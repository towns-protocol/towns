package events

import (
	"bytes"
	"context"
	"iter"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/logging"
	"github.com/river-build/river/core/node/mls_service"
	"github.com/river-build/river/core/node/mls_service/mls_tools"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
	. "github.com/river-build/river/core/node/utils"
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
	streamData *storage.ReadStreamFromLastSnapshotResult,
) (*StreamView, error) {
	if len(streamData.Miniblocks) <= 0 {
		return nil, RiverError(Err_STREAM_EMPTY, "no blocks").Func("MakeStreamView")
	}

	miniblocks := make([]*MiniblockInfo, len(streamData.Miniblocks))
	lastMiniblockNumber := int64(-2)
	snapshotIndex := -1
	for i, binMiniblock := range streamData.Miniblocks {
		miniblock, err := NewMiniblockInfoFromBytes(binMiniblock, lastMiniblockNumber+1)
		if err != nil {
			return nil, err
		}
		miniblocks[i] = miniblock
		lastMiniblockNumber = miniblock.Header().MiniblockNum
		if snapshotIndex == -1 && miniblock.Header().Snapshot != nil {
			snapshotIndex = i
		}
	}

	if snapshotIndex == -1 {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "no snapshot").Func("MakeStreamView")
	}

	snapshot := miniblocks[snapshotIndex].headerEvent.Event.GetMiniblockHeader().GetSnapshot()
	if snapshot == nil {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "no snapshot").Func("MakeStreamView")
	}
	streamId, err := StreamIdFromBytes(snapshot.GetInceptionPayload().GetStreamId())
	if err != nil {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "bad streamId").Func("MakeStreamView")
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

