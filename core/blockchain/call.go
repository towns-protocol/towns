package blockchain

import (
	"context"
	"math/big"

	bind2 "github.com/ethereum/go-ethereum/accounts/abi/bind/v2"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

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
