package events

import (
	"bytes"
	"context"
	"slices"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/crypto"

	"github.com/towns-protocol/towns/core/blockchain"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

// mbJos tracks single miniblock production attempt for a single stream.
type mbJob struct {
	// stream is the stream this job is producing a miniblock for.
	stream *Stream
	// cache is the nodes stream cache.
	cache *StreamCache
	// forceSnapshot is true if the miniblock producer is forced to snapshot.
	forceSnapshot bool
	// quorumNodes is the list of nodes that participate in the stream quorum.
	quorumNodes []common.Address
	// reconcileNodes is the list of nodes that reconcile the stream into local storage in anticipation
	// of joining the streams quorum.
	reconcileNodes []common.Address
	// replicated is true if the stream is replicated.
	replicated bool
	// candidate is the produced miniblock candidate that is attempted to promote to a miniblock.
	candidate *MiniblockInfo
	// skipPromotion is true if the miniblock producer is skipping promotion, used by writeLatestKnownMiniblock.
	skipPromotion bool
}

func skipCandidate(candidateCount int, blockNum blockchain.BlockNumber) bool {
	if blockNum == 0 {
		return false
	}

	cc := candidateCount / 10

	if cc <= 0 {
		return false
	}

	if cc > 10 {
		cc = 10
	}

	// slow down candidate production by 2x for every 10 candidates for up to 450x slowdown.
	// i.e. 900 seconds -> once every 15 minutes.
	slowDownFactor := min(1<<cc, 450)

	// Really shouldn't happen, but just in case.
	if slowDownFactor <= 1 {
		return false
	}

	return uint64(blockNum)%uint64(slowDownFactor) != 0
}

func (j *mbJob) shouldContinue(ctx context.Context, blockNum blockchain.BlockNumber) error {
	if blockNum == 0 {
		return nil
	}

	view, err := j.stream.GetView(ctx)
	if err != nil {
		return err
	}

	candidateCount, err := j.cache.params.Storage.GetMiniblockCandidateCount(
		ctx,
		j.stream.StreamId(),
		view.minipool.generation,
	)
	if err != nil {
		return err
	}

	if skipCandidate(candidateCount, blockNum) {
		return RiverError(
			Err_RESOURCE_EXHAUSTED,
			"mbJob.shouldContinue: candidate production is slowed down",
			"candidateCount",
			candidateCount,
			"blockNum",
			blockNum,
			"streamId",
			j.stream.streamId,
			"miniblockGeneration",
			view.minipool.generation,
		)
	}

	return nil
}

func (j *mbJob) produceCandidate(ctx context.Context, blockNum blockchain.BlockNumber) error {
	err := j.shouldContinue(ctx, blockNum)
	if err != nil {
		return err
	}

	// miniblock producer creates mbJob's only on nodes that participate in stream quorum.
	j.quorumNodes, j.reconcileNodes, _ = j.stream.GetQuorumAndReconcileNodesAndIsLocal()
	j.replicated = len(j.quorumNodes) > 1

	// TODO: this is a sanity check, but in general mb production code needs to be hardened
	// to handle scenario when local replica is removed from the stream.
	if !slices.Contains(j.quorumNodes, j.cache.Params().Wallet.Address) {
		return RiverError(Err_INTERNAL, "Node not participating in stream quorum").
			Tag("streamId", j.stream.streamId)
	}

	err = j.makeCandidate(ctx)
	if err != nil {
		return err
	}
	if j.candidate == nil {
		return nil
	}

	if err := j.saveCandidate(ctx); err != nil {
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
	// retrieve remote proposals
	proposals, view, err := j.processRemoteProposals(ctx)
	if err != nil {
		return nil, nil, err
	}

	// create local proposal
	localProposal := view.proposeNextMiniblock(ctx, j.cache.Params().ChainConfig.Get(), j.forceSnapshot, j.replicated)

	// Combine proposals into a single proposal that is used to create a miniblock candidate.
	proposals = append(proposals, localProposal)
	combined, err := j.combineProposals(proposals, j.cache.Params().ChainConfig.Get())
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

	prop := view.proposeNextMiniblock(ctx, j.cache.Params().ChainConfig.Get(), j.forceSnapshot, j.replicated)

	// Is there anything to do?
	if len(prop.events) == 0 && !prop.shouldSnapshot {
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
		// TODO: REPLICATION: FIX: if any MissingEvents are received, should they still be attempted to be added? I.e.
		// loop below should be still executed?
		return nil, nil, RiverError(
			Err_MINIBLOCK_TOO_OLD,
			"mbJob.processRemoteProposals: stream advanced in the meantime (1)",
		)
	}

	// Apply received MissingEvents, even if there is not enough to reach quorum at the moment.
	// This will ensure that events propagate over all replicas.
	added := make(map[common.Hash]bool)
	converted := make([]*mbProposal, len(proposals))
	for i, p := range proposals {
		// if the proposal was created on a different minipool generation, ignore it.
		if p.response.GetProposal().GetNewMiniblockNum() != view.minipool.generation {
			continue
		}

		// add missing events that replicas provided to the local minipool and keep track of the new stream view
		for _, e := range p.response.MissingEvents {
			parsed, err := ParseEvent(e)
			if err != nil {
				logging.FromCtx(ctx).Errorw("mbJob.processRemoteProposals: error parsing event", "error", err)
				continue
			}

			if _, ok := added[parsed.Hash]; !ok {
				added[parsed.Hash] = true
				if !view.minipool.events.Has(parsed.Hash) {
					newView, err := j.stream.addEvent(ctx, parsed, true)
					if err == nil {
						view = newView
					} else {
						logging.FromCtx(ctx).Errorw(
							"mbJob.processRemoteProposals: error adding event",
							"error",
							err,
							"source",
							p.source,
						)
					}
				}
			}
		}

		converted[i] = mbProposalFromProto(p.response.Proposal, view)
	}

	// View might have been updated by adding events, check if stream advanced in the meantime.
	if view.minipool.generation != request.NewMiniblockNum {
		return nil, nil, RiverError(
			Err_MINIBLOCK_TOO_OLD,
			"mbJob.processRemoteProposals: stream advanced in the meantime (2)",
		)
	}

	if quorumErr != nil {
		// if one of the nodes returned MINIBLOCK_TOO_OLD it indicates that this node has fallen behind, reconcile to
		// catch up.
		if AsRiverError(quorumErr).IsCodeWithBases(Err_MINIBLOCK_TOO_OLD) {
			j.cache.SubmitReconcileStreamTask(j.stream, nil)
		}
		return nil, nil, quorumErr
	}

	// Sanity check: check if we have enough remote proposals and return them.
	if len(converted) >= RemoteQuorumNum(len(j.quorumNodes), true) {
		return converted, view, nil
	}

	return nil, nil, RiverError(Err_INTERNAL, "mbJob.processRemoteProposals: no proposals and no errors")
}

// combineProposals combines the given proposals into a single proposal that can be
// used to create a miniblock candidate.
//
// The combined proposal will contain all events from the given proposals that appear at least
// quorumNum times. It will also contain the ShouldSnapshot flag if at least quorumNum proposals
// contain ShouldSnapshot events.
func (j *mbJob) combineProposals(proposals []*mbProposal, cfg *crypto.OnChainSettings) (*mbProposal, error) {
	// Sanity check: all proposals must have the same miniblock number and prev hash.
	for _, p := range proposals {
		if p.newMiniblockNum != proposals[0].newMiniblockNum || p.prevMiniblockHash != proposals[0].prevMiniblockHash {
			return nil, RiverError(Err_INTERNAL, "mbJob.combineProposals: different miniblock numbers or prev hashes")
		}
	}

	// Sanity check: there should be quorum of proposals.
	quorumNum := TotalQuorumNum(len(j.quorumNodes) + 1)
	if len(proposals) < quorumNum {
		return nil, RiverError(Err_INTERNAL, "mbJob.combineProposals: not enough proposals")
	}

	// count on how many replicates votes to create a snapshot in the miniblock candidate.
	proposalSnapshotVotesCount := 0
	for _, p := range proposals {
		if p.shouldSnapshot {
			proposalSnapshotVotesCount++
		}
	}

	// Count how often each event appears in the proposals.
	// Only events that appear at least quorumNum times are included in the combined proposal.
	eventCounts := make(map[common.Hash]int)
	for _, p := range proposals {
		for _, ev := range p.events {
			eventCounts[ev.Hash]++
		}
	}

	// walk over all event hashes and add the events to the combined proposal if reached quorum.
	// do it this way to preserve order of events as they were received in a single proposal.
	// we do not attempt to order events across proposals. allow up to set limits in the
	// combined proposal.
	var (
		maxEventsPerMiniblock, maxEventCombinedSize = MiniblockEventLimits(cfg)
		combinedEvents                              = make([]mbProposalEvent, 0, len(eventCounts))
		combinedTotalEventSize                      = 0
	)

	var reachedLimit bool
	for _, p := range proposals {
		for _, event := range p.events {
			if c, ok := eventCounts[event.Hash]; ok {
				// only include events that appear at least quorumNum times
				if c >= quorumNum {
					// if adding the next event to the combined proposal exceeds limits, stop processing all proposals
					if len(combinedEvents) >= maxEventsPerMiniblock ||
						combinedTotalEventSize+event.Size > maxEventCombinedSize {
						reachedLimit = true
						break
					}
					combinedEvents = append(combinedEvents, event)
					// keep track of the total size of all events in the combined proposal
					combinedTotalEventSize += event.Size
				}
				// if the next proposal contains the same event, it won't be processed again.
				delete(eventCounts, event.Hash)
			}
		}
		if reachedLimit {
			break
		}
	}

	// ShouldSnapshot flag is set if at least quorumNum proposals contain ShouldSnapshot vote.
	shouldSnapshot := proposalSnapshotVotesCount >= quorumNum

	// Is there anything to do?
	if len(combinedEvents) == 0 && !shouldSnapshot {
		return nil, nil
	}

	return &mbProposal{
		newMiniblockNum:   proposals[0].newMiniblockNum,
		prevMiniblockHash: proposals[0].prevMiniblockHash,
		shouldSnapshot:    shouldSnapshot,
		events:            combinedEvents,
	}, nil
}

type sourcedProposalResponse struct {
	response *ProposeMiniblockResponse
	source   common.Address
}

func (j *mbJob) gatherRemoteProposals(
	ctx context.Context,
	request *ProposeMiniblockRequest,
) ([]*sourcedProposalResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, j.cache.Params().RiverChain.Config.BlockTime()*2)
	defer cancel()

	proposals := make([]*sourcedProposalResponse, 0, len(j.quorumNodes))
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

	// Add fake task to return success for local node, it's a bit hacky, but it is required for correct quorum
	// calculations.
	qp.AddTask(func(ctx context.Context) error {
		return nil
	})

	// local proposal is requested separately
	remoteQuorumNodes := slices.DeleteFunc(slices.Clone(j.quorumNodes), func(node common.Address) bool {
		return node == j.cache.Params().Wallet.Address
	})

	qp.AddNodeTasks(
		remoteQuorumNodes,
		func(ctx context.Context, node common.Address) error {
			proposal, err := j.cache.Params().RemoteMiniblockProvider.GetMbProposal(ctx, node, request)
			if err != nil {
				return err
			}

			// Sanity check: discard proposals for wrong miniblock number and wrong prev hash.
			if proposal.Proposal.NewMiniblockNum != request.NewMiniblockNum ||
				!bytes.Equal(proposal.Proposal.PrevMiniblockHash, request.PrevMiniblockHash) {
				return RiverError(Err_MINIBLOCK_TOO_OLD, "gatherRemoteProposals: wrong miniblock number or prev hash")
			}

			mu.Lock()
			defer mu.Unlock()
			proposals = append(proposals, &sourcedProposalResponse{
				response: proposal,
				source:   node,
			})

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
	timeout := 240 * time.Second // TODO: REPLICATION: FIX: make this timeout configurable
	qp := NewQuorumPool(
		ctx,
		NewQuorumPoolOpts().
			WriteModeWithTimeout(timeout).
			WithTags(
				"method", "mbJob.saveCandidate",
				"streamId", j.stream.streamId,
				"miniblock", j.candidate.Ref,
			),
	)

	qp.AddTask(func(ctx context.Context) error {
		mb, err := j.candidate.AsStorageMb()
		if err != nil {
			return err
		}

		return j.cache.Params().Storage.WriteMiniblockCandidate(ctx, j.stream.streamId, mb)
	})

	quorumNodes := slices.DeleteFunc(slices.Clone(j.quorumNodes), func(node common.Address) bool {
		return node == j.cache.Params().Wallet.Address
	})

	qp.AddNodeTasks(quorumNodes, func(ctx context.Context, node common.Address) error {
		return j.cache.Params().RemoteMiniblockProvider.SaveMbCandidate(ctx, node, j.stream.streamId, j.candidate)
	})

	// save the candidate to the nodes that are not in the quorum but participating in the stream.
	for _, node := range j.reconcileNodes {
		go func() {
			_ = j.cache.Params().RemoteMiniblockProvider.SaveMbCandidate(
				ctx,
				node,
				j.stream.streamId,
				j.candidate,
			)
		}()
	}

	err := qp.Wait()
	if err != nil {
		logging.FromCtx(ctx).
			Errorw("mbJob.saveCandidate: error saving candidate", "error", err, "streamId", j.stream.streamId, "miniblock", j.candidate.Ref, "timeout", timeout)
		return err
	}

	return nil
}
