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

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/contracts/base"
	"github.com/river-build/river/core/contracts/base/deploy"
	test_contracts "github.com/river-build/river/core/contracts/base/deploy"
	"github.com/river-build/river/core/xchain/client_simulator"
	xc_common "github.com/river-build/river/core/xchain/common"
	"github.com/river-build/river/core/xchain/server"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	node_config "github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	node_crypto "github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/testutils/testfmt"
	"github.com/stretchr/testify/require"

	contract_types "github.com/river-build/river/core/contracts/types"

	"github.com/river-build/river/core/contracts/types/test_util"
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
	clientSimBlockchain *node_crypto.Blockchain
	nodes               []*testNodeRecord
	stopBlockAutoMining func()

	// Addresses
	mockEntitlementGatedAddress      common.Address
	mockCrossChainEntitlementAddress common.Address
	entitlementCheckerAddress        common.Address
	walletLinkingAddress             common.Address

	// Contracts
	entitlementChecker *base.IEntitlementChecker
	walletLink         *base.WalletLink

	decoder *node_crypto.EvmErrorDecoder
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

	btc, err := node_crypto.NewBlockchainTestContext(
		ctx,
		crypto.TestParams{NumKeys: numNodes + 1, MineOnTx: true, AutoMine: true},
	)
	require.NoError(err)
	st.btc = btc
	st.clientSimBlockchain = st.btc.GetBlockchain(st.ctx, len(st.nodes))

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
	addr, _, _, err := test_contracts.DeployMockEntitlementChecker(
		auth,
		client,
		approvedNodeOperators,
	)
	st.require.NoError(err)

	st.entitlementCheckerAddress = addr
	iChecker, err := base.NewIEntitlementChecker(addr, client)
	st.require.NoError(err)
	st.entitlementChecker = iChecker

	// Deploy the mock entitlement gated contract
	addr, _, _, err = test_contracts.DeployMockEntitlementGated(
		auth,
		client,
		st.entitlementCheckerAddress,
	)
	st.require.NoError(err)
	st.mockEntitlementGatedAddress = addr

	// Deploy the mock cross chain entitlement contract
	addr, _, _, err = test_contracts.DeployMockCrossChainEntitlement(auth, client)
	st.require.NoError(err)
	st.mockCrossChainEntitlementAddress = addr

	// Deploy the wallet linking contract
	addr, _, _, err = test_contracts.DeployMockWalletLink(auth, client)
	st.require.NoError(err)
	st.walletLinkingAddress = addr
	walletLink, err := base.NewWalletLink(addr, client)
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
		"mockCrossChainEntitlement",
		st.mockCrossChainEntitlementAddress.Hex(),
		"walletLink",
		st.walletLinkingAddress.Hex(),
	)

	decoder, err := node_crypto.NewEVMErrorDecoder(base.IEntitlementCheckerMetaData, base.WalletLinkMetaData)
	st.decoder = decoder
}

func (st *serviceTester) AssertNoEVMError(err error) {
	ce, se, wrapped := st.decoder.DecodeEVMError(err)
	st.require.NoError(err, "EVM errors", ce, se, wrapped)
}

func (st *serviceTester) ClientSimulatorBlockchain() *node_crypto.Blockchain {
	return st.clientSimBlockchain
}

func (st *serviceTester) Close() {
	// Is this needed? Or is the cancel enough here? Do we need to cancel individual nodes?
	for _, node := range st.nodes {
		// if the node failed to start, it may not have a server
		if node.svr != nil {
			node.svr.Stop()
		} else {
			log := dlog.FromCtx(st.ctx)
			log.Warn("Skipping srv Stop, node wasn't started")
		}
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

	// Set on-chain configuration for supported xchain chain ids.
	st.btc.SetConfigValue(
		t,
		ctx,
		crypto.XChainBlockchainsConfigKey,
		crypto.ABIEncodeUint64Array([]uint64{ChainID}),
	)

	for i := 0; i < len(st.nodes); i++ {
		st.nodes[i] = &testNodeRecord{}
		bc := st.btc.GetBlockchain(st.ctx, i)

		// register node
		pendingTx, err := bc.TxPool.Submit(
			ctx,
			"RegisterNode",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return st.entitlementChecker.RegisterNode(opts, bc.Wallet.Address)
			},
		)

		st.AssertNoEVMError(err)
		receipt, err := pendingTx.Wait(ctx)
		if err != nil {
			log.Fatal(err)
		}

		if receipt.Status != node_crypto.TransactionResultSuccess {
			log.Fatal("unable to register node")
		}

		svr, err := server.New(st.ctx, st.Config(), bc, bc, i, nil)
		st.require.NoError(err)
		st.nodes[i].svr = svr
		st.nodes[i].address = bc.Wallet.Address
		go svr.Run(st.ctx)
	}
}

