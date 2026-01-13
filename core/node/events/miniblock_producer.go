package events

import (
	"context"
	"slices"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"
	"github.com/puzpuzpuz/xsync/v4"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	// MiniblockCandidateBatchSize keep track the max number of miniblockblocks that are registered in the
	// StreamRegistry
	// in a single transaction.
	MiniblockCandidateBatchSize = 50

	MiniblockLeaderBlockInterval = 10
)

type TestMiniblockProducer interface {
	// TestMakeMiniblock is a debug function that creates a miniblock proposal, stores it in the registry, and applies
	// it to the stream.
	// It is intended to be called manually from the test code.
	// TestMakeMiniblock always creates a miniblock if there are events in the minipool.
	// TestMakeMiniblock always creates a miniblock if forceSnapshot is true. This miniblock will have a snapshot.
	//
	// If there are no events in the minipool and forceSnapshot is false, TestMakeMiniblock does nothing and succeeds.
	//
	// Returns the hash and number of the last know miniblock.
	TestMakeMiniblock(
		ctx context.Context,
		streamId StreamId,
		forceSnapshot bool,
	) (*MiniblockRef, error)
}

type MiniblockProducerOpts struct {
	TestDisableMbProdcutionOnBlock bool
}

// NewMiniblockProducer instantiates a miniblockblockProducer instance that implements the MiniblockProducer interface.
// It registers a callback on new RiverChain blocks, and every time this callback is called, it creates miniblockblock
// candidates and schedules these candidates for registration.
func newMiniblockProducer(
	ctx context.Context,
	streamCache *StreamCache,
	opts *MiniblockProducerOpts,
) *miniblockProducer {
	mb := &miniblockProducer{
		streamCache:      streamCache,
		localNodeAddress: streamCache.Params().Wallet.Address,
		jobs:             xsync.NewMap[StreamId, *mbJob](),
	}

	if opts != nil {
		mb.opts = *opts
	}

	if !mb.opts.TestDisableMbProdcutionOnBlock {
		streamCache.Params().ChainMonitor.OnBlock(mb.onNewBlock)
	}

	return mb
}

type miniblockProducer struct {
	streamCache      *StreamCache
	opts             MiniblockProducerOpts
	localNodeAddress common.Address

	jobs *xsync.Map[StreamId, *mbJob]

	candidates candidateTracker

	onNewBlockMutex deadlock.Mutex
}

var _ TestMiniblockProducer = (*miniblockProducer)(nil)

// candidateTracker is a helper struct to accumulate proposals and call SetStreamLastMiniblockBatch.
// Logically this is just a part of the miniblockProducer, but encapsulating logic here makes
// the code more readable.
type candidateTracker struct {
	mu         deadlock.Mutex
	candidates []*mbJob
	timer      *time.Timer
}

func (p *candidateTracker) add(ctx context.Context, mp *miniblockProducer, j *mbJob) {
	var readyProposals []*mbJob
	p.mu.Lock()
	p.candidates = append(p.candidates, j)
	if len(p.candidates) >= MiniblockCandidateBatchSize {
		if p.timer != nil {
			p.timer.Stop()
			p.timer = nil
		}
		readyProposals = p.candidates
		p.candidates = nil
	} else if len(p.candidates) == 1 {
		// Wait quarter of a block time before submitting the batch.
		p.timer = time.AfterFunc(
			mp.streamCache.Params().RiverChain.Config.BlockTime()/4,
			func() {
				p.mu.Lock()
				p.timer = nil
				readyProposals := p.candidates
				p.candidates = nil
				p.mu.Unlock()
				if len(readyProposals) > 0 {
					mp.submitProposalBatch(ctx, readyProposals)
				}
			},
		)
	}
	p.mu.Unlock()
	if len(readyProposals) > 0 {
		go mp.submitProposalBatch(ctx, readyProposals)
	}
}

// onNewBlock loops over streams and determines if it needs to produce a miniblock block.
// For every stream that is eligible to produce a miniblock block it creates a miniblock block candidate.
// It bundles candidates in a batch.
// If the batch is full it submits the batch to the RiverRegistry#stream facet for registration and parses the resulting
// logs to determine which mini block candidate was registered and which are not. For each registered mini block
// candidate it applies the candidate to the stream.
func (p *miniblockProducer) onNewBlock(ctx context.Context, blockNum blockchain.BlockNumber) {
	// Try lock to have only one invocation at a time. Previous onNewBlock may still be running.
	if !p.onNewBlockMutex.TryLock() {
		return
	}
	// don't block the chain monitor
	go func() {
		defer p.onNewBlockMutex.Unlock()
		_ = p.scheduleCandidates(ctx, blockNum)
	}()
}

