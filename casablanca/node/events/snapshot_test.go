package events

import (
	"casablanca/node/crypto"
	"casablanca/node/protocol"
	"casablanca/node/shared"
	"context"
	"testing"

	. "casablanca/node/protocol"

	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"
)

func make_User_Inception(wallet *crypto.Wallet, streamId string, t *testing.T) *ParsedEvent {
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

func make_Space_Inception(wallet *crypto.Wallet, streamId string, t *testing.T) *ParsedEvent {
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

func make_User_Membership(wallet *crypto.Wallet, membershipOp MembershipOp, streamId string, prevMiniblockHash []byte, t *testing.T) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(
			membershipOp,
			"inviter$1", //inviter
			streamId,
			nil, // original event ref
		),
		prevMiniblockHash,
	)
	assert.NoError(t, err)
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func make_Space_Membership(wallet *crypto.Wallet, membershipOp MembershipOp, userId string, prevMiniblockHash []byte, t *testing.T) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_SpacePayload_Membership(
			membershipOp,
			userId,
		),
		prevMiniblockHash,
	)
	assert.NoError(t, err)
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func make_Space_Username(wallet *crypto.Wallet, username string, streamId string, prevHash []byte, t *testing.T) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_SpacePayload_Username(
			&protocol.EncryptedData{Ciphertext: username},
		),
		prevHash,
	)
	assert.NoError(t, err)
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func make_Space_DisplayName(wallet *crypto.Wallet, displayName string, streamId string, prevHash []byte, t *testing.T) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_SpacePayload_DisplayName(
			&protocol.EncryptedData{Ciphertext: displayName},
		),
		prevHash,
	)
	assert.NoError(t, err)
	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func TestMakeSnapshot(t *testing.T) {
	wallet, _ := crypto.NewWallet(context.Background())
	streamId := "streamid$1"
	inception := make_User_Inception(wallet, streamId, t)
	snapshot, err := Make_GenisisSnapshot([]*ParsedEvent{inception})
	assert.NoError(t, err)
	assert.Equal(
		t,
		streamId,
		snapshot.Content.(*Snapshot_UserContent).UserContent.Inception.StreamId)
}

func TestUpdateSnapshot(t *testing.T) {
	wallet, _ := crypto.NewWallet(context.Background())
	streamId := "streamid$1"
	inception := make_User_Inception(wallet, streamId, t)
	snapshot, err := Make_GenisisSnapshot([]*ParsedEvent{inception})
	assert.NoError(t, err)

	membership := make_User_Membership(wallet, MembershipOp_SO_JOIN, streamId, nil, t)
	err = Update_Snapshot(snapshot, membership, 0, 1)
	assert.NoError(t, err)
	assert.Equal(
		t,
		MembershipOp_SO_JOIN,
		snapshot.Content.(*Snapshot_UserContent).UserContent.Memberships[streamId].Op,
	)
}

func TestCloneAndUpdateUserSnapshot(t *testing.T) {
	wallet, _ := crypto.NewWallet(context.Background())
	streamId := "streamid$1"
	inception := make_User_Inception(wallet, streamId, t)
	snapshot1, err := Make_GenisisSnapshot([]*ParsedEvent{inception})
	assert.NoError(t, err)

	snapshot := proto.Clone(snapshot1).(*Snapshot)

	membership := make_User_Membership(wallet, MembershipOp_SO_JOIN, streamId, nil, t)
	err = Update_Snapshot(snapshot, membership, 0, 1)
	assert.NoError(t, err)
	assert.Equal(
		t,
		MembershipOp_SO_JOIN,
		snapshot.Content.(*Snapshot_UserContent).UserContent.Memberships[streamId].Op,
	)
}

func TestCloneAndUpdateSpaceSnapshot(t *testing.T) {
	wallet, _ := crypto.NewWallet(context.Background())
	streamId := "streamid$1"
	inception := make_Space_Inception(wallet, streamId, t)
	snapshot1, err := Make_GenisisSnapshot([]*ParsedEvent{inception})
	assert.NoError(t, err)
	userId, err := shared.AddressHex(inception.Event.CreatorAddress)
	assert.NoError(t, err)

	snapshot := proto.Clone(snapshot1).(*Snapshot)

	membership := make_Space_Membership(wallet, MembershipOp_SO_JOIN, userId, nil, t)
	username := make_Space_Username(wallet, "bob", streamId, nil, t)
	displayName := make_Space_DisplayName(wallet, "bobIsTheGreatest", streamId, nil, t)
	events := []*ParsedEvent{membership, username, displayName}
	for i, event := range events[:] {
		err = Update_Snapshot(snapshot, event, 1, int64(3+i))
		assert.NoError(t, err)
	}

	assert.Equal(
		t,
		MembershipOp_SO_JOIN,
		snapshot.Content.(*Snapshot_SpaceContent).SpaceContent.Memberships[userId].Op,
	)
	assert.Equal(
		t,
		"bob",
		snapshot.Content.(*Snapshot_SpaceContent).SpaceContent.Usernames[userId].Data.Ciphertext,
	)
	assert.Equal(
		t,
		"bobIsTheGreatest",
		snapshot.Content.(*Snapshot_SpaceContent).SpaceContent.DisplayNames[userId].Data.Ciphertext,
	)
	assert.Equal(
		t,
		int64(4),
		snapshot.Content.(*Snapshot_SpaceContent).SpaceContent.Usernames[userId].EventNum,
	)
	assert.Equal(
		t,
		int64(5),
		snapshot.Content.(*Snapshot_SpaceContent).SpaceContent.DisplayNames[userId].EventNum,
	)
}

func TestUpdateSnapshotFailsIfInception(t *testing.T) {
	wallet, _ := crypto.NewWallet(context.Background())
	streamId := "streamid$1"
	inception := make_User_Inception(wallet, streamId, t)
	snapshot, err := Make_GenisisSnapshot([]*ParsedEvent{inception})
	assert.NoError(t, err)

	err = Update_Snapshot(snapshot, inception, 0, 1)
	assert.Error(t, err)
}
