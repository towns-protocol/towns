package crypto

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"os"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/ethclient/simulated"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/goleak"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/contracts/river"
	"github.com/river-build/river/core/contracts/river/deploy"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
)

var (
	Eth_1   = new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)
	Eth_2   = new(big.Int).Mul(Eth_1, big.NewInt(2))
	Eth_4   = new(big.Int).Mul(Eth_1, big.NewInt(4))
	Eth_10  = new(big.Int).Exp(big.NewInt(10), big.NewInt(19), nil)
	Eth_100 = new(big.Int).Exp(big.NewInt(10), big.NewInt(20), nil)
)

type autoMiningClientWrapper struct {
	BlockchainClient
	onTx func(context.Context, *types.Transaction) error
}

func (w *autoMiningClientWrapper) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	err := w.BlockchainClient.SendTransaction(ctx, tx)
	if err != nil {
		return err
	}
	if w.onTx == nil {
		return nil
	} else {
		return w.onTx(ctx, tx)
	}
}

type TestParams struct {
	NumKeys         int
	MineOnTx        bool
	AutoMine        bool
	NoDeployer      bool
	NoOnChainConfig bool
}

type BlockchainTestContext struct {
	Params TestParams

	backendMutex sync.RWMutex
	Backend      *simulated.Backend
	EthClient    *ethclient.Client
	RemoteNode   bool
	BcClient     BlockchainClient

	Wallets              []*Wallet
	OnChainConfig        OnChainConfiguration
	RiverRegistryAddress common.Address
	NodeRegistry         *river.NodeRegistryV1
	StreamRegistry       *river.StreamRegistryV1
	Configuration        *river.RiverConfigV1
	ChainId              *big.Int
	DeployerBlockchain   *Blockchain
}

func initSimulated(ctx context.Context, numKeys int) ([]*Wallet, *simulated.Backend, error) {
	wallets := make([]*Wallet, numKeys)
	genesisAlloc := map[common.Address]types.Account{}
	var err error
	for i := 0; i < numKeys; i++ {
		wallets[i], err = NewWallet(ctx)
		if err != nil {
			return nil, nil, err
		}
		genesisAlloc[wallets[i].Address] = types.Account{Balance: Eth_100}
	}

	backend := simulated.NewBackend(genesisAlloc, simulated.WithBlockGasLimit(30_000_000))
	return wallets, backend, nil
}

func initRemoteNode(
	ctx context.Context,
	url string,
	seedWalletPrivateKey string,
	numKeys int,
) ([]*Wallet, *ethclient.Client, error) {
	if len(seedWalletPrivateKey) >= 2 && seedWalletPrivateKey[0] == '0' &&
		(seedWalletPrivateKey[1] == 'x' || seedWalletPrivateKey[1] == 'X') {
		seedWalletPrivateKey = seedWalletPrivateKey[2:]
	}
	seederPrivateKey, err := crypto.HexToECDSA(seedWalletPrivateKey)
	if err != nil {
		return nil, nil, err
	}
	seederAddress := crypto.PubkeyToAddress(seederPrivateKey.PublicKey)

	client, err := ethclient.DialContext(ctx, url)
	if err != nil {
		return nil, nil, err
	}

	chainID, err := client.ChainID(ctx)
	if err != nil {
		return nil, nil, err
	}
	signer := types.LatestSignerForChainID(chainID)

	nonce, err := client.PendingNonceAt(ctx, seederAddress)
	if err != nil {
		return nil, nil, err
	}

	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		return nil, nil, err
	}

	// fund accounts
	wallets := make([]*Wallet, numKeys)
	var lastFundTx *types.Transaction
	for i := 0; i < numKeys; i++ {
		wallets[i], err = NewWallet(ctx)
		if err != nil {
			return nil, nil, err
		}

		tx := types.NewTx(&types.LegacyTx{
			Nonce:    nonce,
			To:       &wallets[i].Address,
			Value:    Eth_100,
			Gas:      21000,
			GasPrice: gasPrice,
		})

		tx, err := types.SignTx(tx, signer, seederPrivateKey)
		if err != nil {
			return nil, nil, err
		}

		if err := client.SendTransaction(ctx, tx); err != nil {
			return nil, nil, err
		}

		lastFundTx = tx
		nonce++
	}

	// wait for all fund txs to be mined
	for {
		<-time.After(25 * time.Millisecond)
		receipt, err := client.TransactionReceipt(ctx, lastFundTx.Hash())
		if receipt != nil && receipt.Status == TransactionResultSuccess {
			break
		} else if receipt != nil && receipt.Status == 0 {
			return nil, nil, RiverError(Err_INTERNAL, "could not fund wallet")
		} else if !errors.Is(err, ethereum.NotFound) {
			return nil, nil, err
		}
	}

	return wallets, client, nil
}

