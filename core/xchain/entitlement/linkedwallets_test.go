package entitlement

import (
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/contracts/base/deploy"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
)

func TestFetchDelegateWallets(t *testing.T) {
	t.Skip("Skipping due to outbound network call")
	require := require.New(t)
	ctx := test.NewTestContext(t)

	btc, err := crypto.NewBlockchainTestContext(
		ctx,
		crypto.TestParams{NumKeys: 1, MineOnTx: true, AutoMine: true},
	)
	require.NoError(err)

	client := btc.DeployerBlockchain.Client

	chainId, err := client.ChainID(ctx)
	require.NoError(err)

	auth, err := bind.NewKeyedTransactorWithChainID(btc.DeployerBlockchain.Wallet.PrivateKeyStruct, chainId)
	require.NoError(err)

	addr, _, _, err := deploy.DeployMockWalletLink(auth, client)
	require.NoError(err)
	walletLink, err := base.NewWalletLink(addr, client)
	require.NoError(err)

	root, err := crypto.NewWallet(ctx)
	require.NoError(err)

	hotWallet := common.HexToAddress("0x10F0ABcC19f37CE6131809b105D4d7Ac5343F77D")
	coldWallet := common.HexToAddress("0xF2BcBF25fA8fE28D755f1C6e1630A09a1E23457f")

	rootWalletLinkArg := base.IWalletLinkBaseLinkedWallet{
		Addr:      root.Address,
		Signature: []byte(""),
	}
	hotWalletLinkArg := base.IWalletLinkBaseLinkedWallet{
		Addr:      hotWallet,
		Signature: []byte(""),
	}

	pendingTx, err := btc.DeployerBlockchain.TxPool.Submit(
		ctx,
		"LinkWalletToRootKey",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return walletLink.LinkWalletToRootKey(opts, hotWalletLinkArg, rootWalletLinkArg, big.NewInt(0))
		},
	)
	require.NoError(err)
	receipt, err := pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(uint64(1), receipt.Status)

	evaluator, err := NewEvaluatorFromConfig(
		ctx,
		cfg,
		allSepoliaChains_onChainConfig,
		infra.NewMetricsFactory(nil, "", ""),
		nil,
	)
	require.NoError(err)
	linkedWallets, err := evaluator.GetLinkedWallets(
		ctx,
		root.Address,
		walletLink,
		nil,
		nil,
		nil,
	)
	require.NoError(err)
	require.ElementsMatch([]common.Address{root.Address, hotWallet, coldWallet}, linkedWallets)

	coldWallet2 := common.HexToAddress("0x32e52d188600F27d12A65120160aA28b1108C050")
	coldWallet3 := common.HexToAddress("0xBda05058243FEf202FB4925b3877373396A08768")

	hotWallet2 := common.HexToAddress("0xca477fFcD9baa0E56B6fa5d7221D99f981A135C7")

	hotWalletLinkArg = base.IWalletLinkBaseLinkedWallet{
		Addr:      hotWallet2,
		Signature: []byte(""),
	}
	pendingTx, err = btc.DeployerBlockchain.TxPool.Submit(
		ctx,
		"LinkWalletToRootKey",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return walletLink.LinkWalletToRootKey(opts, hotWalletLinkArg, rootWalletLinkArg, big.NewInt(0))
		},
	)
	require.NoError(err)
	receipt, err = pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(uint64(1), receipt.Status)

	linkedWallets, err = evaluator.GetLinkedWallets(
		ctx,
		root.Address,
		walletLink,
		nil,
		nil,
		nil,
	)
	require.NoError(err)
	require.ElementsMatch(
		[]common.Address{root.Address, hotWallet, hotWallet2, coldWallet, coldWallet2, coldWallet3},
		linkedWallets,
	)
}
