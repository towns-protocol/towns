package events

import (
	"bytes"
	. "casablanca/node/base"
	. "casablanca/node/crypto"
	"casablanca/node/dlog"
	. "casablanca/node/protocol"
	"casablanca/node/storage"
	. "casablanca/node/utils"
	"context"
	"encoding/hex"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
)

type StreamView interface {
	StreamId() string
	InceptionPayload() IsInceptionPayload
	LastEvent() *ParsedEvent
	MinipoolEnvelopes() []*Envelope
	MiniblocksFromLastSnapshot() []*Miniblock
	SyncCookie() *SyncCookie
}

type JoinableStreamView interface {
	StreamView
	JoinedUsers() (map[string]struct{}, error)
}

type UserDeviceStreamView interface {
	StreamView
	// the set of river device key ids that are revoked
	// river device id is a 256 bit keccak hash of the RDK's public key
	IsDeviceIdRevoked(rdkId RdkId) (bool, error)
}

func MakeStreamView(preceedingMiniblocks [][]byte, streamData *storage.GetStreamFromLastSnapshotResult) (*streamViewImpl, error) {
	// TODO: make sure both client and node can init from snapshot and remove preceedingMiniblocks param.
	if len(preceedingMiniblocks) != streamData.StartMiniblockNumber {
		return nil, RpcErrorf(Err_STREAM_BAD_EVENT, "MakeStreamView: not enogh preceeding blocks")
	}

	if len(streamData.Miniblocks) <= 0 {
		return nil, RpcErrorf(Err_STREAM_EMPTY, "MakeStreamView: no blocks")
	}

	allBlocks := preceedingMiniblocks
	if len(preceedingMiniblocks) == 0 {
		allBlocks = streamData.Miniblocks
	} else {
		allBlocks = append(allBlocks, streamData.Miniblocks...)
	}

	miniblocks := make([]*miniblockInfo, len(allBlocks))
	for i, binMiniblock := range allBlocks {
		miniblock, err := NewMiniblockInfoFromBytes(binMiniblock)
		if err != nil {
			return nil, err
		}
		miniblocks[i] = miniblock
	}

	snapshot := miniblocks[streamData.StartMiniblockNumber].headerEvent.Event.GetMiniblockHeader().GetSnapshot()
	if snapshot == nil {
		return nil, RpcErrorf(Err_STREAM_BAD_EVENT, "MakeStreamView: no snapshot")
	}
	streamId := snapshot.GetInceptionPayload().GetStreamId()
	if streamId == "" {
		return nil, RpcErrorf(Err_STREAM_BAD_EVENT, "MakeStreamView: no streamId")
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
		minipool:      newMiniPoolInstance(minipoolEvents),
		snapshot:      snapshot,
		snapshotIndex: streamData.StartMiniblockNumber,
	}, nil
}

type streamViewImpl struct {
	streamId string

	firstBlockNum int
	blocks        []*miniblockInfo
	minipool      *minipoolInstance
	snapshot      *Snapshot
	snapshotIndex int
}

func (r *streamViewImpl) GetMinipoolGeneration() int {
	return r.firstBlockNum + len(r.blocks)
}

