package events

import (
	"bytes"
	"context"
	"iter"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"go.uber.org/zap/zapcore"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	. "github.com/towns-protocol/towns/core/node/utils"
)

type StreamViewStats struct {
	FirstMiniblockNum     int64
	LastMiniblockNum      int64
	EventsInMiniblocks    int
	SnapshotsInMiniblocks int
	EventsInMinipool      int
	TotalEventsEver       int // This is total number of events in the stream ever, not in the cache.
}

func MakeStreamView(
	ctx context.Context,
	streamId StreamId,
	streamData *storage.ReadStreamFromLastSnapshotResult,
) (*StreamView, error) {
	if len(streamData.Miniblocks) <= 0 {
		return nil, RiverError(Err_STREAM_EMPTY, "no blocks").Func("MakeStreamView")
	}

	startTime := time.Now()
	large := len(streamData.Miniblocks) > 100 || len(streamData.MinipoolEnvelopes) > 10
	if large {
		logging.FromCtx(ctx).Infow(
			"MakeStreamView: parsing large stream",
			"streamId", streamId,
			"miniblocks", len(streamData.Miniblocks),
			"minipoolSize", len(streamData.MinipoolEnvelopes),
			"snapshotOffset", streamData.SnapshotMiniblockOffset,
		)
	}
	defer func() {
		duration := time.Since(startTime)
		durationExceeded := duration > 10*time.Second
		if durationExceeded || large {
			level := zapcore.InfoLevel
			msg := "MakeStreamView: large stream parsed"
			if durationExceeded {
				level = zapcore.ErrorLevel
				msg = "MakeStreamView: stream parsing took too long"
			}
			logging.FromCtx(ctx).Logw(
				level,
				msg,
				"duration", duration,
				"streamId", streamId,
				"miniblocks", len(streamData.Miniblocks),
				"minipoolSize", len(streamData.MinipoolEnvelopes),
				"snapshotOffset", streamData.SnapshotMiniblockOffset,
			)
		}
	}()

	miniblocks := make([]*MiniblockInfo, len(streamData.Miniblocks))
	snapshotIndex := -1
	var snapshot *Snapshot
	firstMbNum := streamData.Miniblocks[0].Number
	opts := NewParsedMiniblockInfoOpts()
	for i, mb := range streamData.Miniblocks {
		opts = opts.WithExpectedBlockNumber(firstMbNum + int64(i))
		miniblock, err := NewMiniblockInfoFromDescriptorWithOpts(mb, opts)
		if err != nil {
			return nil, AsRiverError(
				err,
				Err_BAD_BLOCK,
			).Message("Unable to parse miniblock from descriptor").
				Func("MakeStreamView")
		}
		miniblocks[i] = miniblock
		if miniblock.Snapshot != nil {
			snapshot = miniblock.Snapshot
			snapshotIndex = i
		}
	}

	if snapshot == nil {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "no snapshot").Func("MakeStreamView")
	}

	snapshotStreamId, err := StreamIdFromBytes(snapshot.GetInceptionPayload().GetStreamId())
	if err != nil {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "bad streamId").Func("MakeStreamView")
	}
	if streamId != snapshotStreamId {
		return nil, RiverError(
			Err_STREAM_BAD_EVENT,
			"expected streamId does not match snapshot",
		).Func("MakeStreamView").
			Tag("expectedStreamId", streamId).
			Tag("snapshotStreamId", snapshotStreamId)
	}

	minipoolEvents := NewOrderedMap[common.Hash, *ParsedEvent](len(streamData.MinipoolEnvelopes))
	for _, e := range streamData.MinipoolEnvelopes {
		var env Envelope
		err := proto.Unmarshal(e, &env)
		if err != nil {
			return nil, err
		}
		parsed, err := ParseEvent(&env)
		if err != nil {
			return nil, err
		}
		if !minipoolEvents.Set(parsed.Hash, parsed) {
			return nil, RiverError(
				Err_DATA_LOSS,
				"duplicate event found in saved stream minipool",
			).Func("MakeStreamView").
				Tags("streamId", streamId, "event", parsed.ShortDebugStr())
		}
	}

	lastBlockHeader := miniblocks[len(miniblocks)-1].Header()
	generation := lastBlockHeader.MiniblockNum + 1
	eventNumOffset := lastBlockHeader.EventNumOffset + int64(
		len(lastBlockHeader.EventHashes),
	) + 1 // plus one for header

	return &StreamView{
		streamId:      streamId,
		blocks:        miniblocks,
		minipool:      newMiniPoolInstance(minipoolEvents, generation, eventNumOffset),
		snapshot:      snapshot,
		snapshotIndex: snapshotIndex,
	}, nil
}

