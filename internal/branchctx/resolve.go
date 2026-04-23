package branchctx

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"lekurax/internal/auth"
)

const (
	ContextKey   = "branch_id"
	headerBranch = "X-Branch-Id"
)

type Result struct {
	BranchID uuid.UUID
	Source   string
	Present  bool
}

func Resolve(c *gin.Context) (Result, error) {
	if raw := strings.TrimSpace(c.Param(ContextKey)); raw != "" {
		return parseResult(raw, "path")
	}

	if raw := strings.TrimSpace(c.Query(ContextKey)); raw != "" {
		return parseResult(raw, "query")
	}

	if raw := strings.TrimSpace(c.GetHeader(headerBranch)); raw != "" {
		return parseResult(raw, "header")
	}

	if principal := auth.GetPrincipal(c); principal != nil && principal.BranchID != nil {
		return Result{
			BranchID: *principal.BranchID,
			Source:   "claim",
			Present:  true,
		}, nil
	}

	return Result{}, nil
}

func AbortBranchRequired(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "BRANCH_REQUIRED"})
}

func parseResult(raw, source string) (Result, error) {
	branchID, err := uuid.Parse(raw)
	if err != nil {
		return Result{}, err
	}

	return Result{
		BranchID: branchID,
		Source:   source,
		Present:  true,
	}, nil
}
