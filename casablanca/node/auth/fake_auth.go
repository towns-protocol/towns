package auth

import (
	"context"
)

// This checkers always returns true, used for some testing scenarios.
func NewFakeAuthChecker() *fakeAuthChecker {
	return &fakeAuthChecker{}
}

type fakeAuthChecker struct{}

var _ AuthChecker = (*fakeAuthChecker)(nil)

func (a *fakeAuthChecker) CheckPermission(ctx context.Context, args *AuthCheckArgs) error {
	return nil
}
