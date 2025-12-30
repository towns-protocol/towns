package validator

import (
	"context"
	"crypto/rand"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/cometbft/cometbft/crypto"
	"github.com/cometbft/cometbft/crypto/ed25519"
	"github.com/cometbft/cometbft/crypto/tmhash"
	"github.com/cometbft/cometbft/types"
	cmttime "github.com/cometbft/cometbft/types/time"
	"github.com/ethereum/go-ethereum/common"

	basetest "github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/metadata/mdstate"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

const testShardID uint64 = 1

func TestDbValidatorLoadsState(t *testing.T) {
	ctx := basetest.NewTestContext(t)
	store := newMemoryMetadataStore()

	privVal := newTestDbValidator(t, ctx, store, testShardID, nil)
	block := types.BlockID{
		Hash:          randBytes(t, tmhash.Size),
		PartSetHeader: types.PartSetHeader{},
	}
	vote := newVote(privVal.Key.PubKey().Address(), 10, 1, types.PrevoteType, block)
	err := privVal.SignVote("mychainid", vote.ToProto(), false)
	require.NoError(t, err)

	reloaded, err := NewDbValidator(ctx, privVal.Key, testShardID, store)
	require.NoError(t, err)
	assert.Equal(t, privVal.LastSignState.Height, reloaded.LastSignState.Height)
	assert.Equal(t, privVal.LastSignState.Round, reloaded.LastSignState.Round)
	assert.Equal(t, privVal.LastSignState.Step, reloaded.LastSignState.Step)
	assert.Equal(t, privVal.LastSignState.Signature, reloaded.LastSignState.Signature)
	assert.Equal(t, privVal.LastSignState.SignedBytes, reloaded.LastSignState.SignedBytes)
}

func TestSignVote(t *testing.T) {
	assert := assert.New(t)
	chainID := "mychainid"
	ctx := basetest.NewTestContext(t)
	store := newMemoryMetadataStore()
	privVal := newTestDbValidator(t, ctx, store, testShardID, nil)

	randbytes := randBytes(t, tmhash.Size)
	randbytes2 := randBytes(t, tmhash.Size)

	block1 := types.BlockID{
		Hash:          randbytes,
		PartSetHeader: types.PartSetHeader{Total: 5, Hash: randbytes},
	}
	block2 := types.BlockID{
		Hash:          randbytes2,
		PartSetHeader: types.PartSetHeader{Total: 10, Hash: randbytes2},
	}

	height, round := int64(10), int32(1)
	voteType := types.PrevoteType
	addr := privVal.Key.PubKey().Address()

	// sign a vote for first time
	vote := newVote(addr, height, round, voteType, block1)
	v := vote.ToProto()
	err := privVal.SignVote(chainID, v, false)
	require.NoError(t, err, "expected no error signing vote")
	vote.Signature = v.Signature
	err = vote.ValidateBasic()
	require.NoError(t, err)

	// Verify vote signature
	pubKey, err := privVal.GetPubKey()
	require.NoError(t, err)
	err = vote.Verify(chainID, pubKey)
	require.NoError(t, err)

	// try to sign the same vote again; should be fine
	err = privVal.SignVote(chainID, v, false)
	require.NoError(t, err, "expected no error on signing same vote")

	// now try some bad votes
	cases := []*types.Vote{
		newVote(addr, height, round-1, voteType, block1), // round regression
		newVote(addr, height-1, round, voteType, block1), // height regression
		newVote(
			addr,
			height-2,
			round+4,
			voteType,
			block1,
		), // height regression and different round
		newVote(addr, height, round, voteType, block2), // different block
	}

	for _, c := range cases {
		cpb := c.ToProto()
		err = privVal.SignVote(chainID, cpb, false)
		require.Error(t, err, "expected error on signing conflicting vote")
	}

	// try signing a vote with a different time stamp
	sig := vote.Signature
	vote.Signature = nil
	vote.Timestamp = vote.Timestamp.Add(time.Duration(1000))
	v2 := vote.ToProto()
	err = privVal.SignVote(chainID, v2, false)
	require.NoError(t, err)
	assert.Equal(sig, v2.Signature)
}

func TestSignProposal(t *testing.T) {
	assert := assert.New(t)
	chainID := "mychainid"
	ctx := basetest.NewTestContext(t)
	store := newMemoryMetadataStore()
	privVal := newTestDbValidator(t, ctx, store, testShardID, nil)

	randbytes := randBytes(t, tmhash.Size)
	randbytes2 := randBytes(t, tmhash.Size)

	block1 := types.BlockID{
		Hash:          randbytes,
		PartSetHeader: types.PartSetHeader{Total: 5, Hash: randbytes},
	}
	block2 := types.BlockID{
		Hash:          randbytes2,
		PartSetHeader: types.PartSetHeader{Total: 10, Hash: randbytes2},
	}
	height, round := int64(10), int32(1)

	// sign a proposal for first time
	proposal := newProposal(height, round, block1)
	pbp := proposal.ToProto()
	err := privVal.SignProposal(chainID, pbp)
	sig := pbp.Signature
	require.NoError(t, err, "expected no error signing proposal")

	// try to sign the same proposal again; should be fine
	err = privVal.SignProposal(chainID, pbp)
	require.NoError(t, err, "expected no error on signing same proposal")

	// Verify proposal signature
	pubKey, err := privVal.GetPubKey()
	require.NoError(t, err)
	assert.True(pubKey.VerifySignature(types.ProposalSignBytes(chainID, pbp), sig))

	// now try some bad Proposals
	cases := []*types.Proposal{
		newProposal(height, round-1, block1),   // round regression
		newProposal(height-1, round, block1),   // height regression
		newProposal(height-2, round+4, block1), // height regression and different round
		newProposal(height, round, block2),     // different block
	}

	for _, c := range cases {
		err = privVal.SignProposal(chainID, c.ToProto())
		require.Error(t, err, "expected error on signing conflicting proposal")
	}

	// try signing a proposal with a different time stamp
	proposal.Timestamp = proposal.Timestamp.Add(time.Duration(1000))
	pbp2 := proposal.ToProto()
	err = privVal.SignProposal(chainID, pbp2)
	require.NoError(t, err)
	assert.Equal(sig, pbp2.Signature)
}

func TestSignBytes(t *testing.T) {
	ctx := basetest.NewTestContext(t)
	store := newMemoryMetadataStore()
	privVal := newTestDbValidator(t, ctx, store, testShardID, nil)
	testBytes := []byte("test bytes for signing TODO: REMOVE ME AFTER FIXING BLS")

	// Sign the test bytes
	sig, err := privVal.SignBytes(testBytes)
	require.NoError(t, err, "expected no error signing bytes")

	// Verify the signature
	pubKey, err := privVal.GetPubKey()
	require.NoError(t, err, "expected no error getting public key")
	assert.True(t, pubKey.VerifySignature(testBytes, sig), "signature verification failed")
}

func TestDifferByTimestamp(t *testing.T) {
	ctx := basetest.NewTestContext(t)
	store := newMemoryMetadataStore()
	privVal := newTestDbValidator(t, ctx, store, testShardID, nil)
	randbytes := randBytes(t, tmhash.Size)
	block1 := types.BlockID{Hash: randbytes, PartSetHeader: types.PartSetHeader{Total: 5, Hash: randbytes}}
	height, round := int64(10), int32(1)
	chainID := "mychainid"

	// test proposal
	{
		proposal := newProposal(height, round, block1)
		pb := proposal.ToProto()
		err := privVal.SignProposal(chainID, pb)
		require.NoError(t, err, "expected no error signing proposal")
		signBytes := types.ProposalSignBytes(chainID, pb)

		sig := pb.Signature
		timeStamp := pb.Timestamp

		// manipulate the timestamp. should get changed back
		pb.Timestamp = pb.Timestamp.Add(time.Millisecond)
		pb.Signature = nil
		err = privVal.SignProposal("mychainid", pb)
		require.NoError(t, err, "expected no error on signing same proposal")

		assert.Equal(t, timeStamp, pb.Timestamp)
		assert.Equal(t, signBytes, types.ProposalSignBytes(chainID, pb))
		assert.Equal(t, sig, pb.Signature)
	}

	// test vote
	{
		voteType := types.PrevoteType
		blockID := types.BlockID{Hash: randbytes, PartSetHeader: types.PartSetHeader{}}
		addr := privVal.Key.PubKey().Address()
		vote := newVote(addr, height, round, voteType, blockID)
		v := vote.ToProto()
		err := privVal.SignVote("mychainid", v, false)
		require.NoError(t, err, "expected no error signing vote")

		signBytes := types.VoteSignBytes(chainID, v)
		sig := v.Signature
		extSig := v.ExtensionSignature
		timeStamp := v.Timestamp

		// manipulate the timestamp. should get changed back
		v.Timestamp = v.Timestamp.Add(time.Millisecond)
		v.Signature = nil
		v.ExtensionSignature = nil
		err = privVal.SignVote("mychainid", v, false)
		require.NoError(t, err, "expected no error on signing same vote")

		assert.Equal(t, timeStamp, v.Timestamp)
		assert.Equal(t, signBytes, types.VoteSignBytes(chainID, v))
		assert.Equal(t, sig, v.Signature)
		assert.Equal(t, extSig, v.ExtensionSignature)
	}
}

func TestVoteExtensionsAreSignedIfSignExtensionIsTrue(t *testing.T) {
	ctx := basetest.NewTestContext(t)
	store := newMemoryMetadataStore()
	privVal := newTestDbValidator(t, ctx, store, testShardID, nil)
	pubKey, err := privVal.GetPubKey()
	require.NoError(t, err)

	block := types.BlockID{
		Hash:          randBytes(t, tmhash.Size),
		PartSetHeader: types.PartSetHeader{Total: 5, Hash: randBytes(t, tmhash.Size)},
	}

	height, round := int64(10), int32(1)
	voteType := types.PrecommitType
	addr := privVal.Key.PubKey().Address()

	// We initially sign this vote without an extension
	vote1 := newVote(addr, height, round, voteType, block)
	vpb1 := vote1.ToProto()

	err = privVal.SignVote("mychainid", vpb1, true)
	require.NoError(t, err, "expected no error signing vote")
	assert.NotNil(t, vpb1.ExtensionSignature)

	vesb1 := types.VoteExtensionSignBytes("mychainid", vpb1)
	assert.True(t, pubKey.VerifySignature(vesb1, vpb1.ExtensionSignature))

	// We duplicate this vote precisely, including its timestamp, but change
	// its extension
	vote2 := vote1.Copy()
	vote2.Extension = []byte("new extension")
	vpb2 := vote2.ToProto()

	err = privVal.SignVote("mychainid", vpb2, true)
	require.NoError(t, err, "expected no error signing same vote with manipulated vote extension")

	// We need to ensure that a valid new extension signature has been created
	// that validates against the vote extension sign bytes with the new
	// extension, and does not validate against the vote extension sign bytes
	// with the old extension.
	vesb2 := types.VoteExtensionSignBytes("mychainid", vpb2)
	assert.True(t, pubKey.VerifySignature(vesb2, vpb2.ExtensionSignature))
	assert.False(t, pubKey.VerifySignature(vesb1, vpb2.ExtensionSignature))

	// We now manipulate the timestamp of the vote with the extension, as per
	// TestDifferByTimestamp
	expectedTimestamp := vpb2.Timestamp

	vpb2.Timestamp = vpb2.Timestamp.Add(time.Millisecond)
	vpb2.Signature = nil
	vpb2.ExtensionSignature = nil

	err = privVal.SignVote("mychainid", vpb2, true)
	require.NoError(t, err, "expected no error signing same vote with manipulated timestamp and vote extension")
	assert.Equal(t, expectedTimestamp, vpb2.Timestamp)

	vesb3 := types.VoteExtensionSignBytes("mychainid", vpb2)
	assert.True(t, pubKey.VerifySignature(vesb3, vpb2.ExtensionSignature))
	assert.False(t, pubKey.VerifySignature(vesb1, vpb2.ExtensionSignature))
}

func TestVoteExtensionsAreNotSignedIfSignExtensionIsFalse(t *testing.T) {
	ctx := basetest.NewTestContext(t)
	store := newMemoryMetadataStore()
	privVal := newTestDbValidator(t, ctx, store, testShardID, nil)

	block := types.BlockID{
		Hash:          randBytes(t, tmhash.Size),
		PartSetHeader: types.PartSetHeader{Total: 5, Hash: randBytes(t, tmhash.Size)},
	}

	height, round := int64(10), int32(1)
	voteType := types.PrecommitType
	addr := privVal.Key.PubKey().Address()

	// We initially sign this vote without an extension
	vote1 := newVote(addr, height, round, voteType, block)
	vpb1 := vote1.ToProto()

	err := privVal.SignVote("mychainid", vpb1, false)
	require.NoError(t, err, "expected no error signing vote")
	assert.Nil(t, vpb1.ExtensionSignature)
}

func newVote(addr types.Address, height int64, round int32,
	typ types.SignedMsgType, blockID types.BlockID,
) *types.Vote {
	return &types.Vote{
		ValidatorAddress: addr,
		ValidatorIndex:   0,
		Height:           height,
		Round:            round,
		Type:             typ,
		Timestamp:        cmttime.Now(),
		BlockID:          blockID,
	}
}

func newProposal(height int64, round int32, blockID types.BlockID) *types.Proposal {
	return &types.Proposal{
		Height:    height,
		Round:     round,
		BlockID:   blockID,
		Timestamp: cmttime.Now(),
	}
}

func newTestDbValidator(
	t *testing.T,
	ctx context.Context,
	store storage.MetadataStore,
	shardID uint64,
	keyGenF func() (crypto.PrivKey, error),
) *DbValidator {
	t.Helper()

	var (
		privKey crypto.PrivKey
		err     error
	)
	if keyGenF == nil {
		privKey = ed25519.GenPrivKey()
	} else {
		privKey, err = keyGenF()
		require.NoError(t, err)
	}

	privVal, err := NewDbValidator(ctx, privKey, shardID, store)
	require.NoError(t, err)

	return privVal
}

func randBytes(t *testing.T, size int) []byte {
	t.Helper()

	buf := make([]byte, size)
	_, err := rand.Read(buf)
	require.NoError(t, err)
	return buf
}

var errNotImplemented = errors.New("not implemented")

type memoryMetadataStore struct {
	mu             sync.Mutex
	validatorState map[uint64][]byte
}

func newMemoryMetadataStore() *memoryMetadataStore {
	return &memoryMetadataStore{
		validatorState: make(map[uint64][]byte),
	}
}

func (*memoryMetadataStore) EnsureShardStorage(_ context.Context, _ uint64) error {
	return nil
}

func (*memoryMetadataStore) GetStream(
	_ context.Context,
	_ uint64,
	_ shared.StreamId,
) (*protocol.StreamMetadata, error) {
	return nil, errNotImplemented
}

func (*memoryMetadataStore) ListStreams(
	_ context.Context,
	_ uint64,
	_ int64,
	_ int32,
) ([]*protocol.StreamMetadata, error) {
	return nil, errNotImplemented
}

func (*memoryMetadataStore) ListStreamsByNode(
	_ context.Context,
	_ uint64,
	_ common.Address,
	_ int64,
	_ int32,
) ([]*protocol.StreamMetadata, error) {
	return nil, errNotImplemented
}

func (*memoryMetadataStore) CountStreams(_ context.Context, _ uint64) (int64, error) {
	return 0, errNotImplemented
}

func (*memoryMetadataStore) CountStreamsByNode(_ context.Context, _ uint64, _ common.Address) (int64, error) {
	return 0, errNotImplemented
}

func (*memoryMetadataStore) GetShardState(_ context.Context, _ uint64) (*storage.MetadataShardState, error) {
	return nil, errNotImplemented
}

func (*memoryMetadataStore) GetStreamsStateSnapshot(
	_ context.Context,
	_ uint64,
) ([]*protocol.StreamMetadata, error) {
	return nil, errNotImplemented
}

func (*memoryMetadataStore) PreparePendingBlock(
	_ context.Context,
	_ uint64,
	_ *mdstate.PendingBlockState,
) error {
	return errNotImplemented
}

func (*memoryMetadataStore) CommitPendingBlock(
	_ context.Context,
	_ uint64,
	_ *mdstate.PendingBlockState,
) error {
	return errNotImplemented
}

func (m *memoryMetadataStore) GetShardValidatorState(
	_ context.Context,
	shardID uint64,
) ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	state, ok := m.validatorState[shardID]
	if !ok {
		return nil, nil
	}
	copyState := make([]byte, len(state))
	copy(copyState, state)
	return copyState, nil
}

func (m *memoryMetadataStore) SetShardValidatorState(
	_ context.Context,
	shardID uint64,
	stateJSON []byte,
) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if stateJSON == nil {
		delete(m.validatorState, shardID)
		return nil
	}

	state := make([]byte, len(stateJSON))
	copy(state, stateJSON)
	m.validatorState[shardID] = state
	return nil
}
