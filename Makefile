.PHONY: help install test test-watch test-coverage serve clean

help:           ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install:        ## Install dependencies
	npm install

test:           ## Run tests
	npx vitest run

test-watch:     ## Run tests in watch mode
	npx vitest

test-coverage:  ## Run tests with coverage
	npx vitest run --coverage

serve:          ## Serve dashboard at localhost:8080
	python3 -m http.server 8080 --directory .

clean:          ## Remove generated files
	rm -rf node_modules coverage
