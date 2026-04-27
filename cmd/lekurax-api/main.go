package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"go.uber.org/zap"
	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/config"
	"lekurax/internal/db"
	"lekurax/internal/httpserver"
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

	alg := strings.TrimSpace(strings.ToUpper(cfg.Authz.JWTAlgorithm))
	if alg == "" {
		alg = "RS256"
	}
	verifier, err := auth.NewVerifier(auth.VerifierOptions{
		Issuer:            cfg.Authz.JWTIssuer,
		Algorithm:         alg,
		RS256PublicKeyPEM: cfg.Authz.RS256PublicKey,
		HS256SigningKey:   cfg.Authz.HS256SigningKey,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "init auth verifier: %v\n", err)
		return 1
	}

	gdb, err := db.Open(cfg.DB.DSN)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open db: %v\n", err)
		return 1
	}

	aw := audit.New(gdb)
	az := authzkit.New(cfg.Authz.BaseURL, cfg.Authz.ServiceAPIKey)
	s := server.New(gdb, verifier, aw, az)
	httpserver.RegisterRoutes(s.Engine, gdb, verifier, aw, az)
	authzkit.RegisterPermissionsOnce(context.Background(), az)
	log.Info("starting lekurax-api", zap.String("addr", cfg.HTTP.Addr))
	if err := s.Engine.Run(cfg.HTTP.Addr); err != nil {
		log.Error("server failed", zap.Error(err))
		return 1
	}
	return 0
}