func ParseMiniblocksFromProto(
	protos []*Miniblock,
	snapshotEnvelope *Envelope,
	opts *ParsedMiniblockInfoOpts,
) ([]*MiniblockInfo, *Snapshot, int, error) {
	if len(protos) <= 0 {
		return nil, nil, 0, RiverError(Err_STREAM_EMPTY, "no blocks").Func("ParseMiniblocksFromProto")
	}

	if opts == nil {
		opts = NewParsedMiniblockInfoOpts()
	}
	opts = opts.WithApplyOnlyMatchingSnapshot()

	miniblocks := make([]*MiniblockInfo, len(protos))
	var snapshot *Snapshot
	var snapshotIndex int

	for i, mbProto := range protos {
		// Make sure block numbers are consecutive and prev hashes match.
		if i > 0 {
			opts = opts.WithExpectedBlockNumber(miniblocks[0].Ref.Num + int64(i))
			opts = opts.WithExpectedPrevMiniblockHash(miniblocks[i-1].Ref.Hash)
		}

		miniblock, err := NewMiniblockInfoFromProto(mbProto, snapshotEnvelope, opts)
		if err != nil {
			return nil, nil, 0, err
		}

		if miniblock.Snapshot != nil {
			snapshot = miniblock.Snapshot
			snapshotIndex = i
		}

		miniblocks[i] = miniblock
	}

	if snapshot == nil {
		return nil, nil, 0, RiverError(Err_STREAM_BAD_EVENT, "no snapshot").Func("ParseMiniblocksFromProto")
	}

	return miniblocks, snapshot, snapshotIndex, nil
}

func MakeRemoteStreamView(stream *StreamAndCookie) (*StreamView, error) {
	if stream == nil {
		return nil, RiverError(Err_STREAM_EMPTY, "no stream").Func("MakeStreamViewFromRemote")
	}

	miniblocks, snapshot, snapshotIndex, err := ParseMiniblocksFromProto(stream.Miniblocks, stream.Snapshot, nil)
	if err != nil {
		return nil, err
	}

	streamId, err := StreamIdFromBytes(snapshot.GetInceptionPayload().GetStreamId())
	if err != nil {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "bad streamId").Func("MakeStreamView")
	}

	minipoolEvents := NewOrderedMap[common.Hash, *ParsedEvent](len(stream.Events))
	for _, e := range stream.Events {
		parsed, err := ParseEvent(e)
		if err != nil {
			return nil, err
		}
		if !minipoolEvents.Set(parsed.Hash, parsed) {
			return nil, RiverError(
				Err_DATA_LOSS,
				"duplicate event found in received remote stream minipool",
			).Func("MakeStreamView").
				Tags("streamId", streamId, "event", parsed.ShortDebugStr())
		}
	}

	lastBlockHeader := miniblocks[len(miniblocks)-1].Header()
	generation := lastBlockHeader.MiniblockNum + 1
	eventNumOffset := lastBlockHeader.EventNumOffset + int64(
		len(lastBlockHeader.EventHashes),
	) + 1 // plus one for header

	return &StreamView{
		streamId:      streamId,
		blocks:        miniblocks,
		minipool:      newMiniPoolInstance(minipoolEvents, generation, eventNumOffset),
		snapshot:      snapshot,
		snapshotIndex: snapshotIndex,
	}, nil
}

type StreamView struct {
	streamId      StreamId
	blocks        []*MiniblockInfo
	minipool      *minipoolInstance
	snapshot      *Snapshot
	snapshotIndex int
}

func (r *StreamView) copyAndAddEvent(event *ParsedEvent) (*StreamView, error) {
	if event.Event.GetMiniblockHeader() != nil {
		return nil, RiverError(Err_BAD_EVENT, "streamViewImpl: block event not allowed")
	}

	newMinipool := r.minipool.tryCopyAndAddEvent(event)
	if newMinipool == nil {
		return nil, RiverError(
			Err_DUPLICATE_EVENT,
			"streamViewImpl: duplicate event",
		).Func("copyAndAddEvent").
			Tags("event", event.ShortDebugStr(), "streamId", r.streamId)
	}

	ret := &StreamView{
		streamId:      r.streamId,
		blocks:        r.blocks,
		minipool:      newMinipool,
		snapshot:      r.snapshot,
		snapshotIndex: r.snapshotIndex,
	}
	return ret, nil
}

func (r *StreamView) LastBlock() *MiniblockInfo {
	return r.blocks[len(r.blocks)-1]
}

func (r *StreamView) Blocks() []*MiniblockInfo {
	return r.blocks
}

