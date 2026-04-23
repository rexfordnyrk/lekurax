package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const principalKey = "principal"

func RequireAuth(v *Verifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(strings.ToLower(header), "bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
			return
		}

		token := strings.TrimSpace(header[len("Bearer "):])
		principal, err := v.VerifyAccessToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
			return
		}

		c.Set(principalKey, principal)
		c.Next()
	}
}

func GetPrincipal(c *gin.Context) *Principal {
	value, ok := c.Get(principalKey)
	if !ok {
		return nil
	}

	principal, _ := value.(*Principal)
	return principal
}
