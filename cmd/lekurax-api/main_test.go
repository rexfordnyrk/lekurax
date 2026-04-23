package main

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestRun_ReturnsOneWhenLoggerInitializationFails(t *testing.T) {
	originalNewProductionLogger := newProductionLogger
	newProductionLogger = func(...zap.Option) (*zap.Logger, error) {
		return nil, errors.New("logger init failed")
	}
	defer func() {
		newProductionLogger = originalNewProductionLogger
	}()

	exitCode := run()

	require.Equal(t, 1, exitCode)
}