func (r *streamViewImpl) copyAndAddEvent(event *ParsedEvent) (*streamViewImpl, error) {
	if event.Event.GetMiniblockHeader() != nil {
		return nil, RpcError(Err_BAD_EVENT, "streamViewImpl: block event not allowed")
	}

	// TODO: HNT-1843: Re-enable block-aware event duplicate checks
	// There is a need to reject duplicate events, but there is no efficient way to do it without scanning
	// all blocks (and minipool). Also, this doesn't work in presense of snapshots.
	// The fix for this is to allow events to be added only if they reference "recent" block and
	// to check only recent blocks for duplicates.

	r = &streamViewImpl{
		streamId:      r.streamId,
		firstBlockNum: r.firstBlockNum,
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
	if r.shouldSnapshot() {
		snapshot = proto.Clone(r.snapshot).(*Snapshot)
		events := r.eventsSinceLastSnapshot()
		for _, e := range events {
			err := Update_Snapshot(snapshot, e)
			if err != nil {
				log.Error("Failed to update snapshot",
					"error", err,
					"streamId", r.streamId,
					"event", e.ShortDebugStr(),
				)
			}
		}
	}

	last := r.lastBlock()
	return &MiniblockHeader{
		MiniblockNum:      last.header().MiniblockNum + 1,
		Timestamp:         NextMiniblockTimestamp(last.header().Timestamp),
		EventHashes:       hashes,
		PrevMiniblockHash: last.headerEvent.Hash,
		Snapshot:          snapshot,
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
		return nil, RpcErrorf(Err_INTERNAL_ERROR, "streamViewImpl: non block event not allowed, stream=%s, event=%s", r.streamId, miniblock.headerEvent.ShortDebugStr())
	}

	lastBlock := r.lastBlock()
	if header.MiniblockNum != lastBlock.header().MiniblockNum+1 {
		return nil, RpcErrorf(Err_BAD_BLOCK, "streamViewImpl: block number mismatch, expected=%d, actual=%d", lastBlock.header().MiniblockNum+1, header.MiniblockNum)
	}
	if !bytes.Equal(lastBlock.headerEvent.Hash, header.PrevMiniblockHash) {
		return nil, RpcErrorf(Err_BAD_BLOCK, "streamViewImpl: block hash mismatch, expected=%s, actual=%s", FormatHashFromString(string(lastBlock.headerEvent.Hash)), FormatHashFromString(string(header.PrevMiniblockHash)))
	}

	remaining := make(map[string]*ParsedEvent, MaxInt_(r.minipool.events.Len()-len(header.EventHashes), 0))
	for k, v := range r.minipool.events.Map {
		remaining[k] = v
	}

	for _, e := range miniblock.events {
		if _, ok := remaining[e.HashStr]; ok {
			delete(remaining, e.HashStr)
		} else {
			return nil, RpcErrorf(Err_BAD_BLOCK, "streamViewImpl: block event not found, stream=%s, event_hash=%s", r.streamId, FormatHashFromString(e.HashStr))
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
		firstBlockNum: r.firstBlockNum,
		blocks:        append(r.blocks, miniblock),
		minipool:      newMiniPoolInstance(minipoolEvents),
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

func (r *streamViewImpl) forEachEvent(startBlock int, op func(e *ParsedEvent) (bool, error)) error {
	if startBlock < 0 || startBlock > len(r.blocks) {
		return RpcErrorf(Err_BAD_ARGS, "iterateEvents: bad startBlock, startBlock=%d", startBlock)
	}

	for i := startBlock; i < len(r.blocks); i++ {
		err := r.blocks[i].forEachEvent(op)
		if err != nil {
			return err
		}
	}
	return r.minipool.forEachEvent(op)
}

func (r *streamViewImpl) JoinedUsers() (map[string]struct{}, error) {
	users := make(map[string]struct{})

	_ = r.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_SpacePayload:
			switch spacePayload := payload.SpacePayload.Content.(type) {
			case *SpacePayload_Membership:
				user := spacePayload.Membership.UserId
				if spacePayload.Membership.GetOp() == MembershipOp_SO_JOIN {
					users[user] = struct{}{}
				} else if spacePayload.Membership.GetOp() == MembershipOp_SO_LEAVE {
					delete(users, user)
				}
			default:
				break
			}
		case *StreamEvent_ChannelPayload:
			switch channelPayload := payload.ChannelPayload.Content.(type) {
			case *ChannelPayload_Membership:
				user := channelPayload.Membership.UserId
				if channelPayload.Membership.GetOp() == MembershipOp_SO_JOIN {
					users[user] = struct{}{}
				} else if channelPayload.Membership.GetOp() == MembershipOp_SO_LEAVE {
					delete(users, user)
				}
			default:
				break
			}
		}
		return true, nil
	})

	return users, nil
}

func (r *streamViewImpl) IsDeviceIdRevoked(rdkId RdkId) (bool, error) {
	isRevoked := false
	_ = r.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_UserDeviceKeyPayload:
			switch devicePayload := payload.UserDeviceKeyPayload.Content.(type) {
			case *UserDeviceKeyPayload_UserDeviceKey_:
				deviceKeys := devicePayload.UserDeviceKey.GetDeviceKeys()
				deviceId, err := hex.DecodeString(deviceKeys.DeviceId)
				if err != nil {
					return false, err
				}
				eventRdkId, err := RdkIdFromSlice(deviceId)
				if err != nil {
					return false, err
				}
				switch devicePayload.UserDeviceKey.GetRiverKeyOp() {
				case RiverKeyOp_RDKO_KEY_REVOKE:
					if eventRdkId == rdkId {
						isRevoked = true
						return false, nil
					}
				default:
					break
				}
			}
		default:
			break
		}
		return true, nil
	})

	return isRevoked, nil
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

func (r *streamViewImpl) SyncCookie() *SyncCookie {
	// TODO: create once and re-use.
	return &SyncCookie{
		StreamId:         r.streamId,
		MiniblockNum:     int64(len(r.blocks)),
		MiniblockHash:    r.lastBlock().headerEvent.Hash,
		MinipoolInstance: r.minipool.instance,
		MinipoolSlot:     int64(r.minipool.events.Len()),
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
