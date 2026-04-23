package branchctx

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"lekurax/internal/auth"
)

func TestResolve_UsesConfiguredPrecedence(t *testing.T) {
	gin.SetMode(gin.TestMode)

	pathID := uuid.New()
	queryID := uuid.New()
	headerID := uuid.New()
	claimID := uuid.New()

	testCases := []struct {
		name        string
		pathValue   string
		queryValue  string
		headerValue string
		claimID     *uuid.UUID
		wantID      uuid.UUID
		wantSource  string
	}{
		{
			name:        "path beats query header and claim",
			pathValue:   pathID.String(),
			queryValue:  queryID.String(),
			headerValue: headerID.String(),
			claimID:     &claimID,
			wantID:      pathID,
			wantSource:  "path",
		},
		{
			name:        "query beats header and claim",
			queryValue:  queryID.String(),
			headerValue: headerID.String(),
			claimID:     &claimID,
			wantID:      queryID,
			wantSource:  "query",
		},
		{
			name:        "header beats claim",
			headerValue: headerID.String(),
			claimID:     &claimID,
			wantID:      headerID,
			wantSource:  "header",
		},
		{
			name:       "claim used as fallback",
			claimID:    &claimID,
			wantID:     claimID,
			wantSource: "claim",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			c := newBranchContextTestContext(t, tc.pathValue, tc.queryValue, tc.headerValue, tc.claimID)

			result, err := Resolve(c)

			require.NoError(t, err)
			require.True(t, result.Present)
			require.Equal(t, tc.wantID, result.BranchID)
			require.Equal(t, tc.wantSource, result.Source)
		})
	}
}

func TestResolve_MissingBranchContextReturnsNotPresent(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c := newBranchContextTestContext(t, "", "", "", nil)

	result, err := Resolve(c)

	require.NoError(t, err)
	require.False(t, result.Present)
	require.Equal(t, uuid.Nil, result.BranchID)
	require.Empty(t, result.Source)
}

func newBranchContextTestContext(t *testing.T, pathValue, queryValue, headerValue string, claimID *uuid.UUID) *gin.Context {
	t.Helper()

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	target := "/"
	if queryValue != "" {
		target += "?branch_id=" + queryValue
	}

	req := httptest.NewRequest(http.MethodGet, target, nil)
	if headerValue != "" {
		req.Header.Set("X-Branch-Id", headerValue)
	}
	c.Request = req

	if pathValue != "" {
		c.Params = gin.Params{{Key: "branch_id", Value: pathValue}}
	}

	if claimID != nil {
		c.Set("principal", &auth.Principal{BranchID: claimID})
	}

	return c
}
