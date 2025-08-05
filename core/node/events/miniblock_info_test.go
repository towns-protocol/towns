package events

import (
	"bytes"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

// TestAsStorageMb_LegacySnapshot tests that genesis miniblocks with embedded snapshots
// correctly set the HasLegacySnapshot flag
func TestAsStorageMb_LegacySnapshot(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

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

	// Verify HasLegacySnapshot is true for genesis block
	require.True(t, storageMb.HasLegacySnapshot, "Genesis miniblock should have HasLegacySnapshot=true")

	// Verify snapshot is NOT in the separate snapshot field
	require.Empty(t, storageMb.Snapshot, "Genesis miniblock should not have separate snapshot field")

	// Verify the miniblock header contains the snapshot
	require.NotNil(t, mbInfo.Header().GetSnapshot(), "Genesis miniblock should have snapshot in header")
}

// TestAsStorageMb_NonLegacySnapshot tests miniblocks with separate snapshot envelopes
func TestAsStorageMb_NonLegacySnapshot(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	// Create a regular miniblock with non-legacy snapshot
	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	// Create snapshot separately
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)

	// Create parsed snapshot
	parsedSnapshot, err := MakeParsedSnapshot(wallet, snapshot)
	require.NoError(t, err)

	// Create miniblock header with snapshot hash (not embedded snapshot)
	header := &MiniblockHeader{
		MiniblockNum:   1,
		Timestamp:      NextMiniblockTimestamp(nil),
		EventHashes:    [][]byte{inception.Hash.Bytes()},
		SnapshotHash:   parsedSnapshot.Envelope.Hash,
		EventNumOffset: 1,
	}

	mbInfo, err := NewMiniblockInfoFromHeaderAndParsed(
		wallet,
		header,
		[]*ParsedEvent{inception},
		parsedSnapshot,
	)
	require.NoError(t, err)

	// Convert to storage descriptor
	storageMb, err := mbInfo.AsStorageMb()
	require.NoError(t, err)

	// Verify HasLegacySnapshot is false for non-legacy snapshot
	require.False(t, storageMb.HasLegacySnapshot, "Non-legacy miniblock should have HasLegacySnapshot=false")

	// Verify snapshot is in the separate snapshot field
	require.NotEmpty(t, storageMb.Snapshot, "Non-legacy miniblock should have separate snapshot field")

	// Verify the miniblock header does NOT contain embedded snapshot
	require.Nil(t, mbInfo.Header().GetSnapshot(), "Non-legacy miniblock should not have snapshot in header")
}

// TestAsStorageMb_NoSnapshot tests miniblocks without any snapshots
func TestAsStorageMb_NoSnapshot(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	event, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, common.Address{}, nil, nil),
		&MiniblockRef{Num: 0, Hash: common.BytesToHash([]byte("prevhash"))},
	)
	require.NoError(t, err)

	// Create miniblock header without snapshot
	header := &MiniblockHeader{
		MiniblockNum:             1,
		Timestamp:                NextMiniblockTimestamp(nil),
		EventHashes:              [][]byte{event.Hash.Bytes()},
		PrevMiniblockHash:        []byte("prevhash"),
		EventNumOffset:           1,
		PrevSnapshotMiniblockNum: 0,
	}

	mbInfo, err := NewMiniblockInfoFromHeaderAndParsed(wallet, header, []*ParsedEvent{event}, nil)
	require.NoError(t, err)

	// Convert to storage descriptor
	storageMb, err := mbInfo.AsStorageMb()
	require.NoError(t, err)

	// Verify both HasLegacySnapshot is false and Snapshot is empty
	require.False(t, storageMb.HasLegacySnapshot, "Miniblock without snapshot should have HasLegacySnapshot=false")
	require.Empty(t, storageMb.Snapshot, "Miniblock without snapshot should have empty snapshot field")
}

