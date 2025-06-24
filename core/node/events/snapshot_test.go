package events

import (
	"fmt"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

const (
	AES_GCM_DERIVED_ALGORITHM = "r.aes-256-gcm.derived"
)

func make_User_Inception(wallet *crypto.Wallet, streamId StreamId, t *testing.T) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId, nil),
		nil,
	)
	assert.NoError(t, err)

	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func make_Space_Inception(wallet *crypto.Wallet, streamId StreamId, t *testing.T) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_SpacePayload_Inception(streamId, nil),
		nil,
	)
	assert.NoError(t, err)

	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func make_User_Membership(
	wallet *crypto.Wallet,
	membershipOp MembershipOp,
	streamId StreamId,
	prevMiniblock *MiniblockRef,
	t *testing.T,
) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(
			membershipOp,
			streamId,
			common.Address{},
			nil,
			nil,
		),
		prevMiniblock,
	)
	assert.NoError(t, err)
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func make_Space_Membership(
	wallet *crypto.Wallet,
	membershipOp MembershipOp,
	userId string,
	prevMiniblock *MiniblockRef,
	t *testing.T,
) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_SpacePayload_Membership(
			membershipOp,
			userId,
			userId,
		),
		prevMiniblock,
	)
	assert.NoError(t, err)
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func make_Space_Image(
	wallet *crypto.Wallet,
	ciphertext string,
	prevMiniblock *MiniblockRef,
	t *testing.T,
) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_SpacePayload_SpaceImage(
			ciphertext,
			AES_GCM_DERIVED_ALGORITHM,
		),
		prevMiniblock,
	)
	assert.NoError(t, err)
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func make_Space_Username(
	wallet *crypto.Wallet,
	username string,
	prevMiniblock *MiniblockRef,
	t *testing.T,
) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MemberPayload_Username(
			&EncryptedData{Ciphertext: username},
		),
		prevMiniblock,
	)
	assert.NoError(t, err)
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func make_Space_DisplayName(
	wallet *crypto.Wallet,
	displayName string,
	prevMiniblock *MiniblockRef,
	t *testing.T,
) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MemberPayload_DisplayName(
			&EncryptedData{Ciphertext: displayName},
		),
		prevMiniblock,
	)
	assert.NoError(t, err)
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func TestMakeSnapshot(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)
	inception := make_User_Inception(wallet, streamId, t)
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	assert.NoError(t, err)
	assert.Equal(
		t,
		streamId[:],
		snapshot.Content.(*Snapshot_UserContent).UserContent.Inception.StreamId)
}

func TestUpdateSnapshot(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)
	inception := make_User_Inception(wallet, streamId, t)
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	assert.NoError(t, err)

	membership := make_User_Membership(wallet, MembershipOp_SO_JOIN, streamId, nil, t)
	err = Update_Snapshot(snapshot, membership, 0, 1)
	assert.NoError(t, err)
	foundUserMembership, err := findUserMembership(
		snapshot.Content.(*Snapshot_UserContent).UserContent.Memberships,
		streamId[:],
	)
	assert.NoError(t, err)
	assert.Equal(
		t,
		MembershipOp_SO_JOIN,
		foundUserMembership.Op,
	)
}

func TestCloneAndUpdateUserSnapshot(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)
	inception := make_User_Inception(wallet, streamId, t)
	snapshot1, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	assert.NoError(t, err)

	snapshot := proto.Clone(snapshot1).(*Snapshot)

	membership := make_User_Membership(wallet, MembershipOp_SO_JOIN, streamId, nil, t)
	err = Update_Snapshot(snapshot, membership, 0, 1)
	assert.NoError(t, err)
	foundUserMembership, err := findUserMembership(
		snapshot.Content.(*Snapshot_UserContent).UserContent.Memberships,
		streamId[:],
	)
	assert.NoError(t, err)
	assert.Equal(
		t,
		MembershipOp_SO_JOIN,
		foundUserMembership.Op,
	)
}