func (st *serviceTester) Config() *config.Config {
	cfg := &config.Config{
		BaseChain:  node_config.ChainConfig{},
		RiverChain: node_config.ChainConfig{},
		Chains:     fmt.Sprintf("%d:%s", ChainID, BaseRpcEndpoint),
		TestEntitlementContract: config.ContractConfig{
			Address: st.mockEntitlementGatedAddress,
		},
		EntitlementContract: config.ContractConfig{
			Address: st.entitlementCheckerAddress,
		},
		ArchitectContract: config.ContractConfig{
			Address: st.walletLinkingAddress,
		},
		RegistryContract: config.ContractConfig{
			Address: st.btc.RiverRegistryAddress,
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

	rootKeyWallet := base.IWalletLinkBaseLinkedWallet{
		Addr:      rootWallet.Address,
		Signature: rootKeySignature,
	}

	// Create Wallet IWalletLinkLinkedWallet
	hash, err = node_crypto.PackWithNonce(rootWallet.Address, rootKeyNonce.Uint64())
	st.require.NoError(err)
	nodeWalletSignature, err := wallet.SignHash(node_crypto.ToEthMessageHash(hash))
	nodeWalletSignature[64] += 27 // Transform V from 0/1 to 27/28
	nodeWallet := base.IWalletLinkBaseLinkedWallet{
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
	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		log.Fatal(err)
	}
	st.require.Equal(uint64(1), receipt.Status)
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

	count, err := st.entitlementChecker.GetNodeCount(nil)
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
	data base.IRuleEntitlementBaseRuleData,
	expected bool,
) {
	result, err := cs.EvaluateRuleData(ctx, cfg, data)
	require.NoError(err)
	require.Equal(expected, result)
}

func expectV2EntitlementCheckResult(
	require *require.Assertions,
	cs client_simulator.ClientSimulator,
	ctx context.Context,
	cfg *config.Config,
	data base.IRuleEntitlementBaseRuleDataV2,
	expected bool,
) {
	result, err := cs.EvaluateRuleDataV2(ctx, cfg, data)
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
		v2                  bool
		sentByRootKeyWallet bool
	}{
		"v1 request sent by root key wallet": {sentByRootKeyWallet: true},
		"v1 request sent by linked wallet":   {sentByRootKeyWallet: false},
		"v2 request sent by root key wallet": {
			v2:                  true,
			sentByRootKeyWallet: true,
		},
		"v2 request sent by linked wallet": {
			v2:                  true,
			sentByRootKeyWallet: false,
		},
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

			check := func(
				v1Check base.IRuleEntitlementBaseRuleData,
				expected bool,
			) {
				if tc.v2 {
					v2Check, err := contract_types.ConvertV1RuleDataToV2(ctx, &v1Check)
					require.NoError(err)
					expectV2EntitlementCheckResult(
						require,
						cs,
						ctx,
						cfg,
						*v2Check,
						expected,
					)
				} else {
					expectEntitlementCheckResult(
						require,
						cs,
						ctx,
						cfg,
						v1Check,
						expected,
					)
				}
			}

			// Expect no NFT minted for the client simulator wallet
			oneCheck := test_util.Erc721Check(ChainID, contractAddress, 1)
			check(oneCheck, false)
			// Mint an NFT for client simulator wallet.
			mintTokenForWallet(require, auth, st, erc721, cs.Wallet(), 1)

			// Check if the wallet a 1 balance of the NFT - should pass
			check(oneCheck, true)

			// Checking for balance of 2 should fail
			check(test_util.Erc721Check(ChainID, contractAddress, 2), false)

			// Create a set of 3 linked wallets using client simulator address.
			_, wallet1, wallet2, _ := generateLinkedWallets(ctx, require, tc.sentByRootKeyWallet, st, cs.Wallet())

			// Sanity check: balance of 4 across all 3 wallets should fail
			fourCheck := test_util.Erc721Check(ChainID, contractAddress, 4)
			check(fourCheck, false)

			// Mint 2 NFTs for wallet1.
			mintTokenForWallet(require, auth, st, erc721, wallet1, 2)

			// Mint 1 NFT for wallet2.
			mintTokenForWallet(require, auth, st, erc721, wallet2, 1)

			// Accumulated balance of 4 across all 3 wallets should now pass
			check(fourCheck, true)
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

func deployMockErc1155Contract(
	require *require.Assertions,
	st *serviceTester,
) (*bind.TransactOpts, common.Address, *test_contracts.MockErc1155) {
	// Deploy mock ERC1155 contract to anvil chain
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth, err := bind.NewKeyedTransactorWithChainID(anvilWallet.PrivateKeyStruct, big.NewInt(31337))
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)         // in wei
	auth.GasLimit = uint64(30_000_000) // in units

	contractAddress, txn, erc1155, err := test_contracts.DeployMockErc1155(auth, anvilClient)
	require.NoError(err)
	require.NotNil(xc_common.WaitForTransaction(anvilClient, txn), "Failed to mine ERC1155 contract deployment")
	return auth, contractAddress, erc1155
}

const (
	TokenGold   = 1
	TokenSilver = 2
	TokenBronze = 3
)

func mintErc1155TokensForWallet(
	require *require.Assertions,
	auth *bind.TransactOpts,
	st *serviceTester,
	erc1155 *test_contracts.MockErc1155,
	wallet *node_crypto.Wallet,
	tokenId int,
) {
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))
	var txn *types.Transaction
	var mintErr error
	switch tokenId {
	case TokenGold:
		txn, mintErr = erc1155.MintGold(auth, wallet.Address)
	case TokenSilver:
		txn, mintErr = erc1155.MintSilver(auth, wallet.Address)
	case TokenBronze:
		txn, mintErr = erc1155.MintBronze(auth, wallet.Address)
	default:
		require.FailNow("Invalid token id", "tokenId", tokenId)
	}
	st.AssertNoEVMError(mintErr)
	require.NotNil(xc_common.WaitForTransaction(anvilClient, txn), "Failed to mint token for ERC1155 contract")
}

