#!/bin/bash
set -euo pipefail

# Drives full OpenSpec artifact pipeline (proposal -> specs -> design -> tasks -> apply)
# across separate headless `claude` sessions, per-stage model/effort config, with a
# drafter/reviewer retry loop at every artifact gate.
#
# Resumable with no separate bookkeeping: `openspec status --change <name> --json`
# reports which artifact files already exist, and each append-only review artifact
# (spec-review.md, design-review.md, tasks-review.md, review.md) carries its own
# "Status: APPROVED|CONCERNS" history. Re-running the script with the same change
# name re-derives progress from those two sources of truth and resumes accordingly.
#
# Usage: scripts/run-openspec-full.sh <change-name> [models.json path] [max-retries]

CHANGE_NAME="${1:?usage: $0 <change-name> [models.json] [max-retries]}"
CHANGE_DIR="openspec/changes/${CHANGE_NAME}"
MODELS_JSON="${2:-${CHANGE_DIR}/models.json}"
MAX_RETRIES="${3:-5}"

command -v jq >/dev/null || { echo "jq required" >&2; exit 1; }
command -v openspec >/dev/null || { echo "openspec CLI required" >&2; exit 1; }
command -v uuidgen >/dev/null || { echo "uuidgen required" >&2; exit 1; }

LOG_DIR="openspec/logs/${CHANGE_NAME}"
mkdir -p "${LOG_DIR}"

log() { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$1" >&2; }

# artifact_status ARTIFACT_ID -> "done" | "ready" | "blocked" | "" (unknown id)
artifact_status() {
	openspec status --change "$CHANGE_NAME" --json \
		| jq -r --arg id "$1" '.artifacts[]? | select(.id == $id) | .status // empty'
}

# review_status REVIEW_FILE -> latest "Status: X" value recorded in an append-only
# review artifact, or "" if the file doesn't exist / has no Status line yet.
review_status() {
	local f="$1"
	[[ -f "$f" ]] || return 0
	grep -oE 'Status: (APPROVED|CONCERNS)' "$f" | tail -1 | sed 's/.*Status: \(APPROVED\|CONCERNS\).*/\1/' || true
}

# run_claude MODEL EFFORT PROMPT [SESSION_MODE SESSION_ID] -> prints session stdout,
# also tees to a log file. SESSION_MODE "new" starts a persisted session under
# SESSION_ID, "resume" continues it; omitted, the call is a throwaway one-shot.
run_claude() {
	local model="$1" effort="$2" prompt="$3" session_mode="${4:-}" session_id="${5:-}"
	local -a cmd=(claude --model "$model" --print)
	if [[ -n "$effort" && "$effort" != "null" ]]; then
		cmd+=(--effort "$effort")
	fi
	case "$session_mode" in
		new) cmd+=(--session-id "$session_id") ;;
		resume) cmd+=(--resume "$session_id") ;;
		*) cmd+=(--no-session-persistence) ;;
	esac
	local logfile="${LOG_DIR}/$(date +%s%N).log"
	"${cmd[@]}" "$prompt" | tee "$logfile"
}

# run_claude_in_cycle MODEL EFFORT PROMPT -> routes through the current artifact
# cycle's session (set up by start_cycle_session), so drafter/reviewer/fix turns
# all share one continuous conversation instead of separate one-shot calls.
run_claude_in_cycle() {
	local mode="resume"
	if [[ "$CYCLE_SESSION_STARTED" != "true" ]]; then
		mode="new"
		CYCLE_SESSION_STARTED="true"
	fi
	run_claude "$1" "$2" "$3" "$mode" "$CYCLE_SESSION_ID"
}

# start_cycle_session -> resets the shared session state for a new artifact cycle
start_cycle_session() {
	CYCLE_SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
	CYCLE_SESSION_STARTED="false"
}

cfg() { jq -r "$1" "$MODELS_JSON"; }

# validate_models_json -> prints errors to stderr, returns non-zero if invalid
validate_models_json() {
	local errors=0

	if ! jq -e . "$MODELS_JSON" >/dev/null 2>&1; then
		log "models.json: not valid JSON"
		return 1
	fi

	local path model effort
	for path in \
		specs.drafter specs.reviewer \
		design.drafter design.reviewer \
		tasks.drafter tasks.reviewer \
		apply.implementer apply.reviewer
	do
		model=$(jq -r ".${path}.model // empty" "$MODELS_JSON")
		effort=$(jq -r ".${path}.effort" "$MODELS_JSON" 2>/dev/null)

		case "$model" in
			fable|opus|sonnet|haiku) ;;
			*)
				log "models.json: .${path}.model is '${model}', expected one of fable|opus|sonnet|haiku"
				errors=$((errors + 1))
				;;
		esac

		case "$effort" in
			low|medium|high|null) ;;
			*)
				log "models.json: .${path}.effort is '${effort}', expected one of low|medium|high|null"
				errors=$((errors + 1))
				;;
		esac
	done

	(( errors == 0 ))
}

