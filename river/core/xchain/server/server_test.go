//go:build integration
// +build integration

package server_test

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"math/big"
	"testing"
	"time"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/xchain/client_simulator"
	xc_common "github.com/river-build/river/core/xchain/common"
	"github.com/river-build/river/core/xchain/contracts"
	test_contracts "github.com/river-build/river/core/xchain/contracts/test"
	"github.com/river-build/river/core/xchain/entitlement"
	"github.com/river-build/river/core/xchain/server"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/river-build/river/core/node/base/test"
	node_config "github.com/river-build/river/core/node/config"
	node_contracts "github.com/river-build/river/core/node/contracts"
	node_crypto "github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/stretchr/testify/require"
)

const (
	ChainID         = 31337
	BaseRpcEndpoint = "http://localhost:8545"
)

type testNodeRecord struct {
	svr     server.XChain
	address common.Address
}

type serviceTester struct {
	ctx                 context.Context
	cancel              context.CancelFunc
	require             *require.Assertions
	btc                 *node_crypto.BlockchainTestContext
	nodes               []*testNodeRecord
	stopBlockAutoMining func()

	// Addresses
	mockEntitlementGatedAddress  common.Address
	mockCustomEntitlementAddress common.Address
	entitlementCheckerAddress    common.Address
	walletLinkingAddress         common.Address

	// Contracts
	entitlementChecker *contracts.IEntitlementChecker
	walletLink         *contracts.IWalletLink

	decoder *node_contracts.EvmErrorDecoder
}

// Disable color output for console testing.
func noColorLogger() *slog.Logger {
	return slog.New(
		dlog.NewPrettyTextHandler(dlog.DefaultLogOut, &dlog.PrettyHandlerOptions{
			Colors: dlog.ColorMap_Disabled,
		}),
	)
}

func silentLogger() *slog.Logger {
	return slog.New(&dlog.NullHandler{})
}

func newServiceTester(numNodes int, require *require.Assertions) *serviceTester {
	ctx, cancel := test.NewTestContext()
	// Comment out to silence xchain and client simulator logs. Chain monitoring logs are still visible.
	ctx = dlog.CtxWithLog(ctx, noColorLogger())

	log := dlog.FromCtx(ctx)
	log.Info("Creating service tester")

	st := &serviceTester{
		ctx:     ctx,
		cancel:  cancel,
		require: require,
		nodes:   make([]*testNodeRecord, numNodes),
	}

	btc, err := node_crypto.NewBlockchainTestContext(ctx, numNodes+1, true)
	require.NoError(err)
	st.btc = btc

	st.deployXchainTestContracts()

	return st
}

func (st *serviceTester) deployXchainTestContracts() {

	var (
		log                   = dlog.FromCtx(st.ctx)
		approvedNodeOperators []common.Address
	)
	for _, w := range st.btc.Wallets {
		approvedNodeOperators = append(approvedNodeOperators, w.Address)
	}

	log.Info("Deploying contracts")
	client := st.btc.DeployerBlockchain.Client

	chainId, err := client.ChainID(st.ctx)
	st.require.NoError(err)

	auth, err := bind.NewKeyedTransactorWithChainID(st.btc.DeployerBlockchain.Wallet.PrivateKeyStruct, chainId)
	st.require.NoError(err)

	// Deploy the mock entitlement checker
	addr, _, _, err := contracts.DeployMockEntitlementChecker(auth, client, approvedNodeOperators, st.Config().GetContractVersion())
	st.require.NoError(err)

	st.entitlementCheckerAddress = addr
	iChecker, err := contracts.NewIEntitlementChecker(addr, client, st.Config().GetContractVersion())
	st.require.NoError(err)
	st.entitlementChecker = iChecker

	// Deploy the mock entitlement gated contract
	addr, _, _, err = contracts.DeployMockEntitlementGated(
		auth,
		client,
		st.entitlementCheckerAddress,
		st.Config().GetContractVersion(),
	)
	st.require.NoError(err)
	st.mockEntitlementGatedAddress = addr

	// Deploy the mock custom entitlement contract
	addr, _, _, err = contracts.DeployMockCustomEntitlement(auth, client, st.Config().GetContractVersion())
	st.require.NoError(err)
	st.mockCustomEntitlementAddress = addr

	// Deploy the wallet linking contract
	addr, _, _, err = contracts.DeployWalletLink(auth, client, st.Config().GetContractVersion())
	st.require.NoError(err)
	st.walletLinkingAddress = addr
	walletLink, err := contracts.NewIWalletLink(addr, client, st.Config().GetContractVersion())
	st.require.NoError(err)
	st.walletLink = walletLink

	// Commit all deploys
	st.btc.Commit(st.ctx)

	log = dlog.FromCtx(st.ctx)
	log.Info(
		"Contracts deployed",
		"entitlementChecker",
		st.entitlementCheckerAddress.Hex(),
		"mockEntitlementGated",
		st.mockEntitlementGatedAddress.Hex(),
		"mockCustomEntitlement",
		st.mockCustomEntitlementAddress.Hex(),
		"walletLink",
		st.walletLinkingAddress.Hex(),
	)

	decoder, err := node_contracts.NewEVMErrorDecoder(iChecker.GetMetadata(), walletLink.GetMetadata())
	st.decoder = decoder
}

