package auth

import (
	"context"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/protocol"
)

// This checkers always returns true, used for some testing scenarios.
func NewFakeChainAuth() *fakeChainAuth {
	return &fakeChainAuth{}
}

type fakeChainAuth struct{}

var _ ChainAuth = (*fakeChainAuth)(nil)

func (a *fakeChainAuth) IsEntitled(
	ctx context.Context,
	cfg *config.Config,
	args *ChainAuthArgs,
) (IsEntitledResult, error) {
	return &isEntitledResult{
		isAllowed: true,
		reason:    EntitlementResultReason_NONE,
	}, nil
}

func (a *fakeChainAuth) VerifyReceipt(
	ctx context.Context,
	receipt *protocol.BlockchainTransactionReceipt,
) (bool, error) {
	return true, nil
}