func TestErc1155Entitlements(t *testing.T) {
	tests := map[string]struct {
		sentByRootKeyWallet bool
	}{
		"v2 request sent by root key wallet": {sentByRootKeyWallet: true},
		"v2 request sent by linked wallet":   {sentByRootKeyWallet: false},
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

			// Deploy mock ERC1155 contract to anvil chain
			auth, contractAddress, erc1155 := deployMockErc1155Contract(require, st)

			oneGoldCheck := test_util.Erc1155Check(ChainID, contractAddress, 1, TokenGold)
			expectV2EntitlementCheckResult(
				require,
				cs,
				ctx,
				cfg,
				oneGoldCheck,
				false,
			)

			// Mint 1 gold token for client simulator wallet
			mintErc1155TokensForWallet(require, auth, st, erc1155, cs.Wallet(), TokenGold)

			// Check for balance of 1 gold token should pass
			expectV2EntitlementCheckResult(
				require,
				cs,
				ctx,
				cfg,
				oneGoldCheck,
				true,
			)

			threeGoldCheck := test_util.Erc1155Check(ChainID, contractAddress, 3, TokenGold)
			oneSilverCheck := test_util.Erc1155Check(ChainID, contractAddress, 1, TokenSilver)

			// Create a set of 3 linked wallets using client simulator address.
			_, wallet1, wallet2, _ := generateLinkedWallets(ctx, require, tc.sentByRootKeyWallet, st, cs.Wallet())

			expectV2EntitlementCheckResult(
				require,
				cs,
				ctx,
				cfg,
				threeGoldCheck,
				false,
			)

			// Mint 1 gold token for wallet1
			mintErc1155TokensForWallet(require, auth, st, erc1155, wallet1, TokenGold)

			// Mint 1 gold token for wallet2
			mintErc1155TokensForWallet(require, auth, st, erc1155, wallet2, TokenGold)

			// Check for balance of 3 gold tokens should now pass
			expectV2EntitlementCheckResult(
				require,
				cs,
				ctx,
				cfg,
				threeGoldCheck,
				true,
			)
			// Sanity check: erc 1155 balance checks respect token ids.
			// Check for balance of 1 silver token, of token id 2, should fail.
			expectV2EntitlementCheckResult(
				require,
				cs,
				ctx,
				cfg,
				oneSilverCheck,
				false,
			)
		})
	}
}

