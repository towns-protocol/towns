package events

import (
	"bytes"
	. "casablanca/node/base"
	"casablanca/node/dlog"
	. "casablanca/node/protocol"
	"casablanca/node/storage"
	. "casablanca/node/utils"
	"context"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
)

type StreamView interface {
	StreamId() string
	InceptionPayload() IsInceptionPayload
	LastEvent() *ParsedEvent
	MinipoolEnvelopes() []*Envelope
	MiniblocksFromLastSnapshot() []*Miniblock
	SyncCookie(localNodeAddress string) *SyncCookie
}

func MakeStreamView(streamData *storage.GetStreamFromLastSnapshotResult) (*streamViewImpl, error) {
	if len(streamData.Miniblocks) <= 0 {
		return nil, RiverError(Err_STREAM_EMPTY, "no blocks").Func("MakeStreamView")
	}

	miniblocks := make([]*miniblockInfo, len(streamData.Miniblocks))
	for i, binMiniblock := range streamData.Miniblocks {
		miniblock, err := NewMiniblockInfoFromBytes(binMiniblock, streamData.StartMiniblockNumber+int64(i))
		if err != nil {
			return nil, err
		}
		miniblocks[i] = miniblock
	}

	snapshotIndex := 0
	snapshot := miniblocks[snapshotIndex].headerEvent.Event.GetMiniblockHeader().GetSnapshot()
	if snapshot == nil {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "no snapshot").Func("MakeStreamView")
	}
	streamId := snapshot.GetInceptionPayload().GetStreamId()
	if streamId == "" {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "no streamId").Func("MakeStreamView")
	}

	minipoolEvents := NewOrderedMap[string, *ParsedEvent](len(streamData.MinipoolEnvelopes))
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
		minipoolEvents.Set(parsed.HashStr, parsed)
	}

	return &streamViewImpl{
		streamId:      streamId,
		blocks:        miniblocks,
		minipool:      newMiniPoolInstance(minipoolEvents, miniblocks[len(miniblocks)-1].header().MiniblockNum+1),
		snapshot:      snapshot,
		snapshotIndex: snapshotIndex,
	}, nil
}

func MakeRemoteStreamView(resp *GetStreamResponse) (*streamViewImpl, error) {
	if len(resp.Miniblocks) <= 0 {
		return nil, RiverError(Err_STREAM_EMPTY, "no blocks").Func("MakeStreamViewFromRemote")
	}

	miniblocks := make([]*miniblockInfo, len(resp.Miniblocks))
	// +1 below will make it -1 for the first iteration so block number is not enforced.
	lastMiniblockNumber := int64(-2)
	snapshotIndex := 0
	for i, binMiniblock := range resp.Miniblocks {
		miniblock, err := NewMiniblockInfoFromProto(binMiniblock, lastMiniblockNumber+1)
		if err != nil {
			return nil, err
		}
		lastMiniblockNumber = miniblock.header().MiniblockNum
		miniblocks[i] = miniblock
		if miniblock.header().Snapshot != nil {
			snapshotIndex = i
		}
	}

	snapshot := miniblocks[0].headerEvent.Event.GetMiniblockHeader().GetSnapshot()
	if snapshot == nil {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "no snapshot").Func("MakeStreamView")
	}
	streamId := snapshot.GetInceptionPayload().GetStreamId()
	// TODO: also should check here or at the call site if streamId matches the one that was requested.
	if streamId == "" {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "no streamId").Func("MakeStreamView")
	}

	minipoolEvents := NewOrderedMap[string, *ParsedEvent](len(resp.Stream.Events))
	for _, e := range resp.Stream.Events {
		parsed, err := ParseEvent(e)
		if err != nil {
			return nil, err
		}
		minipoolEvents.Set(parsed.HashStr, parsed)
	}

	return &streamViewImpl{
		streamId:      streamId,
		blocks:        miniblocks,
		minipool:      newMiniPoolInstance(minipoolEvents, lastMiniblockNumber+1),
		snapshot:      snapshot,
		snapshotIndex: snapshotIndex,
	}, nil
}

type streamViewImpl struct {
	streamId      string
	blocks        []*miniblockInfo
	minipool      *minipoolInstance
	snapshot      *Snapshot
	snapshotIndex int
}

var _ StreamView = (*streamViewImpl)(nil)

func (r *streamViewImpl) copyAndAddEvent(event *ParsedEvent) (*streamViewImpl, error) {
	if event.Event.GetMiniblockHeader() != nil {
		return nil, RiverError(Err_BAD_EVENT, "streamViewImpl: block event not allowed")
	}

	// TODO: HNT-1843: Re-enable block-aware event duplicate checks
	// There is a need to reject duplicate events, but there is no efficient way to do it without scanning
	// all blocks (and minipool). Also, this doesn't work in presense of snapshots.
	// The fix for this is to allow events to be added only if they reference "recent" block and
	// to check only recent blocks for duplicates.

	r = &streamViewImpl{
		streamId:      r.streamId,
		blocks:        r.blocks,
		minipool:      r.minipool.copyAndAddEvent(event),
		snapshot:      r.snapshot,
		snapshotIndex: r.snapshotIndex,
	}
	return r, nil
}

