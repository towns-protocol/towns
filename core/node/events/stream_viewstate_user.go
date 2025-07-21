package events

import (
	"bytes"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

type UserStreamView interface {
	GetUserInception() (*UserPayload_Inception, error)
	GetUserMembership(streamId shared.StreamId) (MembershipOp, error)
	IsMemberOf(streamId shared.StreamId) bool
	HasTransaction(evmReceipt *BlockchainTransactionReceipt,
		solanaReceipt *SolanaBlockchainTransactionReceipt) (bool, error)
	IsAppUser() (bool, error)
}

var _ UserStreamView = (*StreamView)(nil)

func (r *StreamView) GetUserInception() (*UserPayload_Inception, error) {
	i := r.InceptionPayload()
	c, ok := i.(*UserPayload_Inception)
	if ok {
		return c, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected user stream", "streamId", r.streamId)
	}
}

func (r *StreamView) GetUserSnapshotContent() (*UserPayload_Snapshot, error) {
	s := r.snapshot.Content
	c, ok := s.(*Snapshot_UserContent)
	if ok {
		return c.UserContent, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected user stream", "streamId", r.streamId)
	}
}

func (r *StreamView) IsMemberOf(streamId shared.StreamId) bool {
	if streamId == r.streamId {
		return true
	}

	userMembershipOp, err := r.GetUserMembership(streamId)
	if err != nil {
		return false
	}
	return userMembershipOp == MembershipOp_SO_JOIN
}

func (r *StreamView) GetUserMembership(streamId shared.StreamId) (MembershipOp, error) {
	retValue := MembershipOp_SO_UNSPECIFIED

	snap, err := r.GetUserSnapshotContent()
	if err != nil {
		return retValue, err
	}
	membership, _ := findUserMembership(
		snap.Memberships,
		streamId[:],
	)

	if membership != nil {
		retValue = membership.Op
	}

	updateFn := func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_UserPayload:
			switch payload := payload.UserPayload.Content.(type) {
			case *UserPayload_UserMembership_:
				if streamId.EqualsBytes(payload.UserMembership.StreamId) {
					retValue = payload.UserMembership.Op
				}
			default:
				break
			}
		default:
			break
		}
		return true, nil // return forEachEvent
	}

	err = r.forEachEvent(r.snapshotIndex+1, updateFn)
	return retValue, err
}

func transactionsAreEqual(blockChainTransaction *BlockchainTransaction,
	evmReceipt *BlockchainTransactionReceipt,
	solanaReceipt *SolanaBlockchainTransactionReceipt,
) bool {
	if blockChainTransaction == nil {
		return false
	} else if evmReceipt != nil && blockChainTransaction.Receipt != nil {
		return bytes.Equal(blockChainTransaction.Receipt.TransactionHash, evmReceipt.TransactionHash)
	} else if solanaReceipt != nil && blockChainTransaction.SolanaReceipt != nil {
		if len(blockChainTransaction.SolanaReceipt.Transaction.Signatures) != len(solanaReceipt.Transaction.Signatures) {
			return false
		}
		for i, sig := range blockChainTransaction.SolanaReceipt.Transaction.Signatures {
			if !bytes.Equal([]byte(sig), []byte(solanaReceipt.Transaction.Signatures[i])) {
				return false
			}
		}
		return true
	}
	return false
}

// handles transactions for user streams and member payload of any stream
func (r *StreamView) HasTransaction(
	evmReceipt *BlockchainTransactionReceipt,
	solanaReceipt *SolanaBlockchainTransactionReceipt,
) (bool, error) {
	retValue := false
	updateFn := func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_UserPayload:
			switch payload := payload.UserPayload.Content.(type) {
			case *UserPayload_BlockchainTransaction:
				if transactionsAreEqual(payload.BlockchainTransaction, evmReceipt, solanaReceipt) {
					retValue = true
					return false, nil
				}
			case *UserPayload_ReceivedBlockchainTransaction_:
				if transactionsAreEqual(payload.ReceivedBlockchainTransaction.Transaction, evmReceipt, solanaReceipt) {
					retValue = true
					return false, nil
				}
			}

		case *StreamEvent_MemberPayload:
			switch payload := payload.MemberPayload.Content.(type) {
			case *MemberPayload_MemberBlockchainTransaction_:
				if transactionsAreEqual(payload.MemberBlockchainTransaction.Transaction, evmReceipt, solanaReceipt) {
					retValue = true
					return false, nil
				}
			}
		}

		return true, nil
	}

	err := r.forEachEvent(0, updateFn)
	return retValue, err
}

func (r *StreamView) IsAppUser() (bool, error) {
	inception, err := r.GetUserInception()
	if err != nil {
		return false, err
	}

	zeroAddress := common.Address{}
	// If the inception event contains a valid AppAddress, then we consider it a bot.
	if len(inception.AppAddress) == 20 && common.Address(inception.AppAddress) != zeroAddress {
		return true, nil
	}

	return false, err
}
