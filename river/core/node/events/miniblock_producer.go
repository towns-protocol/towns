package events

import (
	"context"
	"slices"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/contracts/river"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/shared"
)

const (
	// MiniblockCandidateBatchSize keep track the max number of new miniblocks that are registered in the StreamRegistry
	// in a single transaction.
	MiniblockCandidateBatchSize = 50
)

type MiniblockProducer interface {
	scheduleCandidates(ctx context.Context) []*mbJob
	testCheckAllDone(jobs []*mbJob) bool

	// TestMakeMiniblock is a debug function that creates a miniblock proposal, stores it in the registry, and applies it to the stream.
	// It is intended to be called manually from the test code.
	// TestMakeMiniblock always creates a miniblock if there are events in the minipool.
	// TestMakeMiniblock always creates a miniblock if forceSnapshot is true. This miniblock will have a snapshot.
	//
	// If there are no events in the minipool and forceSnapshot is false, TestMakeMiniblock does nothing and succeeds.
	//
	// Returns the hash and number of the last know block.
	TestMakeMiniblock(
		ctx context.Context,
		streamId StreamId,
		forceSnapshot bool,
	) (common.Hash, int64, error)
}

type MiniblockProducerOpts struct {
	TestDisableMbProdcutionOnBlock bool
}

func NewMiniblockProducer(
	ctx context.Context,
	streamCache StreamCache,
	opts *MiniblockProducerOpts,
) *miniblockProducer {
	mb := &miniblockProducer{
		streamCache: streamCache,
	}
	if opts != nil {
		mb.opts = *opts
	}

	if !mb.opts.TestDisableMbProdcutionOnBlock {
		streamCache.Params().ChainMonitor.OnBlock(mb.OnNewBlock)
	}

	return mb
}

type miniblockProducer struct {
	streamCache StreamCache
	opts        MiniblockProducerOpts

	// jobs is a maps of streamId to *mbJob
	jobs sync.Map

	proposals proposalTracker

	onNewBlockMutex sync.Mutex
}

var _ MiniblockProducer = (*miniblockProducer)(nil)

// mbJos tracks single miniblock production attempt for a single stream.
type mbJob struct {
	stream   *streamImpl
	proposal *MiniblockInfo
}

// proposalTracker is a helper struct to accumulate proposals and call SetStreamLastMiniblockBatch.
// Logically this is just a part of the miniblockProducer, but encapsulating logic here makes
// the code more readable.
type proposalTracker struct {
	mu        sync.Mutex
	proposals []*mbJob
	timer     *time.Timer
}

func (p *proposalTracker) add(ctx context.Context, mp *miniblockProducer, j *mbJob) {
	var readyProposals []*mbJob
	p.mu.Lock()
	p.proposals = append(p.proposals, j)
	if len(p.proposals) >= MiniblockCandidateBatchSize {
		if p.timer != nil {
			p.timer.Stop()
			p.timer = nil
		}
		readyProposals = p.proposals
		p.proposals = nil
	} else if len(p.proposals) == 1 {
		// Wait quarter of a block time before submitting the batch.
		p.timer = time.AfterFunc(
			mp.streamCache.Params().RiverChain.Config.BlockTime()/4,
			func() {
				p.mu.Lock()
				p.timer = nil
				readyProposals := p.proposals
				p.proposals = nil
				p.mu.Unlock()
				if len(readyProposals) > 0 {
					mp.submitProposalBatch(ctx, readyProposals)
				}
			},
		)
	}
	p.mu.Unlock()
	if len(readyProposals) > 0 {
		mp.submitProposalBatch(ctx, readyProposals)
	}
}

// OnNewBlock loops over streams and determines if it needs to produce a new mini block.
// For every stream that is eligible to produce a new mini block it creates a new mini block candidate.
// It bundles candidates in a batch.
// If the batch is full it submits the batch to the RiverRegistry#stream facet for registration and parses the resulting
// logs to determine which mini block candidate was registered and which are not. For each registered mini block
// candidate it applies the candidate to the stream.
func (p *miniblockProducer) OnNewBlock(ctx context.Context, _ crypto.BlockNumber) {
	// Try lock to have only one invocation at a time. Previous onNewBlock may still be running.
	if !p.onNewBlockMutex.TryLock() {
		return
	}

	// don't block the chain monitor
	go func() {
		defer p.onNewBlockMutex.Unlock()
		_ = p.scheduleCandidates(ctx)
	}()
}

func (p *miniblockProducer) scheduleCandidates(ctx context.Context) []*mbJob {
	candidates := p.streamCache.GetMbCandidateStreams(ctx)

	var scheduled []*mbJob

	for _, c := range candidates {
		if !c.nodes.LocalIsLeader() {
			continue
		}
		j := &mbJob{
			stream: c,
		}
		_, prevLoaded := p.jobs.LoadOrStore(c.streamId, j)
		if !prevLoaded {
			scheduled = append(scheduled, j)
			go p.jobStart(ctx, j, false)
		}
	}

	return scheduled
}

func (p *miniblockProducer) testCheckAllDone(jobs []*mbJob) bool {
	for _, j := range jobs {
		if _, loaded := p.jobs.Load(j.stream.streamId); loaded {
			return false
		}
	}
	return true
}

