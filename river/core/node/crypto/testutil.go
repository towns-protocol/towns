package crypto

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"os"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/ethclient/simulated"
	"github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/contracts/deploy"
	"github.com/river-build/river/core/node/protocol"
)

var (
	Eth_1   = new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)
	Eth_10  = new(big.Int).Exp(big.NewInt(10), big.NewInt(19), nil)
	Eth_100 = new(big.Int).Exp(big.NewInt(10), big.NewInt(20), nil)
)

type BlockchainTestContext struct {
	backendMutex         sync.RWMutex
	Backend              *simulated.Backend
	EthClient            *ethclient.Client
	Wallets              []*Wallet
	RiverRegistryAddress common.Address
	NodeRegistry         *contracts.NodeRegistryV1
	StreamRegistry       *contracts.StreamRegistryV1
	ChainId              *big.Int
	DeployerBlockchain   *Blockchain
	RemoteNode           bool
	ChainMonitor         ChainMonitor
}

func initSimulated(ctx context.Context, numKeys int) ([]*Wallet, *simulated.Backend, error) {
	wallets := make([]*Wallet, numKeys)
	genesisAlloc := map[common.Address]core.GenesisAccount{}
	var err error
	for i := 0; i < numKeys; i++ {
		wallets[i], err = NewWallet(ctx)
		if err != nil {
			return nil, nil, err
		}
		genesisAlloc[wallets[i].Address] = core.GenesisAccount{Balance: Eth_100}
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
			Value:    big.NewInt(100000000000000),
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
			return nil, nil, base.RiverError(protocol.Err_INTERNAL, "could not fund wallet")
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

func NewBlockchainTestContext(ctx context.Context, numKeys int) (*BlockchainTestContext, error) {
	// Add one for deployer
	numKeys += 1

	var wallets []*Wallet
	var backend *simulated.Backend
	var ethClient *ethclient.Client
	var client BlockchainClient
	var err error

	remoteNodeURL := os.Getenv("RIVER_REMOTE_NODE_URL")
	remoteFundAccount := os.Getenv("RIVER_REMOTE_NODE_FUND_PRIVATE_KEY")
	anvilUrl := os.Getenv("RIVER_TEST_ANVIL_URL")

	remoteNode := remoteNodeURL != "" && remoteFundAccount != ""
	if remoteNode {
		wallets, ethClient, err = initRemoteNode(ctx, remoteNodeURL, remoteFundAccount, numKeys)
		if err != nil {
			return nil, err
		}
		client = ethClient
	} else if anvilUrl != "" {
		wallets, ethClient, err = initAnvil(ctx, anvilUrl, numKeys)
		if err != nil {
			return nil, err
		}
		client = ethClient
	} else {
		wallets, backend, err = initSimulated(ctx, numKeys)
		if err != nil {
			return nil, err
		}
		client = backend.Client()
	}

	chainId, err := client.ChainID(ctx)
	if err != nil {
		return nil, err
	}

	auth, err := bind.NewKeyedTransactorWithChainID(wallets[len(wallets)-1].PrivateKeyStruct, chainId)
	if err != nil {
		return nil, err
	}

	addr, _, _, err := deploy.DeployMockRiverRegistry(auth, client, []common.Address{wallets[len(wallets)-1].Address})
	if err != nil {
		return nil, err
	}

	node_registry, err := contracts.NewNodeRegistryV1(addr, client)
	if err != nil {
		return nil, err
	}

	stream_registry, err := contracts.NewStreamRegistryV1(addr, client)
	if err != nil {
		return nil, err
	}

	chainMonitor := NewChainMonitor()

	// Add deployer as operator so it can register nodes
	deployerBC := makeTestBlockchain(ctx, wallets[len(wallets)-1], client, chainMonitor, chainId, nil)

	go chainMonitor.RunWithBlockPeriod(ctx, client, deployerBC.InitialBlockNum, 10*time.Millisecond)

	btc := &BlockchainTestContext{
		Backend:              backend,
		EthClient:            ethClient,
		ChainMonitor:         chainMonitor,
		Wallets:              wallets,
		RiverRegistryAddress: addr,
		NodeRegistry:         node_registry,
		StreamRegistry:       stream_registry,
		ChainId:              chainId,
		DeployerBlockchain:   deployerBC,
		RemoteNode:           remoteNode,
	}

	err = btc.mineBlock()
	if err != nil {
		return nil, err
	}

	return btc, nil
}

// SetNextBlockBaseFee sets the base fee of the next blocks. Only supported for Anvil chains!
func (c *BlockchainTestContext) SetNextBlockBaseFee(nextBlockBaseFee *big.Int) error {
	if !c.IsAnvil() {
		panic("SetGasPrice is only supported for Anvil chains")
	}
	return c.EthClient.Client().Call(nil, "anvil_setNextBlockBaseFeePerGas", nextBlockBaseFee)
}

func (c *BlockchainTestContext) mineBlock() error {
	if c.RemoteNode {
		//lint:ignore LE0000 context.Background() used correctly
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
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
		panic("no backend or client")
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
	}
	if c.EthClient != nil {
		c.EthClient.Close()
	}
}

func (c *BlockchainTestContext) Commit() {
	err := c.mineBlock()
	if err != nil {
		panic(err)
	}
}

func (c *BlockchainTestContext) Client() BlockchainClient {
	c.backendMutex.Lock()
	defer c.backendMutex.Unlock()

	if c.Backend != nil {
		return c.Backend.Client()
	} else if c.EthClient != nil {
		return c.EthClient
	} else {
		return nil
	}
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
	chainMonitor ChainMonitor,
	chainId *big.Int,
	onSubmit func(),
) *Blockchain {
	bc, err := NewBlockchainWithClient(
		ctx,
		&config.ChainConfig{
			ChainId:         chainId.Uint64(),
			BlockTimeMs:     100,
			TransactionPool: config.TransactionPoolConfig{}, // use defaults
		},
		wallet,
		client,
		nil,
		chainMonitor,
	)
	if err != nil {
		panic(err)
	}
	bc.TxPool.SetOnSubmitHandler(onSubmit)
	return bc
}

func (c *BlockchainTestContext) GetBlockchain(ctx context.Context, index int, autoMine bool) *Blockchain {
	if index >= len(c.Wallets) {
		return nil
	}
	wallet := c.Wallets[index]
	var onSubmit func()
	if autoMine {
		onSubmit = func() {
			fmt.Println("autocommit block")
			c.Commit()
		}
	}

	return makeTestBlockchain(ctx, wallet, c.Client(), c.ChainMonitor, c.ChainId, onSubmit)
}

func (c *BlockchainTestContext) InitNodeRecord(ctx context.Context, index int, url string) error {
	return c.InitNodeRecordEx(ctx, index, url, contracts.NodeStatus_Operational)
}

func (c *BlockchainTestContext) InitNodeRecordEx(ctx context.Context, index int, url string, status uint8) error {
	pendingTx, err := c.DeployerBlockchain.TxPool.Submit(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return c.NodeRegistry.RegisterNode(opts, c.Wallets[index].Address, url, status)
		},
	)
	if err != nil {
		return err
	}

	err = c.mineBlock()
	if err != nil {
		return err
	}

	receipt := <-pendingTx.Wait()
	if receipt.Status != TransactionResultSuccess {
		return fmt.Errorf("InitNodeRecordEx transaction failed")
	}

	return nil
}

func (c *BlockchainTestContext) UpdateNodeStatus(ctx context.Context, index int, status uint8) error {
	pendingTx, err := c.DeployerBlockchain.TxPool.Submit(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return c.NodeRegistry.UpdateNodeStatus(opts, c.Wallets[index].Address, status)
		},
	)
	if err != nil {
		return err
	}

	err = c.mineBlock()
	if err != nil {
		return err
	}

	receipt := <-pendingTx.Wait()
	if receipt.Status != TransactionResultSuccess {
		return fmt.Errorf("UpdateNodeStatus transaction failed")
	}

	return nil
}

func (c *BlockchainTestContext) UpdateNodeUrl(ctx context.Context, index int, url string) error {
	pendingTx, err := c.DeployerBlockchain.TxPool.Submit(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return c.NodeRegistry.UpdateNodeUrl(opts, c.Wallets[index].Address, url)
		},
	)
	if err != nil {
		return err
	}

	err = c.mineBlock()
	if err != nil {
		return err
	}

	receipt := <-pendingTx.Wait()
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

// GetTestAddress returns a random common.Address that can be used in tests.
func GetTestAddress() common.Address {
	var address common.Address
	_, err := rand.Read(address[:])
	if err != nil {
		panic(err)
	}
	return address
}