func (p *miniblockProducer) scheduleCandidates(ctx context.Context, blockNum blockchain.BlockNumber) []*mbJob {
	log := logging.FromCtx(ctx)

	candidates := p.streamCache.GetMbCandidateStreams(ctx)

	var scheduled []*mbJob

	for _, stream := range candidates {
		if !p.isLocalLeaderOnCurrentBlock(stream, blockNum) {
			log.Debugw(
				"MiniblockProducer: OnNewBlock: Not a leader for stream",
				"streamId",
				stream.streamId,
				"blockNum",
				blockNum,
			)
			continue
		}
		j := p.trySchedule(ctx, stream, blockNum)
		if j != nil {
			scheduled = append(scheduled, j)
			log.Debugw(
				"MiniblockProducer: OnNewBlock: Scheduled miniblock production",
				"streamId",
				stream.streamId,
			)
		} else {
			log.Debugw(
				"MiniblockProducer: OnNewBlock: Miniblock production already scheduled",
				"streamId",
				stream.streamId,
			)
		}
	}

	return scheduled
}

func (p *miniblockProducer) isLocalLeaderOnCurrentBlock(
	stream *Stream,
	blockNum blockchain.BlockNumber,
) bool {
	streamNodes := stream.GetQuorumNodes()
	if len(streamNodes) == 0 {
		return false
	}
	index := (blockNum.AsUint64() / MiniblockLeaderBlockInterval) % uint64(len(streamNodes))
	return streamNodes[index] == p.localNodeAddress
}

func (p *miniblockProducer) trySchedule(ctx context.Context, stream *Stream, blockNum blockchain.BlockNumber) *mbJob {
	j := &mbJob{
		stream: stream,
		cache:  p.streamCache,
	}
	_, prevLoaded := p.jobs.LoadOrStore(stream.streamId, j)
	if !prevLoaded {
		go p.jobStart(ctx, j, blockNum)
		return j
	}
	return nil
}

func (p *miniblockProducer) testCheckDone(job *mbJob) bool {
	actual, _ := p.jobs.Load(job.stream.streamId)
	return actual != job
}

func (p *miniblockProducer) testCheckAllDone(jobs []*mbJob) bool {
	for _, j := range jobs {
		if !p.testCheckDone(j) {
			return false
		}
	}
	return true
}

// TestMakeMiniblock is a debug function that creates a miniblock proposal, stores it in the registry, and applies it to
// the stream.
// It is intended to be called manually from the test code.
// TestMakeMiniblock always creates a miniblock if there are events in the minipool.
// TestMakeMiniblock always creates a miniblock if forceSnapshot is true. This miniblock will have a snapshot.
//
// If there are no events in the minipool and forceSnapshot is false, TestMakeMiniblock does nothing and succeeds.
//
// Returns the hash and number of the last known miniblock.
func (p *miniblockProducer) TestMakeMiniblock(
	ctx context.Context,
	streamId StreamId,
	forceSnapshot bool,
) (*MiniblockRef, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	stream, err := p.streamCache.GetStreamWaitForLocal(ctx, streamId)
	if err != nil {
		return nil, err
	}

	job := &mbJob{
		stream:        stream,
		cache:         p.streamCache,
		forceSnapshot: forceSnapshot,
	}

	// Spin until we manage to insert our job into the jobs map.
	// This is test-only code, so we don't care about the performance.
	for {
		actual, _ := p.jobs.LoadOrStore(streamId, job)
		if actual == job {
			go p.jobStart(ctx, job, 0)
			break
		}

		err = SleepWithContext(ctx, 10*time.Millisecond)
		if err != nil {
			return nil, AsRiverError(err, Err_INTERNAL).
				Func("TestMakeMiniblock").
				Message("Timed out while waiting for make_miniblock job to be scheduled").
				Tag("streamId", streamId)
		}
	}

	// Wait for the job to finish.
	for {
		if current, _ := p.jobs.Load(streamId); current != job {
			break
		}

		err = SleepWithContext(ctx, 10*time.Millisecond)
		if err != nil {
			return nil, AsRiverError(err, Err_INTERNAL).
				Func("TestMakeMiniblock").
				Message("Timed out while waiting for make_miniblock job to terminate").
				Tag("streamId", streamId)
		}
	}

	view, err := stream.GetView(ctx)
	if err != nil {
		return nil, err
	}

	return view.LastBlock().Ref, nil
}

func (p *miniblockProducer) jobStart(ctx context.Context, j *mbJob, blockNum blockchain.BlockNumber) {
	if ctx.Err() != nil {
		p.jobDone(ctx, j)
		return
	}

	err := j.produceCandidate(ctx, blockNum)
	if err != nil {
		logging.FromCtx(ctx).
			Warnw(
				"MiniblockProducer: jobStart: Error creating miniblockblock proposal",
				"streamId",
				j.stream.streamId,
				"error",
				err,
			)
		p.jobDone(ctx, j)
		return
	}
	if j.candidate == nil {
		p.jobDone(ctx, j)
		return
	}

	p.candidates.add(ctx, p, j)
}

