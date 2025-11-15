package events

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

// TestStreamCreation_LegacySnapshot tests that streams created with genesis blocks
// (which have legacy snapshots) are correctly stored with HasLegacySnapshot flag
func TestStreamCreation_LegacySnapshot(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	// Create test storage
	streamStore := storage.NewTestStreamStore(ctx)
	t.Cleanup(streamStore.Close)

	// Create genesis miniblock with legacy snapshot (embedded in header)
	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	// MakeGenesisMiniblock creates a miniblock with snapshot embedded in header (legacy format)
	mb, err := MakeGenesisMiniblock(wallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	mbInfo, err := NewMiniblockInfoFromProto(mb, nil, NewParsedMiniblockInfoOpts())
	require.NoError(t, err)

	// Convert to storage descriptor
	storageMb, err := mbInfo.AsStorageMb()
	require.NoError(t, err)

	// Verify HasLegacySnapshot is set correctly
	require.True(t, storageMb.HasLegacySnapshot, "Genesis miniblock should have HasLegacySnapshot=true")
	require.Empty(t, storageMb.Snapshot, "Genesis miniblock should not have separate snapshot field")

	// Create stream storage with the genesis miniblock
	err = streamStore.Storage.CreateStreamStorage(ctx, streamId, storageMb)
	require.NoError(t, err)

	// Read back the stream and verify
	result, err := streamStore.Storage.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(t, err)
	require.Len(t, result.Miniblocks, 1)
	require.Equal(t, int64(0), result.Miniblocks[0].Number)
	require.Equal(t, storageMb.Data, result.Miniblocks[0].Data)
	require.Empty(t, result.Miniblocks[0].Snapshot, "Read genesis should not have separate snapshot")

	// Verify that the stream can be parsed correctly
	mbInfoRead, err := NewMiniblockInfoFromDescriptor(result.Miniblocks[0])
	require.NoError(t, err)
	require.NotNil(t, mbInfoRead.Header().GetSnapshot(), "Should have snapshot in header for legacy format")
	require.True(t, mbInfoRead.HasLegacySnapshot(), "Should be identified as legacy snapshot")
}

// TestStreamCreation_NonLegacySnapshot tests that streams with non-legacy snapshots
// are correctly stored with the snapshot in a separate field
func TestStreamCreation_NonLegacySnapshot(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	// Create test storage
	streamStore := storage.NewTestStreamStore(ctx)
	t.Cleanup(streamStore.Close)

	// First create genesis to establish the stream
	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	genesisMb, err := MakeGenesisMiniblock(wallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	genesisMbInfo, err := NewMiniblockInfoFromProto(genesisMb, nil, NewParsedMiniblockInfoOpts())
	require.NoError(t, err)

	storageGenesis, err := genesisMbInfo.AsStorageMb()
	require.NoError(t, err)

	// Create stream with genesis
	err = streamStore.Storage.CreateStreamStorage(ctx, streamId, storageGenesis)
	require.NoError(t, err)

	// Now create a miniblock with non-legacy snapshot
	event, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, common.Address{}, nil),
		genesisMbInfo.Ref,
	)
	require.NoError(t, err)

	// Create snapshot separately
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception, event})
	require.NoError(t, err)

	// Create parsed snapshot
	parsedSnapshot, err := MakeParsedSnapshot(wallet, snapshot)
	require.NoError(t, err)

	// Create miniblock header with snapshot hash (not embedded)
	header := &MiniblockHeader{
		MiniblockNum:      1,
		Timestamp:         NextMiniblockTimestamp(genesisMbInfo.Header().Timestamp),
		EventHashes:       [][]byte{event.Hash.Bytes()},
		SnapshotHash:      parsedSnapshot.Envelope.Hash,
		PrevMiniblockHash: genesisMbInfo.Ref.Hash.Bytes(),
		EventNumOffset:    2,
	}

	mbInfo, err := NewMiniblockInfoFromHeaderAndParsed(
		wallet,
		header,
		[]*ParsedEvent{event},
		parsedSnapshot,
	)
	require.NoError(t, err)

	// Convert to storage descriptor
	storageMb, err := mbInfo.AsStorageMb()
	require.NoError(t, err)

	// Verify HasLegacySnapshot is false and snapshot is separate
	require.False(t, storageMb.HasLegacySnapshot, "Non-legacy miniblock should have HasLegacySnapshot=false")
	require.NotEmpty(t, storageMb.Snapshot, "Non-legacy miniblock should have separate snapshot field")

	// Write the miniblock to storage
	err = streamStore.Storage.WriteMiniblocks(
		ctx,
		streamId,
		[]*storage.MiniblockDescriptor{storageMb},
		2,          // new minipool generation
		[][]byte{}, // new minipool events
		1,          // prev minipool generation
		0,          // prev minipool size
	)
	require.NoError(t, err)

	// Read back the stream and verify
	result, err := streamStore.Storage.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(t, err)
	require.Len(t, result.Miniblocks, 2) // Genesis + new miniblock

	// Verify the new miniblock
	require.Equal(t, int64(1), result.Miniblocks[1].Number)
	require.NotEmpty(t, result.Miniblocks[1].Snapshot, "Should have separate snapshot")

	// Verify that the miniblock can be parsed correctly
	mbInfoRead, err := NewMiniblockInfoFromDescriptor(result.Miniblocks[1])
	require.NoError(t, err)
	require.Nil(t, mbInfoRead.Header().GetSnapshot(), "Should not have snapshot in header for non-legacy format")
	require.NotNil(t, mbInfoRead.SnapshotEnvelope, "Should have separate snapshot envelope")
	require.False(t, mbInfoRead.HasLegacySnapshot(), "Should not be identified as legacy snapshot")
}