func (r *streamViewImpl) lastBlock() *miniblockInfo {
	return r.blocks[len(r.blocks)-1]
}

func (r *streamViewImpl) makeMiniblockHeader(ctx context.Context) (*MiniblockHeader, []*ParsedEvent) {
	log := dlog.CtxLog(ctx)
	hashes := make([][]byte, r.minipool.events.Len())
	events := make([]*ParsedEvent, r.minipool.events.Len())
	for i, e := range r.minipool.events.Values {
		hashes[i] = e.Hash
		events[i] = e
	}

	var snapshot *Snapshot
	last := r.lastBlock()
	eventNumOffset := last.header().EventNumOffset + int64(len(last.events)) + 1 // +1 for header
	miniblockNumOfPrevSnapshot := last.header().PrevSnapshotMiniblockNum
	if last.header().Snapshot != nil {
		miniblockNumOfPrevSnapshot = last.header().MiniblockNum
	}
	if r.shouldSnapshot() {
		snapshot = proto.Clone(r.snapshot).(*Snapshot)
		events := r.eventsSinceLastSnapshot()
		for i, e := range events {
			err := Update_Snapshot(snapshot, e, eventNumOffset, i)
			if err != nil {
				log.Error("Failed to update snapshot",
					"error", err,
					"streamId", r.streamId,
					"event", e.ShortDebugStr(),
				)
			}
		}
	}
	return &MiniblockHeader{
		MiniblockNum:             last.header().MiniblockNum + 1,
		Timestamp:                NextMiniblockTimestamp(last.header().Timestamp),
		EventHashes:              hashes,
		PrevMiniblockHash:        last.headerEvent.Hash,
		Snapshot:                 snapshot,
		EventNumOffset:           eventNumOffset,
		PrevSnapshotMiniblockNum: miniblockNumOfPrevSnapshot,
		Content: &MiniblockHeader_None{
			None: &emptypb.Empty{},
		},
	}, events
}

