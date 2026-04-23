package config

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestLoad_RequiresMandatoryValues(t *testing.T) {
	t.Setenv("LEKURAX_DB_DSN", "")
	t.Setenv("LEKURAX_AUTHZ_BASE_URL", "")
	t.Setenv("LEKURAX_AUTHZ_SERVICE_API_KEY", "")

	cfg, err := Load()

	require.Nil(t, cfg)
	require.EqualError(t, err, "db.dsn is required")
}

func TestLoad_UsesEnvAndDefaults(t *testing.T) {
	t.Setenv("LEKURAX_DB_DSN", "postgres://user:pass@localhost:5432/lekurax?sslmode=disable")
	t.Setenv("LEKURAX_AUTHZ_BASE_URL", "https://authz.example.com")
	t.Setenv("LEKURAX_AUTHZ_SERVICE_API_KEY", "secret")

	cfg, err := Load()

	require.NoError(t, err)
	require.Equal(t, ":8081", cfg.HTTP.Addr)
	require.True(t, cfg.Security.RequireBranchContext)
	require.Equal(t, 15*time.Second, cfg.Security.RequestTimeout)
	require.Equal(t, "postgres://user:pass@localhost:5432/lekurax?sslmode=disable", cfg.DB.DSN)
	require.Equal(t, "https://authz.example.com", cfg.Authz.BaseURL)
	require.Equal(t, "secret", cfg.Authz.ServiceAPIKey)
}