func (p *miniblockProducer) TestMakeMiniblock(
	ctx context.Context,
	streamId StreamId,
	forceSnapshot bool,
) (common.Hash, int64, error) {
	stream, err := p.streamCache.GetSyncStream(ctx, streamId)
	if err != nil {
		return common.Hash{}, -1, err
	}

	job := &mbJob{
		stream: stream.(*streamImpl),
	}

	// Spin until we manage to insert our job into the jobs map.
	// This is test-only code, so we don't care about the performance.
	for {
		actual, _ := p.jobs.LoadOrStore(streamId, job)
		if actual == job {
			go p.jobStart(ctx, job, forceSnapshot)
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	// Wait for the job to finish.
	for {
		if current, _ := p.jobs.Load(streamId); current != job {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	view, err := stream.GetView(ctx)
	if err != nil {
		return common.Hash{}, -1, err
	}

	return view.LastBlock().Hash, view.LastBlock().Num, nil
}

// mbProposeAndStore is implemented as standalone function to allow calling from tests.
func mbProposeAndStore(
	ctx context.Context,
	params *StreamCacheParams,
	stream *streamImpl,
	forceSnapshot bool,
) (*MiniblockInfo, error) {
	view, err := stream.getView(ctx)
	if err != nil {
		return nil, err
	}

	proposal, err := view.ProposeNextMiniblock(ctx, params.ChainConfig, forceSnapshot)
	if err != nil {
		return nil, err
	}
	if proposal == nil {
		return nil, nil
	}

	miniblockHeader, envelopes, err := view.makeMiniblockHeader(ctx, proposal)
	if err != nil {
		return nil, err
	}

	mbInfo, err := NewMiniblockInfoFromHeaderAndParsed(params.Wallet, miniblockHeader, envelopes)
	if err != nil {
		return nil, err
	}

	miniblockBytes, err := mbInfo.ToBytes()
	if err != nil {
		return nil, err
	}

	err = params.Storage.WriteBlockProposal(
		ctx,
		stream.streamId,
		mbInfo.Hash,
		mbInfo.Num,
		miniblockBytes,
	)
	if err != nil {
		return nil, err
	}

	return mbInfo, nil
}

func (p *miniblockProducer) jobStart(ctx context.Context, j *mbJob, forceSnapshot bool) {
	if ctx.Err() != nil {
		p.jobDone(ctx, j)
		return
	}

	proposal, err := mbProposeAndStore(ctx, p.streamCache.Params(), j.stream, forceSnapshot)
	if err != nil {
		dlog.FromCtx(ctx).
			Error("MiniblockProducer: jobStart: Error creating new miniblock proposal", "streamId", j.stream.streamId, "err", err)
		p.jobDone(ctx, j)
		return
	}
	if proposal == nil {
		p.jobDone(ctx, j)
		return
	}

	j.proposal = proposal
	p.proposals.add(ctx, p, j)
}

func (p *miniblockProducer) jobDone(ctx context.Context, j *mbJob) {
	if !p.jobs.CompareAndDelete(j.stream.streamId, j) {
		dlog.FromCtx(ctx).Error("MiniblockProducer: jobDone: job not found in jobs map", "streamId", j.stream.streamId)
	}
}

func (p *miniblockProducer) submitProposalBatch(ctx context.Context, proposals []*mbJob) {
	log := dlog.FromCtx(ctx)

	if len(proposals) == 0 {
		return
	}

	var success []StreamId
	if len(proposals) == 1 {
		job := proposals[0]

		err := p.streamCache.Params().Registry.SetStreamLastMiniblock(
			ctx,
			job.stream.streamId,
			*job.proposal.headerEvent.PrevMiniblockHash,
			job.proposal.headerEvent.Hash,
			uint64(job.proposal.Num),
			false,
		)
		if err != nil {
			log.Error("submitProposalBatch: Error registering miniblock", "streamId", job.stream.streamId, "err", err)
		} else {
			success = append(success, job.stream.streamId)
		}
	} else {
		var mbs []river.SetMiniblock
		for _, job := range proposals {
			mbs = append(
				mbs,
				river.SetMiniblock{
					StreamId:          job.stream.streamId,
					PrevMiniBlockHash: *job.proposal.headerEvent.PrevMiniblockHash,
					LastMiniblockHash: job.proposal.headerEvent.Hash,
					LastMiniblockNum:  uint64(job.proposal.Num),
					IsSealed:          false,
				},
			)
		}

		var failed []StreamId
		var err error
		success, failed, err = p.streamCache.Params().Registry.SetStreamLastMiniblockBatch(ctx, mbs)
		if err != nil {
			log.Error("processMiniblockProposalBatch: Error registering miniblock batch", "err", err)
		} else {
			if len(failed) > 0 {
				log.Error("processMiniblockProposalBatch: Failed to register some miniblocks", "failed", failed)
			}
		}
	}

	for _, job := range proposals {
		if slices.Contains(success, job.stream.streamId) {
			err := job.stream.ApplyMiniblock(ctx, job.proposal)
			if err != nil {
				log.Error(
					"processMiniblockProposalBatch: Error applying miniblock",
					"streamId",
					job.stream.streamId,
					"err",
					err,
				)
			}
		}
		p.jobDone(ctx, job)
	}
}
