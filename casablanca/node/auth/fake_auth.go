package auth

import (
	"casablanca/node/shared"
	"context"
)

// This checkers always returns true, used for some testing scenarios.
func NewFakeAuthChecker() *fakeAuthChecker {
	return &fakeAuthChecker{}
}

type fakeAuthChecker struct{}

var _ AuthChecker = (*fakeAuthChecker)(nil)

func (a *fakeAuthChecker) IsAllowed(ctx context.Context, args AuthorizationArgs, info *shared.StreamInfo) (bool, error) {
	return true, nil
}