func (st *serviceTester) AssertNoEVMError(err error) {
	ce, se, wrapped := st.decoder.DecodeEVMError(err)
	st.require.NoError(err, "EVM errors", ce, se, wrapped)
}

func (st *serviceTester) ClientSimulatorBlockchain() *node_crypto.Blockchain {
	return st.btc.GetBlockchain(st.ctx, len(st.nodes))
}

func (st *serviceTester) Close() {
	// Is this needed? Or is the cancel enough here? Do we need to cancel individual nodes?
	for _, node := range st.nodes {
		node.svr.Stop()
	}
	if st.stopBlockAutoMining != nil {
		st.stopBlockAutoMining()
	}
	st.cancel()
}

func (st *serviceTester) Start(t *testing.T) {
	ctx, cancel := context.WithCancel(st.ctx)
	done := make(chan struct{})
	st.stopBlockAutoMining = func() {
		cancel()
		<-done
	}

	// hack to ensure that the chain always produces blocks (automining=true)
	// commit on simulated backend with no pending txs can sometimes crash the simulator.
	// by having a pending tx with automining enabled we can work around that issue.
	go func() {
		blockPeriod := time.NewTicker(2 * time.Second)
		chainID, err := st.btc.Client().ChainID(st.ctx)
		if err != nil {
			log.Fatal(err)
		}
		signer := types.LatestSignerForChainID(chainID)
		for {
			select {
			case <-ctx.Done():
				close(done)
				return
			case <-blockPeriod.C:
				_, _ = st.btc.DeployerBlockchain.TxPool.Submit(
					ctx,
					"noop",
					func(opts *bind.TransactOpts) (*types.Transaction, error) {
						gp, err := st.btc.Client().SuggestGasPrice(ctx)
						if err != nil {
							return nil, err
						}
						tx := types.NewTransaction(
							opts.Nonce.Uint64(),
							st.btc.GetDeployerWallet().Address,
							big.NewInt(1),
							21000,
							gp,
							nil,
						)
						return types.SignTx(tx, signer, st.btc.GetDeployerWallet().PrivateKeyStruct)
					},
				)
			}
		}
	}()

	for i := 0; i < len(st.nodes); i++ {
		st.nodes[i] = &testNodeRecord{}
		bc := st.btc.GetBlockchain(st.ctx, i)

		// register node
		pendingTx, err := bc.TxPool.Submit(ctx, "RegisterNode", func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return st.entitlementChecker.RegisterNode(opts, bc.Wallet.Address)
		})

		require.NoError(t, err, "register node")
		receipt := <-pendingTx.Wait()
		if receipt == nil || receipt.Status != node_crypto.TransactionResultSuccess {
			log.Fatal("unable to register node")
		}

		svr, err := server.New(st.ctx, st.Config(), bc, i)
		st.require.NoError(err)
		st.nodes[i].svr = svr
		st.nodes[i].address = bc.Wallet.Address
		go svr.Run(st.ctx)
	}
}

func (st *serviceTester) Config() *config.Config {
	cfg := &config.Config{
		BaseChain:    node_config.ChainConfig{},
		RiverChain:   node_config.ChainConfig{},
		ChainsString: fmt.Sprintf("%d:%s", ChainID, BaseRpcEndpoint),
		TestEntitlementContract: config.ContractConfig{
			Address: st.mockEntitlementGatedAddress,
		},
		EntitlementContract: config.ContractConfig{
			Address: st.entitlementCheckerAddress,
		},
		ArchitectContract: config.ContractConfig{
			Address: st.walletLinkingAddress,
		},
		TestCustomEntitlementContract: config.ContractConfig{
			Address: st.mockCustomEntitlementAddress,
		},
		Log: config.LogConfig{
			NoColor: true,
		},
	}
	cfg.Init()
	return cfg
}

