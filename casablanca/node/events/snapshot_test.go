package events

import (
	"casablanca/node/crypto"
	"context"
	"testing"

	. "casablanca/node/protocol"

	"github.com/stretchr/testify/assert"
)

func make_User_Inception(wallet *crypto.Wallet, streamId string, t *testing.T) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Inception(streamId),
		nil,
	)
	assert.NoError(t, err)

	parsed, err := ParseEvent(envelope)
	assert.NoError(t, err)
	return parsed
}

func make_User_Membership(wallet *crypto.Wallet, membershipOp MembershipOp, streamId string, prevHash []byte, t *testing.T) *ParsedEvent {
	envelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_UserPayload_Membership(
			membershipOp,
			"inviter$1", //inviter
			streamId,
			nil, // original event ref
		),
		[][]byte{prevHash},
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
	snapshot, err := Make_Snapshot(inception.Event.GetInceptionPayload())
	assert.NoError(t, err)
	assert.Equal(
		t,
		streamId,
		snapshot.Content.(*Snapshot_UserContent).UserContent.Inception.StreamId)
}

func TestUpdateMiniblockHeader(t *testing.T) {
	wallet, _ := crypto.NewWallet(context.Background())
	streamId := "streamid$1"
	inception := make_User_Inception(wallet, streamId, t)
	snapshot, err := Make_Snapshot(inception.Event.GetInceptionPayload())
	assert.NoError(t, err)

	membership := make_User_Membership(wallet, MembershipOp_SO_JOIN, streamId, inception.Hash, t)
	err = Update_Snapshot(snapshot, membership)
	assert.NoError(t, err)
	assert.Equal(
		t,
		MembershipOp_SO_JOIN,
		snapshot.Content.(*Snapshot_UserContent).UserContent.Memberships[streamId].Op,
	)
}

func TestUpdateMiniblockHeaderFailsIfInception(t *testing.T) {
	wallet, _ := crypto.NewWallet(context.Background())
	streamId := "streamid$1"
	inception := make_User_Inception(wallet, streamId, t)
	snapshot, err := Make_Snapshot(inception.Event.GetInceptionPayload())
	assert.NoError(t, err)

	err = Update_Snapshot(snapshot, inception)
	assert.Error(t, err)
}
