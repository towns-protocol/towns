package handler

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestValidateModifySync(t *testing.T) {
	toCookie := func(id shared.StreamId) *protocol.SyncCookie {
		return &protocol.SyncCookie{StreamId: id.Bytes()}
	}

	tests := []struct {
		name        string
		req         *protocol.ModifySyncRequest
		streamCache func() *stubStreamCache
		wantErr     bool
		errCode     protocol.Err
		msg         string
	}{
		{
			name:        "empty request",
			req:         &protocol.ModifySyncRequest{},
			streamCache: newStubStreamCache,
			wantErr:     true,
			errCode:     protocol.Err_INVALID_ARGUMENT,
			msg:         "Empty modify sync request",
		},
		{
			name: "invalid backfill stream",
			req: &protocol.ModifySyncRequest{
				BackfillStreams: &protocol.ModifySyncRequest_Backfill{
					Streams: []*protocol.SyncCookie{
						{StreamId: []byte{0x01}},
					},
				},
			},
			streamCache: newStubStreamCache,
			wantErr:     true,
			errCode:     protocol.Err_INVALID_ARGUMENT,
			msg:         "Invalid stream in backfill list",
		},
		{
			name: "duplicate backfill stream",
			req: &protocol.ModifySyncRequest{
				BackfillStreams: &protocol.ModifySyncRequest_Backfill{
					Streams: func() []*protocol.SyncCookie {
						sid := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
						return []*protocol.SyncCookie{toCookie(sid), toCookie(sid)}
					}(),
				},
			},
			streamCache: newStubStreamCache,
			wantErr:     true,
			errCode:     protocol.Err_INVALID_ARGUMENT,
			msg:         "Duplicate stream in backfill list",
		},
		{
			name: "invalid add stream",
			req: &protocol.ModifySyncRequest{
				AddStreams: []*protocol.SyncCookie{
					{StreamId: []byte{0x01}},
				},
			},
			streamCache: newStubStreamCache,
			wantErr:     true,
			errCode:     protocol.Err_INVALID_ARGUMENT,
			msg:         "Invalid stream in add list",
		},
		{
			name: "duplicate add stream",
			req: func() *protocol.ModifySyncRequest {
				sid := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
				return &protocol.ModifySyncRequest{
					AddStreams: []*protocol.SyncCookie{toCookie(sid), toCookie(sid)},
				}
			}(),
			streamCache: func() *stubStreamCache {
				// Need the stream to exist so we hit the duplicate check on second iteration
				cache := newStubStreamCache()
				cache.stream = &events.Stream{} // Return a valid stream for any lookup
				return cache
			},
			wantErr: true,
			errCode: protocol.Err_INVALID_ARGUMENT,
			msg:     "Duplicate stream in add list",
		},
		{
			name: "add stream not found in cache",
			req: func() *protocol.ModifySyncRequest {
				sid := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
				return &protocol.ModifySyncRequest{
					AddStreams: []*protocol.SyncCookie{toCookie(sid)},
				}
			}(),
			streamCache: func() *stubStreamCache {
				cache := newStubStreamCache()
				cache.err = base.RiverError(protocol.Err_NOT_FOUND, "stream not found")
				return cache
			},
			wantErr: true,
			errCode: protocol.Err_NOT_FOUND,
			msg:     "Stream not found",
		},
		{
			name: "invalid remove stream",
			req: &protocol.ModifySyncRequest{
				RemoveStreams: [][]byte{
					{0x01},
				},
			},
			streamCache: newStubStreamCache,
			wantErr:     true,
			errCode:     protocol.Err_INVALID_ARGUMENT,
			msg:         "Invalid stream in remove list",
		},
		{
			name: "duplicate remove stream",
			req: &protocol.ModifySyncRequest{
				RemoveStreams: func() [][]byte {
					sid := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
					return [][]byte{sid.Bytes(), sid.Bytes()}
				}(),
			},
			streamCache: newStubStreamCache,
			wantErr:     true,
			errCode:     protocol.Err_INVALID_ARGUMENT,
			msg:         "Duplicate stream in remove list",
		},
		{
			name: "remove overlaps add",
			req: func() *protocol.ModifySyncRequest {
				sid := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
				return &protocol.ModifySyncRequest{
					AddStreams:    []*protocol.SyncCookie{toCookie(sid)},
					RemoveStreams: [][]byte{sid.Bytes()},
				}
			}(),
			streamCache: func() *stubStreamCache {
				// Return a non-nil stream for any lookup so add validation passes
				cache := newStubStreamCache()
				cache.stream = nil
				return cache
			},
			wantErr: true,
			errCode: protocol.Err_INVALID_ARGUMENT,
			msg:     "Stream in remove list is also in add list",
		},
		{
			name: "valid request",
			req: func() *protocol.ModifySyncRequest {
				backfillID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
				add1 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
				add2 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
				removeID := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
				return &protocol.ModifySyncRequest{
					BackfillStreams: &protocol.ModifySyncRequest_Backfill{
						Streams: []*protocol.SyncCookie{toCookie(backfillID)},
					},
					AddStreams:    []*protocol.SyncCookie{toCookie(add1), toCookie(add2)},
					RemoveStreams: [][]byte{removeID.Bytes()},
				}
			}(),
			streamCache: func() *stubStreamCache {
				cache := newStubStreamCache()
				cache.stream = nil
				return cache
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cache := tc.streamCache()

			// For tests that need streams to exist, add them to the cache
			if !tc.wantErr || tc.name == "remove overlaps add" {
				for _, cookie := range tc.req.GetAddStreams() {
					sid, err := shared.StreamIdFromBytes(cookie.GetStreamId())
					if err == nil {
						cache.AddStream(sid)
					}
				}
			}

			err := validateModifySync(context.Background(), cache, tc.req)
			if !tc.wantErr {
				require.NoError(t, err)
				return
			}

			require.Error(t, err)
			var riverErr *base.RiverErrorImpl
			require.True(t, errors.As(err, &riverErr))
			require.Equal(t, tc.msg, riverErr.Msg)
			require.Equal(t, tc.errCode, riverErr.Code)
		})
	}
}
