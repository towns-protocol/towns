package rpc

import (
	"context"
	"fmt"
	"sort"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
)

// MockExternalMediaStorage is a mock implementation of ExternalMediaStorage for testing
type MockExternalMediaStorage struct {
	createExternalMediaStreamCalls []StreamId
	uploadPartCalls                []UploadPartCall
	completeUploadCalls            []CompleteUploadCall
	abortUploadCalls               []AbortUploadCall
	createExternalMediaStreamError error
	uploadPartError                error
	completeUploadError            error
	abortUploadError               error
}

// Helper methods for test verification
func (m *MockExternalMediaStorage) Reset() {
	m.createExternalMediaStreamCalls = nil
	m.uploadPartCalls = nil
	m.completeUploadCalls = nil
	m.abortUploadCalls = nil
	m.createExternalMediaStreamError = nil
	m.uploadPartError = nil
	m.completeUploadError = nil
	m.abortUploadError = nil
}

func (m *MockExternalMediaStorage) GetCreateExternalMediaStreamCalls() []StreamId {
	return m.createExternalMediaStreamCalls
}

func (m *MockExternalMediaStorage) GetUploadPartCalls() []UploadPartCall {
	return m.uploadPartCalls
}

func (m *MockExternalMediaStorage) GetCompleteUploadCalls() []CompleteUploadCall {
	return m.completeUploadCalls
}

func (m *MockExternalMediaStorage) GetAbortUploadCalls() []AbortUploadCall {
	return m.abortUploadCalls
}

func (m *MockExternalMediaStorage) SetCreateExternalMediaStreamError(err error) {
	m.createExternalMediaStreamError = err
}

func (m *MockExternalMediaStorage) SetUploadPartError(err error) {
	m.uploadPartError = err
}

func (m *MockExternalMediaStorage) SetCompleteUploadError(err error) {
	m.completeUploadError = err
}

func (m *MockExternalMediaStorage) SetAbortUploadError(err error) {
	m.abortUploadError = err
}

type UploadPartCall struct {
	StreamId     StreamId
	Data         []byte
	UploadID     string
	MiniblockNum int64
}

type CompleteUploadCall struct {
	StreamId StreamId
	UploadID string
	Etags    []storage.Etag
}

type AbortUploadCall struct {
	StreamId StreamId
	UploadID string
}

func (m *MockExternalMediaStorage) CreateExternalMediaStream(ctx context.Context, streamId StreamId) (string, error) {
	m.createExternalMediaStreamCalls = append(m.createExternalMediaStreamCalls, streamId)
	if m.createExternalMediaStreamError != nil {
		return "", m.createExternalMediaStreamError
	}
	return "mock-upload-id-" + string(streamId[:8]), nil
}

func (m *MockExternalMediaStorage) UploadPartToExternalMediaStream(
	ctx context.Context,
	streamId StreamId,
	data []byte,
	uploadID string,
	miniblockNum int64,
) (storage.Etag, error) {
	m.uploadPartCalls = append(m.uploadPartCalls, UploadPartCall{
		StreamId:     streamId,
		Data:         data,
		UploadID:     uploadID,
		MiniblockNum: miniblockNum,
	})
	if m.uploadPartError != nil {
		return storage.Etag{}, m.uploadPartError
	}
	return storage.Etag{
		Miniblock: int(miniblockNum + 1),
		Etag:      "mock-etag-" + string(streamId[:8]) + "-" + fmt.Sprintf("%d", miniblockNum),
	}, nil
}

func (m *MockExternalMediaStorage) CompleteMediaStreamUpload(
	ctx context.Context,
	streamId StreamId,
	uploadID string,
	etags []storage.Etag,
) error {
	m.completeUploadCalls = append(m.completeUploadCalls, CompleteUploadCall{
		StreamId: streamId,
		UploadID: uploadID,
		Etags:    etags,
	})
	return m.completeUploadError
}

func (m *MockExternalMediaStorage) AbortMediaStreamUpload(
	ctx context.Context,
	streamId StreamId,
	uploadID string,
) error {
	m.abortUploadCalls = append(m.abortUploadCalls, AbortUploadCall{
		StreamId: streamId,
		UploadID: uploadID,
	})
	return m.abortUploadError
}