func (st *serviceTester) linkWalletToRootWallet(
	ctx context.Context,
	wallet *node_crypto.Wallet,
	rootWallet *node_crypto.Wallet,
) {
	// Root key nonce
	rootKeyNonce, err := st.walletLink.GetLatestNonceForRootKey(nil, rootWallet.Address)
	st.require.NoError(err)

	// Create RootKey IWalletLinkLinkedWallet
	hash, err := node_crypto.PackWithNonce(wallet.Address, rootKeyNonce.Uint64())
	st.require.NoError(err)
	rootKeySignature, err := rootWallet.SignHash(node_crypto.ToEthMessageHash(hash))
	rootKeySignature[64] += 27 // Transform V from 0/1 to 27/28

	rootKeyWallet := contracts.IWalletLinkBaseLinkedWallet{
		Addr:      rootWallet.Address,
		Signature: rootKeySignature,
	}

	// Create Wallet IWalletLinkLinkedWallet
	hash, err = node_crypto.PackWithNonce(rootWallet.Address, rootKeyNonce.Uint64())
	st.require.NoError(err)
	nodeWalletSignature, err := wallet.SignHash(node_crypto.ToEthMessageHash(hash))
	nodeWalletSignature[64] += 27 // Transform V from 0/1 to 27/28
	nodeWallet := contracts.IWalletLinkBaseLinkedWallet{
		Addr:      wallet.Address,
		Signature: nodeWalletSignature,
	}

	pendingTx, err := st.ClientSimulatorBlockchain().TxPool.Submit(
		ctx,
		"LinkWalletToRootKey",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return st.walletLink.LinkWalletToRootKey(opts, nodeWallet, rootKeyWallet, rootKeyNonce)
		},
	)

	st.AssertNoEVMError(err)
	receipt := <-pendingTx.Wait()
	st.require.Equal(uint64(1), receipt.Status)
}

