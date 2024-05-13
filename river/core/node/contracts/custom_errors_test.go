package contracts_test

import (
	"errors"
	"math/big"
	"net/http"
	"testing"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/jarcoal/httpmock"
	"github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/contracts"
)

var (
	ABI1 = &bind.MetaData{ABI: "[{\"inputs\":[],\"name\":\"bar\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"foo\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"block\",\"type\":\"uint256\"}],\"name\":\"InvalidBlockNumber\",\"type\":\"error\"}]"}
	// ABI2 holds a custom error InvalidBlockNumber(u256)
	ABI2 = &bind.MetaData{ABI: "[{\"inputs\":[],\"name\":\"bar\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"block\",\"type\":\"uint256\"}],\"name\":\"InvalidBlockNumber\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"bytes\",\"name\":\"\",\"type\":\"bytes\"}],\"name\":\"Bytes\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"foo\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"int64\",\"name\":\"\",\"type\":\"int64\"}],\"name\":\"Int64Val\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"int256\",\"name\":\"\",\"type\":\"int256\"}],\"name\":\"IntVal\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"key\",\"type\":\"bytes32\"}],\"name\":\"raiseInt\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"key\",\"type\":\"bytes32\"}],\"name\":\"raiseInt64\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"key\",\"type\":\"bytes32\"},{\"internalType\":\"bytes\",\"name\":\"value\",\"type\":\"bytes\"}],\"name\":\"setBytes\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"key\",\"type\":\"bytes32\"},{\"internalType\":\"int64\",\"name\":\"value\",\"type\":\"int64\"}],\"name\":\"setInt64\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"key\",\"type\":\"bytes32\"}],\"name\":\"getBytes\",\"outputs\":[{\"internalType\":\"bytes\",\"name\":\"\",\"type\":\"bytes\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"key\",\"type\":\"bytes32\"}],\"name\":\"getBytesWithSometimesCustomError\",\"outputs\":[{\"internalType\":\"bytes\",\"name\":\"\",\"type\":\"bytes\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"key\",\"type\":\"bytes32\"}],\"name\":\"getBytesWithSometimesStringError\",\"outputs\":[{\"internalType\":\"bytes\",\"name\":\"\",\"type\":\"bytes\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"key\",\"type\":\"bytes32\"}],\"name\":\"getInt\",\"outputs\":[{\"internalType\":\"int256\",\"name\":\"val\",\"type\":\"int256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"key\",\"type\":\"bytes32\"}],\"name\":\"getInt64\",\"outputs\":[{\"internalType\":\"int64\",\"name\":\"val\",\"type\":\"int64\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"int64\",\"name\":\"val\",\"type\":\"int64\"}],\"name\":\"int64Bytes\",\"outputs\":[{\"internalType\":\"bytes\",\"name\":\"\",\"type\":\"bytes\"}],\"stateMutability\":\"pure\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"int256\",\"name\":\"val\",\"type\":\"int256\"}],\"name\":\"intBytes\",\"outputs\":[{\"internalType\":\"bytes\",\"name\":\"\",\"type\":\"bytes\"}],\"stateMutability\":\"pure\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint64\",\"name\":\"val\",\"type\":\"uint64\"}],\"name\":\"uint64Bytes\",\"outputs\":[{\"internalType\":\"bytes\",\"name\":\"\",\"type\":\"bytes\"}],\"stateMutability\":\"pure\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"val\",\"type\":\"uint256\"}],\"name\":\"uintBytes\",\"outputs\":[{\"internalType\":\"bytes\",\"name\":\"\",\"type\":\"bytes\"}],\"stateMutability\":\"pure\",\"type\":\"function\"}]"}
)