// TestAsStorageMbWithBytes_PreserveProvidedBytes tests that AsStorageMbWithBytes
// preserves the provided bytes instead of serializing
func TestAsStorageMbWithBytes_PreserveProvidedBytes(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	// Test with non-legacy snapshot (where snapshot is separate)
	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	// Create snapshot
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)

	// Create parsed snapshot
	parsedSnapshot, err := MakeParsedSnapshot(wallet, snapshot)
	require.NoError(t, err)

	// Create miniblock header with snapshot hash (not embedded)
	header := &MiniblockHeader{
		MiniblockNum:   1,
		Timestamp:      NextMiniblockTimestamp(nil),
		EventHashes:    [][]byte{inception.Hash.Bytes()},
		SnapshotHash:   parsedSnapshot.Envelope.Hash,
		EventNumOffset: 1,
	}

	mbInfo, err := NewMiniblockInfoFromHeaderAndParsed(
		wallet,
		header,
		[]*ParsedEvent{inception},
		parsedSnapshot,
	)
	require.NoError(t, err)

	// Provide custom bytes
	customMbBytes := []byte("custom_miniblock_bytes")
	customSnapshotBytes := []byte("custom_snapshot_bytes")

	// Convert with provided bytes
	storageMb, err := mbInfo.AsStorageMbWithBytes(customMbBytes, customSnapshotBytes)
	require.NoError(t, err)

	// Verify the provided bytes are used
	require.Equal(t, customMbBytes, storageMb.Data, "Should use provided miniblock bytes")
	require.Equal(t, customSnapshotBytes, storageMb.Snapshot, "Should use provided snapshot bytes")

	// For legacy snapshots (genesis), the snapshot is embedded in the miniblock data
	// so there's no separate snapshot field to preserve
	genesisMb, err := MakeGenesisMiniblock(wallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	genesisMbInfo, err := NewMiniblockInfoFromProto(genesisMb, nil, NewParsedMiniblockInfoOpts())
	require.NoError(t, err)

	// Convert genesis with provided bytes - only miniblock bytes are used
	storageMbGenesis, err := genesisMbInfo.AsStorageMbWithBytes(customMbBytes, customSnapshotBytes)
	require.NoError(t, err)

	// For legacy snapshots, only miniblock data is preserved, snapshot field stays empty
	require.Equal(t, customMbBytes, storageMbGenesis.Data, "Should use provided miniblock bytes for genesis")
	require.Empty(t, storageMbGenesis.Snapshot, "Genesis miniblock should not have separate snapshot field")
	require.True(t, storageMbGenesis.HasLegacySnapshot, "Genesis should have legacy snapshot flag")
}

// TestNewMiniblockInfoFromDescriptor_LegacySnapshot tests parsing miniblocks
// with legacy snapshots from storage descriptors
func TestNewMiniblockInfoFromDescriptor_LegacySnapshot(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	// Create genesis miniblock with legacy snapshot
	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	mb, err := MakeGenesisMiniblock(wallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	mbBytes, err := proto.Marshal(mb)
	require.NoError(t, err)

	// Create storage descriptor for legacy snapshot (no separate snapshot field)
	descriptor := &storage.MiniblockDescriptor{
		Number:            0,
		Data:              mbBytes,
		Snapshot:          nil, // Legacy snapshots don't use this field
		HasLegacySnapshot: true,
	}

	// Parse from descriptor
	mbInfo, err := NewMiniblockInfoFromDescriptor(descriptor)
	require.NoError(t, err)

	// Verify the miniblock was parsed correctly
	require.Equal(t, int64(0), mbInfo.Ref.Num)
	require.NotNil(t, mbInfo.Header().GetSnapshot(), "Should have snapshot in header for legacy format")
	require.Nil(t, mbInfo.SnapshotEnvelope, "Should not have separate snapshot envelope for legacy format")
}

// TestNewMiniblockInfoFromDescriptor_NonLegacySnapshot tests parsing miniblocks
// with non-legacy snapshots from storage descriptors
func TestNewMiniblockInfoFromDescriptor_NonLegacySnapshot(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	// Create snapshot
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)

	// Create parsed snapshot
	parsedSnapshot, err := MakeParsedSnapshot(wallet, snapshot)
	require.NoError(t, err)

	snapshotEnvelopeBytes, err := proto.Marshal(parsedSnapshot.Envelope)
	require.NoError(t, err)

	// Create miniblock with snapshot hash (not embedded)
	header := &MiniblockHeader{
		MiniblockNum:   1,
		Timestamp:      NextMiniblockTimestamp(nil),
		EventHashes:    [][]byte{inception.Hash.Bytes()},
		SnapshotHash:   parsedSnapshot.Envelope.Hash,
		EventNumOffset: 1,
	}

	headerEnvelope, err := MakeEnvelopeWithPayload(wallet, Make_MiniblockHeader(header), nil)
	require.NoError(t, err)

	mb := &Miniblock{
		Events: []*Envelope{inception.Envelope},
		Header: headerEnvelope,
	}

	mbBytes, err := proto.Marshal(mb)
	require.NoError(t, err)

	// Create storage descriptor with non-legacy snapshot
	descriptor := &storage.MiniblockDescriptor{
		Number:            1,
		Data:              mbBytes,
		Snapshot:          snapshotEnvelopeBytes,
		HasLegacySnapshot: false,
	}

	// Parse from descriptor
	mbInfo, err := NewMiniblockInfoFromDescriptor(descriptor)
	require.NoError(t, err)

	// Verify the miniblock was parsed correctly
	require.Equal(t, int64(1), mbInfo.Ref.Num)
	require.Nil(t, mbInfo.Header().GetSnapshot(), "Should not have snapshot in header for non-legacy format")
	require.NotNil(t, mbInfo.SnapshotEnvelope, "Should have separate snapshot envelope for non-legacy format")
	require.True(t, bytes.Equal(parsedSnapshot.Envelope.Hash, mbInfo.SnapshotEnvelope.Hash), "Snapshot hash should match")
}

