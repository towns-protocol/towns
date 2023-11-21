package registries

import (
	"casablanca/node/auth/contracts/localhost_towns_stream_registry"
	"casablanca/node/infra"
	"context"
	"math/big"

	"golang.org/x/exp/slog"

	"casablanca/node/crypto"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	crypto_ethereum "github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

type StreamRegistryContractLocalhostV3 struct {
	ethClient  *ethclient.Client
	transactor *crypto.Wallet
	registry   *localhost_towns_stream_registry.LocalhostTownsStreamRegistry
}

func NewStreamRegistryContractLocalhostV3(ethClient *ethclient.Client, nodeWallet *crypto.Wallet) (*StreamRegistryContractLocalhostV3, error) {
	// get the space factory address from config
	strAddress, err := loadStreamRegistryContractAddress(infra.CHAIN_ID_LOCALHOST)
	if err != nil {
		slog.Error("error parsing localhost contract address", "address", strAddress, "error", err)
		return nil, err
	}
	address := common.HexToAddress(strAddress)

	stream_registry, err := localhost_towns_stream_registry.NewLocalhostTownsStreamRegistry(address, ethClient)

	if err != nil {
		slog.Error("error fetching localhost TownArchitect contract with address", "address", strAddress, "error", err)
		return nil, err
	}
	// no errors.
	streamRegistryContract := &StreamRegistryContractLocalhostV3{
		ethClient:  ethClient,
		transactor: nodeWallet,
		registry:   stream_registry,
	}

	return streamRegistryContract, nil
}

func (za *StreamRegistryContractLocalhostV3) SetNodeAddressesForStream(streamId string, addresses []string) (bool, error) {
	txOpts, err := za.prepareTxOpts()
	if err != nil {
		return false, err
	}

	_, err = za.registry.AddNodesToStream(txOpts, hashStreamId(streamId), addresses)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (za *StreamRegistryContractLocalhostV3) AddNodeAddressForStream(streamId string, address string) (bool, error) {
	txOpts, err := za.prepareTxOpts()
	if err != nil {
		return false, err
	}

	_, err = za.registry.AddNodeToStream(txOpts, hashStreamId(streamId), address)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (za *StreamRegistryContractLocalhostV3) GetNodeAddressesForStream(streamId string) ([]string, error) {
	addresses, err := za.registry.GetStreamNodes(nil, hashStreamId(streamId))
	if err != nil {
		return nil, err
	}
	return addresses, nil
}

func hashStreamId(streamId string) string {
	hash := crypto_ethereum.Keccak256Hash([]byte(streamId))
	return hash.String()
}

func (za *StreamRegistryContractLocalhostV3) prepareTxOpts() (*bind.TransactOpts, error) {
	gasLimit := uint64(1000000)
	gasPrice, err := za.ethClient.SuggestGasPrice(context.Background())
	if err != nil {
		return nil, err
	}

	txOpts, err := bind.NewKeyedTransactorWithChainID(za.transactor.PrivateKeyStruct, big.NewInt(31337))
	if err != nil {
		return nil, err
	}
	txOpts.GasPrice = gasPrice
	txOpts.GasLimit = gasLimit
	return txOpts, nil
}
