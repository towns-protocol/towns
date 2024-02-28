package auth

import (
	"context"
	"math/big"
	"time"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/config"
	"github.com/river-build/river/contracts"
	"github.com/river-build/river/contracts/dev"
	v3 "github.com/river-build/river/contracts/v3"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/dlog"
	"github.com/river-build/river/infra"
	. "github.com/river-build/river/protocol"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

type WalletLinkContract interface {
	GetLatestNonceForRootKey(ctx context.Context, rootKey common.Address) (*big.Int, error)
	GetWalletsByRootKey(ctx context.Context, rootKey common.Address) ([]common.Address, error)
	GetRootKeyForWallet(ctx context.Context, wallet common.Address) (common.Address, error)
	CheckIfLinked(ctx context.Context, rootKey common.Address, wallet common.Address) (bool, error)
}

type GeneratedWalletLinkContract interface {
	GetLatestNonceForRootKey(opts *bind.CallOpts, rootKey common.Address) (*big.Int, error)
	GetWalletsByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error)
	GetRootKeyForWallet(opts *bind.CallOpts, wallet common.Address) (common.Address, error)
	CheckIfLinked(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error)
}

type TownsWalletLink struct {
	contract GeneratedWalletLinkContract
}

var (
	getWalletsByRootKeyCalls = infra.NewSuccessMetrics("get_wallets_by_root_key_calls", contractCalls)
	getRootKeyForWalletCalls = infra.NewSuccessMetrics("get_root_key_for_wallet_calls", contractCalls)
	getLatestNonceCalls      = infra.NewSuccessMetrics("get_latest_nonce_calls", contractCalls)
	checkIfLinkedCalls       = infra.NewSuccessMetrics("check_if_linked_calls", contractCalls)
)

func NewTownsWalletLink(ctx context.Context, cfg *config.ContractConfig, backend bind.ContractBackend) (*TownsWalletLink, error) {
	address, err := crypto.ParseOrLoadAddress(cfg.Address)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_CONFIG).Message("Failed to parse contract address").Func("NewTownsWalletLink")
	}
	var c GeneratedWalletLinkContract
	switch cfg.Version {
	case contracts.DEV:
		c, err = dev.NewWalletLink(address, backend)
	case contracts.V3:
		c, err = v3.NewTownsWalletLink(address, backend)
	}
	if err != nil {
		return nil, WrapRiverError(
			Err_CANNOT_CONNECT,
			err,
		).Tags("address", cfg.Address, "version", cfg.Version).
			Func("NewTownsWalletLink").
			Message("Failed to initialize contract")
	}
	if c == nil {
		return nil, RiverError(
			Err_CANNOT_CONNECT,
			"Unsupported version",
			"version",
			cfg.Version,
			"address",
			cfg.Address,
		).Func("NewTownsWalletLink")
	}
	return &TownsWalletLink{
		contract: c,
	}, nil
}

func (l *TownsWalletLink) GetWalletsByRootKey(ctx context.Context, rootKey common.Address) ([]common.Address, error) {
	log := dlog.FromCtx(ctx)
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("GetWalletsByRootKey", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("GetWalletsByRootKey", "rootKey", rootKey)
	result, err := l.contract.GetWalletsByRootKey(nil, rootKey)
	if err != nil {
		getWalletsByRootKeyCalls.FailInc()
		log.Error("GetWalletsByRootKey", "rootKey", rootKey, "error", err)
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	getWalletsByRootKeyCalls.PassInc()
	log.Debug("GetWalletsByRootKey", "rootKey", rootKey, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}

func (l *TownsWalletLink) GetRootKeyForWallet(ctx context.Context, wallet common.Address) (common.Address, error) {
	log := dlog.FromCtx(ctx)
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("GetRootKeyForWallet", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("GetRootKeyForWallet", "wallet", wallet)
	result, err := l.contract.GetRootKeyForWallet(nil, wallet)
	if err != nil {
		getRootKeyForWalletCalls.FailInc()
		log.Error("GetRootKeyForWallet", "wallet", wallet, "error", err)
		return common.Address{}, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	getRootKeyForWalletCalls.PassInc()
	log.Debug("GetRootKeyForWallet", "wallet", wallet, "result", result, "duration", time.Since(start).Milliseconds())
	return result, nil
}

func (l *TownsWalletLink) GetLatestNonceForRootKey(ctx context.Context, rootKey common.Address) (*big.Int, error) {
	log := dlog.FromCtx(ctx)
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("GetLatestNonceForRootKey", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("GetLatestNonceForRootKey", "rootKey", rootKey)
	result, err := l.contract.GetLatestNonceForRootKey(nil, rootKey)
	if err != nil {
		getLatestNonceCalls.FailInc()
		log.Error("GetLatestNonceForRootKey", "rootKey", rootKey, "error", err)
		return nil, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	getLatestNonceCalls.PassInc()
	log.Debug("GetLatestNonceForRootKey", "rootKey", rootKey, "result", result)
	return result, nil
}

func (l *TownsWalletLink) CheckIfLinked(ctx context.Context, rootKey common.Address, wallet common.Address) (bool, error) {
	log := dlog.FromCtx(ctx)
	start := time.Now()
	defer infra.StoreExecutionTimeMetrics("CheckIfLinked", infra.CONTRACT_CALLS_CATEGORY, start)
	log.Debug("CheckIfLinked", "rootKey", rootKey, "wallet", wallet)
	result, err := l.contract.CheckIfLinked(nil, rootKey, wallet)
	if err != nil {
		checkIfLinkedCalls.FailInc()
		log.Error("CheckIfLinked", "rootKey", rootKey, "wallet", wallet, "error", err)
		return false, WrapRiverError(Err_CANNOT_CALL_CONTRACT, err)
	}
	checkIfLinkedCalls.PassInc()
	log.Debug("CheckIfLinked", "rootKey", rootKey, "wallet", wallet, "result", result)
	return result, nil
}
