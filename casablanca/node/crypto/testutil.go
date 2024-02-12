package crypto

import (
	"context"
	"math/big"
	"os"
	"time"

	"github.com/river-build/river/config"
	"github.com/river-build/river/contracts/deploy"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/ethclient/simulated"
	"github.com/river-build/river/contracts"
)

var (
	Eth_1   = new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)
	Eth_10  = new(big.Int).Exp(big.NewInt(10), big.NewInt(19), nil)
	Eth_100 = new(big.Int).Exp(big.NewInt(10), big.NewInt(20), nil)
)

type BlockchainTestContext struct {
	Backend              *simulated.Backend
	EthClient            *ethclient.Client
	Wallets              []*Wallet
	RiverRegistryAddress common.Address
	RiverRegistry        *contracts.RiverRegistryV1
	ChainId              *big.Int
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

	backend := simulated.NewBackend(genesisAlloc)
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

func mineBlock(backend *simulated.Backend, client *ethclient.Client) error {
	if backend != nil {
		backend.Commit()
		return nil
	} else if client != nil {
		return client.Client().Call(nil, "evm_mine")
	} else {
		panic("no backend or client")
	}
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

	addr, _, _, err := deploy.DeployRiverRegistryDeploy(auth, client)
	if err != nil {
		return nil, err
	}
	err = mineBlock(backend, ethClient)
	if err != nil {
		return nil, err
	}

	river_registry, err := contracts.NewRiverRegistryV1(addr, client)
	if err != nil {
		return nil, err
	}

	return &BlockchainTestContext{
		Backend:              backend,
		EthClient:            ethClient,
		Wallets:              wallets,
		RiverRegistryAddress: addr,
		RiverRegistry:        river_registry,
		ChainId:              chainId,
	}, nil
}

func (c *BlockchainTestContext) Close() {
	if c.Backend != nil {
		c.Backend.Close()
	} else if c.EthClient != nil {
		c.EthClient.Close()
	}
}

func (c *BlockchainTestContext) Commit() {
	err := mineBlock(c.Backend, c.EthClient)
	if err != nil {
		panic(err)
	}
}

func (c *BlockchainTestContext) Client() BlockchainClient {
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

func (c *BlockchainTestContext) GetDeployerBlockchain(ctx context.Context) *Blockchain {
	return c.GetBlockchain(ctx, len(c.Wallets)-1, false)
}

func (c *BlockchainTestContext) GetBlockchain(ctx context.Context, index int, autoMine bool) *Blockchain {
	if index >= len(c.Wallets) {
		return nil
	}
	wallet := c.Wallets[index]
	var onSumbit func()
	if autoMine {
		onSumbit = func() {
			c.Commit()
		}
	}
	return &Blockchain{
		ChainId: c.ChainId,
		Wallet:  wallet,
		Client:  c.Client(),
		TxRunner: NewTxRunner(ctx, &TxRunnerParams{
			Wallet:   wallet,
			Client:   c.Client(),
			ChainId:  c.ChainId,
			OnSubmit: onSumbit,
		}),
		Config:       &config.ChainConfig{ChainId: c.ChainId.Uint64()},
		BlockMonitor: NewFakeBlockMonitor(ctx, 100),
	}
}

func (c *BlockchainTestContext) InitNodeRecord(ctx context.Context, index int, url string) error {
	owner := c.GetDeployerBlockchain(ctx)

	transactor := contracts.RiverRegistryV1TransactorRaw{
		Contract: &(c.RiverRegistry.RiverRegistryV1Transactor),
	}
	tx, err := owner.TxRunner.Submit(
		ctx,
		&transactor,
		"addNode",
		c.Wallets[index].Address,
		url,
	)
	if err != nil {
		return err
	}

	err = mineBlock(c.Backend, c.EthClient)
	if err != nil {
		return err
	}

	_, err = WaitMined(ctx, owner.Client, tx.Hash(), time.Millisecond, time.Second*10)
	return err
}

func (c *BlockchainTestContext) RegistryConfig() config.ContractConfig {
	return config.ContractConfig{
		Address: c.RiverRegistryAddress.Hex(),
	}
}
