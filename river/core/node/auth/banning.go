package auth

import (
	"context"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	baseContracts "github.com/river-build/river/core/node/contracts/base"
	. "github.com/river-build/river/core/node/protocol"
)

type Banning interface {
	IsBanned(ctx context.Context, wallets []common.Address) (bool, error)
}

type bannedAddressCache struct {
	mu              sync.Mutex
	cacheTtl        time.Duration
	bannedAddresses map[common.Address]struct{}
	lastUpdated     time.Time
}

func NewBannedAddressCache(ttl time.Duration) *bannedAddressCache {
	return &bannedAddressCache{
		bannedAddresses: map[common.Address]struct{}{},
		lastUpdated:     time.Time{},
		cacheTtl:        ttl,
	}
}

func (b *bannedAddressCache) IsBanned(
	wallets []common.Address,
	onMiss func() (map[common.Address]struct{}, error),
) (bool, error) {
	b.mu.Lock()
	defer b.mu.Unlock()

	zeroTime := time.Time{}
	if b.lastUpdated == zeroTime || time.Since(b.lastUpdated) > b.cacheTtl {
		bannedAddresses, err := onMiss()
		if err != nil {
			return false, err
		}

		b.bannedAddresses = bannedAddresses
		b.lastUpdated = time.Now()
	}

	for _, wallet := range wallets {
		if _, banned := b.bannedAddresses[wallet]; banned {
			return true, nil
		}
	}
	return false, nil
}

type banning struct {
	contract      *baseContracts.Banning
	tokenContract *baseContracts.Erc721aQueryable
	spaceAddress  common.Address

	bannedAddressCache *bannedAddressCache
}

func (b *banning) IsBanned(ctx context.Context, wallets []common.Address) (bool, error) {
	return b.bannedAddressCache.IsBanned(wallets, func() (map[common.Address]struct{}, error) {
		bannedTokens, err := b.contract.Banned(nil)
		if err != nil {
			return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).
				Func("IsBanned").
				Message("Failed to get banned token ids")
		}
		bannedAddresses := map[common.Address]struct{}{}
		for _, token := range bannedTokens {
			tokenOwnership, err := b.tokenContract.ExplicitOwnershipOf(nil, token)
			if err != nil {
				return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err).
					Func("IsBanned").
					Message("Failed to get owner of banned token")
			}
			// Ignore burned tokens or any resopnse that indicates a token id out of bounds
			zeroAddress := common.Address{}
			if !tokenOwnership.Burned && tokenOwnership.Addr != zeroAddress {
				bannedAddresses[tokenOwnership.Addr] = struct{}{}
			}
		}
		return bannedAddresses, nil
	})
}

func NewBanning(
	ctx context.Context,
	cfg *config.ChainConfig,
	version string,
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
		contract:           contract,
		tokenContract:      tokenContract,
		spaceAddress:       spaceAddress,
		bannedAddressCache: NewBannedAddressCache(negativeCacheTTL),
	}, nil
}
