package validator

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/cosmos/gogoproto/proto"

	"github.com/towns-protocol/towns/core/node/storage"

	cmtproto "github.com/cometbft/cometbft/api/cometbft/types/v1"
	"github.com/cometbft/cometbft/crypto"
	cmtbytes "github.com/cometbft/cometbft/libs/bytes"
	cmtjson "github.com/cometbft/cometbft/libs/json"
	"github.com/cometbft/cometbft/libs/protoio"
	"github.com/cometbft/cometbft/types"
	cmttypes "github.com/cometbft/cometbft/types"
	cmttime "github.com/cometbft/cometbft/types/time"
)

// TODO: type ?
const (
	stepNone      int8 = 0 // Used to distinguish the initial state
	stepPropose   int8 = 1
	stepPrevote   int8 = 2
	stepPrecommit int8 = 3
)

// A vote is either stepPrevote or stepPrecommit.
func voteToStep(vote *cmtproto.Vote) int8 {
	switch vote.Type {
	case types.PrevoteType:
		return stepPrevote
	case types.PrecommitType:
		return stepPrecommit
	default:
		panic(fmt.Sprintf("Unknown vote type: %v", vote.Type))
	}
}

// FilePVLastSignState stores the mutable part of PrivValidator.
type LastSignState struct {
	Height    int64             `json:"height"`
	Round     int32             `json:"round"`
	Step      int8              `json:"step"`
	Signature []byte            `json:"signature,omitempty"`
	SignBytes cmtbytes.HexBytes `json:"signbytes,omitempty"`
}

func (lss *LastSignState) reset() {
	lss.Height = 0
	lss.Round = 0
	lss.Step = 0
	lss.Signature = nil
	lss.SignBytes = nil
}

// CheckHRS checks the given height, round, step (HRS) against that of the
// FilePVLastSignState. It returns an error if the arguments constitute a regression,
// or if they match but the SignBytes are empty.
// The returned boolean indicates whether the last Signature should be reused -
// it returns true if the HRS matches the arguments and the SignBytes are not empty (indicating
// we have already signed for this HRS, and can reuse the existing signature).
// It panics if the HRS matches the arguments, there's a SignBytes, but no Signature.
func (lss *LastSignState) CheckHRS(height int64, round int32, step int8) (bool, error) {
	if lss.Height > height {
		return false, fmt.Errorf("height regression. Got %v, last height %v", height, lss.Height)
	}

	if lss.Height != height {
		return false, nil
	}

	if lss.Round > round {
		return false, fmt.Errorf("round regression at height %v. Got %v, last round %v", height, round, lss.Round)
	}

	if lss.Round != round {
		return false, nil
	}

	if lss.Step > step {
		return false, fmt.Errorf(
			"step regression at height %v round %v. Got %v, last step %v",
			height,
			round,
			step,
			lss.Step,
		)
	}

	if lss.Step < step {
		return false, nil
	}

	if lss.SignBytes == nil {
		return false, errors.New("no SignBytes found")
	}

	if lss.Signature == nil {
		panic("pv: Signature is nil but SignBytes is not!")
	}
	return true, nil
}

// DbValidator implements PrivValidator using metadata storage
// to prevent double signing.
// It includes the LastSignature and LastSignBytes so we don't lose the signature
// if the process crashes after signing but before the resulting consensus message is processed.
type DbValidator struct {
	Key           crypto.PrivKey
	LastSignState *LastSignState
	shardId       uint64
	store         storage.MetadataStore
	ctx           context.Context
}

var _ cmttypes.PrivValidator = (*DbValidator)(nil)

// NewDbValidator generates a new validator from the given key and store.
func NewDbValidator(
	ctx context.Context,
	privKey crypto.PrivKey,
	shardId uint64,
	store storage.MetadataStore,
) (*DbValidator, error) {
	if ctx == nil {
		return nil, errors.New("context is required")
	}
	lastSignState, err := loadDbState(ctx, shardId, store)
	if err != nil {
		return nil, err
	}
	return &DbValidator{
		Key:           privKey,
		LastSignState: lastSignState,
		shardId:       shardId,
		store:         store,
		ctx:           ctx,
	}, nil
}