// TestStreamStorage_VerifyHasLegacySnapshotFlag tests that the HasLegacySnapshot flag
// is correctly used when storing miniblocks
func TestStreamStorage_VerifyHasLegacySnapshotFlag(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	// Create test storage
	streamStore := storage.NewTestStreamStore(ctx)
	t.Cleanup(streamStore.Close)

	// Create genesis miniblock with legacy snapshot
	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	genesisMb, err := MakeGenesisMiniblock(wallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	genesisMbInfo, err := NewMiniblockInfoFromProto(genesisMb, nil, NewParsedMiniblockInfoOpts())
	require.NoError(t, err)

	// Convert to storage and verify flag
	storageGenesis, err := genesisMbInfo.AsStorageMb()
	require.NoError(t, err)
	require.True(t, storageGenesis.HasLegacySnapshot, "Genesis should have legacy snapshot flag")

	// Create stream
	err = streamStore.Storage.CreateStreamStorage(ctx, streamId, storageGenesis)
	require.NoError(t, err)

	// Read debug data to verify snapshot index
	debugData, err := streamStore.Storage.DebugReadStreamData(ctx, streamId)
	require.NoError(t, err)
	require.Equal(t, int64(0), debugData.LatestSnapshotMiniblockNum, "Genesis snapshot should be at index 0")

	// Add miniblocks without snapshots
	var miniblocks []*storage.MiniblockDescriptor
	for i := 1; i <= 3; i++ {
		event, err := MakeParsedEventWithPayload(
			wallet,
			Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, common.Address{byte(i)}, nil),
			&MiniblockRef{Num: int64(i - 1), Hash: common.BytesToHash([]byte{byte(i - 1)})},
		)
		require.NoError(t, err)

		header := &MiniblockHeader{
			MiniblockNum:             int64(i),
			Timestamp:                NextMiniblockTimestamp(nil),
			EventHashes:              [][]byte{event.Hash.Bytes()},
			PrevMiniblockHash:        []byte{byte(i - 1)},
			EventNumOffset:           int64(i + 1),
			PrevSnapshotMiniblockNum: 0,
		}

		mbInfo, err := NewMiniblockInfoFromHeaderAndParsed(wallet, header, []*ParsedEvent{event}, nil)
		require.NoError(t, err)

		storageMb, err := mbInfo.AsStorageMb()
		require.NoError(t, err)

		require.False(
			t,
			storageMb.HasLegacySnapshot,
			"Regular miniblock without snapshot should have HasLegacySnapshot=false",
		)
		miniblocks = append(miniblocks, storageMb)
	}

	// Write miniblocks
	err = streamStore.Storage.WriteMiniblocks(ctx, streamId, miniblocks, 4, [][]byte{}, 1, 0)
	require.NoError(t, err)

	// Verify snapshot index didn't change (still points to genesis)
	debugData, err = streamStore.Storage.DebugReadStreamData(ctx, streamId)
	require.NoError(t, err)
	require.Equal(t, int64(0), debugData.LatestSnapshotMiniblockNum, "Snapshot index should still be 0")

	// Now add a miniblock with a legacy snapshot
	event4, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Membership(MembershipOp_SO_LEAVE, streamId, common.Address{4}, nil),
		&MiniblockRef{Num: 3, Hash: common.BytesToHash([]byte{3})},
	)
	require.NoError(t, err)

	// Create miniblock with embedded snapshot (simulating legacy format)
	allEvents := []*ParsedEvent{inception, event4}
	snapshot, err := Make_GenesisSnapshot(allEvents)
	require.NoError(t, err)

	header4 := &MiniblockHeader{
		MiniblockNum:             4,
		Timestamp:                NextMiniblockTimestamp(nil),
		EventHashes:              [][]byte{event4.Hash.Bytes()},
		PrevMiniblockHash:        []byte{3},
		EventNumOffset:           5,
		PrevSnapshotMiniblockNum: 0,
		Snapshot:                 snapshot, // Embedded snapshot (legacy)
	}

	mbInfo4, err := NewMiniblockInfoFromHeaderAndParsed(wallet, header4, []*ParsedEvent{event4}, nil)
	require.NoError(t, err)

	storageMb4, err := mbInfo4.AsStorageMb()
	require.NoError(t, err)

	require.True(t, storageMb4.HasLegacySnapshot, "Miniblock with embedded snapshot should have HasLegacySnapshot=true")

	// Write the miniblock with legacy snapshot
	err = streamStore.Storage.WriteMiniblocks(
		ctx,
		streamId,
		[]*storage.MiniblockDescriptor{storageMb4},
		5,
		[][]byte{},
		4,
		0,
	)
	require.NoError(t, err)

	// Verify snapshot index advanced to block 4
	debugData, err = streamStore.Storage.DebugReadStreamData(ctx, streamId)
	require.NoError(t, err)
	require.Equal(t, int64(4), debugData.LatestSnapshotMiniblockNum, "Snapshot index should advance to block 4")
}