func (r *StreamView) ProposeNextMiniblock(
	ctx context.Context,
	cfg *crypto.OnChainSettings,
	req *ProposeMiniblockRequest,
) (*ProposeMiniblockResponse, error) {
	if !bytes.Equal(req.StreamId, r.streamId[:]) {
		return nil, RiverError(
			Err_BAD_STREAM_ID,
			"can't create proposal: stream id mismatch",
			"requestedStreamId",
			req.StreamId,
			"actualStreamId",
			r.streamId[:],
		)
	}

	if req.NewMiniblockNum > r.minipool.generation {
		return nil, RiverError(
			Err_MINIBLOCK_TOO_NEW,
			"can't create proposal: local replica is behind stream head",
			"localMbNum",
			r.minipool.generation,
			"requestedMbNum",
			req.NewMiniblockNum,
		)
	}

	if req.NewMiniblockNum < r.minipool.generation {
		return nil, RiverError(
			Err_MINIBLOCK_TOO_OLD,
			"can't create proposal: stream advanced past requested miniblock",
			"localMbNum",
			r.minipool.generation,
			"requestedMbNum",
			req.NewMiniblockNum,
		)
	}

	if !bytes.Equal(req.PrevMiniblockHash, r.LastBlock().Ref.Hash[:]) {
		return nil, RiverError(
			Err_BAD_PREV_MINIBLOCK_HASH,
			"can't create proposal: prev miniblock hash mismatch",
			"requestedMbNum",
			req.NewMiniblockNum,
			"requestedPrevMbHash",
			req.PrevMiniblockHash,
			"actualPrevMbHash",
			r.LastBlock().Ref.Hash,
		)
	}

	remoteHashes := make(map[common.Hash]bool)
	for _, h := range req.LocalEventHashes {
		remoteHashes[common.BytesToHash(h)] = true
	}
	var missingEvents []*Envelope
	for _, e := range r.minipool.events.Values {
		if !remoteHashes[e.Hash] {
			missingEvents = append(missingEvents, e.Envelope)
		}
	}

	return &ProposeMiniblockResponse{
		Proposal: &MiniblockProposal{
			Hashes:            r.minipool.eventHashesAsBytes(),
			NewMiniblockNum:   r.minipool.generation,
			PrevMiniblockHash: r.LastBlock().Ref.Hash[:],
			ShouldSnapshot:    req.DebugForceSnapshot || r.shouldSnapshot(cfg),
		},
		MissingEvents: missingEvents,
	}, nil
}

// proposeNextMiniblock creates a miniblock proposal from the local stream view that
// respects the limits set in the given cfg.
func (r *StreamView) proposeNextMiniblock(
	ctx context.Context,
	cfg *crypto.OnChainSettings,
	forceSnapshot bool,
	replicatedStream bool,
) *mbProposal {
	var events []mbProposalEvent
	// for replicated streams all events are included to prevent the situation that due to
	// miniblock event limits, each replica has a different set of events and no quorum over
	// which events to include could be reached. For replicated streams all gathered proposals
	// are combined into a proposal used to create the next miniblock candidate. Miniblock
	// event limits are respected during this step.
	if replicatedStream {
		events = r.minipool.proposalEvents()
	} else {
		events = r.minipool.proposalEventsWithMiniblockLimits(cfg)
	}

	return &mbProposal{
		newMiniblockNum:   r.minipool.generation,
		prevMiniblockHash: r.LastBlock().headerEvent.Hash,
		shouldSnapshot:    forceSnapshot || r.shouldSnapshot(cfg),
		events:            events,
	}
}

// mbProposalEvent contains details of an event that is included in a miniblock proposal.
type mbProposalEvent struct {
	// Hash is the event hash
	Hash common.Hash
	// Size is the length of the raw event envelope.
	Size int
}

// mbProposal is a proposal created by a stream node that contains the details of the
// next miniblock to be created. Proposals are used to create a candidate that is registered
// in the StreamRegistry smart contract. If registered successful the candidate is promoted
// to be the next miniblock in the stream.
type mbProposal struct {
	// newMiniblockNum is the miniblock number for this proposal.
	newMiniblockNum int64
	// prevMiniblockHash is the hash of the previous miniblock.
	prevMiniblockHash common.Hash
	// shouldSnapshot is true if the node that created the proposal wants to create a snapshot
	shouldSnapshot bool
	// events contain the events included in the proposal. This is a slice to respect the ordering of events.
	events []mbProposalEvent
}

// mbProposalFromProto decodes the given p received from a remote replica node into
// a mbProposal that can be combined to create the next miniblock candidate. The given
// view is used to resolve the hashes to events to grab event details. Only events are
// included in the returned proposal that are also present in the given view.
func mbProposalFromProto(p *MiniblockProposal, view *StreamView) *mbProposal {
	events := make([]mbProposalEvent, 0, len(p.Hashes))
	for _, h := range p.Hashes {
		eventHash := common.BytesToHash(h)
		if event, ok := view.minipool.events.Get(eventHash); ok {
			events = append(events, mbProposalEvent{Hash: eventHash, Size: len(event.Envelope.Event)})
		}
	}

	return &mbProposal{
		newMiniblockNum:   p.NewMiniblockNum,
		prevMiniblockHash: common.BytesToHash(p.PrevMiniblockHash),
		shouldSnapshot:    p.ShouldSnapshot,
		events:            events,
	}
}