// Loads validator state from the store, or returns an empty LastSignState when none is stored.
func loadDbState(ctx context.Context, shardId uint64, store storage.MetadataStore) (*LastSignState, error) {
	pvState := &LastSignState{}

	stateJSONBytes, err := store.GetShardValidatorState(ctx, shardId)
	if err != nil {
		return nil, err
	}

	if len(stateJSONBytes) == 0 {
		return pvState, nil
	}

	err = cmtjson.Unmarshal(stateJSONBytes, pvState)
	if err != nil {
		return nil, err
	}

	return pvState, nil
}

// GetAddress returns the address of the validator.
// Implements PrivValidator.
func (pv *DbValidator) GetAddress() types.Address {
	return pv.Key.PubKey().Address()
}

// GetPubKey returns the public key of the validator.
// Implements PrivValidator.
func (pv *DbValidator) GetPubKey() (crypto.PubKey, error) {
	return pv.Key.PubKey(), nil
}

// SignVote signs a canonical representation of the vote, along with the
// chainID. Implements PrivValidator.
func (pv *DbValidator) SignVote(chainID string, vote *cmtproto.Vote, signExtension bool) error {
	if err := pv.signVote(chainID, vote, signExtension); err != nil {
		return fmt.Errorf("error signing vote: %v", err)
	}
	return nil
}

// SignProposal signs a canonical representation of the proposal, along with
// the chainID. Implements PrivValidator.
func (pv *DbValidator) SignProposal(chainID string, proposal *cmtproto.Proposal) error {
	if err := pv.signProposal(chainID, proposal); err != nil {
		return fmt.Errorf("error signing proposal: %v", err)
	}
	return nil
}

// SignBytes signs the given bytes. Implements PrivValidator.
func (pv *DbValidator) SignBytes(bytes []byte) ([]byte, error) {
	return pv.Key.Sign(bytes)
}

// String returns a string representation of the FilePV.
func (pv *DbValidator) String() string {
	return fmt.Sprintf(
		"PrivValidator{%v LH:%v, LR:%v, LS:%v}",
		pv.GetAddress(),
		pv.LastSignState.Height,
		pv.LastSignState.Round,
		pv.LastSignState.Step,
	)
}

// ------------------------------------------------------------------------------------

// signVote checks if the vote is good to sign and sets the vote signature.
// It may need to set the timestamp as well if the vote is otherwise the same as
// a previously signed vote (ie. we crashed after signing but before the vote hit the WAL).
// Extension signatures are always signed for non-nil precommits (even if the data is empty).
func (pv *DbValidator) signVote(chainID string, vote *cmtproto.Vote, signExtension bool) error {
	height, round, step := vote.Height, vote.Round, voteToStep(vote)

	lss := pv.LastSignState

	sameHRS, err := lss.CheckHRS(height, round, step)
	if err != nil {
		return err
	}

	signBytes := types.VoteSignBytes(chainID, vote)

	if signExtension {
		// Vote extensions are non-deterministic, so it is possible that an
		// application may have created a different extension. We therefore always
		// re-sign the vote extensions of precommits. For prevotes and nil
		// precommits, the extension signature will always be empty.
		// Even if the signed over data is empty, we still add the signature
		var extSig []byte
		if vote.Type == types.PrecommitType && !types.ProtoBlockIDIsNil(&vote.BlockID) {
			extSignBytes := types.VoteExtensionSignBytes(chainID, vote)
			extSig, err = pv.Key.Sign(extSignBytes)
			if err != nil {
				return err
			}
		} else if len(vote.Extension) > 0 {
			return errors.New("unexpected vote extension - extensions are only allowed in non-nil precommits")
		}

		vote.ExtensionSignature = extSig
	}

	// We might crash before writing to the wal,
	// causing us to try to re-sign for the same HRS.
	// If signbytes are the same, use the last signature.
	// If they only differ by timestamp, use last timestamp and signature
	// Otherwise, return error
	if sameHRS {
		if bytes.Equal(signBytes, lss.SignBytes) {
			vote.Signature = lss.Signature
		} else if timestamp, ok := checkVotesOnlyDifferByTimestamp(lss.SignBytes, signBytes); ok {
			// Compares the canonicalized votes (i.e. without vote extensions
			// or vote extension signatures).
			vote.Timestamp = timestamp
			vote.Signature = lss.Signature
		} else {
			err = errors.New("conflicting data")
		}

		return err
	}

	// It passed the checks. Sign the vote
	sig, err := pv.Key.Sign(signBytes)
	if err != nil {
		return err
	}
	if err := pv.saveSigned(height, round, step, signBytes, sig); err != nil {
		return err
	}
	vote.Signature = sig

	return nil
}