func initAnvil(ctx context.Context, url string, numKeys int) ([]*Wallet, *ethclient.Client, error) {
	client, err := ethclient.DialContext(ctx, url)
	if err != nil {
		return nil, nil, err
	}

	wallets := make([]*Wallet, numKeys)
	for i := 0; i < numKeys; i++ {
		wallets[i], err = NewWallet(ctx)
		if err != nil {
			return nil, nil, err
		}

		err = client.Client().CallContext(ctx, nil, "anvil_setBalance", wallets[i].Address, Eth_100.String())
		if err != nil {
			return nil, nil, err
		}
	}

	return wallets, client, nil
}

func NewBlockchainTestContext(ctx context.Context, params TestParams) (*BlockchainTestContext, error) {
	// Add one for deployer
	numKeys := params.NumKeys + 1

	wallets, backend, ethClient, isRemote, err := initChainContext(ctx, numKeys)
	if err != nil {
		return nil, err
	}

	var client BlockchainClient
	client = ethClient
	if backend != nil {
		client = NewWrappedSimulatedClient(backend.Client())
	}

	chainId, err := client.ChainID(ctx)
	if err != nil {
		return nil, err
	}

	btc := &BlockchainTestContext{
		Params:     params,
		Backend:    backend,
		EthClient:  ethClient,
		RemoteNode: isRemote,
		Wallets:    wallets,
		ChainId:    chainId,
		BcClient:   client,
	}

	if params.MineOnTx {
		client = &autoMiningClientWrapper{
			BlockchainClient: client,
			onTx: func(ctx context.Context, tx *types.Transaction) error {
				for range 20 {
					if err := btc.mineBlock(ctx); err != nil {
						return err
					}
					receipt, err := client.TransactionReceipt(ctx, tx.Hash())
					if receipt != nil {
						return nil
					}
					if !errors.Is(err, ethereum.NotFound) {
						return err
					}
					<-time.After(5 * time.Millisecond)
				}
				return RiverError(Err_INTERNAL, "auto mining failed to include tx in block", "tx", tx.Hash())
			},
		}
	}
	btc.BcClient = client

	if params.AutoMine && btc.Backend != nil {
		go func() {
			for {
				select {
				case <-ctx.Done():
					return
				case <-time.After(50 * time.Millisecond):
					_ = btc.mineBlock(ctx)
				}
			}
		}()
	}

	auth, err := bind.NewKeyedTransactorWithChainID(wallets[len(wallets)-1].PrivateKeyStruct, chainId)
	if err != nil {
		return nil, err
	}

	btc.RiverRegistryAddress, _, _, err = deploy.DeployMockRiverRegistry(
		auth,
		client,
		[]common.Address{wallets[len(wallets)-1].Address},
	)
	if err != nil {
		return nil, err
	}

	btc.NodeRegistry, err = river.NewNodeRegistryV1(btc.RiverRegistryAddress, client)
	if err != nil {
		return nil, err
	}

	btc.StreamRegistry, err = river.NewStreamRegistryV1(btc.RiverRegistryAddress, client)
	if err != nil {
		return nil, err
	}

	btc.Configuration, err = river.NewRiverConfigV1(btc.RiverRegistryAddress, client)
	if err != nil {
		return nil, err
	}

	// Add deployer as operator so it can register nodes
	if !params.NoDeployer {
		btc.DeployerBlockchain = makeTestBlockchain(ctx, wallets[len(wallets)-1], client)
	}

	// commit the river registry deployment transaction
	if !params.MineOnTx {
		if err := btc.mineBlock(ctx); err != nil {
			return nil, err
		}
	}

	if !params.NoOnChainConfig {
		blockNum := btc.BlockNum(ctx)
		btc.OnChainConfig, err = NewOnChainConfig(
			ctx, btc.Client(), btc.RiverRegistryAddress, blockNum, btc.DeployerBlockchain.ChainMonitor)
		if err != nil {
			return nil, err
		}
	}

	return btc, nil
}