func TestCloneAndUpdateSpaceSnapshot(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)
	inception := make_Space_Inception(wallet, streamId, t)
	snapshot1, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	assert.NoError(t, err)
	userId, err := AddressHex(inception.Event.CreatorAddress)
	assert.NoError(t, err)

	snapshot := proto.Clone(snapshot1).(*Snapshot)

	membership := make_Space_Membership(wallet, MembershipOp_SO_JOIN, userId, nil, t)
	username := make_Space_Username(wallet, "bob", nil, t)
	displayName := make_Space_DisplayName(wallet, "bobIsTheGreatest", nil, t)
	imageCipertext := "space_image_ciphertext"
	image := make_Space_Image(wallet, imageCipertext, nil, t)
	events := []*ParsedEvent{membership, username, displayName, image}
	for i, event := range events[:] {
		err = Update_Snapshot(snapshot, event, 1, int64(3+i))
		assert.NoError(t, err)
	}

	member, err := findMember(snapshot.Members.Joined, inception.Event.CreatorAddress)
	require.NoError(t, err)

	assert.Equal(
		t,
		inception.Event.CreatorAddress,
		snapshot.Members.Joined[0].UserAddress,
	)
	assert.Equal(
		t,
		"bob",
		member.Username.Data.Ciphertext,
	)
	assert.Equal(
		t,
		"bobIsTheGreatest",
		member.DisplayName.Data.Ciphertext,
	)
	assert.Equal(
		t,
		int64(4),
		member.Username.EventNum,
	)
	assert.Equal(
		t,
		int64(5),
		member.DisplayName.EventNum,
	)

	assert.Equal(
		t,
		imageCipertext,
		snapshot.Content.(*Snapshot_SpaceContent).SpaceContent.SpaceImage.Data.Ciphertext,
	)
	assert.Equal(
		t,
		AES_GCM_DERIVED_ALGORITHM,
		snapshot.Content.(*Snapshot_SpaceContent).SpaceContent.SpaceImage.Data.Algorithm,
	)
}

func TestUpdateSnapshotFailsIfInception(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	streamId := UserStreamIdFromAddr(wallet.Address)
	inception := make_User_Inception(wallet, streamId, t)
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	assert.NoError(t, err)

	err = Update_Snapshot(snapshot, inception, 0, 1)
	assert.Error(t, err)
}

// Helper functions for metadata payload tests

func make_Metadata_Inception(t *testing.T, wallet *crypto.Wallet, streamId StreamId) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MetadataPayload_Inception(streamId, nil),
		nil,
	)
	require.NoError(t, err)

	parsed, err := ParseEvent(envelope)
	require.NoError(t, err)
	return parsed
}

func make_Metadata_NewStream(
	t *testing.T,
	wallet *crypto.Wallet,
	streamId StreamId,
	genesisMiniblockHash common.Hash,
	nodeAddresses []common.Address,
	replicationFactor int64,
	prevMiniblock *MiniblockRef,
) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MetadataPayload_NewStream(streamId, genesisMiniblockHash, nodeAddresses, replicationFactor),
		prevMiniblock,
	)
	require.NoError(t, err)

	parsed, err := ParseEvent(envelope)
	require.NoError(t, err)
	return parsed
}

func make_Metadata_LastMiniblockUpdate(
	t *testing.T,
	wallet *crypto.Wallet,
	streamId StreamId,
	lastMiniblockHash common.Hash,
	lastMiniblockNum int64,
	prevMiniblock *MiniblockRef,
) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MetadataPayload_LastMiniblockUpdate(streamId, lastMiniblockHash, lastMiniblockNum),
		prevMiniblock,
	)
	require.NoError(t, err)

	parsed, err := ParseEvent(envelope)
	require.NoError(t, err)
	return parsed
}

