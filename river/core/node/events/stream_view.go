package events

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
	. "github.com/river-build/river/core/node/utils"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
)

type StreamViewStats struct {
	FirstMiniblockNum     int64
	LastMiniblockNum      int64
	EventsInMiniblocks    int
	SnapshotsInMiniblocks int
	EventsInMinipool      int
	TotalEventsEver       int // This is total number of events in the stream ever, not in the cache.
}

type StreamView interface {
	StreamId() *StreamId
	StreamParentId() *StreamId
	InceptionPayload() IsInceptionPayload
	LastEvent() *ParsedEvent
	MinipoolEnvelopes() []*Envelope
	MiniblocksFromLastSnapshot() []*Miniblock
	SyncCookie(localNodeAddress common.Address) *SyncCookie
	LastBlock() *MiniblockInfo
	ValidateNextEvent(
		ctx context.Context,
		cfg crypto.OnChainConfiguration,
		parsedEvent *ParsedEvent,
		currentTime time.Time,
	) error
	GetStats() StreamViewStats
	ProposeNextMiniblock(ctx context.Context, cfg crypto.OnChainConfiguration, forceSnapshot bool) (*MiniblockProposal, error)
	IsMember(userAddress []byte) (bool, error)
}

func MakeStreamView(streamData *storage.ReadStreamFromLastSnapshotResult) (*streamViewImpl, error) {
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
		lastMiniblockNumber = miniblock.header().MiniblockNum
		if snapshotIndex == -1 && miniblock.header().Snapshot != nil {
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
		minipoolEvents.Set(parsed.Hash, parsed)
	}

	lastBlockHeader := miniblocks[len(miniblocks)-1].header()
	generation := lastBlockHeader.MiniblockNum + 1
	eventNumOffset := lastBlockHeader.EventNumOffset + int64(
		len(lastBlockHeader.EventHashes),
	) + 1 // plus one for header

	return &streamViewImpl{
		streamId:      streamId,
		blocks:        miniblocks,
		minipool:      newMiniPoolInstance(minipoolEvents, generation, eventNumOffset),
		snapshot:      snapshot,
		snapshotIndex: snapshotIndex,
	}, nil
}

