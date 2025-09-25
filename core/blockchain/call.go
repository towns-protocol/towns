package blockchain

import (
	"context"
	"math/big"

	bind2 "github.com/ethereum/go-ethereum/accounts/abi/bind/v2"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

// CallValueRaw executes a read-only call using pre-packed calldata and decodes the
// result with the provided unpacker. A zero block number targets the latest block.
// Returned errors are wrapped with contract call context for easier debugging.
func CallValueRaw[T any](
	contract *bind2.BoundContract,
	ctx context.Context,
	funcName string,
	blockNum BlockNumber,
	calldata []byte,
	unpack func([]byte) (T, error),
) (T, error) {
	var opt bind2.CallOpts
	opt.Context = ctx
	if blockNum > 0 {
		opt.BlockNumber = big.NewInt(int64(blockNum))
	}
	ret, err := bind2.Call(contract, &opt, calldata, unpack)
	if err != nil {
		return ret, AsRiverError(
			err,
			Err_CANNOT_CALL_CONTRACT,
		).Func(funcName).
			Message("Contract call failed").
			Tag("blockNum", blockNum)
	}
	return ret, nil
}

// CallValue builds calldata with the supplied packer, performs a read-only
// contract call against the specified block (or the latest block when zero), and
// returns the decoded result by value. Use this when the ABI method returns a
// scalar or when copying the struct is acceptable. Any failure is wrapped with
// contract call context and block metadata.
func CallValue[T any](
	contract *bind2.BoundContract,
	ctx context.Context,
	funcName string,
	blockNum BlockNumber,
	pack func() ([]byte, error),
	unpack func([]byte) (T, error),
) (T, error) {
	var zero T
	calldata, err := pack()
	if err != nil {
		return zero, AsRiverError(
			err,
			Err_CANNOT_CALL_CONTRACT,
		).Func(funcName).
			Message("Failed to pack calldata").
			Tag("blockNum", blockNum)
	}
	return CallValueRaw(contract, ctx, funcName, blockNum, calldata, unpack)
}

// CallPtrRaw executes a read-only contract call using pre-packed calldata and
// returns a pointer to the decoded value so callers can avoid copying large
// structs. A zero block number targets the latest block, and errors include
// contract call metadata.
func CallPtrRaw[T any](
	contract *bind2.BoundContract,
	ctx context.Context,
	funcName string,
	blockNum BlockNumber,
	calldata []byte,
	unpack func([]byte) (T, error),
) (*T, error) {
	var opt bind2.CallOpts
	opt.Context = ctx
	if blockNum > 0 {
		opt.BlockNumber = big.NewInt(int64(blockNum))
	}
	ret, err := bind2.Call(contract, &opt, calldata, unpack)
	if err != nil {
		return nil, AsRiverError(
			err,
			Err_CANNOT_CALL_CONTRACT,
		).Func(funcName).
			Message("Contract call failed").
			Tag("blockNum", blockNum)
	}
	return &ret, nil
}

// CallPtr builds calldata, executes a read-only contract call against the
// specified block (or latest when zero), and returns a pointer to the decoded
// value. Prefer this helper when the ABI method returns large structs so callers
// can avoid copying the result. Errors include contract call metadata for
// debugging.
func CallPtr[T any](
	contract *bind2.BoundContract,
	ctx context.Context,
	funcName string,
	blockNum BlockNumber,
	pack func() ([]byte, error),
	unpack func([]byte) (T, error),
) (*T, error) {
	calldata, err := pack()
	if err != nil {
		return nil, AsRiverError(
			err,
			Err_CANNOT_CALL_CONTRACT,
		).Func(funcName).
			Message("Failed to pack calldata").
			Tag("blockNum", blockNum)
	}
	return CallPtrRaw(contract, ctx, funcName, blockNum, calldata, unpack)
}

// CallInt64Raw performs a contract call that is expected to return a *big.Int,
// validates that it fits into an int64, and returns the narrowed value. Block
// zero targets the latest block. Errors are wrapped with contract call context
// and block metadata.
func CallInt64Raw(
	contract *bind2.BoundContract,
	ctx context.Context,
	funcName string,
	blockNum BlockNumber,
	calldata []byte,
	unpack func([]byte) (*big.Int, error),
) (int64, error) {
	var opt bind2.CallOpts
	opt.Context = ctx
	if blockNum > 0 {
		opt.BlockNumber = big.NewInt(int64(blockNum))
	}
	ret, err := bind2.Call(contract, &opt, calldata, unpack)
	if err != nil {
		return 0, AsRiverError(
			err,
			Err_CANNOT_CALL_CONTRACT,
		).Func(funcName).
			Message("Contract call failed").
			Tag("blockNum", blockNum)
	}
	if !ret.IsInt64() {
		return 0, RiverError(
			Err_CANNOT_CALL_CONTRACT,
			"Contract returned value that is too big for int64",
			"num",
			ret,
		).Func(funcName)
	}
	return ret.Int64(), nil
}

// CallInt64 builds calldata, invokes a contract method expected to return a
// numeric result, and narrows the decoded *big.Int into an int64. A zero block
// number targets the latest block. Errors from packing or execution are wrapped
// with contract context and block metadata.
func CallInt64(
	contract *bind2.BoundContract,
	ctx context.Context,
	funcName string,
	blockNum BlockNumber,
	pack func() ([]byte, error),
	unpack func([]byte) (*big.Int, error),
) (int64, error) {
	calldata, err := pack()
	if err != nil {
		return 0, AsRiverError(
			err,
			Err_CANNOT_CALL_CONTRACT,
		).Func(funcName).
			Message("Failed to pack calldata").
			Tag("blockNum", blockNum)
	}
	return CallInt64Raw(contract, ctx, funcName, blockNum, calldata, unpack)
}