// signProposal checks if the proposal is good to sign and sets the proposal signature.
// It may need to set the timestamp as well if the proposal is otherwise the same as
// a previously signed proposal ie. we crashed after signing but before the proposal hit the WAL).
func (pv *DbValidator) signProposal(chainID string, proposal *cmtproto.Proposal) error {
	height, round, step := proposal.Height, proposal.Round, stepPropose

	lss := pv.LastSignState

	sameHRS, err := lss.CheckHRS(height, round, step)
	if err != nil {
		return err
	}

	signBytes := types.ProposalSignBytes(chainID, proposal)

	// We might crash before writing to the wal,
	// causing us to try to re-sign for the same HRS.
	// If signbytes are the same, use the last signature.
	// If they only differ by timestamp, use last timestamp and signature
	// Otherwise, return error
	if sameHRS {
		if bytes.Equal(signBytes, lss.SignBytes) {
			proposal.Signature = lss.Signature
		} else if timestamp, ok := checkProposalsOnlyDifferByTimestamp(lss.SignBytes, signBytes); ok {
			proposal.Timestamp = timestamp
			proposal.Signature = lss.Signature
		} else {
			err = errors.New("conflicting data")
		}
		return err
	}

	// It passed the checks. Sign the proposal
	sig, err := pv.Key.Sign(signBytes)
	if err != nil {
		return err
	}
	if err := pv.saveSigned(height, round, step, signBytes, sig); err != nil {
		return err
	}
	proposal.Signature = sig
	return nil
}

// Persist height/round/step and signature.
func (pv *DbValidator) saveSigned(height int64, round int32, step int8,
	signBytes []byte, sig []byte,
) error {
	pv.LastSignState.Height = height
	pv.LastSignState.Round = round
	pv.LastSignState.Step = step
	pv.LastSignState.Signature = sig
	pv.LastSignState.SignBytes = signBytes

	jsonBytes, err := cmtjson.Marshal(pv.LastSignState)
	if err != nil {
		return err
	}
	return pv.store.SetShardValidatorState(pv.ctx, pv.shardId, jsonBytes)
}

// -----------------------------------------------------------------------------------------

// Returns the timestamp from the lastSignBytes.
// Returns true if the only difference in the votes is their timestamp.
// Performs these checks on the canonical votes (excluding the vote extension
// and vote extension signatures).
func checkVotesOnlyDifferByTimestamp(lastSignBytes, newSignBytes []byte) (time.Time, bool) {
	var lastVote, newVote cmtproto.CanonicalVote
	if err := protoio.UnmarshalDelimited(lastSignBytes, &lastVote); err != nil {
		panic(fmt.Sprintf("LastSignBytes cannot be unmarshalled into vote: %v", err))
	}
	if err := protoio.UnmarshalDelimited(newSignBytes, &newVote); err != nil {
		panic(fmt.Sprintf("signBytes cannot be unmarshalled into vote: %v", err))
	}

	lastTime := lastVote.Timestamp
	// set the times to the same value and check equality
	now := cmttime.Now()
	lastVote.Timestamp = now
	newVote.Timestamp = now

	return lastTime, proto.Equal(&newVote, &lastVote)
}

// returns the timestamp from the lastSignBytes.
// returns true if the only difference in the proposals is their timestamp.
func checkProposalsOnlyDifferByTimestamp(lastSignBytes, newSignBytes []byte) (time.Time, bool) {
	var lastProposal, newProposal cmtproto.CanonicalProposal
	if err := protoio.UnmarshalDelimited(lastSignBytes, &lastProposal); err != nil {
		panic(fmt.Sprintf("LastSignBytes cannot be unmarshalled into proposal: %v", err))
	}
	if err := protoio.UnmarshalDelimited(newSignBytes, &newProposal); err != nil {
		panic(fmt.Sprintf("signBytes cannot be unmarshalled into proposal: %v", err))
	}

	lastTime := lastProposal.Timestamp
	// set the times to the same value and check equality
	now := cmttime.Now()
	lastProposal.Timestamp = now
	newProposal.Timestamp = now

	return lastTime, proto.Equal(&newProposal, &lastProposal)
}