func (r *StreamView) makeMiniblockCandidate(
	ctx context.Context,
	params *StreamCacheParams,
	proposal *mbProposal,
) (*MiniblockInfo, error) {
	if r.minipool.generation != proposal.newMiniblockNum ||
		proposal.prevMiniblockHash != r.LastBlock().headerEvent.Hash {
		return nil, RiverError(
			Err_STREAM_LAST_BLOCK_MISMATCH,
			"proposal generation or hash mismatch",
			"expected",
			r.minipool.generation,
			"actual",
			proposal.newMiniblockNum,
		)
	}

	log := logging.FromCtx(ctx)
	hashes := make([][]byte, 0, r.minipool.events.Len())
	events := make([]*ParsedEvent, 0, r.minipool.events.Len())

	for _, ev := range proposal.events {
		e, ok := r.minipool.events.Get(ev.Hash)
		if !ok {
			return nil, RiverError(
				Err_MINIPOOL_MISSING_EVENTS,
				"proposal event not found in minipool",
				"hash", ev.Hash,
				"streamId", r.streamId,
				"generation", r.minipool.generation,
				"minipoolLen", r.minipool.events.Len(),
			)
		}
		hashes = append(hashes, e.Hash[:])
		events = append(events, e)
	}

	last := r.LastBlock()
	eventNumOffset := last.Header().EventNumOffset + int64(len(last.Events())) + 1 // +1 for header
	nextMiniblockNum := last.Header().MiniblockNum + 1
	miniblockNumOfPrevSnapshot := last.Header().PrevSnapshotMiniblockNum
	if last.Snapshot != nil {
		miniblockNumOfPrevSnapshot = last.Header().MiniblockNum
	}

	var parsedSnapshot *ParsedSnapshot
	if proposal.shouldSnapshot {
		snapshot := proto.Clone(r.snapshot).(*Snapshot)

		// Apply all events in blocks since last snapshot
		for i := r.snapshotIndex + 1; i < len(r.blocks); i++ {
			block := r.blocks[i]
			miniblockNum := block.Header().MiniblockNum
			for j, e := range block.Events() {
				offset := block.Header().EventNumOffset
				err := Update_Snapshot(snapshot, e, miniblockNum, offset+int64(j))
				if err != nil {
					log.Errorw("Failed to update snapshot",
						"error", err,
						"streamId", r.streamId,
						"event", e.ShortDebugStr(),
					)
				}
			}
		}

		// Apply all events in the proposed miniblock
		for i, e := range events {
			err := Update_Snapshot(snapshot, e, nextMiniblockNum, eventNumOffset+int64(i))
			if err != nil {
				log.Errorw("Failed to update snapshot",
					"error", err,
					"streamId", r.streamId,
					"event", e.ShortDebugStr(),
				)
			}
		}

		var err error
		if parsedSnapshot, err = MakeParsedSnapshot(params.Wallet, snapshot); err != nil {
			log.Errorw("Failed to make parsed snapshot", "error", err, "streamId", r.streamId)
		}
	}

	header := &MiniblockHeader{
		MiniblockNum:             nextMiniblockNum,
		Timestamp:                NextMiniblockTimestamp(last.Header().Timestamp),
		EventHashes:              hashes,
		PrevMiniblockHash:        last.headerEvent.Hash[:],
		EventNumOffset:           eventNumOffset,
		PrevSnapshotMiniblockNum: miniblockNumOfPrevSnapshot,
		Content: &MiniblockHeader_None{
			None: &emptypb.Empty{},
		},
	}

	if parsedSnapshot != nil {
		header.SnapshotHash = parsedSnapshot.Envelope.Hash
	}

	return NewMiniblockInfoFromHeaderAndParsed(params.Wallet, header, events, parsedSnapshot)
}

// copyAndApplyBlock copies the current view and applies the given miniblock to it.
// Returns the new view and the events that were in the applied miniblock, but not in the minipool.
func (r *StreamView) copyAndApplyBlock(
	miniblock *MiniblockInfo,
	cfg *crypto.OnChainSettings,
) (*StreamView, []*Envelope, error) {
	recencyConstraintsGenerations := int(cfg.RecencyConstraintsGen)

	header := miniblock.headerEvent.Event.GetMiniblockHeader()
	if header == nil {
		return nil, nil, RiverError(
			Err_INTERNAL,
			"streamViewImpl: non block event not allowed",
			"stream",
			r.streamId,
			"event",
			miniblock.headerEvent.ShortDebugStr(),
		)
	}

	lastBlock := r.LastBlock()
	if header.MiniblockNum != lastBlock.Header().MiniblockNum+1 {
		return nil, nil, RiverError(
			Err_BAD_BLOCK,
			"streamViewImpl: block number mismatch",
			"expected",
			lastBlock.Header().MiniblockNum+1,
			"actual",
			header.MiniblockNum,
		)
	}
	if !bytes.Equal(lastBlock.headerEvent.Hash[:], header.PrevMiniblockHash) {
		return nil, nil, RiverError(
			Err_BAD_BLOCK,
			"streamViewImpl: block hash mismatch",
			"expected",
			FormatHash(lastBlock.headerEvent.Hash),
			"actual",
			FormatHashFromBytes(header.PrevMiniblockHash),
		)
	}

	remaining := make(map[common.Hash]*ParsedEvent, max(r.minipool.events.Len()-len(header.EventHashes), 0))
	for k, v := range r.minipool.events.Map {
		remaining[k] = v
	}

	newEvents := []*Envelope{}
	for _, e := range miniblock.Events() {
		if _, ok := remaining[e.Hash]; ok {
			delete(remaining, e.Hash)
		} else {
			newEvents = append(newEvents, e.Envelope)
		}
	}

	minipoolEvents := NewOrderedMap[common.Hash, *ParsedEvent](len(remaining))
	for _, e := range r.minipool.events.Values {
		if _, ok := remaining[e.Hash]; ok {
			if !minipoolEvents.Set(e.Hash, e) {
				panic("duplicate values in map")
			}
		}
	}

	var startIndex int
	var snapshotIndex int
	var snapshot *Snapshot
	if miniblock.Snapshot != nil {
		snapshot = miniblock.Snapshot
		startIndex = max(0, len(r.blocks)-recencyConstraintsGenerations)
		snapshotIndex = len(r.blocks) - startIndex
	} else {
		startIndex = 0
		snapshot = r.snapshot
		snapshotIndex = r.snapshotIndex
	}

	generation := header.MiniblockNum + 1
	eventNumOffset := header.EventNumOffset + int64(len(header.EventHashes)) + 1 // plus one for header

	return &StreamView{
		streamId:      r.streamId,
		blocks:        append(r.blocks[startIndex:], miniblock),
		minipool:      newMiniPoolInstance(minipoolEvents, generation, eventNumOffset),
		snapshot:      snapshot,
		snapshotIndex: snapshotIndex,
	}, newEvents, nil
}

