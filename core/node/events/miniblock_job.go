package events

import (
	"bytes"
	"context"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/storage"
)

// mbJos tracks single miniblock production attempt for a single stream.
type mbJob struct {
	stream        *Stream
	cache         *StreamCache
	forceSnapshot bool

	remoteNodes []common.Address
	replicated  bool

	// syncNodes holds the list of node address that track to stream in preparation of joining the quorum.
	syncNodes []common.Address

	candidate *MiniblockInfo
}

func (j *mbJob) produceCandidate(ctx context.Context) error {
	var isLocal bool
	j.remoteNodes, isLocal = j.stream.GetRemotesAndIsLocal()
	j.syncNodes = j.stream.GetSyncNodes()
	j.replicated = len(j.remoteNodes) > 0

	// TODO: this is a sanity check, but in general mb production code needs to be hardened
	// to handle scenario when local replica is removed from the stream.
	if !isLocal {
		return RiverError(Err_INTERNAL, "Not a local stream")
	}

	err := j.makeCandidate(ctx)
	if err != nil {
		return err
	}
	if j.candidate == nil {
		return nil
	}

	err = j.saveCandidate(ctx)
	if err != nil {
		return err
	}

	return nil
}

func (j *mbJob) makeCandidate(ctx context.Context) error {
	var prop *mbProposal
	var view *StreamView
	var err error
	if j.replicated {
		prop, view, err = j.makeReplicatedProposal(ctx)
	} else {
		prop, view, err = j.makeLocalProposal(ctx)
	}
	if err != nil {
		return err
	}
	if prop == nil {
		return nil
	}

	j.candidate, err = view.makeMiniblockCandidate(ctx, j.cache.Params(), prop)
	if err != nil {
		return err
	}

	return nil
}

func (j *mbJob) makeReplicatedProposal(ctx context.Context) (*mbProposal, *StreamView, error) {
	proposals, view, err := j.processRemoteProposals(ctx)
	if err != nil {
		return nil, nil, err
	}

	localProposal := view.proposeNextMiniblock(ctx, j.cache.Params().ChainConfig.Get(), j.forceSnapshot)

	proposals = append(proposals, localProposal)

	combined, err := j.combineProposals(proposals)
	if err != nil {
		return nil, nil, err
	}

	return combined, view, nil
}

func (j *mbJob) makeLocalProposal(ctx context.Context) (*mbProposal, *StreamView, error) {
	view, err := j.stream.GetView(ctx)
	if err != nil {
		return nil, nil, err
	}

	prop := view.proposeNextMiniblock(ctx, j.cache.Params().ChainConfig.Get(), j.forceSnapshot)

	// Is there anything to do?
	if len(prop.eventHashes) == 0 && !prop.shouldSnapshot {
		return nil, view, nil
	}

	return prop, view, nil
}

func (j *mbJob) processRemoteProposals(ctx context.Context) ([]*mbProposal, *StreamView, error) {
	view, err := j.stream.GetView(ctx)
	if err != nil {
		return nil, nil, err
	}

	request := &ProposeMiniblockRequest{
		StreamId:           j.stream.streamId[:],
		DebugForceSnapshot: j.forceSnapshot,
		NewMiniblockNum:    view.minipool.generation,
		PrevMiniblockHash:  view.LastBlock().Ref.Hash[:],
		LocalEventHashes:   view.minipool.eventHashesAsBytes(),
	}

	proposals, quorumErr := j.gatherRemoteProposals(ctx, request)

	// Get view again and bug out if stream advanced in the meantime.
	view, err = j.stream.GetView(ctx)
	if err != nil {
		return nil, nil, err
	}
	if view.minipool.generation != request.NewMiniblockNum {
		// TODO: REPLICATION: FIX: if any MissingEvents are received, should they still be attempted to be added? I.e. loop below should be still executed?
		return nil, nil, RiverError(Err_MINIBLOCK_TOO_OLD, "mbJob.processRemoteProposals: stream advanced in the meantime (1)")
	}

	// Apply received MissingEvents, even if there are not enough quorum of proposals.
	added := make(map[common.Hash]bool)
	converted := make([]*mbProposal, len(proposals))
	for i, p := range proposals {
		converted[i] = mbProposalFromProto(p.Proposal)

		for _, e := range p.MissingEvents {
			parsed, err := ParseEvent(e)
			if err != nil {
				logging.FromCtx(ctx).Errorw("mbJob.processRemoteProposals: error parsing event", "err", err)
				continue
			}
			if _, ok := added[parsed.Hash]; !ok {
				added[parsed.Hash] = true

				if !view.minipool.events.Has(parsed.Hash) {
					newView, err := j.stream.AddEvent2(ctx, parsed)
					if err == nil {
						view = newView
					} else {
						logging.FromCtx(ctx).Errorw("mbJob.processRemoteProposals: error adding event", "err", err)
					}
				}
			}
		}
	}

	// View might have been updated by adding events, check if stream advanced in the meantime.
	if view.minipool.generation != request.NewMiniblockNum {
		return nil, nil, RiverError(Err_MINIBLOCK_TOO_OLD, "mbJob.processRemoteProposals: stream advanced in the meantime (2)")
	}

	if quorumErr != nil {
		// if one of the nodes returned MINIBLOCK_TOO_OLD it indicates that this node has fallen behind, sync to catch up.
		if AsRiverError(quorumErr).IsCodeWithBases(Err_MINIBLOCK_TOO_OLD) {
			j.cache.SubmitSyncStreamTask(ctx, j.stream)
		}
		return nil, nil, quorumErr
	}

	// Sanity check: check if we have enough remote proposals and return them.
	if len(converted) >= RemoteQuorumNum(len(j.remoteNodes), true) {
		return converted, view, nil
	}

	return nil, nil, RiverError(Err_INTERNAL, "mbJob.processRemoteProposals: no proposals and no errors")
}