// In 1.21 there is built-in max! (facepalm)
func MaxInt_(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (r *streamViewImpl) copyAndApplyBlock(miniblock *miniblockInfo) (*streamViewImpl, error) {
	header := miniblock.headerEvent.Event.GetMiniblockHeader()
	if header == nil {
		return nil, RiverError(Err_INTERNAL, "streamViewImpl: non block event not allowed", "stream", r.streamId, "event", miniblock.headerEvent.ShortDebugStr())
	}

	lastBlock := r.lastBlock()
	if header.MiniblockNum != lastBlock.header().MiniblockNum+1 {
		return nil, RiverError(Err_BAD_BLOCK, "streamViewImpl: block number mismatch", "expected", lastBlock.header().MiniblockNum+1, "actual", header.MiniblockNum)
	}
	if !bytes.Equal(lastBlock.headerEvent.Hash, header.PrevMiniblockHash) {
		return nil, RiverError(Err_BAD_BLOCK, "streamViewImpl: block hash mismatch", "expected", FormatHashFromString(string(lastBlock.headerEvent.Hash)), "actual", FormatHashFromString(string(header.PrevMiniblockHash)))
	}

	remaining := make(map[string]*ParsedEvent, MaxInt_(r.minipool.events.Len()-len(header.EventHashes), 0))
	for k, v := range r.minipool.events.Map {
		remaining[k] = v
	}

	for _, e := range miniblock.events {
		if _, ok := remaining[e.HashStr]; ok {
			delete(remaining, e.HashStr)
		} else {
			return nil, RiverError(Err_BAD_BLOCK, "streamViewImpl: block event not found", "stream", r.streamId, "event_hash", FormatHashFromString(e.HashStr))
		}
	}

	minipoolEvents := NewOrderedMap[string, *ParsedEvent](len(remaining))
	for _, e := range r.minipool.events.Values {
		if _, ok := remaining[e.HashStr]; ok {
			minipoolEvents.Set(e.HashStr, e)
		}
	}

	var snapshotIndex int
	var snapshot *Snapshot
	if header.Snapshot != nil {
		snapshot = header.Snapshot
		snapshotIndex = len(r.blocks)
	} else {
		snapshot = r.snapshot
		snapshotIndex = r.snapshotIndex
	}

	return &streamViewImpl{
		streamId:      r.streamId,
		blocks:        append(r.blocks, miniblock),
		minipool:      newMiniPoolInstance(minipoolEvents, header.MiniblockNum+1),
		snapshot:      snapshot,
		snapshotIndex: snapshotIndex,
	}, nil
}

func (r *streamViewImpl) StreamId() string {
	return r.streamId
}

func (r *streamViewImpl) InceptionPayload() IsInceptionPayload {
	return r.snapshot.GetInceptionPayload()
}

func (r *streamViewImpl) indexOfMiniblockWithNum(mininblockNum int64) (int, error) {
	if len(r.blocks) > 0 {
		diff := int(mininblockNum - r.blocks[0].header().MiniblockNum)
		if diff >= 0 && diff < len(r.blocks) {
			if r.blocks[diff].header().MiniblockNum != mininblockNum {
				return 0, RiverError(Err_INTERNAL, "indexOfMiniblockWithNum block number mismatch", "requested", mininblockNum, "actual", r.blocks[diff].header().MiniblockNum)
			}
			return diff, nil
		}
		return 0, RiverError(Err_INVALID_ARGUMENT, "indexOfMiniblockWithNum index not found", "requested", mininblockNum, "min", r.blocks[0].header().MiniblockNum, "max", r.blocks[len(r.blocks)-1].header().MiniblockNum)
	}
	return 0, RiverError(Err_INVALID_ARGUMENT, "indexOfMiniblockWithNum No blocks loaded", "requested", mininblockNum, "streamId", r.streamId)
}

func (r *streamViewImpl) forEachEvent(startBlock int, op func(e *ParsedEvent) (bool, error)) error {
	if startBlock < 0 || startBlock > len(r.blocks) {
		return RiverError(Err_INVALID_ARGUMENT, "iterateEvents: bad startBlock", "startBlock", startBlock)
	}

	for i := startBlock; i < len(r.blocks); i++ {
		err := r.blocks[i].forEachEvent(op)
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *streamViewImpl) LastEvent() *ParsedEvent {
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

func (r *streamViewImpl) MinipoolEnvelopes() []*Envelope {
	envelopes := make([]*Envelope, 0, len(r.minipool.events.Values))
	_ = r.minipool.forEachEvent(func(e *ParsedEvent) (bool, error) {
		envelopes = append(envelopes, e.Envelope)
		return true, nil
	})
	return envelopes
}

func (r *streamViewImpl) MiniblocksFromLastSnapshot() []*Miniblock {
	miniblocks := make([]*Miniblock, 0, len(r.blocks)-r.snapshotIndex)
	for i := r.snapshotIndex; i < len(r.blocks); i++ {
		// grab the block
		block := r.blocks[i]
		// start copying events
		envelopes := make([]*Envelope, 0, len(block.events))
		// copy all the events (but not the header)
		for _, event := range block.events {
			envelopes = append(envelopes, event.Envelope)
		}
		// make the block
		miniblock := Miniblock{
			Events: envelopes,
			Header: block.headerEvent.Envelope,
		}
		miniblocks = append(miniblocks, &miniblock)
	}
	return miniblocks
}

func (r *streamViewImpl) SyncCookie(localNodeAddress string) *SyncCookie {
	return &SyncCookie{
		NodeAddress:       localNodeAddress,
		StreamId:          r.streamId,
		MinipoolGen:       r.minipool.generation,
		MinipoolSlot:      int64(r.minipool.events.Len()),
		PrevMiniblockHash: r.lastBlock().headerEvent.Hash,
	}
}

func (r *streamViewImpl) getMinEventsPerSnapshot() int {
	// TODO this should be a system level config https://linear.app/hnt-labs/issue/HNT-2011
	defaultMinEventsPerSnapshot := 100
	settings := r.InceptionPayload().GetSettings()
	if settings == nil || settings.GetMinEventsPerSnapshot() == 0 {
		return defaultMinEventsPerSnapshot
	}
	return int(settings.GetMinEventsPerSnapshot())
}

func (r *streamViewImpl) shouldSnapshot() bool {
	var count = 0
	var minEventsPerSnapshot = r.getMinEventsPerSnapshot()
	// count the events in the minipool
	count += r.minipool.events.Len()
	if count >= minEventsPerSnapshot {
		return true
	}
	// count the events in blocks since the last snapshot
	for i := len(r.blocks) - 1; i >= 0; i-- {
		block := r.blocks[i]
		if block.header().Snapshot != nil {
			break
		}
		count += len(block.events)
		if count >= minEventsPerSnapshot {
			return true
		}
	}
	return false
}

func (r *streamViewImpl) eventsSinceLastSnapshot() []*ParsedEvent {
	returnVal := make([]*ParsedEvent, 0, r.getMinEventsPerSnapshot())
	// add events from blocks without snapshot
	for i := r.snapshotIndex + 1; i < len(r.blocks); i++ {
		block := r.blocks[i]
		returnVal = append(returnVal, block.events...)
	}
	// add the minipool
	returnVal = append(returnVal, r.minipool.events.Values...)
	return returnVal
}
