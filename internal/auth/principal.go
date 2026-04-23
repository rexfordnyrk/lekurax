package auth

import "github.com/google/uuid"

type Principal struct {
	UserID      uuid.UUID
	TenantID    uuid.UUID
	Roles       []string
	Permissions []string
	BranchID    *uuid.UUID
	IsPlatform  bool
	SessionID   string
}