func (j *mbJob) combineProposals(proposals []*mbProposal) (*mbProposal, error) {
	// Sanity check: all proposals must have the same miniblock number and prev hash.
	for _, p := range proposals {
		if p.newMiniblockNum != proposals[0].newMiniblockNum || p.prevMiniblockHash != proposals[0].prevMiniblockHash {
			return nil, RiverError(Err_INTERNAL, "mbJob.combineProposals: different miniblock numbers or prev hashes")
		}
	}

	// Sanity check: there should be quorum of proposals.
	quorumNum := TotalQuorumNum(len(j.remoteNodes) + 1)
	if len(proposals) < quorumNum {
		return nil, RiverError(Err_INTERNAL, "mbJob.combineProposals: not enough proposals")
	}

	// Count ShouldSnapshot.
	shouldSnapshotNum := 0
	for _, p := range proposals {
		if p.shouldSnapshot {
			shouldSnapshotNum++
		}
	}
	shouldSnapshot := shouldSnapshotNum >= quorumNum

	// Count event hashes.
	eventCounts := make(map[common.Hash]int)
	for _, p := range proposals {
		for _, h := range p.eventHashes {
			eventCounts[h]++
		}
	}

	events := make([]common.Hash, 0, len(eventCounts))
	for h, c := range eventCounts {
		if c >= quorumNum {
			events = append(events, h)
		}
	}

	// Is there anything to do?
	if len(events) == 0 && !shouldSnapshot {
		return nil, nil
	}

	return &mbProposal{
		newMiniblockNum:   proposals[0].newMiniblockNum,
		prevMiniblockHash: proposals[0].prevMiniblockHash,
		shouldSnapshot:    shouldSnapshot,
		eventHashes:       events,
	}, nil
}

func (j *mbJob) gatherRemoteProposals(
	ctx context.Context,
	request *ProposeMiniblockRequest,
) ([]*ProposeMiniblockResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, j.cache.Params().RiverChain.Config.BlockTime()*2)
	defer cancel()

	proposals := make([]*ProposeMiniblockResponse, 0, len(j.remoteNodes))
	var mu sync.Mutex

	qp := NewQuorumPool(
		ctx,
		NewQuorumPoolOpts().
			ReadModeWithFractionAndTimeout(2.0, 100*time.Millisecond).
			WithTags(
				"method", "mbJob.gatherRemoteProposals",
				"streamId", j.stream.streamId,
				"newMiniblockNum", request.NewMiniblockNum,
				"prevMiniblockHash", request.PrevMiniblockHash,
			),
	)

	// Add fake task to return success for local node, it's a bit hacky, but it is required for correct quorum calculations.
	qp.AddTask(func(ctx context.Context) error {
		return nil
	})

	qp.AddNodeTasks(
		j.remoteNodes,
		func(ctx context.Context, node common.Address) error {
			proposal, err := j.cache.Params().RemoteMiniblockProvider.GetMbProposal(ctx, node, request)
			if err != nil {
				return err
			}

			// Sanity check: discard proposals for wrong miniblock number and wrong prev hash.
			if proposal.Proposal.NewMiniblockNum != request.NewMiniblockNum || !bytes.Equal(proposal.Proposal.PrevMiniblockHash, request.PrevMiniblockHash) {
				return RiverError(Err_MINIBLOCK_TOO_OLD, "gatherRemoteProposals: wrong miniblock number or prev hash")
			}

			mu.Lock()
			defer mu.Unlock()
			proposals = append(proposals, proposal)
			return nil
		},
	)

	err := qp.Wait()

	mu.Lock()
	defer mu.Unlock()
	ret := proposals
	proposals = nil
	return ret, err
}

func (j *mbJob) saveCandidate(ctx context.Context) error {
	qp := NewQuorumPool(
		ctx,
		NewQuorumPoolOpts().
			WriteMode().
			WithTags(
				"method", "mbJob.saveCandidate",
				"streamId", j.stream.streamId,
				"miniblock", j.candidate.Ref,
			),
	)

	qp.AddTask(func(ctx context.Context) error {
		miniblockBytes, err := j.candidate.ToBytes()
		if err != nil {
			return err
		}

		return j.cache.Params().Storage.WriteMiniblockCandidate(
			ctx,
			j.stream.streamId,
			&storage.WriteMiniblockData{
				Number: j.candidate.Ref.Num,
				Hash:   j.candidate.Ref.Hash,
				Data:   miniblockBytes,
			},
		)
	})

	qp.AddNodeTasks(j.remoteNodes, func(ctx context.Context, node common.Address) error {
		return j.cache.Params().RemoteMiniblockProvider.SaveMbCandidate(ctx, node, j.stream.streamId, j.candidate.Proto)
	})

	for _, node := range j.syncNodes {
		go func() {
			_ = j.cache.Params().RemoteMiniblockProvider.SaveMbCandidate(ctx, node, j.stream.streamId, j.candidate.Proto)
		}()
	}

	return qp.Wait()
}
