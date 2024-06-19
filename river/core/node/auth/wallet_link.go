package auth

import (
	"context"
	"math/big"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

type WalletLinkContract interface {
	GetLatestNonceForRootKey(ctx context.Context, rootKey common.Address) (*big.Int, error)
	GetWalletsByRootKey(ctx context.Context, rootKey common.Address) ([]common.Address, error)
	GetRootKeyForWallet(ctx context.Context, wallet common.Address) (common.Address, error)
	CheckIfLinked(ctx context.Context, rootKey common.Address, wallet common.Address) (bool, error)
}
type WalletLink struct {
	contract *base.WalletLink
}

func NewWalletLink(ctx context.Context, cfg *config.ContractConfig, backend bind.ContractBackend) (*WalletLink, error) {
	c, err := base.NewWalletLink(cfg.Address, backend)
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CONNECT,
			err,
		).Tags("address", cfg.Address, "version", cfg.Version).
			Func("NewWalletLink").
			Message("Failed to initialize contract")
	}
	return &WalletLink{
		contract: c,
	}, nil
}

func (l *WalletLink) GetWalletsByRootKey(ctx context.Context, rootKey common.Address) ([]common.Address, error) {
	log := dlog.FromCtx(ctx)
	start := time.Now()
	log.Debug("GetWalletsByRootKey", "rootKey", rootKey)
	result, err := l.contract.GetWalletsByRootKey(nil, rootKey)
	if err != nil {
		log.Error("GetWalletsByRootKey", "rootKey", rootKey, "error", err)
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug("GetWalletsByRootKey", "rootKey", rootKey, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}

func (l *WalletLink) GetRootKeyForWallet(ctx context.Context, wallet common.Address) (common.Address, error) {
	log := dlog.FromCtx(ctx)
	start := time.Now()
	log.Debug("GetRootKeyForWallet", "wallet", wallet)
	result, err := l.contract.GetRootKeyForWallet(nil, wallet)
	if err != nil {
		log.Error("GetRootKeyForWallet", "wallet", wallet, "error", err)
		return common.Address{}, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug("GetRootKeyForWallet", "wallet", wallet, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}

func (l *WalletLink) GetLatestNonceForRootKey(ctx context.Context, rootKey common.Address) (*big.Int, error) {
	log := dlog.FromCtx(ctx)
	log.Debug("GetLatestNonceForRootKey", "rootKey", rootKey)
	result, err := l.contract.GetLatestNonceForRootKey(nil, rootKey)
	if err != nil {
		log.Error("GetLatestNonceForRootKey", "rootKey", rootKey, "error", err)
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug("GetLatestNonceForRootKey", "rootKey", rootKey, "result", result)
	return result, nil
}

func (l *WalletLink) CheckIfLinked(ctx context.Context, rootKey common.Address, wallet common.Address) (bool, error) {
	log := dlog.FromCtx(ctx)
	log.Debug("CheckIfLinked", "rootKey", rootKey, "wallet", wallet)
	result, err := l.contract.CheckIfLinked(nil, rootKey, wallet)
	if err != nil {
		log.Error("CheckIfLinked", "rootKey", rootKey, "wallet", wallet, "error", err)
		return false, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	log.Debug("CheckIfLinked", "rootKey", rootKey, "wallet", wallet, "result", result)
	return result, nil
}
