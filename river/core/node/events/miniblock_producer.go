package events

import (
	"bytes"
	"context"
	"slices"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/contracts/river"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

const (
	// MiniblockCandidateBatchSize keep track the max number of new miniblocks that are registered in the StreamRegistry
	// in a single transaction.
	MiniblockCandidateBatchSize = 50
)

// RemoteMiniblockProvider abstracts communications required for coordinated miniblock production.
type RemoteMiniblockProvider interface {
	GetMbProposal(
		ctx context.Context,
		node common.Address,
		streamId StreamId,
		forceSnapshot bool,
	) (*MiniblockProposal, error)

	SaveMbCandidate(
		ctx context.Context,
		node common.Address,
		streamId StreamId,
		mb *Miniblock,
	) error

	// GetMiniBlocksStreamed returns a stream of mini-blocks or an error for the given stream in the range
	// [fromMiniBlockNum..toMiniBlockNum).
	GetMbsStreamed(
		ctx context.Context,
		node common.Address,
		stream StreamId,
		fromMiniBlockNum int64, // inclusive
		toMiniBlockNum int64, // exclusive
	) <-chan *MbOrError
}

type MbOrError struct {
	Miniblock *Miniblock
	Err       error
}

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

	candidates candidateTracker

	onNewBlockMutex sync.Mutex
}

var _ MiniblockProducer = (*miniblockProducer)(nil)

// mbJos tracks single miniblock production attempt for a single stream.
type mbJob struct {
	stream    *streamImpl
	candidate *MiniblockInfo
}

// candidateTracker is a helper struct to accumulate proposals and call SetStreamLastMiniblockBatch.
// Logically this is just a part of the miniblockProducer, but encapsulating logic here makes
// the code more readable.
type candidateTracker struct {
	mu         sync.Mutex
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

	for _, stream := range candidates {
		// TODO: actual logic
		if !stream.nodes.LocalIsLeader() {
			continue
		}
		j := p.trySchedule(ctx, stream)
		if j != nil {
			scheduled = append(scheduled, j)
		}
	}

	return scheduled
}

