package auth

import (
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gologme/log"
)

//go:embed contracts/addresses.json
var addressesJson []byte

var EMPTY_ADDRESS = common.Address{}

type ContractAddresses struct {
	TownFactory string `json:"townFactory"`
}

type ContractAddressesByChainId struct {
	Localhost ContractAddresses `json:"31337"`
	Goerli    ContractAddresses `json:"5"`
	Sepolia   ContractAddresses `json:"11155111"`
}

func loadContractAddresses(chainId int) (*ContractAddresses, error) {
	var address ContractAddresses
	var allAddresses ContractAddressesByChainId
	err := json.Unmarshal(addressesJson, &allAddresses)
	if err != nil {
		return nil, err
	}
	switch chainId {
	case 31337:
		address.TownFactory = allAddresses.Localhost.TownFactory
	case 5:
		address.TownFactory = allAddresses.Goerli.TownFactory
	case 11155111:
		address.TownFactory = allAddresses.Sepolia.TownFactory
	default:
		errMsg := fmt.Sprintf("unsupported chainId: %d", chainId)
		log.Error("loadSpaceFactoryAddress", errMsg)
		return nil, errors.New(errMsg)
	}
	return &address, nil
}
