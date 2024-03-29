package config

import (
	"encoding/json"
	"os"
	"reflect"

	"github.com/ethereum/go-ethereum/common"
	"github.com/mitchellh/mapstructure"
	"github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/protocol"
)

var (
	commonAddressType = reflect.TypeOf(common.Address{})
)

func DecodeAddressOrAddressFileHook() mapstructure.DecodeHookFuncType {
	return func(from reflect.Type, to reflect.Type, data interface{}) (interface{}, error) {
		if from.Kind() == reflect.String && to == commonAddressType {
			addr, err := parseOrLoadAddress(data.(string))
			if err != nil {
				return nil, base.AsRiverError(err, protocol.Err_BAD_CONFIG).
					Message("Failed to parse address").
					Func("DecodeAddressOrFileHook")
			}
			return addr, nil
		}
		return data, nil
	}
}

func parseOrLoadAddress(addrOrFile string) (common.Address, error) {
	if common.IsHexAddress(addrOrFile) {
		return common.HexToAddress(addrOrFile), nil
	}

	fileData, err := os.ReadFile(addrOrFile)
	if err != nil {
		return common.Address{}, base.AsRiverError(err).
			Tag("file", addrOrFile).
			Func("parseOrLoadAddress")
	}

	var data struct {
		Address string `json:"address"`
	}

	if err := json.Unmarshal(fileData, &data); err != nil {
		return common.Address{}, base.AsRiverError(err).
			Tag("file", addrOrFile).
			Func("parseOrLoadAddress")
	}

	if common.IsHexAddress(data.Address) {
		return common.HexToAddress(data.Address), nil
	}

	return common.Address{}, base.AsRiverError(err).
		Tag("file", addrOrFile).
		Tag("loaded_address", data.Address).
		Func("parseOrLoadAddress")
}