// TestHasLegacySnapshot_GenesisMiniblock tests that genesis miniblocks
// are correctly identified as having legacy snapshots
func TestHasLegacySnapshot_GenesisMiniblock(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	mb, err := MakeGenesisMiniblock(wallet, []*ParsedEvent{inception})
	require.NoError(t, err)

	mbInfo, err := NewMiniblockInfoFromProto(mb, nil, NewParsedMiniblockInfoOpts())
	require.NoError(t, err)

	// Verify HasLegacySnapshot returns true for genesis block
	require.True(t, mbInfo.HasLegacySnapshot(), "Genesis miniblock should have legacy snapshot")
}

// TestHasLegacySnapshot_RegularMiniblock tests regular miniblocks
// with and without legacy snapshots
func TestHasLegacySnapshot_RegularMiniblock(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	// Test 1: Miniblock with non-legacy snapshot
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)

	// Create parsed snapshot
	parsedSnapshot, err := MakeParsedSnapshot(wallet, snapshot)
	require.NoError(t, err)

	header1 := &MiniblockHeader{
		MiniblockNum:   1,
		Timestamp:      NextMiniblockTimestamp(nil),
		EventHashes:    [][]byte{inception.Hash.Bytes()},
		SnapshotHash:   parsedSnapshot.Envelope.Hash,
		EventNumOffset: 1,
	}

	mbInfo1, err := NewMiniblockInfoFromHeaderAndParsed(
		wallet,
		header1,
		[]*ParsedEvent{inception},
		parsedSnapshot,
	)
	require.NoError(t, err)
	require.False(t, mbInfo1.HasLegacySnapshot(), "Miniblock with separate snapshot should not have legacy snapshot")

	// Test 2: Miniblock with no snapshot
	header2 := &MiniblockHeader{
		MiniblockNum:             2,
		Timestamp:                NextMiniblockTimestamp(nil),
		EventHashes:              [][]byte{inception.Hash.Bytes()},
		PrevMiniblockHash:        []byte("prevhash"),
		EventNumOffset:           2,
		PrevSnapshotMiniblockNum: 1,
	}

	mbInfo2, err := NewMiniblockInfoFromHeaderAndParsed(
		wallet,
		header2,
		[]*ParsedEvent{inception},
		nil,
	)
	require.NoError(t, err)
	require.False(t, mbInfo2.HasLegacySnapshot(), "Miniblock without snapshot should not have legacy snapshot")
}

// TestAsStorageMb_SnapshotHashMismatch tests error handling when
// snapshot envelope hash doesn't match the header hash
func TestAsStorageMb_SnapshotHashMismatch(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	// Create a fake snapshot with mismatched hash
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)

	// Create parsed snapshot and manually corrupt the hash
	parsedSnapshot, err := MakeParsedSnapshot(wallet, snapshot)
	require.NoError(t, err)
	// Corrupt the envelope hash
	parsedSnapshot.Envelope.Hash = []byte("wrong_hash")

	header := &MiniblockHeader{
		MiniblockNum:   1,
		Timestamp:      NextMiniblockTimestamp(nil),
		EventHashes:    [][]byte{inception.Hash.Bytes()},
		SnapshotHash:   []byte("different_hash"), // Mismatch!
		EventNumOffset: 1,
	}

	mbInfo, err := NewMiniblockInfoFromHeaderAndParsed(
		wallet,
		header,
		[]*ParsedEvent{inception},
		parsedSnapshot,
	)
	require.NoError(t, err)

	// Convert to storage descriptor should fail
	_, err = mbInfo.AsStorageMb()
	require.Error(t, err)
	require.Contains(t, err.Error(), "snapshot envelope hash does not match header snapshot hash")
}

