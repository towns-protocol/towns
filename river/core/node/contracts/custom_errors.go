package contracts

import (
	"encoding/hex"
	"fmt"
	"reflect"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

var (
	// stringErrorFuncSelector = keccack256("Revert reason")[4]
	stringErrorFuncSelector = [4]byte{0x08, 0xc3, 0x79, 0xa0}
	stringType, _           = abi.NewType("string", "string", nil)
)

type EvmErrorDecoder struct {
	abis []*abi.ABI
}

// NewEVMErrorDecoder returns a evmErrorDecoder that combines multiple ABI
// definitions to decode errors returned from the EVM.
func NewEVMErrorDecoder(metaData ...*bind.MetaData) (*EvmErrorDecoder, error) {
	cea := &EvmErrorDecoder{}
	for _, md := range metaData {
		if err := cea.AddMetaData(md); err != nil {
			return nil, err
		}
	}
	return cea, nil
}

// AddMetaData add extra ABI metadata to consider when decoding EVM errors.
func (ca *EvmErrorDecoder) AddMetaData(md *bind.MetaData) error {
	a, err := md.GetAbi()
	if err != nil {
		return AsRiverError(err, Err_INVALID_ARGUMENT).Func("NewErrorsABI")
	}
	ca.abis = append(ca.abis, a)
	return nil
}

// DecodeEVMError tries to decode the given error returned from a contract call
// made with abigen generated bindings or directly from a call made with
// ethclient.Client.
//
// It will try to decode the EVM message to a custom error defined in any of the
// wrapped ABI's. If that fails it tries to decode the message as a classical
// string error. If that fails it returns err as a RiverError.
func (ca *EvmErrorDecoder) DecodeEVMError(err error) (*CustomerError, *StringError, error) {
	if err == nil {
		return nil, nil, nil
	}

	// if err is a *rpc.jsonError it holds a response from the RPC server
	// indicating that the EVM failed during execution. Because this type is
	// not exported we need to bypass the type system to get access to the
	// underlying data.
	errType := reflect.TypeOf(err)
	errValue := reflect.ValueOf(err)

	if errType.Kind() == reflect.Pointer &&
		errType.Elem().PkgPath() == "github.com/ethereum/go-ethereum/rpc" &&
		errType.Elem().Name() == "jsonError" {

		var (
			code         = errValue.Elem().FieldByName("Code").Int()
			message      = errValue.Elem().FieldByName("Message").String()
			data         = errValue.Elem().FieldByName("Data").Interface()
			funcSelector [4]byte
		)

		// data contains hex encoded data returned from the EVM
		if hexData, ok := data.(string); ok {
			rawData := common.FromHex(hexData)
			if len(rawData) >= 4 {
				copy(funcSelector[:], rawData[:4])

				for _, a := range ca.abis {
					if decErr, _ := a.ErrorByID(funcSelector); decErr != nil {
						if decoded, err := decErr.Unpack(rawData); err == nil {
							if decodedAsSlice, ok := decoded.([]any); ok {
								return &CustomerError{
									Code:         code,
									Message:      message,
									DecodedError: decErr,
									Params:       decodedAsSlice,
								}, nil, nil
							} else {
								return &CustomerError{
									Code:         code,
									Message:      message,
									DecodedError: decErr,
								}, nil, nil
							}
						}
					}
				}

				// Try to decode the error as a string error.
				if funcSelector == stringErrorFuncSelector {
					payloadArg := abi.Arguments{{Type: stringType}}
					if decodedString, err := payloadArg.Unpack(rawData[4:]); err == nil {
						if str, ok := decodedString[0].(string); ok {
							return nil, &StringError{
								Code:       code,
								EVMError:   str,
								RPCMessage: message,
							}, nil
						}
					}
				}
			}

			// the EVM returned an unknown custom error
			return nil, nil, RiverError(Err_UNKNOWN, "Unknown custom EVM error").
				Tag("code", code).
				Tag("funcSelector", hex.EncodeToString(funcSelector[:])).
				Func("DecodeEVMError")
		}
	}

	return nil, nil, AsRiverError(err).Func("DecodeEVMError")
}

// CustomerError represents a custom error returned by the RPC server.
type CustomerError struct {
	// Code is the received RPC error code
	Code int64
	// Message is the received RPC message
	Message string
	// DecodedError holds the ABI error definition and can be used to determine
	// what error was raised
	DecodedError *abi.Error
	// Params hold the decoded error data for the DecError
	// e.g. MyCustomErr(uint256, address) => Params[1234, 0x12..34]
	Params []any
}

func (ce CustomerError) Error() string {
	var sb strings.Builder
	sb.Write([]byte(ce.DecodedError.Name))
	sb.Write([]byte("("))
	for i, p := range ce.Params {
		if i > 0 {
			sb.Write([]byte(","))
		}
		sb.Write([]byte(fmt.Sprintf("%s", p)))
	}
	sb.Write([]byte(")"))
	return sb.String()
}

// StringError as received from the RPC node.
type StringError struct {
	// Code is the received RPC error code
	Code int64
	// EVMErrorString holds the string error as returned by the EVM
	// e.g. require(cond, "My String Error") => EVMError="My String Error"
	EVMError string
	// RPCMessage contains the string error, (probably modified) from the RPC
	// server. You probably want to use EVMError instead.
	RPCMessage string
}

func (se StringError) Error() string {
	return se.EVMError
}
