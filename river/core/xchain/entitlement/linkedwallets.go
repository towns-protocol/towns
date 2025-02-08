package entitlement

import (
	"context"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
)

func GetLinkedWallets(
	ctx context.Context,
	wallet common.Address,
	walletLink *base.WalletLink,
	callDurations *prometheus.HistogramVec,
	getRootKeyForWalletCalls *infra.StatusCounterVec,
	getWalletsByRootKeyCalls *infra.StatusCounterVec,
) ([]common.Address, error) {
	log := logging.FromCtx(ctx)
	var timer *prometheus.Timer

	if callDurations != nil {
		timer = prometheus.NewTimer(callDurations.WithLabelValues("GetRootKeyForWallet"))
	}
	rootKey, err := walletLink.GetRootKeyForWallet(&bind.CallOpts{Context: ctx}, wallet)
	if timer != nil {
		timer.ObserveDuration()
	}

	if err != nil {
		log.Errorw("Failed to GetRootKeyForWallet", "err", err, "wallet", wallet.Hex())
		if getRootKeyForWalletCalls != nil {
			getRootKeyForWalletCalls.IncFail()
		}
		return nil, err
	}
	if getRootKeyForWalletCalls != nil {
		getRootKeyForWalletCalls.IncPass()
	}

	var zero common.Address
	if rootKey == zero {
		log.Debugw("Wallet not linked to any root key, trying as root key", "wallet", wallet.Hex())
		rootKey = wallet
	}

	if callDurations != nil {
		timer = prometheus.NewTimer(callDurations.WithLabelValues("GetWalletsByRootKey"))
	}
	wallets, err := walletLink.GetWalletsByRootKey(&bind.CallOpts{Context: ctx}, rootKey)
	if timer != nil {
		timer.ObserveDuration()
	}
	if err != nil {
		if getWalletsByRootKeyCalls != nil {
			getWalletsByRootKeyCalls.IncFail()
		}
		return nil, err
	}
	if getWalletsByRootKeyCalls != nil {
		getWalletsByRootKeyCalls.IncPass()
	}

	if len(wallets) == 0 {
		log.Debugw("No linked wallets found", "rootKey", rootKey.Hex())
		return []common.Address{wallet}, nil
	}

	// Make sure the root wallet is included in the returned list of linked wallets. This will not
	// be the case when the wallet passed to the check is the root wallet.
	containsRootWallet := false
	for _, w := range wallets {
		if w == rootKey {
			containsRootWallet = true
			break
		}
	}
	if !containsRootWallet {
		wallets = append(wallets, rootKey)
	}

	log.Debugw("Linked wallets", "rootKey", rootKey.Hex(), "wallets", wallets)

	return wallets, nil
}