// TestAsStorageMb_MissingSnapshotEnvelope tests error handling when
// header has snapshot hash but no envelope is provided
func TestAsStorageMb_MissingSnapshotEnvelope(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	header := &MiniblockHeader{
		MiniblockNum:   1,
		Timestamp:      NextMiniblockTimestamp(nil),
		EventHashes:    [][]byte{inception.Hash.Bytes()},
		SnapshotHash:   []byte("some_hash"), // Has hash but no envelope
		EventNumOffset: 1,
	}

	mbInfo, err := NewMiniblockInfoFromHeaderAndParsed(
		wallet,
		header,
		[]*ParsedEvent{inception},
		nil, // No snapshot envelope provided
	)
	require.NoError(t, err)

	// Convert to storage descriptor should fail
	_, err = mbInfo.AsStorageMb()
	require.Error(t, err)
	require.Contains(t, err.Error(), "snapshot hash is set in the miniblock header, but no snapshot envelope is provided")
}

// TestAsStorageMb_MixedSnapshots tests converting multiple miniblocks
// with different snapshot types
func TestAsStorageMb_MixedSnapshots(t *testing.T) {
	ctx := test.NewTestContext(t)
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)

	inception, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	// Create genesis with legacy snapshot
	genesisMb, err := MakeGenesisMiniblock(wallet, []*ParsedEvent{inception})
	require.NoError(t, err)
	genesisMbInfo, err := NewMiniblockInfoFromProto(genesisMb, nil, NewParsedMiniblockInfoOpts())
	require.NoError(t, err)

	// Create second miniblock with non-legacy snapshot
	event2, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Membership(MembershipOp_SO_JOIN, streamId, common.Address{}, nil, nil),
		genesisMbInfo.Ref,
	)
	require.NoError(t, err)

	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception, event2})
	require.NoError(t, err)

	// Create parsed snapshot
	parsedSnapshot, err := MakeParsedSnapshot(wallet, snapshot)
	require.NoError(t, err)

	header2 := &MiniblockHeader{
		MiniblockNum:      1,
		Timestamp:         NextMiniblockTimestamp(genesisMbInfo.Header().Timestamp),
		EventHashes:       [][]byte{event2.Hash.Bytes()},
		SnapshotHash:      parsedSnapshot.Envelope.Hash,
		PrevMiniblockHash: genesisMbInfo.Ref.Hash.Bytes(),
		EventNumOffset:    2,
	}

	mbInfo2, err := NewMiniblockInfoFromHeaderAndParsed(
		wallet,
		header2,
		[]*ParsedEvent{event2},
		parsedSnapshot,
	)
	require.NoError(t, err)

	// Create third miniblock without snapshot
	event3, err := MakeParsedEventWithPayload(
		wallet,
		Make_UserPayload_Membership(MembershipOp_SO_LEAVE, streamId, common.Address{}, nil, nil),
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

	// Convert all to storage descriptors
	storageMb1, err := genesisMbInfo.AsStorageMb()
	require.NoError(t, err)
	storageMb2, err := mbInfo2.AsStorageMb()
	require.NoError(t, err)
	storageMb3, err := mbInfo3.AsStorageMb()
	require.NoError(t, err)

	// Verify correct snapshot handling for each
	require.True(t, storageMb1.HasLegacySnapshot, "Genesis should have legacy snapshot")
	require.Empty(t, storageMb1.Snapshot, "Genesis should not have separate snapshot")

	require.False(t, storageMb2.HasLegacySnapshot, "MB2 should not have legacy snapshot")
	require.NotEmpty(t, storageMb2.Snapshot, "MB2 should have separate snapshot")

	require.False(t, storageMb3.HasLegacySnapshot, "MB3 should not have legacy snapshot")
	require.Empty(t, storageMb3.Snapshot, "MB3 should not have any snapshot")
}
