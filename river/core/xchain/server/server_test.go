//go:build integration
// +build integration

package server_test

import (
	"context"
	"core/xchain/client_simulator"
	xc_common "core/xchain/common"
	"core/xchain/config"
	"core/xchain/contracts"
	tc "core/xchain/contracts/test"
	"core/xchain/entitlement"
	"core/xchain/server"
	"log"
	"log/slog"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/node/base/test"
	node_config "github.com/river-build/river/core/node/config"
	node_crypto "github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	infra "github.com/river-build/river/core/node/infra/config"
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

	mockEntitlementGatedAddress  common.Address
	mockCustomEntitlementAddress common.Address
	entitlementCheckerAddress    common.Address

	entitlementChecker *contracts.IEntitlementChecker
}

// Disable color output for console testing.
func noColorLogger() *slog.Logger {
	return slog.New(
		dlog.NewPrettyTextHandler(dlog.DefaultLogOut, &dlog.PrettyHandlerOptions{
			Colors: dlog.ColorMap_Disabled,
		}),
	)
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

	btc, err := node_crypto.NewBlockchainTestContext(ctx, numNodes+1)
	require.NoError(err)
	st.btc = btc

	st.btc.DeployerBlockchain.TxPool.SetOnSubmitHandler(func() {
		log.Info("Auto-mining block (deployer)")
		st.btc.Commit()
	})

	st.deployXchainTestContracts()

	return st
}

func (st *serviceTester) deployXchainTestContracts() {
	log := dlog.FromCtx(st.ctx)
	log.Info("Deploying contracts")
	client := st.btc.DeployerBlockchain.Client

	chainId, err := client.ChainID(st.ctx)
	st.require.NoError(err)

	auth, err := bind.NewKeyedTransactorWithChainID(st.btc.DeployerBlockchain.Wallet.PrivateKeyStruct, chainId)
	st.require.NoError(err)

	// Deploy the entitlement checker
	addr, _, _, err := contracts.DeployEntitlementChecker(auth, client, st.Config().GetContractVersion())
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

	st.btc.Commit()

	log = dlog.FromCtx(st.ctx)
	log.Info(
		"Contracts deployed",
		"entitlementChecker",
		st.entitlementCheckerAddress.Hex(),
		"mockEntitlementGated",
		st.mockEntitlementGatedAddress.Hex(),
		"mockCustomEntitlement",
		st.mockCustomEntitlementAddress.Hex(),
	)
}

func (st *serviceTester) ClientSimulatorBlockchain() *node_crypto.Blockchain {
	return st.btc.GetBlockchain(st.ctx, len(st.nodes), true)
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
		bc := st.btc.GetBlockchain(st.ctx, i, true)

		// register node
		pendingTx, err := bc.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
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
		ChainsString: "1:ws://localhost:8545",
		TestingContract: config.ContractConfig{
			Address: st.mockEntitlementGatedAddress.String(),
		},
		EntitlementContract: config.ContractConfig{
			Address: st.entitlementCheckerAddress.String(),
		},
		TestCustomEntitlementContract: config.ContractConfig{
			Address: st.mockCustomEntitlementAddress.String(),
		},
		Log: infra.LogConfig{
			NoColor: true,
		},
	}
	cfg.Init()
	return cfg
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
	baseWebsocketURL = "ws://localhost:8545"
	anvilWallet      *node_crypto.Wallet
	anvilClient      *ethclient.Client
)