# run_artifact_cycle ARTIFACT_KEY LABEL REVIEW_ID
# Drives step 2/3/3a/3b for one artifact (specs|design|tasks). Resumable purely
# from `openspec status` (does the artifact file exist yet) and the review
# artifact's own append-only "Status:" history (already approved? how many
# CONCERNS passes already spent?).
run_artifact_cycle() {
	local key="$1" label="$2" review_id="$3"
	local review_file="${CHANGE_DIR}/${review_id}.md"

	if [[ "$(review_status "$review_file")" == "APPROVED" ]]; then
		log "=== ${label}: already APPROVED, skipping ==="
		return 0
	fi

	local drafter_model drafter_effort reviewer_model reviewer_effort
	drafter_model=$(cfg ".${key}.drafter.model")
	drafter_effort=$(cfg ".${key}.drafter.effort")
	reviewer_model=$(cfg ".${key}.reviewer.model")
	reviewer_effort=$(cfg ".${key}.reviewer.effort")

	start_cycle_session

	if [[ "$(artifact_status "$key")" == "done" ]]; then
		log "=== ${label}: artifact already exists, skipping draft ==="
	else
		log "=== ${label}: drafting (model=${drafter_model} effort=${drafter_effort}) ==="
		run_claude_in_cycle "$drafter_model" "$drafter_effort" \
			"/opsx:continue for change ${CHANGE_NAME}: create the ${label} artifact." >/dev/null
	fi

	local attempt=0

	while true; do
		if [[ "$(review_status "$review_file")" == "CONCERNS" ]]; then
			log "=== ${label}: CONCERNS on record, sending back to drafter for fixes (attempt ${attempt}) ==="
			run_claude_in_cycle "$drafter_model" "$drafter_effort" \
				"/opsx:continue for change ${CHANGE_NAME}: load ${review_id}.md findings and correct the identified issues in the ${label} artifact." >/dev/null
		fi

		log "=== ${label}: reviewing (model=${reviewer_model} effort=${reviewer_effort}), attempt ${attempt} ==="
		run_claude_in_cycle "$reviewer_model" "$reviewer_effort" \
			"/opsx:continue for change ${CHANGE_NAME}: review the ${label} artifact. State APPROVED or CONCERNS explicitly." >/dev/null

		if [[ "$(review_status "$review_file")" == "APPROVED" ]]; then
			log "=== ${label}: APPROVED ==="
			return 0
		fi

		attempt=$((attempt + 1))
		if (( attempt > MAX_RETRIES )); then
			log "=== ${label}: exceeded ${MAX_RETRIES} retries, aborting (rerun to resume) ==="
			exit 1
		fi
		# loop back: fix (3a) then re-review (3b)
	done
}

# --- 1. proposal + models.json -------------------------------------------------
if [[ "$(artifact_status proposal)" == "done" ]]; then
	log "=== proposal: already created, skipping ==="
else
	log "=== proposal: drafting with opus/high ==="
	run_claude opus high \
		"/opsx:new for change ${CHANGE_NAME}. After creating the proposal artifact, also write ${MODELS_JSON} choosing model (fable|opus|sonnet|haiku) and effort (low|medium|high|null) per stage (specs/design/tasks drafter+reviewer, apply implementer+reviewer) sized to task complexity." >/dev/null
fi

[[ -f "$MODELS_JSON" ]] || { log "models.json missing at ${MODELS_JSON}"; exit 1; }

attempt=0
until validate_models_json; do
	attempt=$((attempt + 1))
	if (( attempt > MAX_RETRIES )); then
		log "models.json: failed validation after ${MAX_RETRIES} regeneration attempts, aborting (rerun to resume)"
		exit 1
	fi
	log "=== models.json invalid, asking haiku to regenerate (attempt ${attempt}) ==="
	run_claude haiku null \
		"Rewrite ${MODELS_JSON} to strictly match the schema: each of specs/design/tasks has drafter+reviewer, apply has implementer+reviewer, each with model (one of: fable, opus, sonnet, haiku) and effort (one of: low, medium, high, or JSON null). Output only valid JSON matching that schema, no extra keys, no commentary." >/dev/null
done

# --- 2-3b. specs / design / tasks ---------------------------------------------
run_artifact_cycle "specs" "specs" "spec-review"
run_artifact_cycle "design" "design" "design-review"
run_artifact_cycle "tasks" "tasks" "tasks-review"

# --- 5-6b. apply + review ------------------------------------------------------
review_file="${CHANGE_DIR}/review.md"

if [[ "$(review_status "$review_file")" == "APPROVED" ]]; then
	log "=== apply: already APPROVED, skipping ==="
else
	implementer_model=$(cfg ".apply.implementer.model")
	implementer_effort=$(cfg ".apply.implementer.effort")
	apply_reviewer_model=$(cfg ".apply.reviewer.model")
	apply_reviewer_effort=$(cfg ".apply.reviewer.effort")

	attempt=0

	start_cycle_session

	while true; do
		if [[ "$(review_status "$review_file")" == "CONCERNS" ]]; then
			log "=== apply: CONCERNS on record, sending back to implementer for fixes (attempt ${attempt}) ==="
			run_claude_in_cycle "$implementer_model" "$implementer_effort" \
				"/opsx:apply for change ${CHANGE_NAME}: load review.md and correct the identified issues in the implementation." >/dev/null
		else
			log "=== apply: implementing (model=${implementer_model} effort=${implementer_effort}) ==="
			run_claude_in_cycle "$implementer_model" "$implementer_effort" \
				"/opsx:apply for change ${CHANGE_NAME}." >/dev/null
		fi

		log "=== apply: reviewing (model=${apply_reviewer_model} effort=${apply_reviewer_effort}), attempt ${attempt} ==="
		run_claude_in_cycle "$apply_reviewer_model" "$apply_reviewer_effort" \
			"/opsx:continue for change ${CHANGE_NAME}: review the full implementation diff. State APPROVED or CONCERNS explicitly." >/dev/null

		if [[ "$(review_status "$review_file")" == "APPROVED" ]]; then
			log "=== apply: APPROVED ==="
			break
		fi

		attempt=$((attempt + 1))
		if (( attempt > MAX_RETRIES )); then
			log "=== apply: exceeded ${MAX_RETRIES} retries, aborting (rerun to resume) ==="
			exit 1
		fi
		# loop back: fix (6a) then re-review (6b)
	done
fi

log "=== pipeline complete for ${CHANGE_NAME} ==="