// TestStreamReinitialize_MixedSnapshots tests reinitializing streams with
// both legacy and non-legacy snapshots
func TestStreamReinitialize_MixedSnapshots(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	// Create test storage
	streamStore := storage.NewTestStreamStore(ctx)
	t.Cleanup(streamStore.Close)

	// Create genesis with legacy snapshot
	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	genesisMb, err := MakeGenesisMiniblock(wallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	genesisMbInfo, err := NewMiniblockInfoFromProto(genesisMb, nil, NewParsedMiniblockInfoOpts())
	require.NoError(t, err)

	storageGenesis, err := genesisMbInfo.AsStorageMb()
	require.NoError(t, err)

	// Create second miniblock with non-legacy snapshot
	event2, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, common.Address{}, nil),
		genesisMbInfo.Ref,
	)
	require.NoError(t, err)

	snapshot2, err := Make_GenesisSnapshot([]*ParsedEvent{inception, event2})
	require.NoError(t, err)

	parsedSnapshot2, err := MakeParsedSnapshot(wallet, snapshot2)
	require.NoError(t, err)

	header2 := &MiniblockHeader{
		MiniblockNum:      1,
		Timestamp:         NextMiniblockTimestamp(genesisMbInfo.Header().Timestamp),
		EventHashes:       [][]byte{event2.Hash.Bytes()},
		SnapshotHash:      parsedSnapshot2.Envelope.Hash,
		PrevMiniblockHash: genesisMbInfo.Ref.Hash.Bytes(),
		EventNumOffset:    2,
	}

	mbInfo2, err := NewMiniblockInfoFromHeaderAndParsed(
		wallet,
		header2,
		[]*ParsedEvent{event2},
		parsedSnapshot2,
	)
	require.NoError(t, err)

	storageMb2, err := mbInfo2.AsStorageMb()
	require.NoError(t, err)

	// Create third miniblock without snapshot
	event3, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Membership(MembershipOp_SO_LEAVE, streamId, common.Address{}, nil),
		mbInfo2.Ref,
	)
	require.NoError(t, err)

	header3 := &MiniblockHeader{
		MiniblockNum:             2,
		Timestamp:                NextMiniblockTimestamp(mbInfo2.Header().Timestamp),
		EventHashes:              [][]byte{event3.Hash.Bytes()},
		PrevMiniblockHash:        mbInfo2.Ref.Hash.Bytes(),
		EventNumOffset:           3,
		PrevSnapshotMiniblockNum: 1,
	}

	mbInfo3, err := NewMiniblockInfoFromHeaderAndParsed(
		wallet,
		header3,
		[]*ParsedEvent{event3},
		nil,
	)
	require.NoError(t, err)

	storageMb3, err := mbInfo3.AsStorageMb()
	require.NoError(t, err)

	// Prepare miniblocks for reinitialization
	miniblocks := []*storage.MiniblockDescriptor{
		storageGenesis, // Has legacy snapshot
		storageMb2,     // Has non-legacy snapshot
		storageMb3,     // No snapshot
	}

	// Reinitialize stream with mixed snapshots
	err = streamStore.Storage.ReinitializeStreamStorage(
		ctx,
		streamId,
		miniblocks,
		1,     // Last snapshot is at index 1 (non-legacy)
		false, // Don't update existing
	)
	require.NoError(t, err)

	// Read back and verify
	result, err := streamStore.Storage.ReadStreamFromLastSnapshot(ctx, streamId, 10)
	require.NoError(t, err)
	require.Len(t, result.Miniblocks, 3)

	// Verify each miniblock type
	mb0Read, err := NewMiniblockInfoFromDescriptor(result.Miniblocks[0])
	require.NoError(t, err)
	require.True(t, mb0Read.HasLegacySnapshot(), "Genesis should have legacy snapshot")

	mb1Read, err := NewMiniblockInfoFromDescriptor(result.Miniblocks[1])
	require.NoError(t, err)
	require.False(t, mb1Read.HasLegacySnapshot(), "MB1 should have non-legacy snapshot")
	require.NotNil(t, mb1Read.SnapshotEnvelope, "MB1 should have snapshot envelope")

	mb2Read, err := NewMiniblockInfoFromDescriptor(result.Miniblocks[2])
	require.NoError(t, err)
	require.False(t, mb2Read.HasLegacySnapshot(), "MB2 should not have any snapshot")
	require.Nil(t, mb2Read.SnapshotEnvelope, "MB2 should not have snapshot envelope")

	// Verify snapshot index points to MB1
	require.Equal(t, 1, result.SnapshotMiniblockOffset, "Snapshot should be at index 1")

	// Verify debug data
	debugData, err := streamStore.Storage.DebugReadStreamData(ctx, streamId)
	require.NoError(t, err)
	require.Equal(t, int64(1), debugData.LatestSnapshotMiniblockNum, "Latest snapshot should be at miniblock 1")
}
