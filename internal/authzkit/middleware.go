package authzkit

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"lekurax/internal/auth"
	"lekurax/internal/branchctx"
)

func RequireBranchMembership(client *Client, isTenantAdmin func(*auth.Principal) bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		principal := auth.GetPrincipal(c)
		if principal == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
			return
		}

		if isTenantAdmin != nil && isTenantAdmin(principal) {
			if result, err := branchctx.Resolve(c); err != nil {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH_ID"})
				return
			} else if result.Present {
				c.Set(branchctx.ContextKey, result.BranchID.String())
			}

			c.Next()
			return
		}

		result, err := branchctx.Resolve(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH_ID"})
			return
		}
		if !result.Present {
			branchctx.AbortBranchRequired(c)
			return
		}

		ok, err := client.UserHasBranch(c.Request.Context(), result.BranchID, principal.UserID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadGateway, gin.H{"error": "AUTHZ_UNAVAILABLE"})
			return
		}
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "BRANCH_FORBIDDEN"})
			return
		}

		c.Set(branchctx.ContextKey, result.BranchID.String())
		c.Next()
	}
}
