package main

import (
	"fmt"
	"os"

	"go.uber.org/zap"
	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/config"
	"lekurax/internal/db"
	"lekurax/internal/server"
)

var newProductionLogger = zap.NewProduction

func main() {
	os.Exit(run())
}

func run() int {
	log, err := newProductionLogger()
	if err != nil {
		fmt.Fprintf(os.Stderr, "init logger: %v\n", err)
		return 1
	}
	defer func() {
		_ = log.Sync()
	}()

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}

	if cfg.Authz.JWTIssuer == "" {
		fmt.Fprintln(os.Stderr, "authz.jwt_issuer is required")
		return 1
	}
	if cfg.Authz.RS256PublicKey == "" {
		fmt.Fprintln(os.Stderr, "authz.rs256_public_key_pem is required")
		return 1
	}

	verifier, err := auth.NewRS256Verifier(cfg.Authz.RS256PublicKey, cfg.Authz.JWTIssuer)
	if err != nil {
		fmt.Fprintf(os.Stderr, "init auth verifier: %v\n", err)
		return 1
	}

	gdb, err := db.Open(cfg.DB.DSN)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open db: %v\n", err)
		return 1
	}

	s := server.New(
		verifier,
		audit.New(gdb),
		authzkit.New(cfg.Authz.BaseURL, cfg.Authz.ServiceAPIKey),
	)
	log.Info("starting lekurax-api", zap.String("addr", cfg.HTTP.Addr))
	if err := s.Engine.Run(cfg.HTTP.Addr); err != nil {
		log.Error("server failed", zap.Error(err))
		return 1
	}
	return 0
}
