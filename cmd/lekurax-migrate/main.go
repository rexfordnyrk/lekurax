package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"lekurax/internal/config"
)

func usage() {
	fmt.Fprintf(os.Stderr, `Usage: lekurax-migrate <command>

Commands:
  up       Apply all pending migrations (default if omitted)
  down     Roll back the last migration
  status   Show migration status

Configuration: same as lekurax-api (config.yaml or LEKURAX_* env). Database:
either db.dsn or db.user + db.name (plus optional host/port/password/sslmode).
Authz base_url and service_api_key are still required by config validation.

Examples:
  make migrate-up
  go run ./cmd/lekurax-migrate up
`)
}

func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		args = []string{"up"}
	}
	cmd := args[0]
	switch cmd {
	case "up", "down", "status":
	default:
		usage()
		os.Exit(1)
	}

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	db, err := sql.Open("pgx", cfg.DB.DSN)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if err := goose.SetDialect("postgres"); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	var runErr error
	switch cmd {
	case "up":
		runErr = goose.UpContext(ctx, db, "migrations")
	case "down":
		runErr = goose.DownContext(ctx, db, "migrations")
	case "status":
		runErr = goose.StatusContext(ctx, db, "migrations")
	}

	if runErr != nil {
		fmt.Fprintln(os.Stderr, runErr)
		os.Exit(1)
	}
}
