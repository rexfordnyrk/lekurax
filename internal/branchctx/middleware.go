package branchctx

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RequireBranchContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		result, err := Resolve(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH_ID"})
			return
		}
		if !result.Present {
			AbortBranchRequired(c)
			return
		}

		c.Set(ContextKey, result.BranchID.String())
		c.Next()
	}
}
