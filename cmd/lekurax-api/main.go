package main

import (
	"fmt"
	"os"

	"go.uber.org/zap"
	"lekurax/internal/config"
	"lekurax/internal/server"
)

func main() {
	log, _ := zap.NewProduction()
	defer log.Sync()

	cfg, err := config.Load()
	if err != nil {
		_ = log.Sync()
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	s := server.New()
	log.Info("starting lekurax-api", zap.String("addr", cfg.HTTP.Addr))
	if err := s.Engine.Run(cfg.HTTP.Addr); err != nil {
		log.Fatal("server failed", zap.Error(err))
	}
}
