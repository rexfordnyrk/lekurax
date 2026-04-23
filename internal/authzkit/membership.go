package authzkit

import (
	"context"
	"net/url"

	"github.com/google/uuid"
)

type listBranchUsersResponse struct {
	Items []struct {
		ID string `json:"id"`
	} `json:"items"`
}

func (c *Client) UserHasBranch(ctx context.Context, branchID, userID uuid.UUID) (bool, error) {
	q := url.Values{}
	q.Set("user_id", userID.String())

	var out listBranchUsersResponse
	if err := c.get(ctx, "/branches/"+branchID.String()+"/users", q, &out); err != nil {
		return false, err
	}

	for _, item := range out.Items {
		if item.ID == userID.String() {
			return true, nil
		}
	}

	return false, nil
}