func make_Metadata_PlacementUpdate(
	t *testing.T,
	wallet *crypto.Wallet,
	streamId StreamId,
	nodeAddresses []common.Address,
	replicationFactor int64,
	prevMiniblock *MiniblockRef,
) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MetadataPayload_PlacementUpdate(streamId, nodeAddresses, replicationFactor),
		prevMiniblock,
	)
	require.NoError(t, err)

	parsed, err := ParseEvent(envelope)
	require.NoError(t, err)
	return parsed
}

// Test metadata snapshot creation and updates

func TestMakeMetadataSnapshot(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	streamId := MetadataStreamIdFromShard(0)
	inception := make_Metadata_Inception(t, wallet, streamId)
	
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)
	
	// Verify the snapshot content is correctly set up
	metadataContent := snapshot.Content.(*Snapshot_MetadataContent)
	require.NotNil(t, metadataContent)
	require.NotNil(t, metadataContent.MetadataContent)
	require.NotNil(t, metadataContent.MetadataContent.Inception)
	assert.Equal(t, streamId[:], metadataContent.MetadataContent.Inception.StreamId)
	assert.Empty(t, metadataContent.MetadataContent.Streams)
}

func TestUpdateMetadataSnapshot_NewStream(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	metadataStreamId := MetadataStreamIdFromShard(0)
	
	// Create metadata stream snapshot
	inception := make_Metadata_Inception(t, wallet, metadataStreamId)
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)
	
	// Create a NewStream event
	testStreamId := UserStreamIdFromAddr(wallet.Address)
	genesisMiniblockHash := common.HexToHash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").Bytes()
	nodes := [][]byte{wallet.Address.Bytes(), common.HexToAddress("0x1234").Bytes()}
	replicationFactor := int64(2)
	
	// Convert data to proper types
	genesisHash := common.BytesToHash(genesisMiniblockHash)
	nodeAddresses := make([]common.Address, len(nodes))
	for i, node := range nodes {
		nodeAddresses[i] = common.BytesToAddress(node)
	}

	newStreamEvent := make_Metadata_NewStream(
		t,
		wallet,
		testStreamId,
		genesisHash,
		nodeAddresses,
		replicationFactor,
		nil,
	)
	
	// Update snapshot with NewStream event
	err = Update_Snapshot(snapshot, newStreamEvent, 0, 1)
	require.NoError(t, err)
	
	// Verify the stream was added to the snapshot
	metadataContent := snapshot.Content.(*Snapshot_MetadataContent)
	require.Len(t, metadataContent.MetadataContent.Streams, 1)
	
	streamRecord := metadataContent.MetadataContent.Streams[0]
	assert.Equal(t, testStreamId[:], streamRecord.StreamId)
	assert.Equal(t, genesisMiniblockHash, streamRecord.LastMiniblockHash)
	assert.Equal(t, int64(0), streamRecord.LastMiniblockNum) // Genesis miniblock is always 0
	assert.Equal(t, nodes, streamRecord.Nodes)
	assert.Equal(t, replicationFactor, streamRecord.ReplicationFactor)
}