func initChainContext(
	ctx context.Context,
	numKeys int,
) ([]*Wallet, *simulated.Backend, *ethclient.Client, bool, error) {
	var (
		remoteNodeURL     = os.Getenv("RIVER_REMOTE_NODE_URL")
		remoteFundAccount = os.Getenv("RIVER_REMOTE_NODE_FUND_PRIVATE_KEY")
		anvilUrl          = os.Getenv("RIVER_TEST_ANVIL_URL")
		remoteNode        = remoteNodeURL != "" && remoteFundAccount != ""
	)

	if remoteNode {
		wallets, client, err := initRemoteNode(ctx, remoteNodeURL, remoteFundAccount, numKeys)
		return wallets, nil, client, true, err
	} else if anvilUrl != "" {
		wallets, client, err := initAnvil(ctx, anvilUrl, numKeys)
		return wallets, nil, client, false, err
	}

	wallets, backend, err := initSimulated(ctx, numKeys)
	if err != nil {
		return nil, nil, nil, false, err
	}

	return wallets, backend, nil, false, nil
}

// SetNextBlockBaseFee sets the base fee of the next blocks. Only supported for Anvil chains!
func (c *BlockchainTestContext) SetNextBlockBaseFee(nextBlockBaseFee *big.Int) error {
	if !c.IsAnvil() {
		panic("SetGasPrice is only supported for Anvil chains")
	}
	return c.EthClient.Client().Call(nil, "anvil_setNextBlockBaseFeePerGas", nextBlockBaseFee)
}

func (c *BlockchainTestContext) mineBlock(ctx context.Context) error {
	if c.RemoteNode {
		ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
		defer cancel()

		head, err := c.EthClient.HeaderByNumber(ctx, nil)
		if err != nil {
			return err
		}

		for {
			<-time.After(500 * time.Millisecond)
			newHead, err := c.EthClient.HeaderByNumber(ctx, nil)
			if err != nil {
				return err
			}
			if newHead.Number.Cmp(head.Number) > 0 {
				return nil
			}
		}
	}
	c.backendMutex.Lock()
	defer c.backendMutex.Unlock()

	if c.Backend != nil {
		c.Backend.Commit()
		return nil
	} else if c.EthClient != nil {
		return c.EthClient.Client().Call(nil, "evm_mine")
	} else {
		return nil
	}
}

func (c *BlockchainTestContext) Close() {
	c.backendMutex.Lock()
	defer c.backendMutex.Unlock()

	if c.DeployerBlockchain != nil {
		c.DeployerBlockchain.Close()
	}
	if c.Backend != nil {
		_ = c.Backend.Close()
		c.Backend = nil
	}
	if c.EthClient != nil {
		c.EthClient.Close()
	}
}

func (c *BlockchainTestContext) Commit(ctx context.Context) {
	err := c.mineBlock(ctx)
	if err != nil {
		panic(err)
	}
}

func (c *BlockchainTestContext) Client() BlockchainClient {
	return c.BcClient
}

func (c *BlockchainTestContext) IsAnvil() bool {
	return c.EthClient != nil
}

func (c *BlockchainTestContext) AnvilAutoMineEnabled() bool {
	if !c.IsAnvil() || c.IsRemote() {
		return false
	}

	var autoMine bool
	if err := c.EthClient.Client().Call(&autoMine, "anvil_getAutomine"); err != nil {
		panic(err)
	}
	return autoMine
}