func MakeRemoteStreamView(resp *GetStreamResponse) (*streamViewImpl, error) {
	if len(resp.Stream.Miniblocks) <= 0 {
		return nil, RiverError(Err_STREAM_EMPTY, "no blocks").Func("MakeStreamViewFromRemote")
	}

	miniblocks := make([]*MiniblockInfo, len(resp.Stream.Miniblocks))
	// +1 below will make it -1 for the first iteration so block number is not enforced.
	lastMiniblockNumber := int64(-2)
	snapshotIndex := 0
	for i, binMiniblock := range resp.Stream.Miniblocks {
		miniblock, err := NewMiniblockInfoFromProto(
			binMiniblock,
			NewMiniblockInfoFromProtoOpts{ExpectedBlockNumber: lastMiniblockNumber + 1},
		)
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
	streamId, err := StreamIdFromBytes(snapshot.GetInceptionPayload().GetStreamId())
	if err != nil {
		return nil, RiverError(Err_STREAM_BAD_EVENT, "bad streamId").Func("MakeStreamView")
	}

	minipoolEvents := NewOrderedMap[common.Hash, *ParsedEvent](len(resp.Stream.Events))
	for _, e := range resp.Stream.Events {
		parsed, err := ParseEvent(e)
		if err != nil {
			return nil, err
		}
		minipoolEvents.Set(parsed.Hash, parsed)
	}

	lastBlockHeader := miniblocks[len(miniblocks)-1].header()
	generation := lastBlockHeader.MiniblockNum + 1
	eventNumOffset := lastBlockHeader.EventNumOffset + int64(
		len(lastBlockHeader.EventHashes),
	) + 1 // plus one for header

	return &streamViewImpl{
		streamId:      streamId,
		blocks:        miniblocks,
		minipool:      newMiniPoolInstance(minipoolEvents, generation, eventNumOffset),
		snapshot:      snapshot,
		snapshotIndex: snapshotIndex,
	}, nil
}

type streamViewImpl struct {
	streamId      StreamId
	blocks        []*MiniblockInfo
	minipool      *minipoolInstance
	snapshot      *Snapshot
	snapshotIndex int
}

var _ StreamView = (*streamViewImpl)(nil)

func (r *streamViewImpl) copyAndAddEvent(event *ParsedEvent) (*streamViewImpl, error) {
	if event.Event.GetMiniblockHeader() != nil {
		return nil, RiverError(Err_BAD_EVENT, "streamViewImpl: block event not allowed")
	}

	r = &streamViewImpl{
		streamId:      r.streamId,
		blocks:        r.blocks,
		minipool:      r.minipool.copyAndAddEvent(event),
		snapshot:      r.snapshot,
		snapshotIndex: r.snapshotIndex,
	}
	return r, nil
}

func (r *streamViewImpl) LastBlock() *MiniblockInfo {
	return r.blocks[len(r.blocks)-1]
}

// Returns nil if there are no events to propose.
func (r *streamViewImpl) ProposeNextMiniblock(
	ctx context.Context,
	cfg crypto.OnChainConfiguration,
	forceSnapshot bool,
) (*MiniblockProposal, error) {
	if r.minipool.events.Len() == 0 && !forceSnapshot {
		return nil, nil
	}
	hashes := make([][]byte, 0, r.minipool.events.Len())
	for _, e := range r.minipool.events.Values {
		hashes = append(hashes, e.Hash[:])
	}
	return &MiniblockProposal{
		Hashes:            hashes,
		NewMiniblockNum:   r.minipool.generation,
		PrevMiniblockHash: r.LastBlock().headerEvent.Hash[:],
		ShouldSnapshot:    forceSnapshot || r.shouldSnapshot(ctx, cfg),
	}, nil
}

func (r *streamViewImpl) makeMiniblockHeader(
	ctx context.Context,
	proposal *MiniblockProposal,
) (*MiniblockHeader, []*ParsedEvent, error) {
	if r.minipool.generation != proposal.NewMiniblockNum ||
		!bytes.Equal(proposal.PrevMiniblockHash, r.LastBlock().headerEvent.Hash[:]) {
		return nil, nil, RiverError(
			Err_STREAM_LAST_BLOCK_MISMATCH,
			"proposal generation or hash mismatch",
			"expected",
			r.minipool.generation,
			"actual",
			proposal.NewMiniblockNum,
		)
	}

	log := dlog.FromCtx(ctx)
	hashes := make([][]byte, 0, r.minipool.events.Len())
	events := make([]*ParsedEvent, 0, r.minipool.events.Len())

	for _, h := range proposal.Hashes {
		e, ok := r.minipool.events.Get(common.BytesToHash(h))
		if !ok {
			return nil, nil, RiverError(
				Err_MINIPOOL_MISSING_EVENTS,
				"proposal event not found in minipool",
				"hash",
				FormatHashFromBytes(h),
			)
		}
		hashes = append(hashes, e.Hash[:])
		events = append(events, e)
	}

	var snapshot *Snapshot
	last := r.LastBlock()
	eventNumOffset := last.header().EventNumOffset + int64(len(last.events)) + 1 // +1 for header
	nextMiniblockNum := last.header().MiniblockNum + 1
	miniblockNumOfPrevSnapshot := last.header().PrevSnapshotMiniblockNum
	if last.header().Snapshot != nil {
		miniblockNumOfPrevSnapshot = last.header().MiniblockNum
	}
	if proposal.ShouldSnapshot {
		snapshot = proto.Clone(r.snapshot).(*Snapshot)
		// update all blocks since last snapshot
		for i := r.snapshotIndex + 1; i < len(r.blocks); i++ {
			block := r.blocks[i]
			miniblockNum := block.header().MiniblockNum
			for j, e := range block.events {
				offset := block.header().EventNumOffset
				err := Update_Snapshot(snapshot, e, miniblockNum, offset+int64(j))
				if err != nil {
					log.Error("Failed to update snapshot",
						"error", err,
						"streamId", r.streamId,
						"event", e.ShortDebugStr(),
					)
				}
			}
		}
		// update with current events in minipool
		for i, e := range events {
			err := Update_Snapshot(snapshot, e, nextMiniblockNum, eventNumOffset+int64(i))
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
		MiniblockNum:             nextMiniblockNum,
		Timestamp:                NextMiniblockTimestamp(last.header().Timestamp),
		EventHashes:              hashes,
		PrevMiniblockHash:        last.headerEvent.Hash[:],
		Snapshot:                 snapshot,
		EventNumOffset:           eventNumOffset,
		PrevSnapshotMiniblockNum: miniblockNumOfPrevSnapshot,
		Content: &MiniblockHeader_None{
			None: &emptypb.Empty{},
		},
	}, events, nil
}

func (r *streamViewImpl) copyAndApplyBlock(
	miniblock *MiniblockInfo,
	cfg crypto.OnChainConfiguration,
) (*streamViewImpl, error) {
	recencyConstraintsGenerations, err := cfg.GetInt(crypto.StreamRecencyConstraintsGenerationsConfigKey)
	if err != nil {
		return nil, err
	}

	header := miniblock.headerEvent.Event.GetMiniblockHeader()
	if header == nil {
		return nil, RiverError(
			Err_INTERNAL,
			"streamViewImpl: non block event not allowed",
			"stream",
			r.streamId,
			"event",
			miniblock.headerEvent.ShortDebugStr(),
		)
	}

	lastBlock := r.LastBlock()
	if header.MiniblockNum != lastBlock.header().MiniblockNum+1 {
		return nil, RiverError(
			Err_BAD_BLOCK,
			"streamViewImpl: block number mismatch",
			"expected",
			lastBlock.header().MiniblockNum+1,
			"actual",
			header.MiniblockNum,
		)
	}
	if !bytes.Equal(lastBlock.headerEvent.Hash[:], header.PrevMiniblockHash) {
		return nil, RiverError(
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

	for _, e := range miniblock.events {
		if _, ok := remaining[e.Hash]; ok {
			delete(remaining, e.Hash)
		} else {
			return nil, RiverError(Err_BAD_BLOCK, "streamViewImpl: block event not found", "stream", r.streamId, "event_hash", FormatHash(e.Hash))
		}
	}

	minipoolEvents := NewOrderedMap[common.Hash, *ParsedEvent](len(remaining))
	for _, e := range r.minipool.events.Values {
		if _, ok := remaining[e.Hash]; ok {
			minipoolEvents.Set(e.Hash, e)
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

	return &streamViewImpl{
		streamId:      r.streamId,
		blocks:        append(r.blocks[startIndex:], miniblock),
		minipool:      newMiniPoolInstance(minipoolEvents, generation, eventNumOffset),
		snapshot:      snapshot,
		snapshotIndex: snapshotIndex,
	}, nil
}

func (r *streamViewImpl) StreamId() *StreamId {
	return &r.streamId
}

func (r *streamViewImpl) InceptionPayload() IsInceptionPayload {
	return r.snapshot.GetInceptionPayload()
}

func (r *streamViewImpl) indexOfMiniblockWithNum(mininblockNum int64) (int, error) {
	if len(r.blocks) > 0 {
		diff := int(mininblockNum - r.blocks[0].header().MiniblockNum)
		if diff >= 0 && diff < len(r.blocks) {
			if r.blocks[diff].header().MiniblockNum != mininblockNum {
				return 0, RiverError(
					Err_INTERNAL,
					"indexOfMiniblockWithNum block number mismatch",
					"requested",
					mininblockNum,
					"actual",
					r.blocks[diff].header().MiniblockNum,
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
			r.blocks[0].header().MiniblockNum,
			"max",
			r.blocks[len(r.blocks)-1].header().MiniblockNum,
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

// iterate over events starting at startBlock including events in the minipool
func (r *streamViewImpl) forEachEvent(
	startBlock int,
	op func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error),
) error {
	if startBlock < 0 || startBlock > len(r.blocks) {
		return RiverError(Err_INVALID_ARGUMENT, "iterateEvents: bad startBlock", "startBlock", startBlock)
	}

	for i := startBlock; i < len(r.blocks); i++ {
		err := r.blocks[i].forEachEvent(op)
		if err != nil {
			return err
		}
	}
	err := r.minipool.forEachEvent(op)
	return err
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
	_ = r.minipool.forEachEvent(func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		envelopes = append(envelopes, e.Envelope)
		return true, nil
	})
	return envelopes
}

func (r *streamViewImpl) MiniblocksFromLastSnapshot() []*Miniblock {
	miniblocks := make([]*Miniblock, 0, len(r.blocks)-r.snapshotIndex)
	for i := r.snapshotIndex; i < len(r.blocks); i++ {
		miniblocks = append(miniblocks, r.blocks[i].Proto)
	}
	return miniblocks
}

func (r *streamViewImpl) SyncCookie(localNodeAddress common.Address) *SyncCookie {
	return &SyncCookie{
		NodeAddress:       localNodeAddress.Bytes(),
		StreamId:          r.streamId[:],
		MinipoolGen:       r.minipool.generation,
		MinipoolSlot:      int64(r.minipool.events.Len()),
		PrevMiniblockHash: r.LastBlock().headerEvent.Hash[:],
	}
}

func (r *streamViewImpl) shouldSnapshot(ctx context.Context, cfg crypto.OnChainConfiguration) bool {
	minEventsPerSnapshot, err := cfg.GetMinEventsPerSnapshot(r.streamId.Type())
	if err != nil {
		dlog.FromCtx(ctx).Error("Unable to determine minimum events per snapshot",
			"streamType", fmt.Sprintf("%x", r.streamId[0]), "err", err)
		return false
	}

	count := 0
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

func (r *streamViewImpl) ValidateNextEvent(
	ctx context.Context,
	cfg crypto.OnChainConfiguration,
	parsedEvent *ParsedEvent,
	currentTime time.Time,
) error {
	// the preceding miniblock hash should reference a recent block
	// the event should not already exist in any block after the preceding miniblock
	// the event should not exist in the minipool
	foundBlockAt := -1
	// loop over blocks backwards to find block with preceding miniblock hash
	for i := len(r.blocks) - 1; i >= 0; i-- {
		block := r.blocks[i]
		if bytes.Equal(block.headerEvent.Hash[:], parsedEvent.Event.PrevMiniblockHash) {
			foundBlockAt = i
			break
		}
	}
	// ensure that we found it
	if foundBlockAt == -1 {
		return RiverError(
			Err_BAD_PREV_MINIBLOCK_HASH,
			"prevMiniblockHash not found in recent blocks",
			"event",
			parsedEvent.ShortDebugStr(),
			"expected",
			FormatFullHash(r.LastBlock().headerEvent.Hash),
		)
	}
	// make sure we're recent
	// if the user isn't adding the latest block, allow it if the block after was recently created
	if foundBlockAt < len(r.blocks)-1 && !r.isRecentBlock(ctx, cfg, r.blocks[foundBlockAt+1], currentTime) {
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
		for _, e := range block.events {
			if e.Hash == parsedEvent.Hash {
				return RiverError(
					Err_DUPLICATE_EVENT,
					"event already exists in block",
					"event",
					parsedEvent.ShortDebugStr(),
				)
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
			)
		}
	}
	// success
	return nil
}

func (r *streamViewImpl) isRecentBlock(
	ctx context.Context,
	cfg crypto.OnChainConfiguration,
	block *MiniblockInfo,
	currentTime time.Time,
) bool {
	ageSec, err := cfg.GetInt64(crypto.StreamRecencyConstraintsAgeSecConfigKey)
	if err != nil {
		ageSec = 5
	}

	maxAgeDuration := time.Duration(ageSec) * time.Second
	if maxAgeDuration == 0 {
		maxAgeDuration = 5 * time.Second
	}
	diff := currentTime.Sub(block.header().Timestamp.AsTime())
	return diff <= maxAgeDuration
}

func (r *streamViewImpl) GetStats() StreamViewStats {
	stats := StreamViewStats{
		FirstMiniblockNum: r.blocks[0].Num,
		LastMiniblockNum:  r.LastBlock().Num,
		EventsInMinipool:  r.minipool.events.Len(),
	}

	for _, block := range r.blocks {
		stats.EventsInMiniblocks += len(block.events) + 1 // +1 for header
		if block.header().Snapshot != nil {
			stats.SnapshotsInMiniblocks++
		}
	}

	stats.TotalEventsEver = int(r.blocks[r.snapshotIndex].header().EventNumOffset)
	for _, block := range r.blocks[r.snapshotIndex:] {
		stats.TotalEventsEver += len(block.events) + 1 // +1 for header
	}
	stats.TotalEventsEver += r.minipool.events.Len()

	return stats
}

func (r *streamViewImpl) IsMember(userAddress []byte) (bool, error) {
	membership, err := r.GetMembership(userAddress)
	if err != nil {
		return false, err
	}
	return membership == MembershipOp_SO_JOIN, nil
}

func (r *streamViewImpl) StreamParentId() *StreamId {
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
