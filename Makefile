.PHONY: dev format lint test build run

dev:
	npm run dev

format:
	npm run format
	npm run lint-fix

lint:
	npm run lint

test:
	npm run test:run
	npm run test:e2e

build:
	npm run build

run:
	npm run start
