package server

import (
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestTaskZeroDependencyReferences_AreAvailable(t *testing.T) {
	require.NotEmpty(t, uuid.NewString())
	require.Equal(t, "RS256", jwt.SigningMethodRS256.Alg())
}
