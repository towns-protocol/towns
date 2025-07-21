package auth

import (
	"context"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/config"
	baseContracts "github.com/towns-protocol/towns/core/contracts/base"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

type Banning interface {
	IsBanned(ctx context.Context, tokenIds []*big.Int) (bool, error)
}

type bannedTokensCache struct {
	mu           sync.Mutex
	cacheTtl     time.Duration
	bannedTokens map[string]struct{}
	lastUpdated  time.Time
}

func NewBannedTokensCache(ttl time.Duration) *bannedTokensCache {
	return &bannedTokensCache{
		bannedTokens: map[string]struct{}{},
		lastUpdated:  time.Time{},
		cacheTtl:     ttl,
	}
}

func (b *bannedTokensCache) IsBanned(
	tokenIds []*big.Int,
	onMiss func() (map[string]struct{}, error),
) (bool, error) {
	b.mu.Lock()
	defer b.mu.Unlock()

	zeroTime := time.Time{}
	if b.lastUpdated == zeroTime || time.Since(b.lastUpdated) > b.cacheTtl {
		bannedTokens, err := onMiss()
		if err != nil {
			return false, err
		}

		b.bannedTokens = bannedTokens
		b.lastUpdated = time.Now()
	}

	for _, tokenId := range tokenIds {
		if _, banned := b.bannedTokens[tokenId.String()]; banned {
			return true, nil
		}
	}
	return false, nil
}

type banning struct {
	contract      *baseContracts.Banning
	tokenContract *baseContracts.Erc721aQueryable
	spaceAddress  common.Address

	bannedTokensCache *bannedTokensCache
}

func (b *banning) IsBanned(ctx context.Context, tokenIds []*big.Int) (bool, error) {
	return b.bannedTokensCache.IsBanned(tokenIds, func() (map[string]struct{}, error) {
		bannedTokens, err := b.contract.Banned(&bind.CallOpts{Context: ctx})
		if err != nil {
			return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).
				Func("IsBanned").
				Message("Failed to get banned token ids")
		}
		bannedTokensMap := make(map[string]struct{})
		for _, tokenId := range bannedTokens {
			bannedTokensMap[tokenId.String()] = struct{}{}
		}
		return bannedTokensMap, nil
	})
}

func NewBanning(
	ctx context.Context,
	cfg *config.ChainConfig,
	spaceAddress common.Address,
	backend bind.ContractBackend,
) (Banning, error) {
	contract, err := baseContracts.NewBanning(spaceAddress, backend)
	if err != nil {
		return nil, err
	}

	tokenContract, err := baseContracts.NewErc721aQueryable(spaceAddress, backend)
	if err != nil {
		return nil, err
	}

	// Default to 2s
	negativeCacheTTL := 2 * time.Second
	if cfg.NegativeEntitlementCacheTTLSeconds > 0 {
		negativeCacheTTL = time.Duration(cfg.NegativeEntitlementCacheTTLSeconds) * time.Second
	}

	return &banning{
		contract:          contract,
		tokenContract:     tokenContract,
		spaceAddress:      spaceAddress,
		bannedTokensCache: NewBannedTokensCache(negativeCacheTTL),
	}, nil
}