func (r *StreamView) StreamId() *StreamId {
	return &r.streamId
}

func (r *StreamView) InceptionPayload() IsInceptionPayload {
	return r.snapshot.GetInceptionPayload()
}

func (r *StreamView) indexOfMiniblockWithNum(mininblockNum int64) (int, error) {
	if len(r.blocks) > 0 {
		diff := int(mininblockNum - r.blocks[0].Header().MiniblockNum)
		if diff >= 0 && diff < len(r.blocks) {
			if r.blocks[diff].Header().MiniblockNum != mininblockNum {
				return 0, RiverError(
					Err_INTERNAL,
					"indexOfMiniblockWithNum block number mismatch",
					"requested",
					mininblockNum,
					"actual",
					r.blocks[diff].Header().MiniblockNum,
				)
			}
			return diff, nil
		}
		return 0, RiverError(
			Err_INVALID_ARGUMENT,
			"indexOfMiniblockWithNum index not found",
			"requested",
			mininblockNum,
			"min",
			r.blocks[0].Header().MiniblockNum,
			"max",
			r.blocks[len(r.blocks)-1].Header().MiniblockNum,
		)
	}
	return 0, RiverError(
		Err_INVALID_ARGUMENT,
		"indexOfMiniblockWithNum No blocks loaded",
		"requested",
		mininblockNum,
		"streamId",
		r.streamId,
	)
}

func (r *StreamView) blockWithNum(mininblockNum int64) (*MiniblockInfo, error) {
	index, err := r.indexOfMiniblockWithNum(mininblockNum)
	if err != nil {
		return nil, err
	}
	return r.blocks[index], nil
}

// ForEachEvent iterates over events starting at startBlock including events in the minipool
func (r *StreamView) ForEachEvent(
	startBlock int,
	op func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error),
) error {
	return r.forEachEvent(startBlock, op)
}

// iterate over events starting at startBlock including events in the minipool
func (r *StreamView) forEachEvent(
	startBlock int,
	op func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error),
) error {
	if startBlock < 0 || startBlock > len(r.blocks) {
		return RiverError(Err_INVALID_ARGUMENT, "iterateEvents: bad startBlock", "startBlock", startBlock)
	}

	for i := startBlock; i < len(r.blocks); i++ {
		cont, err := r.blocks[i].forEachEvent(op)
		if err != nil || !cont {
			return err
		}
	}
	err := r.minipool.forEachEvent(op)
	return err
}

func (r *StreamView) LastEvent() *ParsedEvent {
	lastEvent := r.minipool.lastEvent()
	if lastEvent != nil {
		return lastEvent
	}

	// Iterate over blocks in reverse order to find non-empty block and return last event from it.
	for i := len(r.blocks) - 1; i >= 0; i-- {
		lastEvent := r.blocks[i].lastEvent()
		if lastEvent != nil {
			return lastEvent
		}
	}
	return nil
}

func (r *StreamView) MinipoolEnvelopes() []*Envelope {
	envelopes := make([]*Envelope, 0, len(r.minipool.events.Values))
	_ = r.minipool.forEachEvent(func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		envelopes = append(envelopes, e.Envelope)
		return true, nil
	})
	return envelopes
}

func (r *StreamView) MinipoolEvents() []*ParsedEvent {
	return r.minipool.events.Values
}

func (r *StreamView) Miniblocks() []*MiniblockInfo {
	return r.blocks
}

func (r *StreamView) MiniblocksFromLastSnapshot() (miniblocks []*Miniblock, snapshot *Envelope) {
	miniblocks = make([]*Miniblock, 0, len(r.blocks)-r.snapshotIndex)
	for i := r.snapshotIndex; i < len(r.blocks); i++ {
		miniblocks = append(miniblocks, r.blocks[i].Proto)
	}
	if len(miniblocks) > 0 {
		snapshot = r.blocks[r.snapshotIndex].SnapshotEnvelope
	}
	return miniblocks, snapshot
}

func (r *StreamView) SyncCookie(localNodeAddress common.Address) *SyncCookie {
	return &SyncCookie{
		NodeAddress:       localNodeAddress.Bytes(),
		StreamId:          r.streamId[:],
		MinipoolGen:       r.minipool.generation,
		PrevMiniblockHash: r.LastBlock().headerEvent.Hash[:],
	}
}

