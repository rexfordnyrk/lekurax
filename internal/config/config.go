package config

import "time"

type Config struct {
	HTTP struct {
		Addr string `mapstructure:"addr"`
	} `mapstructure:"http"`

	DB DBConfig `mapstructure:"db"`

	Authz struct {
		BaseURL        string `mapstructure:"base_url"`
		ServiceAPIKey  string `mapstructure:"service_api_key"` // used for introspection/membership lookups
		JWTIssuer      string `mapstructure:"jwt_issuer"`
		// JWTAlgorithm is RS256 (asymmetric, default) or HS256 (symmetric). Must match Authz jwt.algorithm.
		JWTAlgorithm string `mapstructure:"jwt_algorithm"`
		// RS256PublicKey is PEM PKIX public key when JWTAlgorithm is RS256.
		RS256PublicKey string `mapstructure:"rs256_public_key_pem"`
		// HS256SigningKey is the shared secret when JWTAlgorithm is HS256 (min 32 chars, same as Authz).
		HS256SigningKey string `mapstructure:"hs256_signing_key"`
	} `mapstructure:"authz"`

	Security struct {
		RequireBranchContext bool          `mapstructure:"require_branch_context"`
		RequestTimeout       time.Duration `mapstructure:"request_timeout"`
	} `mapstructure:"security"`
}