func (p *miniblockProducer) trySchedule(ctx context.Context, stream *streamImpl) *mbJob {
	j := &mbJob{
		stream: stream,
	}
	_, prevLoaded := p.jobs.LoadOrStore(stream.streamId, j)
	if !prevLoaded {
		go p.jobStart(ctx, j, false)
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

func (p *miniblockProducer) TestMakeMiniblock(
	ctx context.Context,
	streamId StreamId,
	forceSnapshot bool,
) (*MiniblockRef, error) {
	stream, err := p.streamCache.GetStream(ctx, streamId)
	if err != nil {
		return nil, err
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

		err = SleepWithContext(ctx, 10*time.Millisecond)
		if err != nil {
			return nil, err
		}
	}

	// Wait for the job to finish.
	for {
		if current, _ := p.jobs.Load(streamId); current != job {
			break
		}

		err = SleepWithContext(ctx, 10*time.Millisecond)
		if err != nil {
			return nil, err
		}
	}

	view, err := stream.GetView(ctx)
	if err != nil {
		return nil, err
	}

	return view.LastBlock().Ref, nil
}

func combineProposals(
	remoteQuorumNum int,
	local *MiniblockProposal,
	remote []*MiniblockProposal,
) (*MiniblockProposal, error) {
	// Filter remotes that don't match local prerequisites.
	remote = slices.DeleteFunc(remote, func(p *MiniblockProposal) bool {
		return p.NewMiniblockNum != local.NewMiniblockNum || !bytes.Equal(p.PrevMiniblockHash, local.PrevMiniblockHash)
	})

	// Check if we have enough remote proposals.
	if len(remote) < remoteQuorumNum {
		return nil, RiverError(Err_INTERNAL, "combineProposals: not enough remote proposals")
	}

	all := append(remote, local)

	// Count ShouldSnapshot.
	shouldSnapshotNum := 0
	for _, p := range all {
		if p.ShouldSnapshot {
			shouldSnapshotNum++
		}
	}
	quorumNum := remoteQuorumNum + 1
	shouldSnapshot := shouldSnapshotNum >= quorumNum

	// Count event hashes.
	eventCounts := make(map[common.Hash]int)
	for _, p := range all {
		for _, h := range p.Hashes {
			eventCounts[common.BytesToHash(h)]++
		}
	}

	events := make([][]byte, 0, len(eventCounts))
	for h, c := range eventCounts {
		if c >= quorumNum {
			events = append(events, h.Bytes())
		}
	}

	return &MiniblockProposal{
		PrevMiniblockHash: local.PrevMiniblockHash,
		NewMiniblockNum:   local.NewMiniblockNum,
		ShouldSnapshot:    shouldSnapshot,
		Hashes:            events,
	}, nil
}

func gatherRemoteProposals(
	ctx context.Context,
	params *StreamCacheParams,
	nodes []common.Address,
	streamId StreamId,
	forceSnapshot bool,
) ([]*MiniblockProposal, error) {
	// TODO: better timeout?
	// TODO: once quorum is achieved, it could be beneficial to return reasonably early.
	ctx, cancel := context.WithTimeout(ctx, params.RiverChain.Config.BlockTime())
	defer cancel()

	proposals := make([]*MiniblockProposal, 0, len(nodes))
	errs := make([]error, 0)
	var mu sync.Mutex

	var wg sync.WaitGroup
	wg.Add(len(nodes))

	for i, node := range nodes {
		go func(i int, node common.Address) {
			defer wg.Done()
			proposal, err := params.RemoteMiniblockProvider.GetMbProposal(ctx, node, streamId, forceSnapshot)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				errs = append(errs, err)
			} else {
				proposals = append(proposals, proposal)
			}
		}(i, node)
	}
	wg.Wait()

	if len(proposals) > 0 {
		return proposals, nil
	}
	if len(errs) > 0 {
		return nil, errs[0]
	}
	return nil, RiverError(Err_INTERNAL, "gatherRemoteProposals: no proposals and no errors")
}

// mbProduceCandiate is implemented as standalone function to allow calling from tests.
func mbProduceCandiate(
	ctx context.Context,
	params *StreamCacheParams,
	stream *streamImpl,
	forceSnapshot bool,
) (*MiniblockInfo, error) {
	remoteNodes, isLocal := stream.nodes.GetRemotesAndIsLocal()
	// TODO: this is a sanity check, but in general mb production code needs to be hardened
	// to handle scenario when local node is removed from the stream.
	if !isLocal {
		return nil, RiverError(Err_INTERNAL, "Not a local stream")
	}

	view, err := stream.getView(ctx)
	if err != nil {
		return nil, err
	}

	localProposal, err := view.ProposeNextMiniblock(ctx, params.ChainConfig.Get(), forceSnapshot)
	if err != nil {
		return nil, err
	}
	// TODO: update code to handle situation when localProposal is empty and still proceed with remote proposals.
	if localProposal == nil {
		return nil, nil
	}

	var combinedProposal *MiniblockProposal
	if len(remoteNodes) > 0 {
		remoteProposals, err := gatherRemoteProposals(
			ctx,
			params,
			remoteNodes,
			stream.streamId,
			forceSnapshot,
		)
		if err != nil {
			return nil, err
		}

		remoteQuorumNum := RemoteQuorumNum(len(remoteNodes), true)
		if len(remoteProposals) < remoteQuorumNum {
			// TODO: actual error
			return nil, RiverError(Err_INTERNAL, "mbProposeAndStore: not enough remote proposals")
		}

		combinedProposal, err = combineProposals(remoteQuorumNum, localProposal, remoteProposals)
		if err != nil {
			return nil, err
		}
	} else {
		combinedProposal = localProposal
	}

	// TODO: fix this to fetch missing events
	// Filter out events that are not present locally; otherwise we would not be able to create candidate.
	localEvents := map[common.Hash]bool{}
	for _, e := range localProposal.Hashes {
		localEvents[common.BytesToHash(e)] = true
	}
	combinedProposal.Hashes = slices.DeleteFunc(combinedProposal.Hashes, func(h []byte) bool {
		return !localEvents[common.BytesToHash(h)]
	})

	// Is there anything to do?
	if !(len(combinedProposal.Hashes) > 0 || combinedProposal.ShouldSnapshot) {
		return nil, nil
	}

	miniblockHeader, envelopes, err := view.makeMiniblockHeader(ctx, combinedProposal)
	if err != nil {
		return nil, err
	}

	mbInfo, err := NewMiniblockInfoFromHeaderAndParsed(params.Wallet, miniblockHeader, envelopes)
	if err != nil {
		return nil, err
	}

	qp := NewQuorumPool(len(remoteNodes))

	qp.GoLocal(func() error {
		miniblockBytes, err := mbInfo.ToBytes()
		if err != nil {
			return err
		}

		return params.Storage.WriteMiniblockCandidate(
			ctx,
			stream.streamId,
			mbInfo.Ref.Hash,
			mbInfo.Ref.Num,
			miniblockBytes,
		)
	})

	for _, node := range remoteNodes {
		qp.GoRemote(node, func(node common.Address) error {
			return params.RemoteMiniblockProvider.SaveMbCandidate(ctx, node, stream.streamId, mbInfo.Proto)
		})
	}

	err = qp.Wait()
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

	candidate, err := mbProduceCandiate(ctx, p.streamCache.Params(), j.stream, forceSnapshot)
	if err != nil {
		dlog.FromCtx(ctx).
			Error("MiniblockProducer: jobStart: Error creating new miniblock proposal", "streamId", j.stream.streamId, "err", err)
		p.jobDone(ctx, j)
		return
	}
	if candidate == nil {
		p.jobDone(ctx, j)
		return
	}

	j.candidate = candidate
	p.candidates.add(ctx, p, j)
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
			job.candidate.headerEvent.MiniblockRef.Hash,
			job.candidate.headerEvent.Hash,
			uint64(job.candidate.Ref.Num),
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
					PrevMiniBlockHash: job.candidate.headerEvent.MiniblockRef.Hash,
					LastMiniblockHash: job.candidate.headerEvent.Hash,
					LastMiniblockNum:  uint64(job.candidate.Ref.Num),
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
			err := job.stream.ApplyMiniblock(ctx, job.candidate)
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