func TestErc20Entitlements(t *testing.T) {
	tests := map[string]struct {
		v2                  bool
		sentByRootKeyWallet bool
	}{
		"v1 request sent by root key wallet": {sentByRootKeyWallet: true},
		"v1 request sent by linked wallet":   {sentByRootKeyWallet: false},
		"v2 request sent by root key wallet": {v2: true, sentByRootKeyWallet: true},
		"v2 request sent by linked wallet":   {v2: true, sentByRootKeyWallet: false},
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

			check := func(
				v1Check base.IRuleEntitlementBaseRuleData,
				expected bool,
			) {
				if tc.v2 {
					v2Check, err := contract_types.ConvertV1RuleDataToV2(ctx, &v1Check)
					require.NoError(err)
					expectV2EntitlementCheckResult(
						require,
						cs,
						ctx,
						cfg,
						*v2Check,
						expected,
					)
				} else {
					expectEntitlementCheckResult(
						require,
						cs,
						ctx,
						cfg,
						v1Check,
						expected,
					)
				}
			}

			// Check for balance of 1 should fail, as this wallet has no coins.
			oneCheck := test_util.Erc20Check(ChainID, contractAddress, 1)
			check(oneCheck, false)
			// Mint 10 tokens for the client simulator wallet.
			mintErc20TokensForWallet(require, auth, st, erc20, cs.Wallet(), 10)

			// Check for balance of 10 should pass.
			tenCheck := test_util.Erc20Check(ChainID, contractAddress, 10)
			check(tenCheck, true)

			// Checking for balance of 20 should fail
			twentyCheck := test_util.Erc20Check(ChainID, contractAddress, 20)
			check(twentyCheck, false)

			// Create a set of 3 linked wallets using client simulator address.
			_, wallet1, wallet2, _ := generateLinkedWallets(ctx, require, tc.sentByRootKeyWallet, st, cs.Wallet())

			// Sanity check: balance of 30 across all 3 wallets should fail
			thirtyCheck := test_util.Erc20Check(ChainID, contractAddress, 30)
			check(thirtyCheck, false)

			// Mint 19 tokens for wallet1.
			mintErc20TokensForWallet(require, auth, st, erc20, wallet1, 19)
			// Mint 1 token for wallet2.
			mintErc20TokensForWallet(require, auth, st, erc20, wallet2, 1)

			// Accumulated balance of 30 across all 3 wallets should now pass
			check(thirtyCheck, true)
		})
	}
}

func toggleEntitlement(
	require *require.Assertions,
	auth *bind.TransactOpts,
	crossChainEntitlement *deploy.MockCrossChainEntitlement,
	wallet *node_crypto.Wallet,
	id int64,
	response bool,
) {
	// Update nonce
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))

	// Toggle contract response
	txn, err := crossChainEntitlement.SetIsEntitled(auth, big.NewInt(id), wallet.Address, response)
	require.NoError(err)
	blockNum := xc_common.WaitForTransaction(anvilClient, txn)
	require.NotNil(blockNum)
}

func deployMockCrossChainEntitlement(
	require *require.Assertions,
	st *serviceTester,
) (*bind.TransactOpts, common.Address, *deploy.MockCrossChainEntitlement) {
	// Deploy mock crosschain entitlement contract to anvil chain
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth, err := bind.NewKeyedTransactorWithChainID(anvilWallet.PrivateKeyStruct, big.NewInt(31337))
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)         // in wei
	auth.GasLimit = uint64(30_000_000) // in units

	contractAddress, txn, crossChainEntitlement, err := deploy.DeployMockCrossChainEntitlement(
		auth,
		anvilClient,
	)
	require.NoError(err)
	require.NotNil(
		xc_common.WaitForTransaction(anvilClient, txn),
		"Failed to mine cross chain entitlement contract deployment",
	)
	return auth, contractAddress, crossChainEntitlement
}

func TestCrossChainEntitlements(t *testing.T) {
	tests := map[string]struct {
		sentByRootKeyWallet bool
	}{
		"v2 request sent by root key wallet": {sentByRootKeyWallet: true},
		"v2 request sent by linked wallet":   {sentByRootKeyWallet: false},
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

			// Deploy mock crosschain entitlement contract to anvil chain
			auth, contractAddress, crossChainEntitlement := deployMockCrossChainEntitlement(require, st)
			testfmt.Log(t, "Deployed crosschain entitlement contract", contractAddress.Hex(), ChainID)

			check := func(
				check base.IRuleEntitlementBaseRuleDataV2,
				result bool,
			) {
				expectV2EntitlementCheckResult(
					require,
					cs,
					ctx,
					cfg,
					check,
					result,
				)
			}

			// Initially the check should fail.
			isEntitledCheck := test_util.MockCrossChainEntitlementCheck(ChainID, contractAddress, big.NewInt(1))
			check(isEntitledCheck, false)

			// Toggle entitlemenet result for user's wallet
			toggleEntitlement(require, auth, crossChainEntitlement, cs.Wallet(), 1, true)

			// Check should now succeed.
			check(isEntitledCheck, true)

			// Create a set of 3 linked wallets using client simulator address.
			_, wallet1, wallet2, wallet3 := generateLinkedWallets(ctx, require, tc.sentByRootKeyWallet, st, cs.Wallet())

			for i, wallet := range []*node_crypto.Wallet{wallet1, wallet2, wallet3} {
				// Use a new id for each check
				id := int64(i) + 2
				isEntitledCheck = test_util.MockCrossChainEntitlementCheck(ChainID, contractAddress, big.NewInt(id))

				// Check should fail for all wallets.
				check(isEntitledCheck, false)

				// Toggle entitlement for a particular linked wallet
				toggleEntitlement(require, auth, crossChainEntitlement, wallet, id, true)

				// Check should now succeed for the wallet.
				check(isEntitledCheck, true)

				// Untoggle entitlement for the wallet
				toggleEntitlement(require, auth, crossChainEntitlement, wallet, id, false)
			}
		})
	}
}

