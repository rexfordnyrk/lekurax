.PHONY: build test migrate-up migrate-down migrate-status

# Default binary output directory (gitignored).
BIN_DIR := bin

build:
	mkdir -p $(BIN_DIR)
	go build -o $(BIN_DIR)/lekurax-api ./cmd/lekurax-api
	go build -o $(BIN_DIR)/lekurax-migrate ./cmd/lekurax-migrate

test:
	go test ./... -count=1

# Goose migrations against Postgres (uses config.yaml or LEKURAX_* env).
migrate-up:
	go run ./cmd/lekurax-migrate up

migrate-down:
	go run ./cmd/lekurax-migrate down

migrate-status:
	go run ./cmd/lekurax-migrate status
