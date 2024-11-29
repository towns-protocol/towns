package rpc

import (
	"context"
	"fmt"
	"testing"

	"connectrpc.com/connect"

	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	. "github.com/river-build/river/core/node/shared"
)

func TestServerShutdown(t *testing.T) {
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	ctx := tester.ctx
	require := tester.require
	log := dlog.FromCtx(ctx)

	stub := tester.testClient(0)
	url := tester.nodes[0].url

	resp, err := stub.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.NoError(err)
	require.NotNil(resp)
	require.Equal("HTTP/2.0", resp.Header().Get("X-Http-Version"), "expected HTTP/2.0")

	log.Info("Shutting down server")
	tester.nodes[0].Close(ctx, tester.dbUrl)
	log.Info("Server shut down")

	stub2 := tester.testClientForUrl(url)
	_, err = stub2.Info(ctx, connect.NewRequest(&protocol.InfoRequest{}))
	require.Error(err)
}

func createGDMChannel(
	ctx context.Context,
	initiator *crypto.Wallet,
	members []*crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	channelID StreamId,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, []byte, error) {
	channel, err := events.MakeEnvelopeWithPayload(
		initiator,
		events.Make_GdmChannelPayload_Inception(
			channelID,
			streamSettings,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}

	envelopes := []*protocol.Envelope{channel}

	for _, member := range append([]*crypto.Wallet{initiator}, members...) {
		join, err := events.MakeEnvelopeWithPayload(
			initiator,
			events.Make_GdmChannelPayload_Membership(
				protocol.MembershipOp_SO_JOIN,
				member.Address.String(),
				initiator.Address.String(),
			),
			nil,
		)
		if err != nil {
			return nil, nil, err
		}

		envelopes = append(envelopes, join)
	}

	reschannel, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   envelopes,
		StreamId: channelID[:],
	}))
	if err != nil {
		return nil, nil, err
	}
	if len(reschannel.Msg.Stream.Miniblocks) == 0 {
		return nil, nil, fmt.Errorf("expected at least one miniblock")
	}

	miniblockHash := reschannel.Msg.Stream.Miniblocks[len(reschannel.Msg.Stream.Miniblocks)-1].Header.Hash
	return reschannel.Msg.Stream.NextSyncCookie, miniblockHash, nil
}

func createDMChannel(
	ctx context.Context,
	initiator *crypto.Wallet,
	member *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	channelStreamId StreamId,
	streamSettings *protocol.StreamSettings,
) (*protocol.SyncCookie, []byte, error) {
	channel, err := events.MakeEnvelopeWithPayload(
		initiator,
		events.Make_DmChannelPayload_Inception(
			channelStreamId,
			initiator.Address,
			member.Address,
			streamSettings,
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}

	join1, err := events.MakeEnvelopeWithPayload(
		initiator,
		events.Make_DmChannelPayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			member.Address.String(),
			initiator.Address.String(),
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}

	join2, err := events.MakeEnvelopeWithPayload(
		initiator,
		events.Make_DmChannelPayload_Membership(
			protocol.MembershipOp_SO_JOIN,
			member.Address.String(),
			initiator.Address.String(),
		),
		nil,
	)
	if err != nil {
		return nil, nil, err
	}

	reschannel, err := client.CreateStream(ctx, connect.NewRequest(&protocol.CreateStreamRequest{
		Events:   []*protocol.Envelope{channel, join1, join2},
		StreamId: channelStreamId[:],
	}))
	if err != nil {
		return nil, nil, err
	}
	if len(reschannel.Msg.Stream.Miniblocks) == 0 {
		return nil, nil, fmt.Errorf("expected at least one miniblock")
	}
	miniblockHash := reschannel.Msg.Stream.Miniblocks[len(reschannel.Msg.Stream.Miniblocks)-1].Header.Hash
	return reschannel.Msg.Stream.NextSyncCookie, miniblockHash, nil
}
