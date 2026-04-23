package config

import "time"

type Config struct {
	HTTP struct {
		Addr string `mapstructure:"addr"`
	} `mapstructure:"http"`

	DB struct {
		DSN string `mapstructure:"dsn"`
	} `mapstructure:"db"`

	Authz struct {
		BaseURL        string `mapstructure:"base_url"`
		ServiceAPIKey  string `mapstructure:"service_api_key"` // used for introspection/membership lookups
		JWTIssuer      string `mapstructure:"jwt_issuer"`
		RS256PublicKey string `mapstructure:"rs256_public_key_pem"` // optional if using JWKS later
	} `mapstructure:"authz"`

	Security struct {
		RequireBranchContext bool          `mapstructure:"require_branch_context"`
		RequestTimeout       time.Duration `mapstructure:"request_timeout"`
	} `mapstructure:"security"`
}
