package rpc_client

import (
	"context"

	"connectrpc.com/connect"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type RpcClient struct {
	wallet *crypto.Wallet
	client protocolconnect.StreamServiceClient
}

func NewRpcClient(wallet *crypto.Wallet, client protocolconnect.StreamServiceClient) *RpcClient {
	return &RpcClient{
		wallet: wallet,
		client: client,
	}
}

func (c *RpcClient) CreateMetadataStream(ctx context.Context, streamId StreamId) (*connect.Response[CreateStreamResponse], error) {
	inception, err := MakeEnvelopeWithPayload(
		c.wallet,
		Make_MetadataPayload_Inception(streamId, nil),
		nil,
	)
	if err != nil {
		return nil, err
	}

	resp, err := c.client.CreateStream(
		ctx,
		connect.NewRequest(&CreateStreamRequest{
			Events:   []*Envelope{inception},
			StreamId: streamId[:],
		}),
	)
	if err != nil {
		return nil, AsRiverError(err)
	}

	return resp, nil
}
