package auth

import (
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
)

//go:embed contracts/addresses.json
var addressesJson []byte

type ContractAddresses struct {
	SpaceFactory string `json:"spaceFactory"`
	SpaceToken   string `json:"spaceToken"`
	PioneerToken string `json:"pioneerToken"`
	Member       string `json:"member"`
}

type ContractAddressesByChainId struct {
	Localhost ContractAddresses `json:"31337"`
	Goerli    ContractAddresses `json:"5"`
	Sepolia   ContractAddresses `json:"11155111"`
}

func loadSpaceFactoryAddress(chainId int) (*ContractAddresses, error) {
	var address ContractAddresses
	var allAddresses ContractAddressesByChainId
	err := json.Unmarshal(addressesJson, &allAddresses)
	if err != nil {
		return nil, err
	}
	switch chainId {
	case 31337:
		address.SpaceFactory = allAddresses.Localhost.SpaceFactory
	case 5:
		address.SpaceFactory = allAddresses.Goerli.SpaceFactory
	case 11155111:
		address.SpaceFactory = allAddresses.Sepolia.SpaceFactory
	default:
		errMsg := fmt.Sprintf("unsupported chainId: %d", chainId)
		return nil, errors.New(errMsg)
	}
	return &address, nil
}