func TestEVMCustomError(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	var (
		combinedABI, _           = contracts.NewEVMErrorDecoder(ABI1, ABI2)
		mockReplyWithCustomError = map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      3,
			"error": map[string]interface{}{
				"code":    3,
				"message": "execution reverted",
				"data":    "0x9f4aafbe00000000000000000000000000000000000000000000000000000000006b4a50",
			},
		}
	)

	httpmock.RegisterResponder("POST", "http://localhost:8545",
		func(req *http.Request) (*http.Response, error) {
			return httpmock.NewJsonResponse(200, mockReplyWithCustomError)
		})

	client, err := ethclient.Dial("http://localhost:8545")
	if err != nil {
		t.Fatalf("unable to dial endpoint: %v", err)
	}

	_, err = client.EstimateGas(ctx, ethereum.CallMsg{})

	customError, stringError, err := combinedABI.DecodeEVMError(err)
	if err != nil {
		t.Fatalf("unexpected error, got: %v", err)
	}
	if stringError != nil {
		t.Fatalf("unexpected string error, got: %v", stringError)
	}
	if err != nil {
		t.Fatalf("unexpected error, got: %v", err)
	}
	if customError == nil {
		t.Fatalf("expected custom error, but got nil")
	}
	a, _ := ABI2.GetAbi()
	if customError.DecodedError.ID != a.Errors["InvalidBlockNumber"].ID {
		t.Fatalf("unexpected custom error message, exp: '%x', got: '%x'", a.Errors["InvalidBlockNumber"].ID, customError.DecodedError.ID)
	}
	if customError.DecodedError.Name != "InvalidBlockNumber" {
		t.Fatalf("unexpected custom error name, exp: '%x', got: '%x'", "InvalidBlockNumber", customError.DecodedError.Name)
	}
	if customError.DecodedError.Sig != "InvalidBlockNumber(uint256)" {
		t.Fatalf("unexpected custom error message, exp: '%s', got: '%s'", "InvalidBlockNumber(uint256)", customError.DecodedError.Sig)
	}
	if customError.Params[0].(*big.Int).Uint64() != 7031376 {
		t.Fatalf("unexpected custom error message, exp: '%d', got: '%d'", 7031376, customError.Params[0])
	}
	if customError.Error() != "InvalidBlockNumber(7031376)" {
		t.Fatalf("unexpected custom error as string, exp: 'InvalidBlockNumber(7031376)', got: '%s'", customError.Error())
	}
}

func TestEVMStringError(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	var (
		combinedABI, _           = contracts.NewEVMErrorDecoder(ABI1, ABI2)
		mockReplyWithStringError = map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      7,
			"error": map[string]interface{}{
				"code":    3,
				"message": "execution reverted: InvalidBlockNumber",
				"data":    "0x08c379a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000012496e76616c6964426c6f636b4e756d6265720000000000000000000000000000",
			},
		}
	)

	httpmock.RegisterResponder("POST", "http://localhost:8545",
		func(req *http.Request) (*http.Response, error) {
			return httpmock.NewJsonResponse(200, mockReplyWithStringError)
		})

	client, err := ethclient.Dial("http://localhost:8545")
	if err != nil {
		t.Fatalf("unable to dial endpoint: %v", err)
	}

	_, err = client.EstimateGas(ctx, ethereum.CallMsg{})

	customError, stringError, err := combinedABI.DecodeEVMError(err)
	if err != nil {
		t.Fatalf("unexpected error, got: %v", err)
	}
	if customError != nil {
		t.Fatalf("unexpected custom error, got: %v", customError)
	}
	if err != nil {
		t.Fatalf("unexpected error, got: %v", err)
	}
	if stringError == nil {
		t.Fatalf("expected string error, but got nil")
	}
	if stringError.EVMError != "InvalidBlockNumber" {
		t.Fatalf("unexpected string error message, exp: '%s', got: '%s'", "InvalidBlockNumber", stringError.RPCMessage)
	}
}

func TestEVMUnexpectedError(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()

	httpmock.Activate()
	defer httpmock.DeactivateAndReset()

	combinedABI, _ := contracts.NewEVMErrorDecoder(ABI1, ABI2)

	httpmock.RegisterResponder("POST", "http://localhost:8545",
		func(req *http.Request) (*http.Response, error) {
			return httpmock.NewJsonResponse(200, "invalid reply")
		})

	client, err := ethclient.Dial("http://localhost:8545")
	if err != nil {
		t.Fatalf("unable to dial endpoint: %v", err)
	}

	_, err = client.EstimateGas(ctx, ethereum.CallMsg{})

	customError, stringError, err := combinedABI.DecodeEVMError(err)

	if err == nil {
		t.Fatalf("expected error, got nil")
	}
	var rerr *base.RiverErrorImpl
	if !errors.As(err, &rerr) {
		t.Fatalf("expected error to be a RiverError, got: %T", err)
	}
	if stringError != nil {
		t.Fatalf("unexpected string error, got: %v", stringError)
	}
	if customError != nil {
		t.Fatalf("expected custom error, but got: %v", customError)
	}
}
