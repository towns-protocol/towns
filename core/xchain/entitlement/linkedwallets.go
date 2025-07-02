package entitlement

import (
	"context"
	"fmt"
	"slices"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
)

var (
	DELEGATE_XYZ_V1_ADDRESS = common.HexToAddress("0x00000000000076a84fef008cdabe6409d2fe638b")
	DelegationType_ALL      = uint8(1)
)

func getLinkedWallets(
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
		log.Errorw("Failed to GetRootKeyForWallet", "error", err, "wallet", wallet.Hex())
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

// getMainnetDelegators returns the list of wallets that delegated ALL to the list
// of wallets passed into the functions, using the v1 deligation registry of delegate.xyz.
// To compute the total list of linked wallets and mainnet delegators, the caller must
// combine the returned result with the original list of linked wallets.
func (e *Evaluator) getMainnetDelegators(
	ctx context.Context,
	wallets []common.Address,
) (delegators []common.Address, err error) {
	uniqueDelegatorWallets := map[string]struct{}{}
	log := logging.FromCtx(ctx)
	for _, chainId := range e.ethereumNetworkIds {
		log.Debugw("Fetching delegate.xyz V1 delegators for wallets", "chainID", chainId, "wallets", wallets)
		client, err := e.clients.Get(chainId)
		if err != nil {
			log.Errorw("Provider for Chain ID not found", "chainID", chainId)
			return nil, fmt.Errorf("getMainnetDelegators: Provider for chain ID %v not found", chainId)
		}

		registry, err := base.NewIDelegateRegistryV1(
			DELEGATE_XYZ_V1_ADDRESS,
			client,
		)
		if err != nil {
			log.Errorw("Error querying delegate.xyz V1 registry", "chainId", chainId, "error", err)
		}

		for _, wallet := range wallets {
			delegationInfos, err := registry.GetDelegationsByDelegate(&bind.CallOpts{Context: ctx}, wallet)
			if err != nil {
				log.Errorw("Unable to retrieve delegations for wallet", "chainId", chainId, "error", err)
				return nil, err
			}
			for _, info := range delegationInfos {
				if info.Type == DelegationType_ALL {
					walletString := info.Vault.Hex()
					// Make sure the delegators list is unique
					if _, ok := uniqueDelegatorWallets[walletString]; !ok {
						delegators = append(delegators, info.Vault)
						uniqueDelegatorWallets[walletString] = struct{}{}
					}
				}
			}
		}
	}
	return delegators, nil
}

func (e *Evaluator) GetLinkedWallets(
	ctx context.Context,
	wallet common.Address,
	walletLink *base.WalletLink,
	callDurations *prometheus.HistogramVec,
	getRootKeyForWalletCalls *infra.StatusCounterVec,
	getWalletsByRootKeyCalls *infra.StatusCounterVec,
) ([]common.Address, error) {
	wallets, err := getLinkedWallets(
		ctx,
		wallet,
		walletLink,
		callDurations,
		getRootKeyForWalletCalls,
		getWalletsByRootKeyCalls,
	)
	// Attempt to parse any contract errors
	if err != nil {
		ce, se, err := e.decoder.DecodeEVMError(err)
		if ce != nil {
			return nil, ce
		} else if se != nil {
			return nil, se
		}
		return nil, err
	}

	delegators, err := e.getMainnetDelegators(ctx, wallets)
	if err != nil {
		return nil, err
	}

	logging.FromCtx(ctx).
		Debugw("Found the following delegators for linked wallets", "linkedWallets", wallet, "delegators", delegators)

	// Append delegator wallets to the list
	for _, delegator := range delegators {
		// Ensure no duplicate wallets
		if !slices.ContainsFunc(wallets, func(wallet common.Address) bool {
			return wallet.Cmp(delegator) == 0
		}) {
			wallets = append(wallets, delegator)
		}
	}

	return wallets, nil
}