func erc721Check(chainId uint64, contractAddress common.Address, threshold uint64) contracts.IRuleData {
	return contracts.IRuleData{
		Operations: []contracts.IRuleEntitlementOperation{
			{
				OpType: uint8(entitlement.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []contracts.IRuleEntitlementCheckOperation{
			{
				OpType:          uint8(entitlement.ERC721),
				ChainId:         new(big.Int).SetUint64(chainId),
				ContractAddress: contractAddress,
				Threshold:       new(big.Int).SetUint64(threshold),
			},
		},
	}
}

func erc20Check(chainId uint64, contractAddress common.Address, threshold uint64) contracts.IRuleData {
	return contracts.IRuleData{
		Operations: []contracts.IRuleEntitlementOperation{
			{
				OpType: uint8(entitlement.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []contracts.IRuleEntitlementCheckOperation{
			{
				OpType:  uint8(entitlement.ERC20),
				ChainId: new(big.Int).SetUint64(chainId),
				// Chainlink is a good ERC 20 token to use for testing because it's easy to get from faucets.
				ContractAddress: contractAddress,
				Threshold:       new(big.Int).SetUint64(threshold),
			},
		},
	}
}

func customEntitlementCheck(chainId uint64, contractAddress common.Address) contracts.IRuleData {
	return contracts.IRuleData{
		Operations: []contracts.IRuleEntitlementOperation{
			{
				OpType: uint8(entitlement.CHECK),
				Index:  0,
			},
		},
		CheckOperations: []contracts.IRuleEntitlementCheckOperation{
			{
				OpType:          uint8(entitlement.ISENTITLED),
				ChainId:         new(big.Int).SetUint64(chainId),
				ContractAddress: contractAddress,
				Threshold:       new(big.Int).SetUint64(0),
			},
		},
	}
}

// Expect base anvil chain available at localhost:8545.
// xchain needs an rpc url endpoint available for evaluating entitlements.
var (
	anvilWallet *node_crypto.Wallet
	anvilClient *ethclient.Client
)

func TestMain(m *testing.M) {
	ctx := context.Background()
	var err error
	anvilWallet, err = node_crypto.NewWallet(ctx)
	if err != nil {
		panic(err)
	}

	anvilClient, err = ethclient.Dial(BaseRpcEndpoint)
	if err != nil {
		// Expect a panic here if anvil base chain is not running.
		panic(err)
	}

	// Fund the wallet for deploying anvil contracts
	err = anvilClient.Client().
		CallContext(ctx, nil, "anvil_setBalance", anvilWallet.Address, node_crypto.Eth_100.String())
	if err != nil {
		panic(err)
	}

	m.Run()
}

func TestNodeIsRegistered(t *testing.T) {
	require := require.New(t)
	st := newServiceTester(5, require)
	defer st.Close()
	st.Start(t)

	count, err := st.entitlementChecker.NodeCount(nil)
	require.NoError(err)
	require.Equal(5, int(count.Int64()))

	for _, node := range st.nodes {
		valid, err := st.entitlementChecker.IsValidNode(nil, node.address)
		require.NoError(err)
		require.True(valid)
	}
}

func mintTokenForWallet(
	require *require.Assertions,
	auth *bind.TransactOpts,
	st *serviceTester,
	erc721 *test_contracts.MockErc721,
	wallet *node_crypto.Wallet,
	amount int64,
) {
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))
	txn, err := erc721.Mint(auth, wallet.Address, big.NewInt(amount))
	st.AssertNoEVMError(err)
	require.NotNil(xc_common.WaitForTransaction(anvilClient, txn))
}

func expectEntitlementCheckResult(
	require *require.Assertions,
	cs client_simulator.ClientSimulator,
	ctx context.Context,
	cfg *config.Config,
	data contracts.IRuleData,
	expected bool,
) {
	result, err := cs.EvaluateRuleData(ctx, cfg, data)
	require.NoError(err)
	require.Equal(expected, result)
}

func generateLinkedWallets(
	ctx context.Context,
	require *require.Assertions,
	simulatorAsRoot bool,
	st *serviceTester,
	csWallet *node_crypto.Wallet,
) (rootKey *node_crypto.Wallet, wallet1 *node_crypto.Wallet, wallet2 *node_crypto.Wallet, wallet3 *node_crypto.Wallet) {
	// Create a set of 3 linked wallets using client simulator address.
	var err error
	if simulatorAsRoot {
		rootKey = csWallet
		wallet3, err = node_crypto.NewWallet(ctx)
		require.NoError(err)
	} else {
		rootKey, err = node_crypto.NewWallet(ctx)
		require.NoError(err)
		wallet3 = csWallet
	}
	wallet1, err = node_crypto.NewWallet(ctx)
	require.NoError(err)
	wallet2, err = node_crypto.NewWallet(ctx)
	require.NoError(err)

	st.linkWalletToRootWallet(ctx, wallet1, rootKey)
	st.linkWalletToRootWallet(ctx, wallet2, rootKey)
	st.linkWalletToRootWallet(ctx, wallet3, rootKey)

	return rootKey, wallet1, wallet2, wallet3
}

func deployMockErc721Contract(
	require *require.Assertions,
	st *serviceTester,
) (*bind.TransactOpts, common.Address, *test_contracts.MockErc721) {
	// Deploy mock ERC721 contract to anvil chain
	auth, err := bind.NewKeyedTransactorWithChainID(anvilWallet.PrivateKeyStruct, big.NewInt(31337))
	require.NoError(err)

	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)         // in wei
	auth.GasLimit = uint64(30_000_000) // in units

	contractAddress, txn, erc721, err := test_contracts.DeployMockErc721(auth, anvilClient)
	st.AssertNoEVMError(err)
	require.NotEmpty(contractAddress)
	require.NotNil(erc721)
	blockNum := xc_common.WaitForTransaction(anvilClient, txn)
	require.NotNil(blockNum)
	return auth, contractAddress, erc721
}

func TestErc721Entitlements(t *testing.T) {
	tests := map[string]struct {
		sentByRootKeyWallet bool
	}{
		"request sent by root key wallet": {sentByRootKeyWallet: true},
		"request sent by linked wallet":   {sentByRootKeyWallet: false},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctx, cancel := test.NewTestContext()
			ctx = dlog.CtxWithLog(ctx, noColorLogger())
			defer cancel()

			require := require.New(t)
			st := newServiceTester(5, require)
			defer st.Close()
			st.Start(t)

			bc := st.ClientSimulatorBlockchain()
			cfg := st.Config()
			cs, err := client_simulator.New(ctx, cfg, bc, bc.Wallet)
			require.NoError(err)
			cs.Start(ctx)
			defer cs.Stop()

			// Deploy mock ERC721 contract to anvil chain
			auth, contractAddress, erc721 := deployMockErc721Contract(require, st)

			// Expect no NFT minted for the client simulator wallet
			expectEntitlementCheckResult(require, cs, ctx, cfg, erc721Check(ChainID, contractAddress, 1), false)

			// Mint an NFT for client simulator wallet.
			mintTokenForWallet(require, auth, st, erc721, cs.Wallet(), 1)

			// Check if the wallet a 1 balance of the NFT - should pass
			expectEntitlementCheckResult(require, cs, ctx, cfg, erc721Check(ChainID, contractAddress, 1), true)

			// Checking for balance of 2 should fail
			expectEntitlementCheckResult(require, cs, ctx, cfg, erc721Check(ChainID, contractAddress, 2), false)

			// Create a set of 3 linked wallets using client simulator address.
			_, wallet1, wallet2, _ := generateLinkedWallets(ctx, require, tc.sentByRootKeyWallet, st, cs.Wallet())

			// Sanity check: balance of 4 across all 3 wallets should fail
			expectEntitlementCheckResult(require, cs, ctx, cfg, erc721Check(ChainID, contractAddress, 4), false)

			// Mint 2 NFTs for wallet1.
			mintTokenForWallet(require, auth, st, erc721, wallet1, 2)

			// Mint 1 NFT for wallet2.
			mintTokenForWallet(require, auth, st, erc721, wallet2, 1)

			// Accumulated balance of 4 across all 3 wallets should now pass
			expectEntitlementCheckResult(require, cs, ctx, cfg, erc721Check(ChainID, contractAddress, 4), true)
		})
	}
}

func mintErc20TokensForWallet(
	require *require.Assertions,
	auth *bind.TransactOpts,
	st *serviceTester,
	erc20 *test_contracts.MockErc20,
	wallet *node_crypto.Wallet,
	amount int64,
) {
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))
	txn, err := erc20.Mint(auth, wallet.Address, big.NewInt(amount))
	st.AssertNoEVMError(err)
	require.NotNil(xc_common.WaitForTransaction(anvilClient, txn))
}