func (c *BlockchainTestContext) IsSimulated() bool {
	return c.Backend != nil && !c.RemoteNode
}

func (c *BlockchainTestContext) IsRemote() bool {
	return c.RemoteNode
}

func (c *BlockchainTestContext) GetDeployerWallet() *Wallet {
	return c.Wallets[len(c.Wallets)-1]
}

func makeTestBlockchain(
	ctx context.Context,
	wallet *Wallet,
	client BlockchainClient,
) *Blockchain {
	chainID, err := client.ChainID(ctx)
	if err != nil {
		panic(err)
	}
	bc, err := NewBlockchainWithClient(
		ctx,
		&config.ChainConfig{
			ChainId:                                chainID.Uint64(),
			BlockTimeMs:                            100,
			TransactionPool:                        config.TransactionPoolConfig{}, // use defaults
			DisableReplacePendingTransactionOnBoot: true,
		},
		wallet,
		client,
		nil,
		infra.NewMetricsFactory(nil, "", ""),
		nil,
	)
	if err != nil {
		panic(err)
	}

	bc.StartChainMonitor(ctx)

	return bc
}

func (c *BlockchainTestContext) GetBlockchain(ctx context.Context, index int) *Blockchain {
	if index >= len(c.Wallets) {
		return nil
	}
	return makeTestBlockchain(ctx, c.Wallets[index], c.Client())
}

func (c *BlockchainTestContext) NewWalletAndBlockchain(ctx context.Context) *Blockchain {
	wallet, err := NewWallet(ctx)
	if err != nil {
		panic(err)
	}
	return makeTestBlockchain(ctx, wallet, c.Client())
}

func (c *BlockchainTestContext) InitNodeRecord(ctx context.Context, index int, url string) error {
	return c.InitNodeRecordEx(ctx, index, url, river.NodeStatus_Operational)
}

func (c *BlockchainTestContext) InitNodeRecordEx(ctx context.Context, index int, url string, status uint8) error {
	pendingTx, err := c.DeployerBlockchain.TxPool.Submit(
		ctx,
		"RegisterNode",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return c.NodeRegistry.RegisterNode(opts, c.Wallets[index].Address, url, status)
		},
	)
	if err != nil {
		return err
	}

	err = c.mineBlock(ctx)
	if err != nil {
		return err
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}

	if receipt.Status != TransactionResultSuccess {
		return fmt.Errorf("InitNodeRecordEx transaction failed")
	}

	return nil
}

func (c *BlockchainTestContext) UpdateNodeStatus(ctx context.Context, index int, status uint8) error {
	pendingTx, err := c.DeployerBlockchain.TxPool.Submit(
		ctx,
		"UpdateNodeStatus",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return c.NodeRegistry.UpdateNodeStatus(opts, c.Wallets[index].Address, status)
		},
	)
	if err != nil {
		return err
	}

	err = c.mineBlock(ctx)
	if err != nil {
		return err
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}

	if receipt.Status != TransactionResultSuccess {
		return fmt.Errorf("UpdateNodeStatus transaction failed")
	}

	return nil
}

func (c *BlockchainTestContext) UpdateNodeUrl(ctx context.Context, index int, url string) error {
	pendingTx, err := c.DeployerBlockchain.TxPool.Submit(
		ctx,
		"UpdateNodeUrl",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return c.NodeRegistry.UpdateNodeUrl(opts, c.Wallets[index].Address, url)
		},
	)
	if err != nil {
		return err
	}

	err = c.mineBlock(ctx)
	if err != nil {
		return err
	}

	receipt, err := pendingTx.Wait(ctx)
	if err != nil {
		return err
	}
	if receipt.Status != TransactionResultSuccess {
		return fmt.Errorf("UpdateNodeStatus transaction failed")
	}

	return nil
}

func (c *BlockchainTestContext) RegistryConfig() config.ContractConfig {
	return config.ContractConfig{
		Address: c.RiverRegistryAddress,
	}
}

