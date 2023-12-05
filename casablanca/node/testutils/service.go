package testutils

import (
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/infra"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/rpc"
	"context"
	"fmt"
	"net/http"

	"github.com/ethereum/go-ethereum/common"
	eth_rpc "github.com/ethereum/go-ethereum/rpc"
)

func TestServerAndClient(ctx context.Context, dbUrl string) (protocolconnect.StreamServiceClient, func()) {
	cfg := &config.Config{
		UseContract: false,
		BaseChain: config.ChainConfig{
			ChainId:    infra.CHAIN_ID_LOCALHOST,
			NetworkUrl: "http://localhost:8545",
		},
		Address: "localhost",
		Port:    1234,
		Database: config.DatabaseConfig{
			Url: dbUrl,
		},
		Stream: config.StreamConfig{
			Media: config.MediaStreamConfig{
				MaxChunkCount: 100,
				MaxChunkSize:  1000000,
			},
			RecencyConstraints: config.RecencyConstraintsConfig{
				Generations: 5,
				AgeSeconds:  11,
			},
		},
	}

	wallet, err := crypto.NewWallet(ctx)
	if err != nil {
		panic(err)
	}

	closer, port, _, err := rpc.StartServer(ctx, cfg, wallet)
	if err != nil {
		panic(err)
	}

	client := protocolconnect.NewStreamServiceClient(
		http.DefaultClient,
		fmt.Sprintf("http://localhost:%d", port),
	)

	return client, closer
}

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