func (p *miniblockProducer) jobDone(ctx context.Context, j *mbJob) {
	notFound := false
	// Delete the job from the jobs map if value is the same as j.
	_, _ = p.jobs.Compute(
		j.stream.streamId,
		func(oldValue *mbJob, loaded bool) (*mbJob, xsync.ComputeOp) {
			if oldValue == j {
				return nil, xsync.DeleteOp
			}
			notFound = true
			return oldValue, xsync.CancelOp
		},
	)
	if notFound && !j.skipPromotion {
		logging.FromCtx(ctx).
			Errorw("MiniblockProducer: jobDone: job not found in jobs map", "streamId", j.stream.streamId)
	}
}

func (p *miniblockProducer) submitProposalBatch(ctx context.Context, proposals []*mbJob) {
	log := logging.FromCtx(ctx)

	if len(proposals) == 0 {
		return
	}

	var (
		success          []StreamId
		invalidProposals []StreamId
		failed           []StreamId
		mbs              []river.SetMiniblock
	)

	for _, job := range proposals {
		mbs = append(
			mbs,
			river.SetMiniblock{
				StreamId:          job.stream.streamId,
				PrevMiniBlockHash: job.candidate.headerEvent.MiniblockRef.Hash,
				LastMiniblockHash: job.candidate.headerEvent.Hash,
				LastMiniblockNum:  uint64(job.candidate.Ref.Num),
				IsSealed:          false,
			},
		)
	}

	successRegistered, invalid, failed, err := p.streamCache.Params().Registry.SetStreamLastMiniblockBatch(ctx, mbs)
	if err == nil {
		success = append(success, successRegistered...)
		invalidProposals = append(invalidProposals, invalid...)
		if len(failed) > 0 {
			log.Errorw("processMiniblockProposalBatch: Failed to register some miniblocks", "failed", failed)
		}
	} else {
		log.Errorw("processMiniblockProposalBatch: Error registering miniblock batch", "error", err)
	}

	log.Infow("processMiniblockProposalBatch: Submitted SetStreamLastMiniblockBatch",
		"total", len(proposals),
		"success", len(success),
		"failed", len(failed),
	)

	streamsNeedingReconciliation := make([]*mbJob, 0, len(invalidProposals))

	for _, job := range proposals {
		if slices.Contains(success, job.stream.streamId) && !job.skipPromotion {
			go func() {
				err := job.stream.ApplyMiniblock(ctx, job.candidate)
				if err != nil {
					log.Errorw(
						"processMiniblockProposalBatch: Error applying miniblock",
						"streamId",
						job.stream.streamId,
						"error",
						err,
					)
				}
				p.jobDone(ctx, job)
			}()
		} else if slices.Contains(invalidProposals, job.stream.streamId) && !job.skipPromotion {
			streamsNeedingReconciliation = append(streamsNeedingReconciliation, job)
		} else {
			p.jobDone(ctx, job)
		}
	}

	if err := p.promoteConfirmedCandidates(ctx, streamsNeedingReconciliation); err != nil {
		log.Errorw("processMiniblockProposalBatch: Error promoting confirmed miniblock candidates", "error", err)
	}
}

// promoteConfirmedCandidates tries to promote local candidates that are registered in the Stream Registry
// but not yet applied.
func (p *miniblockProducer) promoteConfirmedCandidates(ctx context.Context, jobs []*mbJob) error {
	if len(jobs) == 0 {
		return nil
	}

	log := logging.FromCtx(ctx)
	registry := p.streamCache.Params().Registry

	headNum, err := p.streamCache.Params().RiverChain.Client.BlockNumber(ctx)
	if err != nil {
		return AsRiverError(err, Err_CANNOT_CALL_CONTRACT).
			Message("Unable to determine River Chain block number")
	}

	for _, job := range jobs {
		stream, err := registry.StreamRegistry.GetStreamOnBlock(
			ctx,
			job.stream.streamId,
			blockchain.BlockNumber(headNum),
		)
		if err != nil {
			log.Errorw("Unable to retrieve stream details from registry",
				"streamId", job.stream.streamId, "error", err)

			p.jobDone(ctx, job)
			continue
		}

		committedLocalCandidateRef := stream.LastMb()

		if err := job.stream.promoteCandidate(ctx, committedLocalCandidateRef); err == nil {
			log.Infow("Promoted miniblock candidate",
				"streamId", job.stream.streamId,
				"mb", committedLocalCandidateRef)
		} else {
			log.Errorw("Unable to promote candidate",
				"streamId", job.stream.streamId,
				"mb", committedLocalCandidateRef,
				"error", err)
		}

		p.jobDone(ctx, job)
	}

	return nil
}

// writeLatestKnownMiniblock writes the latest known miniblock to the smart contract record for this
// stream.
// It is used in the very specific situation: stream was unreplicated and new reconcilation replicas were added.
// Unreplicated streams write updates at reduced rate, but in this case write should be done immediately to
// allow replicas to catch up to the correct state.
func (p *miniblockProducer) writeLatestKnownMiniblock(ctx context.Context, stream *Stream, mb *MiniblockInfo) {
	job := &mbJob{
		stream:        stream,
		cache:         p.streamCache,
		replicated:    true,
		candidate:     mb,
		skipPromotion: true,
	}

	p.candidates.add(ctx, p, job)
}
