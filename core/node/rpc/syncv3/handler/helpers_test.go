package handler

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func TestValidateModifySync(t *testing.T) {
	toCookie := func(id shared.StreamId) *protocol.SyncCookie {
		return &protocol.SyncCookie{StreamId: id.Bytes()}
	}

	tests := []struct {
		name    string
		req     *protocol.ModifySyncRequest
		wantErr bool
		msg     string
	}{
		{
			name:    "empty request",
			req:     &protocol.ModifySyncRequest{},
			wantErr: true,
			msg:     "Empty modify sync request",
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
			wantErr: true,
			msg:     "Invalid stream in backfill list",
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
			wantErr: true,
			msg:     "Duplicate stream in backfill list",
		},
		{
			name: "invalid add stream",
			req: &protocol.ModifySyncRequest{
				AddStreams: []*protocol.SyncCookie{
					{StreamId: []byte{0x01}},
				},
			},
			wantErr: true,
			msg:     "Invalid stream in add list",
		},
		{
			name: "duplicate add stream",
			req: &protocol.ModifySyncRequest{
				AddStreams: func() []*protocol.SyncCookie {
					sid := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
					return []*protocol.SyncCookie{toCookie(sid), toCookie(sid)}
				}(),
			},
			wantErr: true,
			msg:     "Duplicate stream in add list",
		},
		{
			name: "invalid remove stream",
			req: &protocol.ModifySyncRequest{
				RemoveStreams: [][]byte{
					{0x01},
				},
			},
			wantErr: true,
			msg:     "Invalid stream in remove list",
		},
		{
			name: "duplicate remove stream",
			req: &protocol.ModifySyncRequest{
				RemoveStreams: func() [][]byte {
					sid := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
					return [][]byte{sid.Bytes(), sid.Bytes()}
				}(),
			},
			wantErr: true,
			msg:     "Duplicate stream in remove list",
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
			wantErr: true,
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
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateModifySync(tc.req)
			if !tc.wantErr {
				require.NoError(t, err)
				return
			}

			require.Error(t, err)
			var riverErr *base.RiverErrorImpl
			require.True(t, errors.As(err, &riverErr))
			require.Equal(t, tc.msg, riverErr.Msg)
			require.Equal(t, protocol.Err_INVALID_ARGUMENT, riverErr.Code)
		})
	}
}
