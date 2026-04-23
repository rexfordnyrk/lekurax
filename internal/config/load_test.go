package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func setRequiredEnv(t *testing.T) {
	t.Helper()
	t.Setenv("LEKURAX_DB_DSN", "postgres://user:pass@localhost:5432/lekurax?sslmode=disable")
	t.Setenv("LEKURAX_AUTHZ_BASE_URL", "https://authz.example.com")
	t.Setenv("LEKURAX_AUTHZ_SERVICE_API_KEY", "secret")
}

func TestLoad_RequiresDBDSN(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("LEKURAX_DB_DSN", "")

	cfg, err := Load()

	require.Nil(t, cfg)
	require.EqualError(t, err, "db.dsn is required")
}

func TestLoad_RequiresAuthzBaseURL(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("LEKURAX_AUTHZ_BASE_URL", "")

	cfg, err := Load()

	require.Nil(t, cfg)
	require.EqualError(t, err, "authz.base_url is required")
}

func TestLoad_RequiresAuthzServiceAPIKey(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("LEKURAX_AUTHZ_SERVICE_API_KEY", "")

	cfg, err := Load()

	require.Nil(t, cfg)
	require.EqualError(t, err, "authz.service_api_key is required")
}

func TestLoad_ReturnsMalformedConfigError(t *testing.T) {
	tmpDir := t.TempDir()
	t.Chdir(tmpDir)

	err := os.WriteFile(filepath.Join(tmpDir, "config.yaml"), []byte("http: ["), 0o644)
	require.NoError(t, err)

	cfg, loadErr := Load()

	require.Nil(t, cfg)
	require.Error(t, loadErr)
	require.ErrorContains(t, loadErr, "read config:")
}

func TestLoad_UsesEnvAndDefaults(t *testing.T) {
	setRequiredEnv(t)

	cfg, err := Load()

	require.NoError(t, err)
	require.Equal(t, ":8081", cfg.HTTP.Addr)
	require.True(t, cfg.Security.RequireBranchContext)
	require.Equal(t, 15*time.Second, cfg.Security.RequestTimeout)
	require.Equal(t, "postgres://user:pass@localhost:5432/lekurax?sslmode=disable", cfg.DB.DSN)
	require.Equal(t, "https://authz.example.com", cfg.Authz.BaseURL)
	require.Equal(t, "secret", cfg.Authz.ServiceAPIKey)
}