func (r *StreamView) shouldSnapshot(cfg *crypto.OnChainSettings) bool {
	minEventsPerSnapshot := int(cfg.MinSnapshotEvents.ForType(r.streamId.Type()))

	count := 0
	// count the events in the minipool
	count += r.minipool.events.Len()
	if count >= minEventsPerSnapshot {
		return true
	}
	// count the events in blocks since the last snapshot
	for i := len(r.blocks) - 1; i >= 0; i-- {
		block := r.blocks[i]
		if block.Snapshot != nil {
			break
		}
		count += len(block.Events())
		if count >= minEventsPerSnapshot {
			return true
		}
	}
	return false
}

// ValidateNextEvent validates that the event can be added to the stream.
// It checks that the preceding miniblock hash references a recent block,
// that the event does not already exist in any blocks after the referenced miniblock,
// and that the event does not exist in the minipool.
// Time-based recency check is disabled if currentTime is zero.
func (r *StreamView) ValidateNextEvent(
	ctx context.Context,
	cfg *crypto.OnChainSettings,
	parsedEvent *ParsedEvent,
	currentTime time.Time,
) error {
	if len(r.blocks) == 0 {
		return RiverError(Err_INTERNAL, "no miniblocks loaded").Func("ValidateNextEvent")
	}

	foundBlockAt := -1
	var foundBlock *MiniblockInfo
	lastBlock := r.LastBlock()

	// NOTE: insanely TS SDK tries to parse out hash of last block from "expected" field in the error message

	// Num is -1 if it was not set in the protocol event.
	// If not set, search for the block by hash for backcompat.
	if parsedEvent.MiniblockRef.Num >= 0 {
		if parsedEvent.MiniblockRef.Num > lastBlock.Ref.Num {
			return RiverError(
				Err_MINIBLOCK_TOO_NEW,
				"prevMiniblockNum is greater than the last miniblock number in the stream",
				"expected", lastBlock.Ref.Hash,
				"expNum", lastBlock.Ref.Num,
				"requestedBlockNum", parsedEvent.MiniblockRef.Num,
				"requestedBlock", parsedEvent.MiniblockRef.Hash,
				"streamId", r.streamId,
				"event", parsedEvent.Hash,
			).Func("ValidateNextEvent")
		}
		if parsedEvent.MiniblockRef.Num < r.blocks[0].Ref.Num {
			return RiverError(
				Err_BAD_PREV_MINIBLOCK_HASH,
				"prevMiniblockHash references block that is too old to be loaded",
				"expected", lastBlock.Ref.Hash,
				"expNum", lastBlock.Ref.Num,
				"requestedBlockNum", parsedEvent.MiniblockRef.Num,
				"requestedBlock", parsedEvent.MiniblockRef.Hash,
				"firstLoadedBlockNum", r.blocks[0].Ref.Num,
				"streamId", r.streamId,
				"event", parsedEvent.Hash,
			).Func("ValidateNextEvent")
		}
		foundBlockAt = int(parsedEvent.MiniblockRef.Num - r.blocks[0].Ref.Num)
		foundBlock = r.blocks[foundBlockAt]
		if foundBlock.headerEvent.Hash != parsedEvent.MiniblockRef.Hash {
			return RiverError(
				Err_DATA_LOSS,
				"prevMiniblockHash does not match the block number",
				"requestedBlockNum", parsedEvent.MiniblockRef.Num,
				"requestedBlock", parsedEvent.MiniblockRef.Hash,
				"actualBlock", foundBlock.Ref,
				"streamId", r.streamId,
				"event", parsedEvent.Hash,
			).Func("ValidateNextEvent")
		}
	} else {
		// miniblock number is not provided by client, for backcompat
		// loop over blocks backwards to find block with preceding miniblock hash
		for i := len(r.blocks) - 1; i >= 0; i-- {
			block := r.blocks[i]
			if block.headerEvent.Hash == parsedEvent.MiniblockRef.Hash {
				foundBlockAt = i
				foundBlock = block
				break
			}
		}

		if foundBlock == nil {
			return RiverError(
				Err_BAD_PREV_MINIBLOCK_HASH,
				"prevMiniblockHash not found in recent blocks",
				"requestedBlockNum", -1,
				"requestedBlock", parsedEvent.MiniblockRef.Hash,
				"expected", lastBlock.Ref.Hash,
				"expNum", lastBlock.Ref.Num,
				"firstLoadedBlockNum", r.blocks[0].Ref.Num,
				"streamId", r.streamId,
				"event", parsedEvent.Hash,
			).Func("ValidateNextEvent")
		}
	}

	// the preceding miniblock hash should reference a recent block
	// the event should not already exist in any block after the preceding miniblock
	// the event should not exist in the minipool

	// make sure we're recent
	// if the user isn't adding the latest block, allow it if the block after was recently created
	// if time is zero, disable recency check - this is used for replicated add after ValidateNextEvent was already
	// called as part of CanAddEvent
	if !currentTime.IsZero() && foundBlockAt < len(r.blocks)-1 &&
		!r.isRecentBlock(cfg, r.blocks[foundBlockAt+1], currentTime) {
		return RiverError(
			Err_BAD_PREV_MINIBLOCK_HASH,
			"referenced block is not recent",
			"requestedBlockNum", parsedEvent.MiniblockRef.Num,
			"requestedBlock", parsedEvent.MiniblockRef.Hash,
			"expected", lastBlock.Ref.Hash,
			"expNum", lastBlock.Ref.Num,
			"firstLoadedBlockNum", r.blocks[0].Ref.Num,
			"streamId", r.streamId,
			"event", parsedEvent.Hash,
		).Func("ValidateNextEvent")
	}
	// loop forwards from foundBlockAt and check for duplicate event
	for i := foundBlockAt + 1; i < len(r.blocks); i++ {
		block := r.blocks[i]
		for _, e := range block.Events() {
			if e.Hash == parsedEvent.Hash {
				return RiverError(
					Err_DUPLICATE_EVENT,
					"event already exists in block",
					"event", parsedEvent.Hash,
					"foundInBlock", block.Ref,
					"streamId", r.streamId,
				).Func("ValidateNextEvent")
			}
		}
	}
	// check for duplicates in the minipool
	for _, e := range r.minipool.events.Values {
		if e.Hash == parsedEvent.Hash {
			return RiverError(
				Err_DUPLICATE_EVENT,
				"event already exists in minipool",
				"event", parsedEvent.Hash,
				"streamId", r.streamId,
				"lastBlock", lastBlock.Ref,
			).Func("ValidateNextEvent")
		}
	}

	return nil
}

