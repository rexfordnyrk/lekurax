package rbac

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"lekurax/internal/auth"
)

func RequirePermission(name string) gin.HandlerFunc {
	return func(c *gin.Context) {
		principal := auth.GetPrincipal(c)
		if principal == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
			return
		}

		for _, permission := range principal.Permissions {
			if permission == name {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "FORBIDDEN"})
	}
}
