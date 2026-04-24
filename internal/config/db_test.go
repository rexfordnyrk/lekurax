package config

import (
	"net/url"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestDBConfig_BuildDSN_RawDSNPrecedence(t *testing.T) {
	d := DBConfig{
		DSN:  "postgres://explicit:only@db:5432/app?sslmode=require",
		Host: "ignored",
		User: "ignored",
		Name: "ignored",
	}
	require.Equal(t, d.DSN, d.BuildDSN())
}

func TestDBConfig_BuildDSN_FromParts_DefaultsHostPortSSL(t *testing.T) {
	d := DBConfig{
		User:     "postgres",
		Password: "secret",
		Name:     "lekurax",
	}
	out := d.BuildDSN()
	u, err := url.Parse(out)
	require.NoError(t, err)
	require.Equal(t, "postgres", u.Scheme)
	require.Equal(t, "postgres", u.User.Username())
	pass, _ := u.User.Password()
	require.Equal(t, "secret", pass)
	require.Equal(t, "localhost:5432", u.Host)
	require.Equal(t, "/lekurax", u.Path)
	require.Equal(t, "disable", u.Query().Get("sslmode"))
}

func TestDBConfig_BuildDSN_EncodesSpecialPassword(t *testing.T) {
	d := DBConfig{
		Host:     "127.0.0.1",
		Port:     5432,
		User:     "app",
		Password: "p@ss:w/rd",
		Name:     "db",
		SSLMode:  "disable",
	}
	out := d.BuildDSN()
	require.True(t, strings.Contains(out, "p%40ss%3Aw%2Frd"), "password should be URL-encoded: %s", out)
}

func TestDBConfig_ResolveDSN_SetsDSN(t *testing.T) {
	d := DBConfig{
		User: "u",
		Name: "n",
		Host: "h",
		Port: 5433,
	}
	require.NoError(t, d.ResolveDSN())
	require.Contains(t, d.DSN, "postgres://u:")
	require.Contains(t, d.DSN, "@h:5433/n")
}

func TestDBConfig_ResolveDSN_MissingUser(t *testing.T) {
	d := DBConfig{Name: "onlydb"}
	require.EqualError(t, d.ResolveDSN(), "db: either 'dsn' or both 'user' and 'name' are required")
}