func TestUpdateMetadataSnapshot_LastMiniblockUpdate(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	metadataStreamId := MetadataStreamIdFromShard(0)
	
	// Create metadata stream snapshot with an existing stream
	inception := make_Metadata_Inception(t, wallet, metadataStreamId)
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)
	
	// Add a stream first
	testStreamId := UserStreamIdFromAddr(wallet.Address)
	genesisMiniblockHash := []byte("test_genesis_hash")
	nodes := [][]byte{wallet.Address.Bytes()}
	replicationFactor := int64(1)
	
	// Convert data to proper types
	genesisHash := common.BytesToHash(genesisMiniblockHash)
	nodeAddresses := make([]common.Address, len(nodes))
	for i, node := range nodes {
		nodeAddresses[i] = common.BytesToAddress(node)
	}

	newStreamEvent := make_Metadata_NewStream(
		t,
		wallet,
		testStreamId,
		genesisHash,
		nodeAddresses,
		replicationFactor,
		nil,
	)
	
	err = Update_Snapshot(snapshot, newStreamEvent, 0, 1)
	require.NoError(t, err)
	
	// Now update the stream's last miniblock
	newMiniblockHash := common.HexToHash("0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321").Bytes()
	newMiniblockNum := int64(5)
	
	// Convert data to proper types
	newHash := common.BytesToHash(newMiniblockHash)

	updateEvent := make_Metadata_LastMiniblockUpdate(
		t,
		wallet,
		testStreamId,
		newHash,
		newMiniblockNum,
		nil,
	)
	
	err = Update_Snapshot(snapshot, updateEvent, 0, 2)
	require.NoError(t, err)
	
	// Verify the stream record was updated
	metadataContent := snapshot.Content.(*Snapshot_MetadataContent)
	require.Len(t, metadataContent.MetadataContent.Streams, 1)
	
	streamRecord := metadataContent.MetadataContent.Streams[0]
	assert.Equal(t, testStreamId[:], streamRecord.StreamId)
	assert.Equal(t, newMiniblockHash, streamRecord.LastMiniblockHash)
	assert.Equal(t, newMiniblockNum, streamRecord.LastMiniblockNum)
	// Nodes and replication factor should remain unchanged
	assert.Equal(t, nodes, streamRecord.Nodes)
	assert.Equal(t, replicationFactor, streamRecord.ReplicationFactor)
}

func TestUpdateMetadataSnapshot_PlacementUpdate(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	metadataStreamId := MetadataStreamIdFromShard(0)
	
	// Create metadata stream snapshot with an existing stream
	inception := make_Metadata_Inception(t, wallet, metadataStreamId)
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)
	
	// Add a stream first
	testStreamId := UserStreamIdFromAddr(wallet.Address)
	genesisMiniblockHash := common.HexToHash("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").Bytes()
	originalNodes := [][]byte{wallet.Address.Bytes()}
	originalReplicationFactor := int64(1)
	
	// Convert data to proper types
	genesisHash := common.BytesToHash(genesisMiniblockHash)
	originalNodeAddresses := make([]common.Address, len(originalNodes))
	for i, node := range originalNodes {
		originalNodeAddresses[i] = common.BytesToAddress(node)
	}

	newStreamEvent := make_Metadata_NewStream(
		t,
		wallet,
		testStreamId,
		genesisHash,
		originalNodeAddresses,
		originalReplicationFactor,
		nil,
	)
	
	err = Update_Snapshot(snapshot, newStreamEvent, 0, 1)
	require.NoError(t, err)
	
	// Now update the stream's placement
	newNodes := [][]byte{
		wallet.Address.Bytes(),
		common.HexToAddress("0x1234").Bytes(),
		common.HexToAddress("0x5678").Bytes(),
	}
	newReplicationFactor := int64(3)
	
	// Convert data to proper types
	newNodeAddresses := make([]common.Address, len(newNodes))
	for i, node := range newNodes {
		newNodeAddresses[i] = common.BytesToAddress(node)
	}

	placementUpdateEvent := make_Metadata_PlacementUpdate(
		t,
		wallet,
		testStreamId,
		newNodeAddresses,
		newReplicationFactor,
		nil,
	)
	
	err = Update_Snapshot(snapshot, placementUpdateEvent, 0, 2)
	require.NoError(t, err)
	
	// Verify the stream record was updated
	metadataContent := snapshot.Content.(*Snapshot_MetadataContent)
	require.Len(t, metadataContent.MetadataContent.Streams, 1)
	
	streamRecord := metadataContent.MetadataContent.Streams[0]
	assert.Equal(t, testStreamId[:], streamRecord.StreamId)
	assert.Equal(t, newNodes, streamRecord.Nodes)
	assert.Equal(t, newReplicationFactor, streamRecord.ReplicationFactor)
	// Miniblock info should remain unchanged
	assert.Equal(t, genesisMiniblockHash, streamRecord.LastMiniblockHash)
	assert.Equal(t, int64(0), streamRecord.LastMiniblockNum)
}

