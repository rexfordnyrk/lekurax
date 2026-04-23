package main

import (
	"fmt"
	"os"

	"go.uber.org/zap"
	"lekurax/internal/config"
	"lekurax/internal/server"
)

var newProductionLogger = zap.NewProduction

func main() {
	os.Exit(run())
}

func run() int {
	log, err := newProductionLogger()
	if err != nil {
		fmt.Fprintln(os.Stderr, fmt.Errorf("init logger: %w", err))
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

	s := server.New()
	log.Info("starting lekurax-api", zap.String("addr", cfg.HTTP.Addr))
	if err := s.Engine.Run(cfg.HTTP.Addr); err != nil {
		log.Error("server failed", zap.Error(err))
		return 1
	}
	return 0
}