func TestEthBalance(t *testing.T) {
	tests := map[string]struct {
		v2                  bool
		sentByRootKeyWallet bool
	}{
		"v1 request sent by root key wallet": {sentByRootKeyWallet: true},
		"v1 request sent by linked wallet":   {sentByRootKeyWallet: false},
		"v2 request sent by root key wallet": {v2: true, sentByRootKeyWallet: true},
		"v2 request sent by linked wallet":   {v2: true, sentByRootKeyWallet: false},
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

			cfg := st.Config()
			bc := st.ClientSimulatorBlockchain()
			cs, err := client_simulator.New(ctx, cfg, bc, bc.Wallet)
			require.NoError(err)
			cs.Start(ctx)
			defer cs.Stop()

			check := func(
				v1Check base.IRuleEntitlementBaseRuleData,
				expected bool,
			) {
				if tc.v2 {
					v2Check, err := contract_types.ConvertV1RuleDataToV2(ctx, &v1Check)
					require.NoError(err)
					expectV2EntitlementCheckResult(
						require,
						cs,
						ctx,
						cfg,
						*v2Check,
						expected,
					)
				} else {
					expectEntitlementCheckResult(
						require,
						cs,
						ctx,
						cfg,
						v1Check,
						expected,
					)
				}
			}

			// Explicitly set client simulator wallet balance to 1 Eth for covering gas fees.
			err = anvilClient.Client().
				CallContext(ctx, nil, "anvil_setBalance", cs.Wallet().Address, node_crypto.Eth_1.String())
			require.NoError(err)

			// Initially the check should fail.
			ethCheck := test_util.EthBalanceCheck(ChainID, node_crypto.Eth_2.Uint64())
			check(ethCheck, false)

			// Fund the client simulator wallet with 10 eth - should pass the check.
			err = anvilClient.Client().
				CallContext(ctx, nil, "anvil_setBalance", cs.Wallet().Address, node_crypto.Eth_10.String())
			require.NoError(err)

			// Check should now succeed.
			check(ethCheck, true)

			// Create a set of 3 linked wallets using client simulator address.
			rootKey, wallet1, wallet2, wallet3 := generateLinkedWallets(
				ctx,
				require,
				tc.sentByRootKeyWallet,
				st,
				cs.Wallet(),
			)

			// Set each wallet balance to 2 eth, bringing cumulative total over all wallets to 8 eth.
			// This amount should not pass a threshold of 10eth, but increasing any single wallet balance
			// to 4th would cause a 10eth check to pass.
			for _, wallet := range []*node_crypto.Wallet{rootKey, wallet1, wallet2, wallet3} {
				err = anvilClient.Client().
					CallContext(ctx, nil, "anvil_setBalance", wallet.Address, node_crypto.Eth_2.String())
				require.NoError(err)
			}

			eth10Check := test_util.EthBalanceCheck(ChainID, node_crypto.Eth_10.Uint64())

			for _, wallet := range []*node_crypto.Wallet{wallet1, wallet2, wallet3} {
				// Check should fail for all wallets.
				check(eth10Check, false)

				// Toggle entitlement for a particular linked wallet
				err = anvilClient.Client().
					CallContext(ctx, nil, "anvil_setBalance", wallet.Address, node_crypto.Eth_4.String())
				require.NoError(err)

				// Check should now succeed for the wallet.
				check(eth10Check, true)

				// Reset wallet balance.
				err = anvilClient.Client().
					CallContext(ctx, nil, "anvil_setBalance", wallet.Address, node_crypto.Eth_2.String())
				require.NoError(err)
			}
		})
	}
}
