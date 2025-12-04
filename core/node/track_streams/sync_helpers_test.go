package track_streams

import (
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/protocol"
)

// makeMiniblockWithNum creates a minimal valid miniblock with the specified miniblock number.
func makeMiniblockWithNum(t *testing.T, miniblockNum int64) *protocol.Miniblock {
	ctx := test.NewTestContext(t)
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(t, err)

	header := &protocol.MiniblockHeader{
		MiniblockNum: miniblockNum,
		Timestamp:    timestamppb.Now(),
		EventHashes:  [][]byte{},
		Content: &protocol.MiniblockHeader_None{
			None: &emptypb.Empty{},
		},
	}

	headerEnvelope, err := events.MakeEnvelopeWithPayload(
		wallet,
		events.Make_MiniblockHeader(header),
		nil,
	)
	require.NoError(t, err)

	return &protocol.Miniblock{
		Events: []*protocol.Envelope{},
		Header: headerEnvelope,
	}
}

func TestGetFirstMiniblockNumber_EmptyMiniblocks(t *testing.T) {
	require := require.New(t)

	// Empty slice should return error
	_, err := getFirstMiniblockNumber([]*protocol.Miniblock{})
	require.Error(err)
	require.Contains(err.Error(), "no miniblocks in response")
}

func TestGetFirstMiniblockNumber_NilMiniblocks(t *testing.T) {
	require := require.New(t)

	// Nil slice should return error
	_, err := getFirstMiniblockNumber(nil)
	require.Error(err)
	require.Contains(err.Error(), "no miniblocks in response")
}

func TestGetFirstMiniblockNumber_SingleMiniblock(t *testing.T) {
	require := require.New(t)

	// Create a miniblock with number 100
	mb := makeMiniblockWithNum(t, 100)

	num, err := getFirstMiniblockNumber([]*protocol.Miniblock{mb})
	require.NoError(err)
	require.Equal(int64(100), num)
}

func TestGetFirstMiniblockNumber_MultipleMiniblocks(t *testing.T) {
	require := require.New(t)

	// Create miniblocks with numbers 50, 51, 52
	mb1 := makeMiniblockWithNum(t, 50)
	mb2 := makeMiniblockWithNum(t, 51)
	mb3 := makeMiniblockWithNum(t, 52)

	// Should return the number from the first miniblock
	num, err := getFirstMiniblockNumber([]*protocol.Miniblock{mb1, mb2, mb3})
	require.NoError(err)
	require.Equal(int64(50), num)
}

func TestGetFirstMiniblockNumber_ZeroMiniblock(t *testing.T) {
	require := require.New(t)

	// Create genesis miniblock (number 0)
	mb := makeMiniblockWithNum(t, 0)

	num, err := getFirstMiniblockNumber([]*protocol.Miniblock{mb})
	require.NoError(err)
	require.Equal(int64(0), num)
}
