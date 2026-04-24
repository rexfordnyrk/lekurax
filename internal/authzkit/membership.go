package authzkit

import (
	"context"
	"net/url"

	"github.com/google/uuid"
)

type listBranchUsersResponse struct {
	Success bool `json:"success"`
	Data    []struct {
		ID string `json:"id"`
	} `json:"data"`
}

func (c *Client) UserHasBranch(ctx context.Context, branchID, userID uuid.UUID) (bool, error) {
	q := url.Values{}
	q.Set("user_id", userID.String())

	var out listBranchUsersResponse
	if err := c.get(ctx, "/branches/"+branchID.String()+"/users", q, &out); err != nil {
		return false, err
	}

	for _, item := range out.Data {
		if item.ID == userID.String() {
			return true, nil
		}
	}

	return false, nil
}
