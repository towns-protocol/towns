package registries

import (
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gologme/log"
)

//go:embed contracts/localhost_stream_registry.json
var LocalhostStreamRegistryAddressJson []byte

var EMPTY_ADDRESS = common.Address{}

type ContractAddress struct {
	Address string `json:"address"`
}

func loadStreamRegistryContractAddress(chainId int) (string, error) {
	switch chainId {
	case 31337:
		return unmarshalFromJson(LocalhostStreamRegistryAddressJson)
	default:
		errMsg := fmt.Sprintf("unsupported chainId: %d", chainId)
		log.Error("loadStreamRegistryContractAddress", errMsg)
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
