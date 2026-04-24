package config

import (
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
)

// DBConfig holds Postgres connection settings. Either set DSN directly or use
// host/user/name (and optional password, port, sslmode) to build one — same idea as AuthzKit.
type DBConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Name     string `mapstructure:"name"`
	SSLMode  string `mapstructure:"sslmode"`
	// DSN, when non-empty, is used as-is and takes precedence over individual fields.
	DSN string `mapstructure:"dsn"`
}

// BuildDSN returns DSN if set; otherwise builds postgres:// from individual fields.
func (d *DBConfig) BuildDSN() string {
	if strings.TrimSpace(d.DSN) != "" {
		return d.DSN
	}

	host := strings.TrimSpace(d.Host)
	if host == "" {
		host = "localhost"
	}
	port := d.Port
	if port == 0 {
		port = 5432
	}
	ssl := strings.TrimSpace(d.SSLMode)
	if ssl == "" {
		ssl = "disable"
	}

	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(d.User, d.Password),
		Host:   net.JoinHostPort(host, strconv.Itoa(port)),
		Path:   "/" + strings.TrimPrefix(strings.TrimSpace(d.Name), "/"),
	}
	q := url.Values{}
	q.Set("sslmode", ssl)
	u.RawQuery = q.Encode()
	return u.String()
}

// ResolveDSN sets DSN from components when DSN is empty. Returns an error if neither
// a raw DSN nor the minimum fields (user + name) are present.
func (d *DBConfig) ResolveDSN() error {
	if strings.TrimSpace(d.DSN) != "" {
		return nil
	}
	if strings.TrimSpace(d.User) == "" || strings.TrimSpace(d.Name) == "" {
		return fmt.Errorf("db: either 'dsn' or both 'user' and 'name' are required")
	}
	d.DSN = d.BuildDSN()
	return nil
}
