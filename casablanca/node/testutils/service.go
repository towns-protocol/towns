package testutils

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	eth_rpc "github.com/ethereum/go-ethereum/rpc"
)

func FundWallet(ctx context.Context, wallet common.Address, url string) error {
	rpcClient, err := eth_rpc.DialContext(ctx, url)
	if err != nil {
		panic(err)
	}

	// 1 eth
	amountInWei := "1000000000000000000"

	var result interface{}
	err = rpcClient.CallContext(ctx, &result, "anvil_setBalance", wallet, amountInWei)
	if err != nil {
		return err
	}
	return nil
}