func deployMockErc20Contract(
	require *require.Assertions,
	st *serviceTester,
) (*bind.TransactOpts, common.Address, *test_contracts.MockErc20) {
	// Deploy mock ERC20 contract to anvil chain
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth, err := bind.NewKeyedTransactorWithChainID(anvilWallet.PrivateKeyStruct, big.NewInt(31337))
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)         // in wei
	auth.GasLimit = uint64(30_000_000) // in units

	contractAddress, txn, erc20, err := test_contracts.DeployMockErc20(auth, anvilClient, "MockERC20", "M20")
	require.NoError(err)
	require.NotNil(xc_common.WaitForTransaction(anvilClient, txn), "Failed to mine ERC20 contract deployment")
	return auth, contractAddress, erc20
}

func TestErc20Entitlements(t *testing.T) {
	tests := map[string]struct {
		sentByRootKeyWallet bool
	}{
		"request sent by root key wallet": {sentByRootKeyWallet: true},
		"request sent by linked wallet":   {sentByRootKeyWallet: false},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctx, cancel := test.NewTestContext()
			defer cancel()

			require := require.New(t)
			st := newServiceTester(5, require)
			defer st.Close()
			st.Start(t)

			cfg := st.Config()
			bc := st.ClientSimulatorBlockchain()
			cs, err := client_simulator.New(ctx, cfg, bc, bc.Wallet)
			require.NoError(err)
			cs.Start(ctx)
			defer cs.Stop()

			// Deploy mock ERC20 contract to anvil chain
			auth, contractAddress, erc20 := deployMockErc20Contract(require, st)

			// Check for balance of 1 should fail, as this wallet has no coins.
			expectEntitlementCheckResult(require, cs, ctx, cfg, erc20Check(ChainID, contractAddress, 1), false)

			// Mint 10 tokens for the client simulator wallet.
			mintErc20TokensForWallet(require, auth, st, erc20, cs.Wallet(), 10)

			// Check for balance of 10 should pass.
			expectEntitlementCheckResult(require, cs, ctx, cfg, erc20Check(ChainID, contractAddress, 10), true)

			// Checking for balance of 20 should fail
			expectEntitlementCheckResult(require, cs, ctx, cfg, erc20Check(ChainID, contractAddress, 20), false)

			// Create a set of 3 linked wallets using client simulator address.
			_, wallet1, wallet2, _ := generateLinkedWallets(ctx, require, tc.sentByRootKeyWallet, st, cs.Wallet())

			// Sanity check: balance of 30 across all 3 wallets should fail
			expectEntitlementCheckResult(require, cs, ctx, cfg, erc20Check(ChainID, contractAddress, 30), false)

			// Mint 19 tokens for wallet1.
			mintErc20TokensForWallet(require, auth, st, erc20, wallet1, 19)
			// Mint 1 token for wallet2.
			mintErc20TokensForWallet(require, auth, st, erc20, wallet2, 1)

			// Accumulated balance of 30 across all 3 wallets should now pass
			expectEntitlementCheckResult(require, cs, ctx, cfg, erc20Check(ChainID, contractAddress, 30), true)
		})
	}
}