func TestUpdateMetadataSnapshot_MultipleStreams(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	metadataStreamId := MetadataStreamIdFromShard(0)
	
	// Create metadata stream snapshot
	inception := make_Metadata_Inception(t, wallet, metadataStreamId)
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)
	
	// Add multiple streams
	streamIds := []StreamId{
		UserStreamIdFromAddr(wallet.Address),
		UserStreamIdFromAddr(common.HexToAddress("0x1234")),
		UserStreamIdFromAddr(common.HexToAddress("0x5678")),
	}
	
	for i, streamId := range streamIds {
		// Create unique hashes for each stream
		genesisHash := common.HexToHash(fmt.Sprintf("0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef%02d", i))
		nodes := [][]byte{common.HexToAddress("0xaaaa").Bytes()}
		replicationFactor := int64(1)
		
		// Convert data to proper types
		nodeAddresses := make([]common.Address, len(nodes))
		for j, node := range nodes {
			nodeAddresses[j] = common.BytesToAddress(node)
		}

		newStreamEvent := make_Metadata_NewStream(
			t,
			wallet,
			streamId,
			genesisHash,
			nodeAddresses,
			replicationFactor,
			nil,
		)
		
		err = Update_Snapshot(snapshot, newStreamEvent, 0, int64(i+1))
		require.NoError(t, err)
	}
	
	// Verify all streams were added and are sorted
	metadataContent := snapshot.Content.(*Snapshot_MetadataContent)
	require.Len(t, metadataContent.MetadataContent.Streams, 3)
	
	// Verify streams are sorted by StreamId
	for i := 0; i < len(metadataContent.MetadataContent.Streams)-1; i++ {
		current := metadataContent.MetadataContent.Streams[i].StreamId
		next := metadataContent.MetadataContent.Streams[i+1].StreamId
		assert.True(t, len(current) == len(next) && string(current) < string(next), 
			"Streams should be sorted by StreamId")
	}
}

// Test error cases

func TestUpdateMetadataSnapshot_InceptionFails(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	metadataStreamId := MetadataStreamIdFromShard(0)
	
	// Create metadata stream snapshot
	inception := make_Metadata_Inception(t, wallet, metadataStreamId)
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)
	
	// Try to update with inception - should fail
	err = Update_Snapshot(snapshot, inception, 0, 1)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot update snapshot with inception event")
}

func TestUpdateMetadataSnapshot_WrongSnapshotType(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	userStreamId := UserStreamIdFromAddr(wallet.Address)
	
	// Create user stream snapshot (not metadata)
	inception := make_User_Inception(wallet, userStreamId, t)
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)
	
	// Try to update with metadata payload - should fail
	testStreamId := UserStreamIdFromAddr(common.HexToAddress("0x1234"))
	genesisMiniblockHash := []byte("test_genesis_hash")
	nodes := [][]byte{wallet.Address.Bytes()}
	replicationFactor := int64(1)
	
	// Convert data to proper types
	genesisHash := common.BytesToHash(genesisMiniblockHash)
	nodeAddresses := make([]common.Address, len(nodes))
	for i, node := range nodes {
		nodeAddresses[i] = common.BytesToAddress(node)
	}

	newStreamEvent := make_Metadata_NewStream(
		t,
		wallet,
		testStreamId,
		genesisHash,
		nodeAddresses,
		replicationFactor,
		nil,
	)
	
	err = Update_Snapshot(snapshot, newStreamEvent, 0, 1)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "snapshot is not a metadata snapshot")
}