func (c *BlockchainTestContext) BlockNum(ctx context.Context) BlockNumber {
	blockNum, err := c.Client().BlockNumber(ctx)
	if err != nil {
		panic(err)
	}
	return BlockNumber(blockNum)
}

func (c *BlockchainTestContext) SetConfigValue(t *testing.T, ctx context.Context, key string, value []byte) {
	blockNum := c.BlockNum(ctx)

	keyHash := HashSettingName(key)
	pendingTx, err := c.DeployerBlockchain.TxPool.Submit(
		ctx,
		"SetConfiguration",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return c.Configuration.SetConfiguration(
				opts,
				keyHash,
				blockNum.AsUint64(),
				value,
			)
		},
	)
	require.NoError(t, err)
	receipt, err := pendingTx.Wait(ctx)
	require.NoError(t, err)
	require.Equal(t, TransactionResultSuccess, receipt.Status)

	require.EventuallyWithT(
		t,
		func(t *assert.CollectT) {
			e := c.OnChainConfig.LastAppliedEvent()
			if assert.NotNil(t, e) {
				assert.EqualValues(t, keyHash, e.Key)
				assert.EqualValues(t, blockNum, e.Block)
				assert.EqualValues(t, value, e.Value)
			}
		},
		10*time.Second,
		50*time.Millisecond,
	)
}

// GetTestAddress returns a random common.Address that can be used in tests.
func GetTestAddress() common.Address {
	var address common.Address
	_, err := rand.Read(address[:])
	if err != nil {
		panic(err)
	}
	return address
}

type NoopChainMonitor struct{}

var _ ChainMonitor = NoopChainMonitor{}

func (NoopChainMonitor) RunWithBlockPeriod(
	context.Context,
	BlockchainClient,
	BlockNumber,
	time.Duration,
	infra.MetricsFactory,
) {
}

func (NoopChainMonitor) OnHeader(OnChainNewHeader)                                         {}
func (NoopChainMonitor) OnBlock(OnChainNewBlock)                                           {}
func (NoopChainMonitor) OnBlockWithLogs(BlockNumber, OnChainNewBlockWithLogs)              {}
func (NoopChainMonitor) OnAllEvents(BlockNumber, OnChainEventCallback)                     {}
func (NoopChainMonitor) OnContractEvent(BlockNumber, common.Address, OnChainEventCallback) {}
func (NoopChainMonitor) OnContractWithTopicsEvent(BlockNumber, common.Address, [][]common.Hash, OnChainEventCallback) {
}
func (NoopChainMonitor) OnStopped(OnChainMonitorStoppedCallback) {}

// TestMainForLeaksIgnoreGeth is a helper function to check if there are goroutine leaks.
// It ignores goroutines created by Geth's simulated backend.
// It should be called in TestMain after m.Run().
// If there are leaks, it will print the goroutine stacks and os.Exit with non-zero code.
// Using t.Parallel() makes it impossible to test for leaks in individual tests,
// so leak testing is done on package level from TestMain.
// Run individual tests with -run to find specific leaking tests.
func TestMainForLeaksIgnoreGeth() {
	// Geth's simulated backend leaks a lot of goroutines.
	// Unfortunately goleak doesn't have optiosn to ignore by module or package,
	// so some custom error string parsing is required to filter them out.
	now := time.Now()
	err := goleak.Find()
	elapsed := time.Since(now)
	if err != nil {
		msg := err.Error()

		stacks := strings.Split(msg, "Goroutine ")
		if len(stacks) > 1 {
			stacks = stacks[1:]
		}
		stacks = slices.DeleteFunc(stacks, func(s string) bool {
			return strings.Contains(s, "created by github.com/ethereum/go-ethereum/") ||
				strings.Contains(s, "created by github.com/syndtr/goleveldb/")
		})

		if len(stacks) > 0 {
			fmt.Println(
				"goleak: Errors on successful test run: found unexpected goroutines =", len(stacks),
				"elapsed =", elapsed,
			)
			for _, s := range stacks {
				fmt.Println()
				fmt.Println("Goroutine", s)
				fmt.Println()
			}
			os.Exit(1)
		}
	}
}
