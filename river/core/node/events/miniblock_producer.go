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
	// GetMbProposal requests miniblock proposal from the given node for the given stream.
	// The node must participate in the stream.
	GetMbProposal(
		ctx context.Context,
		node common.Address,
		streamId StreamId,
		forceSnapshot bool,
	) (*MiniblockProposal, error)

	// SaveMbCandidate sends the given mb to the given node and node must save it.
	SaveMbCandidate(
		ctx context.Context,
		node common.Address,
		streamId StreamId,
		mb *Miniblock,
	) error

	// GetMbs returns a range of miniblocks from the given stream from the given node.
	//
	// Note: it is possible that the returned miniblocks range is limited when the requested miniblock
	// range is too large. Range it limited to chain config setting `stream.getMiniblocksMaxPageSize`.
	GetMbs(
		ctx context.Context,
		node common.Address,
		streamId StreamId,
		fromInclusive int64,
		toExclusive int64,
	) ([]*Miniblock, error)
}

type TestMiniblockProducer interface {
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

type MiniblockProducer interface {
	scheduleCandidates(ctx context.Context, blockNum crypto.BlockNumber) []*mbJob
	testCheckAllDone(jobs []*mbJob) bool
}

type MiniblockProducerOpts struct {
	TestDisableMbProdcutionOnBlock bool
}

// NewMiniblockProducer instantiates a new miniblockProducer instance that implements the MiniblockProducer interface.
// It registers a callback on new RiverChain blocks and everytime this callback is called it creates new miniblock
// candidates and schedules these candidates for registration.
func NewMiniblockProducer(
	ctx context.Context,
	streamCache StreamCache,
	cfg crypto.OnChainConfiguration,
	opts *MiniblockProducerOpts,
) *miniblockProducer {
	mb := &miniblockProducer{
		streamCache:      streamCache,
		localNodeAddress: streamCache.Params().Wallet.Address,
		cfg:              cfg,
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
	streamCache      StreamCache
	cfg              crypto.OnChainConfiguration
	opts             MiniblockProducerOpts
	localNodeAddress common.Address

	// jobs is a maps of streamId to *mbJob
	jobs sync.Map

	candidates candidateTracker

	onNewBlockMutex sync.Mutex
}

var _ MiniblockProducer = (*miniblockProducer)(nil)
var _ TestMiniblockProducer = (*miniblockProducer)(nil)

// mbJos tracks single miniblock production attempt for a single stream.
type mbJob struct {
	stream     *streamImpl
	candidate  *MiniblockInfo
	replicated bool
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
func (p *miniblockProducer) OnNewBlock(ctx context.Context, blockNum crypto.BlockNumber) {
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

func (p *miniblockProducer) scheduleCandidates(ctx context.Context, blockNum crypto.BlockNumber) []*mbJob {
	log := dlog.FromCtx(ctx)

	candidates := p.streamCache.GetMbCandidateStreams(ctx)

	var scheduled []*mbJob

	for _, stream := range candidates {
		if !p.isLocalLeaderOnCurrentBlock(stream, blockNum) {
			log.Debug(
				"MiniblockProducer: OnNewBlock: Not a leader for stream",
				"streamId",
				stream.streamId,
				"blockNum",
				blockNum,
			)
			continue
		}
		j := p.trySchedule(ctx, stream)
		if j != nil {
			scheduled = append(scheduled, j)
			log.Debug(
				"MiniblockProducer: OnNewBlock: Scheduled miniblock production",
				"streamId",
				stream.streamId,
			)
		} else {
			log.Debug(
				"MiniblockProducer: OnNewBlock: Miniblock production already scheduled",
				"streamId",
				stream.streamId,
			)
		}
	}

	return scheduled
}

func (p *miniblockProducer) isLocalLeaderOnCurrentBlock(
	stream *streamImpl,
	blockNum crypto.BlockNumber,
) bool {
	streamNodes := stream.GetNodes()
	if len(streamNodes) == 0 {
		return false
	}
	index := blockNum.AsUint64() % uint64(len(streamNodes))
	return streamNodes[index] == p.localNodeAddress
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
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	stream, err := p.streamCache.GetStreamWaitForLocal(ctx, streamId)
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

func combineProposals(
	ctx context.Context,
	remoteQuorumNum int,
	local *MiniblockProposal,
	remote []*MiniblockProposal,
) (*MiniblockProposal, error) {
	log := dlog.FromCtx(ctx)
	// Filter remotes that don't match local prerequisites.
	remote = slices.DeleteFunc(remote, func(p *MiniblockProposal) bool {
		if p.NewMiniblockNum != local.NewMiniblockNum {
			log.Info(
				"combineProposals: ignoring remote proposal: mb number mismatch",
				"remoteNum",
				p.NewMiniblockNum,
				"localNum",
				local.NewMiniblockNum,
			)
			return true
		}
		if !bytes.Equal(p.PrevMiniblockHash, local.PrevMiniblockHash) {
			log.Info(
				"combineProposals: ignoring remote proposal: prev hash mismatch",
				"remoteHash",
				p.PrevMiniblockHash,
				"localHash",
				local.PrevMiniblockHash,
			)
			return true
		}
		return false
	})

	// Check if we have enough remote proposals.
	if len(remote) < remoteQuorumNum {
		return nil, RiverError(
			Err_INTERNAL,
			"combineProposals: not enough remote proposals",
			"remoteNum",
			len(remote),
			"remoteQuorumNum",
			remoteQuorumNum,
		)
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

// mbProduceCandidate is implemented as standalone function to allow calling from tests.
func mbProduceCandidate(
	ctx context.Context,
	params *StreamCacheParams,
	stream *streamImpl,
	forceSnapshot bool,
) (*MiniblockInfo, bool, error) {
	remoteNodes, isLocal := stream.GetRemotesAndIsLocal()
	replicated := len(remoteNodes) > 0
	// TODO: this is a sanity check, but in general mb production code needs to be hardened
	// to handle scenario when local node is removed from the stream.
	if !isLocal {
		return nil, replicated, RiverError(Err_INTERNAL, "Not a local stream")
	}

	view, err := stream.getViewIfLocal(ctx)
	if err != nil {
		return nil, replicated, err
	}
	if view == nil {
		return nil, replicated, RiverError(Err_INTERNAL, "mbProduceCandidate: stream is not local")
	}

	mbInfo, err := mbProduceCandidate_Make(ctx, params, view, forceSnapshot, remoteNodes)
	if err != nil {
		return nil, replicated, err
	}
	if mbInfo == nil {
		return nil, replicated, nil
	}

	err = mbProduceCandidate_Save(ctx, params, stream.streamId, mbInfo, remoteNodes)
	if err != nil {
		return nil, replicated, err
	}

	return mbInfo, replicated, nil
}

func mbProduceCandidate_Make(
	ctx context.Context,
	params *StreamCacheParams,
	view *streamViewImpl,
	forceSnapshot bool,
	remoteNodes []common.Address,
) (*MiniblockInfo, error) {
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
			view.streamId,
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

		combinedProposal, err = combineProposals(ctx, remoteQuorumNum, localProposal, remoteProposals)
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

	return mbInfo, nil
}

func mbProduceCandidate_Save(
	ctx context.Context,
	params *StreamCacheParams,
	streamId StreamId,
	mbInfo *MiniblockInfo,
	remoteNodes []common.Address,
) error {
	qp := NewQuorumPool("method", "mbProduceCandidate_Save", "streamId", streamId, "miniblock", mbInfo.Ref)

	qp.GoLocal(ctx, func(ctx context.Context) error {
		miniblockBytes, err := mbInfo.ToBytes()
		if err != nil {
			return err
		}

		return params.Storage.WriteMiniblockCandidate(
			ctx,
			streamId,
			mbInfo.Ref.Hash,
			mbInfo.Ref.Num,
			miniblockBytes,
		)
	})

	qp.GoRemotes(ctx, remoteNodes, func(ctx context.Context, node common.Address) error {
		return params.RemoteMiniblockProvider.SaveMbCandidate(ctx, node, streamId, mbInfo.Proto)
	})

	return qp.Wait()
}

func (p *miniblockProducer) jobStart(ctx context.Context, j *mbJob, forceSnapshot bool) {
	if ctx.Err() != nil {
		p.jobDone(ctx, j)
		return
	}

	candidate, replicated, err := mbProduceCandidate(ctx, p.streamCache.Params(), j.stream, forceSnapshot)
	if err != nil {
		dlog.FromCtx(ctx).
			Error(
				"MiniblockProducer: jobStart: Error creating new miniblock proposal",
				"streamId",
				j.stream.streamId,
				"err",
				err,
			)
		p.jobDone(ctx, j)
		return
	}
	if candidate == nil {
		p.jobDone(ctx, j)
		return
	}

	j.candidate = candidate
	j.replicated = replicated
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

	// Only register miniblocks when it's time. If it's not time assume registration was successful.
	// This is to reduce the number of transactions/calldata size.
	var success []StreamId
	var failed []StreamId
	var filteredProposals []*mbJob
	freq := int64(p.cfg.Get().StreamMiniblockRegistrationFrequency)
	if freq <= 0 {
		freq = 1
	}

	for _, job := range proposals {
		if job.replicated || job.candidate.Ref.Num%freq == 0 || job.candidate.Ref.Num == 1 {
			filteredProposals = append(filteredProposals, job)
		} else {
			success = append(success, job.stream.streamId)

			log.Debug("submitProposalBatch: skip miniblock registration",
				"streamId", job.stream.streamId, "blocknum", job.candidate.Ref.Num)
		}
	}

	if len(filteredProposals) > 0 {
		var mbs []river.SetMiniblock
		for _, job := range filteredProposals {
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

		var err error
		successRegistered, failed, err := p.streamCache.Params().Registry.SetStreamLastMiniblockBatch(ctx, mbs)
		if err == nil {
			success = append(success, successRegistered...)
			if len(failed) > 0 {
				log.Error("processMiniblockProposalBatch: Failed to register some miniblocks", "failed", failed)
			}
		} else {
			log.Error("processMiniblockProposalBatch: Error registering miniblock batch", "err", err)
		}
	}

	log.Info("processMiniblockProposalBatch: Submitted SetStreamLastMiniblockBatch",
		"total", len(proposals),
		"actualSubmitted", len(filteredProposals),
		"success", len(success),
		"failed", len(failed),
		"mbFrequency", freq,
	)

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
