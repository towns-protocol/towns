package events

import (
	"testing"

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
