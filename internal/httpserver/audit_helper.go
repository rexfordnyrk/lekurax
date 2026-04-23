package httpserver

import (
	"context"
	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/branchctx"
)

func (a *API) log(c *gin.Context, action string, entityType string, entityID *uuid.UUID, metadata map[string]any) {
	if a.audit == nil {
		return
	}
	pr := auth.GetPrincipal(c)
	if pr == nil {
		return
	}
	var branchID *uuid.UUID
	if bid := c.GetString(branchctx.ContextKey); bid != "" {
		if parsed, err := uuid.Parse(bid); err == nil {
			branchID = &parsed
		}
	}
	raw, _ := json.Marshal(metadata)
	_ = a.audit.Write(c.Request.Context(), audit.Entry{
		TenantID:    pr.TenantID,
		BranchID:    branchID,
		ActorUserID: &pr.UserID,
		Action:      action,
		EntityType:  &entityType,
		EntityID:    entityID,
		Metadata:    raw,
	})
}

func (a *API) logCtx(ctx context.Context, tenantID uuid.UUID, branchID *uuid.UUID, actor *uuid.UUID, action, entityType string, entityID *uuid.UUID, metadata map[string]any) {
	if a.audit == nil {
		return
	}
	raw, _ := json.Marshal(metadata)
	_ = a.audit.Write(ctx, audit.Entry{
		TenantID:    tenantID,
		BranchID:    branchID,
		ActorUserID: actor,
		Action:      action,
		EntityType:  &entityType,
		EntityID:    entityID,
		Metadata:    raw,
	})
}