// TestExternalMediaStreamCreation tests media stream creation with external storage
func TestExternalMediaStreamCreation(t *testing.T) {
	const chunks = 10
	const nodes = 5
	const replicationFactor = 3
	iv := []byte{1, 3, 3}
	// Configure the service to use external media storage
	configUpdater := func(cfg *config.Config) {
		cfg.MediaStreamDataStorage = storage.StreamStorageTypeAWS
		cfg.ExternalMediaStreamDataBucket = "test-bucket"
		cfg.ExternalMediaStreamDataToken = "test-token"
	}

	tt := newServiceTester(
		t,
		serviceTesterOpts{
			numNodes:          nodes,
			replicationFactor: replicationFactor,
			start:             true,
			nodeStartOpts:     &startOpts{configUpdater: configUpdater},
		},
	)

	// Setup mock external storage after nodes are started
	mockStorage := &MockExternalMediaStorage{}
	for _, node := range tt.nodes {
		originalStorage := node.service.externalMediaStorage
		node.service.externalMediaStorage = mockStorage
		defer func() { node.service.externalMediaStorage = originalStorage }()
	}

	alice := tt.newTestClient(0, testClientOpts{})
	_ = alice.createUserStream()
	spaceId, _ := alice.createSpace()
	channelId, _, _ := alice.createChannel(spaceId)

	createMediaStream := func(firstChunk []byte) *protocol.CreationCookie {
		var err error
		mediaStreamId := testutils.FakeStreamId(STREAM_MEDIA_BIN)
		initialEvents := make([]*protocol.Envelope, 1, 2)

		// Create inception event
		trueVal := true
		initialEvents[0], err = events.MakeEnvelopeWithPayload(
			alice.wallet,
			events.Make_MediaPayload_Inception(&protocol.MediaPayload_Inception{
				StreamId:           mediaStreamId[:],
				ChannelId:          channelId[:],
				SpaceId:            spaceId[:],
				UserId:             alice.userId[:],
				ChunkCount:         chunks,
				PerChunkEncryption: &trueVal,
			}),
			nil,
		)
		tt.require.NoError(err)

		// Create first chunk event
		if len(firstChunk) > 0 {
			mp := events.Make_MediaPayload_Chunk(firstChunk, 0, iv)
			envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, nil)
			tt.require.NoError(err)
			initialEvents = append(initialEvents, envelope)
		}

		// Create media stream
		csResp, err := alice.client.CreateMediaStream(alice.ctx, connect.NewRequest(&protocol.CreateMediaStreamRequest{
			Events:   initialEvents,
			StreamId: mediaStreamId[:],
		}))
		tt.require.NoError(err)

		return csResp.Msg.GetNextCreationCookie()
	}

	t.Run("External media stream creation is called during media stream creation", func(t *testing.T) {
		mockStorage.Reset()

		// Create media stream without initial chunk
		creationCookie := createMediaStream(nil)

		// Verify that CreateExternalMediaStream was called (once for each node)
		createCalls := mockStorage.GetCreateExternalMediaStreamCalls()
		require.Len(t, createCalls, replicationFactor)
		streamId, err := StreamIdFromBytes(creationCookie.StreamId)
		require.NoError(t, err)
		for i := 0; i < replicationFactor; i++ {
			require.Equal(t, streamId, createCalls[i])
		}

		// Verify no other external storage methods were called yet
		require.Len(t, mockStorage.GetUploadPartCalls(), 0)
		require.Len(t, mockStorage.GetCompleteUploadCalls(), 0)
		require.Len(t, mockStorage.GetAbortUploadCalls(), 0)
	})

	t.Run("External media stream upload parts are called during media chunk uploads", func(t *testing.T) {
		mockStorage.Reset()

		// Create media stream with the first chunk
		creationCookie := createMediaStream(nil)
		mb := &MiniblockRef{
			Hash: common.BytesToHash(creationCookie.PrevMiniblockHash),
			Num:  creationCookie.MiniblockNum,
		}

		// Add media chunks
		mediaChunks := make([][]byte, chunks)
		for i := 0; i < chunks; i++ {
			// Create media chunk event
			mediaChunks[i] = []byte("chunk " + fmt.Sprint(i))
			mp := events.Make_MediaPayload_Chunk(mediaChunks[i], int32(i), iv)
			envelope, err := events.MakeEnvelopeWithPayload(alice.wallet, mp, mb)
			tt.require.NoError(err)

			// Add media chunk event
			aeResp, err := alice.client.AddMediaEvent(alice.ctx, connect.NewRequest(&protocol.AddMediaEventRequest{
				Event:          envelope,
				CreationCookie: creationCookie,
				Last:           i == chunks-1,
			}))
			tt.require.NoError(err)

			mb.Hash = common.BytesToHash(aeResp.Msg.CreationCookie.PrevMiniblockHash)
			mb.Num++
			creationCookie = aeResp.Msg.CreationCookie
		}

		// Verify external storage calls
		createCalls := mockStorage.GetCreateExternalMediaStreamCalls()
		require.Len(t, createCalls, replicationFactor)
		streamId, err := StreamIdFromBytes(creationCookie.StreamId)
		require.NoError(t, err)
		for i := 0; i < replicationFactor; i++ {
			require.Equal(t, streamId, createCalls[i])
		}

		uploadCalls := mockStorage.GetUploadPartCalls()
		require.Len(t, uploadCalls, chunks*replicationFactor)

		// Verify upload calls have correct data
		sort.Slice(uploadCalls, func(i, j int) bool {
			return uploadCalls[i].MiniblockNum < uploadCalls[j].MiniblockNum
		})
		for i, call := range uploadCalls {
			require.Equal(t, streamId, call.StreamId)
			// With replication, each miniblock number appears replicationFactor times in uploadCalls.
			require.Equal(t, int64((i/replicationFactor)+1), call.MiniblockNum)
			require.NotEmpty(t, call.Data)
		}

		// Verify completion was called
		completeCalls := mockStorage.GetCompleteUploadCalls()
		require.Len(t, completeCalls, replicationFactor)
		for i := 0; i < replicationFactor; i++ {
			require.Equal(t, streamId, completeCalls[i].StreamId)
		}
		require.Len(t, completeCalls[0].Etags, chunks)

		// Verify no abort calls
		require.Len(t, mockStorage.GetAbortUploadCalls(), 0)
	})
}
