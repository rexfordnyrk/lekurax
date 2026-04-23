package audit

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Entry struct {
	ID          uuid.UUID       `gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID       `gorm:"type:uuid;not null;index"`
	BranchID    *uuid.UUID      `gorm:"type:uuid;index"`
	ActorUserID *uuid.UUID      `gorm:"type:uuid;index"`
	Action      string          `gorm:"type:text;not null"`
	EntityType  *string         `gorm:"type:text"`
	EntityID    *uuid.UUID      `gorm:"type:uuid"`
	Metadata    json.RawMessage `gorm:"type:jsonb;not null;default:'{}'::jsonb"`
	CreatedAt   time.Time       `gorm:"type:timestamptz;not null"`
}

func (Entry) TableName() string {
	return "lekurax_audit_logs"
}

type Writer struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Writer {
	return &Writer{db: db}
}

func (w *Writer) Write(ctx context.Context, entry Entry) error {
	if entry.ID == uuid.Nil {
		entry.ID = uuid.New()
	}
	if len(entry.Metadata) == 0 {
		entry.Metadata = json.RawMessage(`{}`)
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now().UTC()
	}

	return w.db.WithContext(ctx).Create(&entry).Error
}
