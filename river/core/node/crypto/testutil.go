package crypto

import (
	"context"
	"crypto/rand"
	"math/big"
	"os"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/ethclient/simulated"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/contracts/deploy"
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

	backend := simulated.New(genesisAlloc, 30_000_000)
	return wallets, backend, nil
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
	anvilUrl := os.Getenv("RIVER_TEST_ANVIL_URL")
	if anvilUrl != "" {
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

	// Add deployer as operator so it can register nodes
	deployerBC := makeTestBlockchain(ctx, wallets[len(wallets)-1], client, chainId, nil)

	btc := &BlockchainTestContext{
		Backend:              backend,
		EthClient:            ethClient,
		Wallets:              wallets,
		RiverRegistryAddress: addr,
		NodeRegistry:         node_registry,
		StreamRegistry:       stream_registry,
		ChainId:              chainId,
		DeployerBlockchain:   deployerBC,
	}

	err = btc.mineBlock()
	if err != nil {
		return nil, err
	}

	return btc, nil
}

func (c *BlockchainTestContext) mineBlock() error {
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

func (c *BlockchainTestContext) IsSimulated() bool {
	return c.Backend != nil
}

func (c *BlockchainTestContext) GetDeployerWallet() *Wallet {
	return c.Wallets[len(c.Wallets)-1]
}

func makeTestBlockchain(
	ctx context.Context,
	wallet *Wallet,
	client BlockchainClient,
	chainId *big.Int,
	onSubmit func(),
) *Blockchain {
	bc, err := NewBlockchainWithClient(
		ctx,
		&config.ChainConfig{
			ChainId:     chainId.Uint64(),
			BlockTimeMs: 100,
		},
		wallet,
		client,
		nil,
	)
	if err != nil {
		panic(err)
	}
	bc.TxRunner.SetOnSubmit(onSubmit)
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
			c.Commit()
		}
	}

	return makeTestBlockchain(ctx, wallet, c.Client(), c.ChainId, onSubmit)
}

func (c *BlockchainTestContext) InitNodeRecord(ctx context.Context, index int, url string) error {
	return c.InitNodeRecordEx(ctx, index, url, contracts.NodeStatus_Operational)
}

func (c *BlockchainTestContext) InitNodeRecordEx(ctx context.Context, index int, url string, status uint8) error {
	owner := c.DeployerBlockchain

	tx, err := owner.TxRunner.Submit(
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

	_, err = WaitMined(ctx, owner.Client, tx.Hash(), time.Millisecond, time.Second*10)
	return err
}

func (c *BlockchainTestContext) UpdateNodeStatus(ctx context.Context, index int, status uint8) error {
	owner := c.DeployerBlockchain

	tx, err := owner.TxRunner.Submit(
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

	_, err = WaitMined(ctx, owner.Client, tx.Hash(), time.Millisecond, time.Second*10)
	return err
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
