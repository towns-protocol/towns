package auth

import (
	"context"
)

// This checkers always returns true, used for some testing scenarios.
func NewFakeChainAuth() *fakeChainAuth {
	return &fakeChainAuth{}
}

type fakeChainAuth struct{}

var _ ChainAuth = (*fakeChainAuth)(nil)

func (a *fakeChainAuth) IsEntitled(ctx context.Context, args *ChainAuthArgs) error {
	return nil
}