func MakeRemoteStreamView(ctx context.Context, stream *StreamAndCookie) (*StreamView, error) {
	if stream == nil {
		return nil, RiverError(Err_STREAM_EMPTY, "no stream").Func("MakeStreamViewFromRemote")
	}
	if len(stream.Miniblocks) <= 0 {
		return nil, RiverError(Err_STREAM_EMPTY, "no blocks").Func("MakeStreamViewFromRemote")
	}

	miniblocks := make([]*MiniblockInfo, len(stream.Miniblocks))
	lastMiniblockNumber := int64(-1)
	snapshotIndex := 0
	for i, binMiniblock := range stream.Miniblocks {
		opts := NewParsedMiniblockInfoOpts()
		// Ignore block number of first block, but enforce afterwards
		if i > 0 {
			opts = opts.WithExpectedBlockNumber(lastMiniblockNumber + 1)
		}

		miniblock, err := NewMiniblockInfoFromProto(
			binMiniblock,
			opts,
		)
		if err != nil {
			return nil, err
		}
		lastMiniblockNumber = miniblock.Header().MiniblockNum
		miniblocks[i] = miniblock
		if miniblock.Header().Snapshot != nil {
			snapshotIndex = i
		}
	}

	snapshot := miniblocks[0].headerEvent.Event.GetMiniblockHeader().GetSnapshot()
	if snapshot == nil {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "no snapshot").Func("MakeStreamView")
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

func (r *StreamView) proposeNextMiniblock(
	ctx context.Context,
	cfg *crypto.OnChainSettings,
	forceSnapshot bool,
) *mbProposal {
	return &mbProposal{
		newMiniblockNum:   r.minipool.generation,
		prevMiniblockHash: r.LastBlock().headerEvent.Hash,
		shouldSnapshot:    forceSnapshot || r.shouldSnapshot(cfg),
		eventHashes:       r.minipool.eventHashes(),
	}
}

type mbProposal struct {
	newMiniblockNum   int64
	prevMiniblockHash common.Hash
	shouldSnapshot    bool
	eventHashes       []common.Hash
}

func mbProposalFromProto(p *MiniblockProposal) *mbProposal {
	hashes := make([]common.Hash, len(p.Hashes))
	for i, h := range p.Hashes {
		hashes[i].SetBytes(h)
	}
	return &mbProposal{
		newMiniblockNum:   p.NewMiniblockNum,
		prevMiniblockHash: common.Hash(p.PrevMiniblockHash),
		shouldSnapshot:    p.ShouldSnapshot,
		eventHashes:       hashes,
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

	for _, h := range proposal.eventHashes {
		e, ok := r.minipool.events.Get(h)
		if !ok {
			return nil, RiverError(
				Err_MINIPOOL_MISSING_EVENTS,
				"proposal event not found in minipool",
				"hash",
				h,
			)
		}
		hashes = append(hashes, e.Hash[:])
		events = append(events, e)
	}

	var snapshot *Snapshot
	last := r.LastBlock()
	eventNumOffset := last.Header().EventNumOffset + int64(len(last.Events())) + 1 // +1 for header
	nextMiniblockNum := last.Header().MiniblockNum + 1
	miniblockNumOfPrevSnapshot := last.Header().PrevSnapshotMiniblockNum
	if last.Header().Snapshot != nil {
		miniblockNumOfPrevSnapshot = last.Header().MiniblockNum
	}
	if proposal.shouldSnapshot {
		snapshot = proto.Clone(r.snapshot).(*Snapshot)
		mlsSnapshotRequest := r.makeMlsSnapshotRequest()

		if snapshot.Members.GetMls() == nil {
			snapshot.Members.Mls = &MemberPayload_Snapshot_Mls{}
		}
		// reset the MLS commits
		snapshot.Members.Mls.CommitsSinceLastSnapshot = make([][]byte, 0)

		// update all blocks since last snapshot
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
				updateMlsSnapshotRequest(mlsSnapshotRequest, e)
			}
		}
		// update with current events in minipool
		for i, e := range events {
			err := Update_Snapshot(snapshot, e, nextMiniblockNum, eventNumOffset+int64(i))
			if err != nil {
				log.Errorw("Failed to update snapshot",
					"error", err,
					"streamId", r.streamId,
					"event", e.ShortDebugStr(),
				)
			}
			updateMlsSnapshotRequest(
				mlsSnapshotRequest,
				e,
			) // is it wrong that we're calling this for events in the minipool?
		}

		// only attempt to snapshot the MLS state if MLS has been initialized for this stream.
		if mlsSnapshotRequest != nil && len(mlsSnapshotRequest.ExternalGroupSnapshot) > 0 {
			resp, err := mls_service.SnapshotExternalGroupRequest(mlsSnapshotRequest)
			if err != nil {
				// what to do here...?
				log.Errorw("Failed to update MLS snapshot",
					"error", err,
					"streamId", r.streamId,
				)
			}
			snapshot.Members.Mls.ExternalGroupSnapshot = resp.ExternalGroupSnapshot
			snapshot.Members.Mls.GroupInfoMessage = resp.GroupInfoMessage
		}
	}

	header := &MiniblockHeader{
		MiniblockNum:             nextMiniblockNum,
		Timestamp:                NextMiniblockTimestamp(last.Header().Timestamp),
		EventHashes:              hashes,
		PrevMiniblockHash:        last.headerEvent.Hash[:],
		Snapshot:                 snapshot,
		EventNumOffset:           eventNumOffset,
		PrevSnapshotMiniblockNum: miniblockNumOfPrevSnapshot,
		Content: &MiniblockHeader_None{
			None: &emptypb.Empty{},
		},
	}

	return NewMiniblockInfoFromHeaderAndParsed(params.Wallet, header, events)
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
	if header.Snapshot != nil {
		snapshot = header.Snapshot
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

// iterate over events starting at startBlock including events in the minipool
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

func (r *StreamView) MiniblocksFromLastSnapshot() []*Miniblock {
	miniblocks := make([]*Miniblock, 0, len(r.blocks)-r.snapshotIndex)
	for i := r.snapshotIndex; i < len(r.blocks); i++ {
		miniblocks = append(miniblocks, r.blocks[i].Proto)
	}
	return miniblocks
}

func (r *StreamView) SyncCookie(localNodeAddress common.Address) *SyncCookie {
	return &SyncCookie{
		NodeAddress:       localNodeAddress.Bytes(),
		StreamId:          r.streamId[:],
		MinipoolGen:       r.minipool.generation,
		MinipoolSlot:      int64(r.minipool.events.Len()),
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
		if block.Header().Snapshot != nil {
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
	// the preceding miniblock hash should reference a recent block
	// the event should not already exist in any block after the preceding miniblock
	// the event should not exist in the minipool
	foundBlockAt := -1
	var foundBlock *MiniblockInfo
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
		if parsedEvent.MiniblockRef.Num > r.LastBlock().Ref.Num {
			return RiverError(
				Err_MINIBLOCK_TOO_NEW,
				"prevMiniblockNum is greater than the last miniblock number in the stream",
				"lastBlockNum",
				r.LastBlock().Ref.Num,
				"eventPrevMiniblockNum",
				parsedEvent.MiniblockRef.Num,
				"streamId",
				r.streamId,
			)
		} else {
			return RiverError(
				Err_BAD_PREV_MINIBLOCK_HASH,
				"prevMiniblockHash not found in recent blocks",
				"event",
				parsedEvent.ShortDebugStr(),
				"expected",
				FormatFullHash(r.LastBlock().headerEvent.Hash),
			)
		}
	}

	// for backcompat, do not check that the number of miniblock matches if it's set to 0
	if parsedEvent.MiniblockRef.Num != 0 {
		if foundBlock.Ref.Num != parsedEvent.MiniblockRef.Num {
			return RiverError(
				Err_BAD_PREV_MINIBLOCK_HASH,
				"prevMiniblockNum does not match the miniblock number in the block",
				"blockNum",
				foundBlock.Ref.Num,
				"eventPrevMiniblockNum",
				parsedEvent.MiniblockRef.Num,
				"streamId",
				r.streamId,
				"blockHash",
				foundBlock.headerEvent.Hash,
			)
		}
	}

	// make sure we're recent
	// if the user isn't adding the latest block, allow it if the block after was recently created
	// if time is zero, disable recency check - this is used for replicated add after ValidateNextEvent was already called as part of CanAddEvent
	if !currentTime.IsZero() && foundBlockAt < len(r.blocks)-1 && !r.isRecentBlock(cfg, r.blocks[foundBlockAt+1], currentTime) {
		return RiverError(
			Err_BAD_PREV_MINIBLOCK_HASH,
			"prevMiniblockHash did not reference a recent block",
			"event",
			parsedEvent.ShortDebugStr(),
			"expected",
			FormatFullHash(r.LastBlock().headerEvent.Hash),
		)
	}
	// loop forwards from foundBlockAt and check for duplicate event
	for i := foundBlockAt + 1; i < len(r.blocks); i++ {
		block := r.blocks[i]
		for _, e := range block.Events() {
			if e.Hash == parsedEvent.Hash {
				return RiverError(
					Err_DUPLICATE_EVENT,
					"event already exists in block",
					"event",
					parsedEvent.ShortDebugStr(),
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
				"event",
				parsedEvent.ShortDebugStr(),
				"expected",
				FormatHashShort(r.LastBlock().headerEvent.Hash),
			).Func("ValidateNextEvent")
		}
	}
	// success
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
		if block.Header().Snapshot != nil {
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
		return inceptionContent.SpaceId
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

func (r *StreamView) makeMlsSnapshotRequest() *mls_tools.SnapshotExternalGroupRequest {
	if r.snapshot.Members.GetMls() == nil {
		return nil
	}
	return &mls_tools.SnapshotExternalGroupRequest{
		ExternalGroupSnapshot: r.snapshot.Members.GetMls().ExternalGroupSnapshot,
		GroupInfoMessage:      r.snapshot.Members.GetMls().GroupInfoMessage,
		Commits:               make([]*mls_tools.SnapshotExternalGroupRequest_CommitInfo, 0),
	}
}

func updateMlsSnapshotRequest(mlsSnapshotRequest *mls_tools.SnapshotExternalGroupRequest, e *ParsedEvent) {
	if mlsSnapshotRequest == nil {
		return
	}
	switch payload := e.Event.Payload.(type) {
	case *StreamEvent_MemberPayload:
		switch content := payload.MemberPayload.Content.(type) {
		case *MemberPayload_Mls_:
			switch mlsContent := content.Mls.Content.(type) {
			case *MemberPayload_Mls_InitializeGroup_:
				if len(mlsSnapshotRequest.ExternalGroupSnapshot) == 0 {
					mlsSnapshotRequest.ExternalGroupSnapshot = mlsContent.InitializeGroup.ExternalGroupSnapshot
					mlsSnapshotRequest.GroupInfoMessage = mlsContent.InitializeGroup.GroupInfoMessage
				}
			case *MemberPayload_Mls_ExternalJoin_:
				// external joins consist of a commit + a group info message.
				// new clients rely on the group info message to join the group.
				// for this reason, we cannot blindly assume that the latest group info message
				// is the one that should be used — we need to make sure that the commit is applied correctly first.
				// clients will replay the state locally before attempting to join the group.
				commitInfo := &mls_tools.SnapshotExternalGroupRequest_CommitInfo{
					Commit:           mlsContent.ExternalJoin.Commit,
					GroupInfoMessage: mlsContent.ExternalJoin.GroupInfoMessage,
				}
				mlsSnapshotRequest.Commits = append(mlsSnapshotRequest.Commits, commitInfo)
			}
		default:
			break
		}
	default:
		break
	}
}
