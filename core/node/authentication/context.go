package authentication

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
)

type userIDCtxKey struct{}

// contextWithAuthenticatedUser returns a context that has the id of the authenticated wallet stored
// within. It's used by the authentication interceptor to supply authentication metadata to the request
// handler guarded by authentication.
func contextWithAuthenticatedUser(ctx context.Context, userId common.Address) context.Context {
	return context.WithValue(ctx, userIDCtxKey{}, userId)
}

// UserFromAuthenticatedContext retrieves the wallet address of the authenticated party calling a request
// that is guarded by authentication. This data is populated by the authentication interceptor.
func UserFromAuthenticatedContext(ctx context.Context) common.Address {
	val := ctx.Value(userIDCtxKey{})
	// If the user id is unset, return the zero address.
	if val == nil {
		return common.Address{}
	}

	return val.(common.Address)
}