func TestMain(m *testing.M) {
	ctx := context.Background()
	var err error
	anvilWallet, err = node_crypto.NewWallet(ctx)
	if err != nil {
		panic(err)
	}

	anvilClient, err = ethclient.Dial(baseWebsocketURL)
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

func TestErc721Entitlements(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	ctx = dlog.CtxWithLog(ctx, noColorLogger())
	defer cancel()

	require := require.New(t)
	st := newServiceTester(5, require)
	defer st.Close()
	st.Start(t)

	bc := st.ClientSimulatorBlockchain()
	cs, err := client_simulator.New(ctx, st.Config(), bc, bc.Wallet)
	require.NoError(err)
	cs.Start(ctx)
	defer cs.Stop()

	// Deploy mock ERC721 contract to anvil chain
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth, err := bind.NewKeyedTransactorWithChainID(anvilWallet.PrivateKeyStruct, big.NewInt(31337))
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)         // in wei
	auth.GasLimit = uint64(30_000_000) // in units

	contractAddress, txn, erc721, err := tc.DeployMockErc721(auth, anvilClient)
	require.NoError(err)
	require.NotEmpty(contractAddress)
	require.NotNil(erc721)
	blockNum := xc_common.WaitForTransaction(anvilClient, txn)
	require.NotNil(blockNum)

	// Expect no NFT minted for the client simulator wallet
	result, err := cs.EvaluateRuleData(ctx, erc721Check(1, contractAddress, 1))
	require.NoError(err)
	require.False(result)

	// Update nonce
	nonce, err = anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))

	// Mint an NFT for simulator wallet.
	txn, err = erc721.Mint(auth, cs.Wallet().Address, big.NewInt(1))
	require.NoError(err)
	require.NotNil(xc_common.WaitForTransaction(anvilClient, txn))

	// Sanity check: Wallet has a balance of 1
	balance, err := erc721.BalanceOf(nil, cs.Wallet().Address)
	require.NoError(err)
	require.Equal(big.NewInt(1), balance)

	// Check if the wallet a 1 balance of the NFT - should pass
	result, err = cs.EvaluateRuleData(ctx, erc721Check(1, contractAddress, 1))
	require.NoError(err)
	require.True(result)

	// Checking for balance of 2 should fail
	result, err = cs.EvaluateRuleData(ctx, erc721Check(1, contractAddress, 2))
	require.NoError(err)
	require.False(result)
}

func TestErc20Entitlements(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()

	require := require.New(t)
	st := newServiceTester(5, require)
	defer st.Close()
	st.Start(t)

	bc := st.ClientSimulatorBlockchain()
	cs, err := client_simulator.New(ctx, st.Config(), bc, bc.Wallet)
	require.NoError(err)
	cs.Start(ctx)
	defer cs.Stop()

	// Deploy mock ERC20 contract to anvil chain
	nonce, err := anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth, err := bind.NewKeyedTransactorWithChainID(anvilWallet.PrivateKeyStruct, big.NewInt(31337))
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)         // in wei
	auth.GasLimit = uint64(30_000_000) // in units

	contractAddress, txn, erc20, err := tc.DeployMockErc20(auth, anvilClient, "MockERC20", "M20")
	require.NoError(err)
	require.NotEmpty(contractAddress)
	require.NotNil(erc20)
	require.NotNil(xc_common.WaitForTransaction(anvilClient, txn), "Failed to mine ERC20 contract deployment")

	// Check for balance of 1 should fail, as this wallet has no coins.
	result, err := cs.EvaluateRuleData(ctx, erc20Check(1, contractAddress, 1))
	require.NoError(err)
	require.False(result)

	// Update nonce
	nonce, err = anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))

	// Mint 10 tokens
	txn, err = erc20.Mint(auth, cs.Wallet().Address, big.NewInt(10))
	require.NoError(err)
	require.NotNil(xc_common.WaitForTransaction(anvilClient, txn), "Failed to mine ERC20 mint")

	// Check if the wallet a balance of 10 should succeed
	result, err = cs.EvaluateRuleData(ctx, erc721Check(1, contractAddress, 10))
	require.NoError(err)
	require.True(result)

	// Checking for balance of 20 should fail
	result, err = cs.EvaluateRuleData(ctx, erc721Check(1, contractAddress, 20))
	require.NoError(err)
	require.False(result)
}

func TestCustomEntitlements(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()

	require := require.New(t)
	st := newServiceTester(5, require)
	defer st.Close()
	st.Start(t)

	bc := st.ClientSimulatorBlockchain()
	cs, err := client_simulator.New(ctx, st.Config(), bc, bc.Wallet)
	require.NoError(err)
	cs.Start(ctx)
	defer cs.Stop()

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
	require.NotEmpty(contractAddress)
	require.NotNil(customEntitlement)
	require.NotNil(
		xc_common.WaitForTransaction(anvilClient, txn),
		"Failed to mine custom entitlement contract deployment",
	)

	// Initially the check should fail.
	customCheck := customEntitlementCheck(1, contractAddress)
	result, err := cs.EvaluateRuleData(ctx, customCheck)
	require.NoError(err)
	require.False(result)

	// Update nonce
	nonce, err = anvilClient.PendingNonceAt(context.Background(), anvilWallet.Address)
	require.NoError(err)
	auth.Nonce = big.NewInt(int64(nonce))

	// Toggle contract response
	txn, err = customEntitlement.SetEntitled(auth, []common.Address{cs.Wallet().Address}, true)
	require.NoError(err)
	xc_common.WaitForTransaction(anvilClient, txn)

	// Check should now succeed.
	result, err = cs.EvaluateRuleData(ctx, customCheck)
	require.NoError(err)
	require.True(result)
}
