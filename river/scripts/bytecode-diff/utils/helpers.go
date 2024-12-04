package utils

import (
	"github.com/ethereum/go-ethereum/ethclient"
)

type ChainClients struct {
	BaseClient  *ethclient.Client
	RiverClient *ethclient.Client
}

func (c *ChainClients) CloseAll() {
	if c.BaseClient != nil {
		c.BaseClient.Close()
	}
	if c.RiverClient != nil {
		c.RiverClient.Close()
	}
}

type DiamondAddresses struct {
	BaseDiamonds  map[Diamond]string
	RiverDiamonds map[Diamond]string
}

func InitializeDiamonds(
	deploymentsPath string,
	baseDiamonds []Diamond,
	riverDiamonds []Diamond,
	verbose bool,
) (*DiamondAddresses, error) {
	// Get diamond addresses
	baseDiamondAddresses, err := GetDiamondAddresses(
		deploymentsPath,
		baseDiamonds,
		BASE,
		verbose,
	)
	if err != nil {
		return nil, err
	}

	riverDiamondAddresses, err := GetDiamondAddresses(
		deploymentsPath,
		riverDiamonds,
		RIVER,
		verbose,
	)
	if err != nil {
		return nil, err
	}

	diamonds := &DiamondAddresses{
		BaseDiamonds:  baseDiamondAddresses,
		RiverDiamonds: riverDiamondAddresses,
	}

	return diamonds, nil
}

func InitializeClients(
	baseRpcUrl string,
	riverRpcUrl string,
	verbose bool,
) (*ChainClients, error) {
	// Create Ethereum clients
	baseClient, err := CreateEthereumClient(baseRpcUrl)
	if err != nil {
		return nil, err
	}

	riverClient, err := CreateEthereumClient(riverRpcUrl)
	if err != nil {
		baseClient.Close()
		return nil, err
	}

	clients := &ChainClients{
		BaseClient:  baseClient,
		RiverClient: riverClient,
	}

	return clients, nil
}
