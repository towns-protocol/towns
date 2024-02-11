package crypto

import (
	"context"
	"math/big"

	"github.com/river-build/river/config"
	"github.com/river-build/river/contracts/deploy"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core"
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
	Wallets              []*Wallet
	RiverRegistryAddress common.Address
	RiverRegistry        *contracts.RiverRegistryV1
	ChainId              *big.Int
}

func NewBlockchainTestContext(ctx context.Context, numKeys int) (*BlockchainTestContext, error) {
	// Add one for deployer
	numKeys += 1

	wallets := make([]*Wallet, numKeys)
	genesisAlloc := map[common.Address]core.GenesisAccount{}
	var err error
	for i := 0; i < numKeys; i++ {
		wallets[i], err = NewWallet(ctx)
		if err != nil {
			return nil, err
		}
		genesisAlloc[wallets[i].Address] = core.GenesisAccount{Balance: Eth_100}
	}

	backend := simulated.NewBackend(genesisAlloc)
	chainId, err := backend.Client().ChainID(ctx)
	if err != nil {
		return nil, err
	}

	auth, err := bind.NewKeyedTransactorWithChainID(wallets[len(wallets)-1].PrivateKeyStruct, chainId)
	if err != nil {
		return nil, err
	}

	addr, _, _, err := deploy.DeployRiverRegistryDeploy(auth, backend.Client())
	if err != nil {
		return nil, err
	}
	backend.Commit()

	river_registry, err := contracts.NewRiverRegistryV1(addr, backend.Client())
	if err != nil {
		return nil, err
	}

	return &BlockchainTestContext{
		Backend:              backend,
		Wallets:              wallets,
		RiverRegistryAddress: addr,
		RiverRegistry:        river_registry,
		ChainId:              chainId,
	}, nil
}

func (c *BlockchainTestContext) Close() {
	c.Backend.Close()
}

func (c *BlockchainTestContext) Commit() {
	c.Backend.Commit()
}

func (c *BlockchainTestContext) Client() BlockchainClient {
	return c.Backend.Client()
}

func (c *BlockchainTestContext) GetDeployerWallet() *Wallet {
	return c.Wallets[len(c.Wallets)-1]
}

func (c *BlockchainTestContext) GetDeployerBlockchain(ctx context.Context) *Blockchain {
	return c.GetBlockchain(ctx, len(c.Wallets)-1)
}

func (c *BlockchainTestContext) GetBlockchain(ctx context.Context, index int) *Blockchain {
	if index >= len(c.Wallets) {
		return nil
	}
	wallet := c.Wallets[index]
	return &Blockchain{
		ChainId: c.ChainId,
		Wallet:  wallet,
		Client:  c.Client(),
		TxRunner: NewTxRunner(ctx, &TxRunnerParams{
			Wallet:  wallet,
			Client:  c.Client(),
			ChainId: c.ChainId,
		}),
		Config:       &config.ChainConfig{ChainId: c.ChainId.Uint64()},
		BlockMonitor: NewFakeBlockMonitor(ctx, 100),
	}
}