func toggleEntitlement(
	require *require.Assertions,
	auth *bind.TransactOpts,
	customEntitlement *contracts.MockCustomEntitlement,
	wallet *node_crypto.Wallet,
	response bool,
) {
	// Update nonce
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))

	// Toggle contract response
	txn, err := customEntitlement.SetEntitled(auth, []common.Address{wallet.Address}, response)
	require.NoError(err)
	blockNum := xc_common.WaitForTransaction(anvilClient, txn)
	require.NotNil(blockNum)
}

func deployMockCustomEntitlement(
	require *require.Assertions,
	st *serviceTester,
) (*bind.TransactOpts, common.Address, *contracts.MockCustomEntitlement) {
	// Deploy mock custom entitlement contract to anvil chain
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth, err := bind.NewKeyedTransactorWithChainID(anvilWallet.PrivateKeyStruct, big.NewInt(31337))
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)         // in wei
	auth.GasLimit = uint64(30_000_000) // in units

	contractAddress, txn, customEntitlement, err := contracts.DeployMockCustomEntitlement(
		auth,
		anvilClient,
		st.Config().GetContractVersion(),
	)
	require.NoError(err)
	require.NotNil(
		xc_common.WaitForTransaction(anvilClient, txn),
		"Failed to mine custom entitlement contract deployment",
	)
	return auth, contractAddress, customEntitlement
}

func TestCustomEntitlements(t *testing.T) {
	tests := map[string]struct {
		sentByRootKeyWallet bool
	}{
		"request sent by root key wallet": {sentByRootKeyWallet: true},
		"request sent by linked wallet":   {sentByRootKeyWallet: false},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctx, cancel := test.NewTestContext()
			defer cancel()

			require := require.New(t)
			st := newServiceTester(5, require)
			defer st.Close()
			st.Start(t)

			cfg := st.Config()
			bc := st.ClientSimulatorBlockchain()
			cs, err := client_simulator.New(ctx, cfg, bc, bc.Wallet)
			require.NoError(err)
			cs.Start(ctx)
			defer cs.Stop()

			// Deploy mock custom entitlement contract to anvil chain
			auth, contractAddress, customEntitlement := deployMockCustomEntitlement(require, st)
			t.Log("Deployed custom entitlement contract", contractAddress.Hex(), ChainID)

			// Initially the check should fail.
			customCheck := customEntitlementCheck(ChainID, contractAddress)
			t.Log("Checking entitlement for client simulator wallet", customCheck)
			expectEntitlementCheckResult(require, cs, ctx, cfg, customCheck, false)

			toggleEntitlement(require, auth, customEntitlement, cs.Wallet(), true)

			// Check should now succeed.
			expectEntitlementCheckResult(require, cs, ctx, cfg, customCheck, true)

			// Untoggle entitlement for client simulator wallet
			toggleEntitlement(require, auth, customEntitlement, cs.Wallet(), false)

			// Create a set of 3 linked wallets using client simulator address.
			_, wallet1, wallet2, wallet3 := generateLinkedWallets(ctx, require, tc.sentByRootKeyWallet, st, cs.Wallet())

			for _, wallet := range []*node_crypto.Wallet{wallet1, wallet2, wallet3} {
				// Check should fail for all wallets.
				expectEntitlementCheckResult(require, cs, ctx, cfg, customCheck, false)

				// Toggle entitlement for a particular linked wallet
				toggleEntitlement(require, auth, customEntitlement, wallet, true)

				// Check should now succeed for the wallet.
				expectEntitlementCheckResult(require, cs, ctx, cfg, customCheck, true)

				// Untoggle entitlement for the wallet
				toggleEntitlement(require, auth, customEntitlement, wallet, false)
			}
		})
	}
}
