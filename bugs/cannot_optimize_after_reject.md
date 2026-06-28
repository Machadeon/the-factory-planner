# Cannot run recipe optimizer after rejecting all suggested recipes

If the user optimizes recipes, then immediately rejects all suggestions, then clicks on "Optimize Recipes" again,
nothing happens.

## Steps to Reproduce

1. New factory
2. Under "optimization" tab, add target "power" at 100,000 MW
3. Click "Optimize Recipes"
4. Reject all suggestions using "Reject All"
5. Click "Optimize Recipes" again

## Expected Results

After step 5, the same recipes are suggested as after step 3

## Actual Results

After step 5, nothing happens

## Full Error Message

None
