package auth

import (
	"context"

	"github.com/river-build/river/core/node/config"
)

// This checkers always returns true, used for some testing scenarios.
func NewFakeChainAuth() *fakeChainAuth {
	return &fakeChainAuth{}
}

type fakeChainAuth struct{}

var _ ChainAuth = (*fakeChainAuth)(nil)

func (a *fakeChainAuth) IsEntitled(ctx context.Context, cfg *config.Config, args *ChainAuthArgs) (bool, error) {
	return true, nil
}
