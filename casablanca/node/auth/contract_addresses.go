package auth

import (
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gologme/log"
)

//go:embed contracts/localhost_town_factory.json
var localhostTownFactoryAddressJson []byte

//go:embed contracts/goerli_town_factory.json
var goerliTownFactoryAddressJson []byte

//go:embed contracts/base_goerli_town_factory.json
var baseGoerliTownFactoryAddressJson []byte

//go:embed contracts/sepolia_town_factory.json
var sepoliaTownFactoryAddressJson []byte


var EMPTY_ADDRESS = common.Address{}

type ContractAddress struct {
	Address string `json:"address"`
}

func loadContractAddress(chainId int) (string, error) {
	switch chainId {
	case 31337:
		return unmarshalFromJson(localhostTownFactoryAddressJson)
	case 5:
		return unmarshalFromJson(goerliTownFactoryAddressJson)
	case 11155111:
		return unmarshalFromJson(sepoliaTownFactoryAddressJson)
	case 84531:
		return unmarshalFromJson(baseGoerliTownFactoryAddressJson)
	default:
		errMsg := fmt.Sprintf("unsupported chainId: %d", chainId)
		log.Error("loadContractAddress", errMsg)
		return "", errors.New(errMsg)
	}
}

func unmarshalFromJson(bytes []byte) (string, error) {
	var address ContractAddress
	err := json.Unmarshal(bytes, &address)
	if err != nil {
		return "", err
	}
	return address.Address, nil
}
