package infra

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("document file not found")
var ErrTooLarge = errors.New("document file too large")

type LocalStorage struct {
	baseDir string
}

func NewLocalStorage(baseDir string) (*LocalStorage, error) {
	if strings.TrimSpace(baseDir) == "" {
		return nil, fmt.Errorf("base dir is required")
	}
	abs, err := filepath.Abs(baseDir)
	if err != nil {
		return nil, fmt.Errorf("abs base dir: %w", err)
	}
	if err := os.MkdirAll(abs, 0o755); err != nil {
		return nil, fmt.Errorf("mkdir base dir: %w", err)
	}
	return &LocalStorage{baseDir: abs}, nil
}

func (s *LocalStorage) BaseDir() string { return s.baseDir }

func (s *LocalStorage) Put(ctx context.Context, tenantID uuid.UUID, branchID *uuid.UUID, documentID uuid.UUID, r io.Reader, maxBytes int64) (storagePath string, err error) {
	_ = ctx

	dirRel := filepath.Join("tenant", tenantID.String())
	if branchID != nil && *branchID != uuid.Nil {
		dirRel = filepath.Join(dirRel, "branch", branchID.String())
	}
	if err := os.MkdirAll(filepath.Join(s.baseDir, dirRel), 0o755); err != nil {
		return "", fmt.Errorf("mkdir tenant dir: %w", err)
	}

	suffix := randomHex(8)
	filenameRel := filepath.Join(dirRel, fmt.Sprintf("%s-%s", documentID.String(), suffix))

	full := filepath.Join(s.baseDir, filenameRel)
	if err := ensureWithinBaseDir(s.baseDir, full); err != nil {
		return "", err
	}

	f, err := os.OpenFile(full, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		return "", fmt.Errorf("create file: %w", err)
	}
	defer func() {
		_ = f.Close()
		if err != nil {
			_ = os.Remove(full)
		}
	}()

	if maxBytes > 0 {
		// Copy at most maxBytes+1 so we can detect overflow and fail (rather than truncate).
		n, copyErr := io.CopyN(f, r, maxBytes+1)
		if copyErr != nil && !errors.Is(copyErr, io.EOF) {
			return "", fmt.Errorf("write file: %w", copyErr)
		}
		if n > maxBytes {
			return "", ErrTooLarge
		}
	} else {
		if _, err := io.Copy(f, r); err != nil {
			return "", fmt.Errorf("write file: %w", err)
		}
	}
	if err := f.Sync(); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	// Store relative path for portability across baseDir changes.
	return filepath.ToSlash(filenameRel), nil
}

func (s *LocalStorage) Open(storagePath string) (*os.File, error) {
	cleanRel := filepath.Clean(filepath.FromSlash(storagePath))
	if cleanRel == "." || cleanRel == string(os.PathSeparator) || strings.HasPrefix(cleanRel, ".."+string(os.PathSeparator)) || cleanRel == ".." {
		return nil, fmt.Errorf("invalid storage path")
	}

	full := filepath.Join(s.baseDir, cleanRel)
	if err := ensureWithinBaseDir(s.baseDir, full); err != nil {
		return nil, err
	}

	f, err := os.Open(full)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("open file: %w", err)
	}
	return f, nil
}

func ensureWithinBaseDir(baseDir, fullPath string) error {
	baseClean := filepath.Clean(baseDir)
	fullClean := filepath.Clean(fullPath)

	rel, err := filepath.Rel(baseClean, fullClean)
	if err != nil {
		return fmt.Errorf("invalid storage path")
	}
	if rel == "." {
		return fmt.Errorf("invalid storage path")
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
		return fmt.Errorf("invalid storage path")
	}
	return nil
}

func randomHex(nBytes int) string {
	if nBytes <= 0 {
		return "0"
	}
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "rand"
	}
	return hex.EncodeToString(b)
}

