package crypto

import (
	. "casablanca/node/base"
	"encoding/json"
	"os"

	"github.com/ethereum/go-ethereum/common"
)

type AddressData struct {
	Address string `json:"address"`
}

func ParseOrLoadAddress(a string) (common.Address, error) {
	addr, err := AddressStrToEthAddress(a)
	if err == nil {
		return addr, nil
	}

	fileData, err := os.ReadFile(a)
	if err != nil {
		return common.Address{}, AsRiverError(err).Func("ParseOrLoadAddress")
	}

	var data AddressData
	err = json.Unmarshal(fileData, &data)
	if err != nil {
		return common.Address{}, AsRiverError(err).Func("ParseOrLoadAddress")
	}

	addr, err = AddressStrToEthAddress(data.Address)
	if err != nil {
		return common.Address{}, AsRiverError(err).Func("ParseOrLoadAddress").Tag("loaded_address", data.Address)
	}

	return addr, nil
}