func TestUpdateMetadataSnapshot_StreamNotFound(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	wallet, _ := crypto.NewWallet(ctx)
	metadataStreamId := MetadataStreamIdFromShard(0)
	
	// Create metadata stream snapshot (empty)
	inception := make_Metadata_Inception(t, wallet, metadataStreamId)
	snapshot, err := Make_GenesisSnapshot([]*ParsedEvent{inception})
	require.NoError(t, err)
	
	// Try to update a stream that doesn't exist - should fail
	nonExistentStreamId := UserStreamIdFromAddr(common.HexToAddress("0x9999"))
	newMiniblockHash := []byte("new_hash")
	newMiniblockNum := int64(5)
	
	// Convert data to proper types
	newHash := common.BytesToHash(newMiniblockHash)

	updateEvent := make_Metadata_LastMiniblockUpdate(
		t,
		wallet,
		nonExistentStreamId,
		newHash,
		newMiniblockNum,
		nil,
	)
	
	err = Update_Snapshot(snapshot, updateEvent, 0, 1)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Could not find stream record for LastMiniblockUpdate")
	
	// Try placement update on non-existent stream - should also fail
	newNodes := [][]byte{wallet.Address.Bytes()}
	newReplicationFactor := int64(1)
	
	// Convert data to proper types
	newNodeAddresses := make([]common.Address, len(newNodes))
	for i, node := range newNodes {
		newNodeAddresses[i] = common.BytesToAddress(node)
	}

	placementUpdateEvent := make_Metadata_PlacementUpdate(
		t,
		wallet,
		nonExistentStreamId,
		newNodeAddresses,
		newReplicationFactor,
		nil,
	)
	
	err = Update_Snapshot(snapshot, placementUpdateEvent, 0, 2)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Could not find stream record for PlacementUpdate")
}

// Test helper functions

func TestFindStreamRecord(t *testing.T) {
	// Create test stream records
	streamId1 := UserStreamIdFromAddr(common.HexToAddress("0x1111"))
	streamId2 := UserStreamIdFromAddr(common.HexToAddress("0x2222"))
	streamId3 := UserStreamIdFromAddr(common.HexToAddress("0x3333"))
	
	streams := []*StreamRecord{
		{StreamId: streamId1[:], LastMiniblockNum: 1},
		{StreamId: streamId2[:], LastMiniblockNum: 2},
		{StreamId: streamId3[:], LastMiniblockNum: 3},
	}
	
	// Test finding existing streams
	found, err := findStreamRecord(streams, streamId2[:])
	require.NoError(t, err)
	assert.Equal(t, streamId2[:], found.StreamId)
	assert.Equal(t, int64(2), found.LastMiniblockNum)
	
	// Test finding non-existent stream
	nonExistentStreamId := UserStreamIdFromAddr(common.HexToAddress("0x9999"))
	_, err = findStreamRecord(streams, nonExistentStreamId[:])
	assert.Error(t, err)
}

func TestInsertStreamRecord(t *testing.T) {
	// Create initial stream records
	streamId1 := UserStreamIdFromAddr(common.HexToAddress("0x1111"))
	streamId3 := UserStreamIdFromAddr(common.HexToAddress("0x3333"))
	
	streams := []*StreamRecord{
		{StreamId: streamId1[:], LastMiniblockNum: 1},
		{StreamId: streamId3[:], LastMiniblockNum: 3},
	}
	
	// Insert a stream in the middle
	streamId2 := UserStreamIdFromAddr(common.HexToAddress("0x2222"))
	newStream := &StreamRecord{StreamId: streamId2[:], LastMiniblockNum: 2}
	
	streams = insertStreamRecord(streams, newStream)
	
	// Verify the stream was inserted and array is still sorted
	require.Len(t, streams, 3)
	assert.Equal(t, streamId1[:], streams[0].StreamId)
	assert.Equal(t, streamId2[:], streams[1].StreamId)
	assert.Equal(t, streamId3[:], streams[2].StreamId)
	
	// Insert duplicate (should replace)
	duplicateStream := &StreamRecord{StreamId: streamId2[:], LastMiniblockNum: 22}
	streams = insertStreamRecord(streams, duplicateStream)
	
	// Should still have 3 streams, but middle one updated
	require.Len(t, streams, 3)
	assert.Equal(t, int64(22), streams[1].LastMiniblockNum)
}
