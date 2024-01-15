package testutils

import (
	"context"
	"testing"

	"github.com/river-build/river/config"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/events"
	"github.com/river-build/river/protocol"
	"github.com/river-build/river/storage"

	"github.com/stretchr/testify/assert"
)

var streamConfig_t = &config.StreamConfig{
	Media: config.MediaStreamConfig{
		MaxChunkCount: 100,
		MaxChunkSize:  1000000,
	},
	RecencyConstraints: config.RecencyConstraintsConfig{
		Generations: 5,
		AgeSeconds:  11,
	},
}

type StreamContext_T struct {
	t           *testing.T
	Context     context.Context
	StreamCache events.StreamCache
	SyncStream  events.SyncStream
	StreamView  events.StreamView
}

func (s *StreamContext_T) Refresh() *StreamContext_T {
	// force a new miniblock to be created so that the stream view is updated
	_ = s.SyncStream.MakeMiniblock(s.Context)
	// reload the stream and the view
	syncStream, streamView, err := s.StreamCache.GetStream(s.Context, s.StreamView.StreamId())
	assert.NoError(s.t, err)
	s.SyncStream = syncStream
	s.StreamView = streamView
	return s
}

func MakeChannelStreamContext_T(
	t *testing.T,
	ctx context.Context,
	wallet *crypto.Wallet,
	userId string,
	channelStreamId string,
	spaceStreamId string,
) *StreamContext_T {
	streamCache := events.NewStreamCache(&events.StreamCacheParams{
		Storage:    storage.NewMemStorage(),
		Wallet:     wallet,
		DefaultCtx: ctx,
	}, streamConfig_t)
	// create a channel stream and auto-add the creator as a member
	channelEvents := MakeChannelInceptionEvents_T(
		t,
		wallet,
		userId,
		channelStreamId,
		spaceStreamId,
	)
	mb, err := events.MakeGenesisMiniblock(wallet, channelEvents)
	assert.NoError(t, err)
	syncStream, streamView, err := streamCache.CreateStream(ctx, channelStreamId, mb)
	assert.NoError(t, err)

	return &StreamContext_T{
		t:           t,
		Context:     ctx,
		StreamCache: streamCache,
		SyncStream:  syncStream,
		StreamView:  streamView,
	}
}

func JoinChannel_T(
	t_Context *StreamContext_T,
	wallet *crypto.Wallet,
	users []string,
) *StreamContext_T {
	t := t_Context.t
	ctx := t_Context.Context
	syncStream := t_Context.SyncStream
	streamView := t_Context.StreamView
	prevMiniblockHash := streamView.LastBlock().Hash
	for _, user := range users {
		err := syncStream.AddEvent(
			ctx,
			ParsedEvent_T(
				t,
				MakeEnvelopeWithPayload_T(
					t,
					wallet,
					events.Make_ChannelPayload_Membership(
						protocol.MembershipOp_SO_JOIN,
						user,
					),
					prevMiniblockHash,
				),
			),
		)
		assert.NoError(t, err)
	}
	return t_Context.Refresh()
}

func LeaveChannel_T(
	t_Context *StreamContext_T,
	wallet *crypto.Wallet,
	users []string,
) *StreamContext_T {
	t := t_Context.t
	ctx := t_Context.Context
	syncStream := t_Context.SyncStream
	streamView := t_Context.StreamView
	prevHash := streamView.LastBlock().Hash
	for _, user := range users {
		err := syncStream.AddEvent(
			ctx,
			ParsedEvent_T(
				t,
				MakeEnvelopeWithPayload_T(
					t,
					wallet,
					events.Make_ChannelPayload_Membership(
						protocol.MembershipOp_SO_LEAVE,
						user,
					),
					prevHash,
				),
			),
		)
		assert.NoError(t, err)
	}
	return t_Context.Refresh()
}

func PostMessage_T(
	t_Context *StreamContext_T,
	wallet *crypto.Wallet,
	message string,
) (*events.ParsedEvent, *StreamContext_T) {
	t := t_Context.t
	ctx := t_Context.Context
	syncStream := t_Context.SyncStream
	streamView := t_Context.StreamView
	prevMiniblockHash := streamView.LastBlock().Hash
	parsedEvent := ParsedEvent_T(
		t,
		MakeEnvelopeWithPayload_T(
			t,
			wallet,
			events.Make_ChannelPayload_Message(
				message,
			),
			prevMiniblockHash,
		),
	)
	err := syncStream.AddEvent(
		ctx,
		parsedEvent,
	)
	assert.NoError(t, err)
	return parsedEvent, t_Context.Refresh()
}

func ParsedEvent_T(t *testing.T, envelope *protocol.Envelope) *events.ParsedEvent {
	parsed, err := events.ParseEvent(envelope)
	if err != nil {
		assert.NoError(t, err)
	}
	return parsed
}

func MakeEnvelopeWithPayload_T(t *testing.T, wallet *crypto.Wallet, payload protocol.IsStreamEvent_Payload, prevMiniblockHash []byte) *protocol.Envelope {
	envelope, err := events.MakeEnvelopeWithPayload(wallet, payload, prevMiniblockHash)
	assert.NoError(t, err)
	return envelope
}

func MakeChannelInceptionEvents_T(
	t *testing.T,
	wallet *crypto.Wallet,
	userId string,
	channelStreamId string,
	spaceStreamId string,
) []*events.ParsedEvent {
	streamSettings := &protocol.StreamSettings{
		MinEventsPerSnapshot: 2,
		MiniblockTimeMs:      10000000,
	}
	channelProperties := &protocol.EncryptedData{
		Ciphertext: "encrypted text supposed to be here",
	}
	inception := MakeEnvelopeWithPayload_T(
		t,
		wallet,
		events.Make_ChannelPayload_Inception(
			channelStreamId,
			spaceStreamId,
			channelProperties,
			streamSettings,
		),
		nil,
	)
	join := MakeEnvelopeWithPayload_T(
		t,
		wallet,
		events.Make_ChannelPayload_Membership(protocol.MembershipOp_SO_JOIN, userId),
		nil,
	)
	return []*events.ParsedEvent{
		ParsedEvent_T(t, inception),
		ParsedEvent_T(t, join),
	}
}