func (r *StreamView) isRecentBlock(
	cfg *crypto.OnChainSettings,
	block *MiniblockInfo,
	currentTime time.Time,
) bool {
	maxAgeDuration := cfg.RecencyConstraintsAge
	diff := currentTime.Sub(block.Header().Timestamp.AsTime())
	return diff <= maxAgeDuration
}

func (r *StreamView) GetStats() StreamViewStats {
	stats := StreamViewStats{
		FirstMiniblockNum: r.blocks[0].Ref.Num,
		LastMiniblockNum:  r.LastBlock().Ref.Num,
		EventsInMinipool:  r.minipool.events.Len(),
	}

	for _, block := range r.blocks {
		stats.EventsInMiniblocks += len(block.Events()) + 1 // +1 for header
		if block.Snapshot != nil {
			stats.SnapshotsInMiniblocks++
		}
	}

	stats.TotalEventsEver = int(r.blocks[r.snapshotIndex].Header().EventNumOffset)
	for _, block := range r.blocks[r.snapshotIndex:] {
		stats.TotalEventsEver += len(block.Events()) + 1 // +1 for header
	}
	stats.TotalEventsEver += r.minipool.events.Len()

	return stats
}

func (r *StreamView) IsMember(userAddress []byte) (bool, error) {
	membership, err := r.GetMembership(userAddress)
	if err != nil {
		return false, err
	}
	return membership == MembershipOp_SO_JOIN, nil
}

func (r *StreamView) StreamParentId() *StreamId {
	streamIdBytes := GetStreamParentId(r.InceptionPayload())
	if streamIdBytes == nil {
		return nil
	}
	streamId, err := StreamIdFromBytes(streamIdBytes)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}
	return &streamId
}

func GetStreamParentId(inception IsInceptionPayload) []byte {
	switch inceptionContent := inception.(type) {
	case *ChannelPayload_Inception:
		spaceID := StreamId{STREAM_SPACE_BIN}
		copy(spaceID[1:], inceptionContent.StreamId[1:21])
		return spaceID[:]
	default:
		return nil
	}
}

func (r *StreamView) CopyAndPrependMiniblocks(mbs []*MiniblockInfo) (*StreamView, error) {
	if len(mbs) == 0 {
		return r, nil
	}

	for i := 1; i < len(mbs); i++ {
		if mbs[i].Ref.Num != mbs[i-1].Ref.Num+1 {
			return nil, RiverError(Err_INVALID_ARGUMENT, "miniblocks are not sequential")
		}
	}

	if mbs[len(mbs)-1].Ref.Num+1 != r.blocks[0].Ref.Num {
		return nil, RiverError(Err_INVALID_ARGUMENT, "miniblocks do not match the first block in the stream")
	}

	return &StreamView{
		streamId:      r.streamId,
		blocks:        append(mbs, r.blocks...),
		minipool:      r.minipool,
		snapshot:      r.snapshot,
		snapshotIndex: r.snapshotIndex + len(mbs),
	}, nil
}

func (r *StreamView) AllEvents() iter.Seq[*ParsedEvent] {
	return func(yield func(*ParsedEvent) bool) {
		for _, block := range r.blocks {
			for _, event := range block.Events() {
				if !yield(event) {
					return
				}
			}
			if !yield(block.headerEvent) {
				return
			}
		}
		for _, event := range r.minipool.events.Values {
			if !yield(event) {
				return
			}
		}
	}
}

func (r *StreamView) GetStreamSince(
	ctx context.Context,
	addr common.Address,
	cookie *SyncCookie,
) (*StreamAndCookie, error) {
	if cookie.MinipoolGen == r.minipool.generation {
		envelopes := make([]*Envelope, r.minipool.events.Len())
		for i, e := range r.minipool.events.Values {
			envelopes[i] = e.Envelope
		}

		// Always send response, even if there are no events so that the client knows it's up to date
		return &StreamAndCookie{
			Events:         envelopes,
			NextSyncCookie: r.SyncCookie(addr),
		}, nil
	}

	// Reset if index is not found or snapshot needs to be sent anyway
	miniblockIndex, err := r.indexOfMiniblockWithNum(cookie.MinipoolGen)
	if err != nil || miniblockIndex <= r.snapshotIndex {
		return r.GetResetStreamAndCookie(addr), nil
	}

	// TODO: FIX: do not flatten miniblocks here, send them as they are
	// Append events from blocks and minipool
	envelopes := make([]*Envelope, 0, 16)
	err = r.forEachEvent(miniblockIndex, func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		envelopes = append(envelopes, e.Envelope)
		return true, nil
	})
	if err != nil {
		return nil, RiverError(Err_INTERNAL, "GetStreamSince: forEachEvent failed", "error", err).
			Func("GetStreamSince")
	}

	return &StreamAndCookie{
		Events:         envelopes,
		NextSyncCookie: r.SyncCookie(addr),
	}, nil
}

