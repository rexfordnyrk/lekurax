package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

func Load() (*Config, error) {
	v := viper.New()
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("./config")

	v.AutomaticEnv()
	v.SetEnvPrefix("LEKURAX")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	_ = v.BindEnv("http.addr")
	_ = v.BindEnv("db.dsn")
	_ = v.BindEnv("authz.base_url")
	_ = v.BindEnv("authz.service_api_key")
	_ = v.BindEnv("authz.jwt_issuer")
	_ = v.BindEnv("authz.rs256_public_key_pem")
	_ = v.BindEnv("security.require_branch_context")
	_ = v.BindEnv("security.request_timeout")
	v.SetDefault("http.addr", ":8081")
	v.SetDefault("security.require_branch_context", true)
	v.SetDefault("security.request_timeout", "15s")

	_ = v.ReadInConfig()

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}
	if cfg.DB.DSN == "" {
		return nil, fmt.Errorf("db.dsn is required")
	}
	if cfg.Authz.BaseURL == "" {
		return nil, fmt.Errorf("authz.base_url is required")
	}
	if cfg.Authz.ServiceAPIKey == "" {
		return nil, fmt.Errorf("authz.service_api_key is required")
	}
	return &cfg, nil
}