func (r *StreamView) GetResetStreamAndCookie(addr common.Address) *StreamAndCookie {
	mbs, sn := r.MiniblocksFromLastSnapshot()
	return &StreamAndCookie{
		Events:         r.MinipoolEnvelopes(),
		NextSyncCookie: r.SyncCookie(addr),
		Miniblocks:     mbs,
		Snapshot:       sn,
		SyncReset:      true,
	}
}

func (r *StreamView) GetResetStreamAndCookieWithPrecedingMiniblocks(
	addr common.Address,
	numPrecedingMiniblocks int64,
) *StreamAndCookie {
	// Validate input to prevent negative values
	if numPrecedingMiniblocks < 0 {
		numPrecedingMiniblocks = 0
	}

	// Calculate how many miniblocks to include before the snapshot
	startIndex := r.snapshotIndex

	if numPrecedingMiniblocks > 0 && r.snapshotIndex > 0 {
		// Prevent overflow by checking if numPrecedingMiniblocks is larger than max int
		// or larger than the snapshot index itself
		maxPreceding := int64(r.snapshotIndex)
		if numPrecedingMiniblocks > maxPreceding {
			// Can't go before the first block
			startIndex = 0
		} else {
			// Safe to subtract since we know numPrecedingMiniblocks <= r.snapshotIndex
			startIndex = r.snapshotIndex - int(numPrecedingMiniblocks)
		}
	}

	// Ensure startIndex is within bounds
	if startIndex < 0 {
		startIndex = 0
	}
	if startIndex >= len(r.blocks) {
		startIndex = len(r.blocks) - 1
		if startIndex < 0 {
			startIndex = 0
		}
	}

	// Calculate capacity safely
	capacity := len(r.blocks) - startIndex
	if capacity < 0 {
		capacity = 0
	}

	// Get miniblocks starting from the calculated index
	miniblocks := make([]*Miniblock, 0, capacity)
	for i := startIndex; i < len(r.blocks); i++ {
		miniblocks = append(miniblocks, r.blocks[i].Proto)
	}

	// Get the snapshot envelope if present
	var snapshot *Envelope
	// Calculate snapshot index in the result safely
	snapshotIndexInResult := int64(0)
	if r.snapshotIndex >= startIndex && r.snapshotIndex < len(r.blocks) {
		snapshotIndexInResult = int64(r.snapshotIndex - startIndex)
		snapshot = r.blocks[r.snapshotIndex].SnapshotEnvelope
	}

	return &StreamAndCookie{
		Events:                 r.MinipoolEnvelopes(),
		NextSyncCookie:         r.SyncCookie(addr),
		Miniblocks:             miniblocks,
		Snapshot:               snapshot,
		SyncReset:              true,
		SnapshotMiniblockIndex: snapshotIndexInResult,
	}
}

// MiniblockEventLimits returns the maximum numbers of events per miniblock and the max total combined
// size (in bytes) of all events in a miniblock as defined in the given cfg. It reads those from on-chain
// settings and if not found, uses default values.
//
// It also ensures that settings read from on-chain are not too high, limiting them to the max allowed
// by the protocol. This prevents misconfiguration or malicious on-chain values from causing excessive
// miniblock sizes that could impact network performance or storage requirements.
func MiniblockEventLimits(cfg *crypto.OnChainSettings) (maxEventsPerMiniblock, maxEventCombinedSize int) {
	// limit the number of events that can be proposed in a single miniblock.
	// use the default also as a max when settings are configured on-chain to prevent
	// values that could cause performance issues or enable denial-of-service attacks.
	maxEventsPerMiniblock = crypto.MaxEventsPerMiniblockDefault
	if cfg.StreamMaxEventsPerMiniblock > 0 {
		maxEventsPerMiniblock = int(min(crypto.MaxEventsPerMiniblockDefault, cfg.StreamMaxEventsPerMiniblock))
	}

	// limit the combined size of events that can be proposed in a single miniblock.
	// use the default also as a max when settings are configured on-chain to prevent
	// values that could cause performance issues or enable denial-of-service attacks.
	maxEventCombinedSize = crypto.StreamMaxTotalEventsSizePerMiniblockDefault
	if cfg.StreamMaxTotalEventsSizePerMiniblock > 0 {
		maxEventCombinedSize = int(
			min(crypto.StreamMaxTotalEventsSizePerMiniblockDefault, cfg.StreamMaxTotalEventsSizePerMiniblock),
		)
	}

	return maxEventsPerMiniblock, maxEventCombinedSize
}
