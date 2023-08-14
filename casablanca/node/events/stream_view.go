package events

import (
	"bytes"
	. "casablanca/node/base"
	. "casablanca/node/crypto"
	"casablanca/node/dlog"
	. "casablanca/node/protocol"
	. "casablanca/node/utils"
	"context"
	"encoding/hex"
	"fmt"
	"os"
	"runtime/debug"
	"sync"

	"google.golang.org/protobuf/proto"
)

type StreamView interface {
	StreamId() string
	InceptionEvent() *ParsedEvent
	InceptionPayload() IsInceptionPayload
	LastEvent() *ParsedEvent
	Envelopes() []*Envelope
	SyncCookie() *SyncCookie
}

type JoinableStreamView interface {
	StreamView
	JoinedUsers() (map[string]struct{}, error)
}

type UserDeviceStreamView interface {
	StreamView
	RiverDeviceKeys() (map[[TOWNS_HASH_SIZE]byte]struct{}, error)
}

var debugLogMutex = &sync.Mutex{}

func degugLogEvents(events []*ParsedEvent, markEvent string, problem error) {
	debugLogMutex.Lock()
	defer debugLogMutex.Unlock()
	for i, e := range events {
		var marker string
		if e.HashStr == markEvent {
			marker = " <=="
		}
		fmt.Printf("%3d %s%s\n", i, e.ShortDebugStr(), marker)
	}
	fmt.Printf("Error: %s\n", problem.Error())
	if DebugCorruptionExit() {
		fmt.Printf("%s", debug.Stack())
		os.Exit(1)
	}
}

func topologicalSort(events []*ParsedEvent, eventsByHash map[string]*ParsedEvent) (sorted []*ParsedEvent, err error) {
	sorted = make([]*ParsedEvent, 0, len(events))
	visited := make(map[string]bool)

	for _, e := range events {
		if !visited[e.HashStr] {
			visited[e.HashStr] = true
			sorted, err = dfs(e, visited, events, eventsByHash, sorted)
			if err != nil {
				return
			}
		}
	}

	return
}

func dfs(e *ParsedEvent, visited map[string]bool, events []*ParsedEvent, eventsByHash map[string]*ParsedEvent, sorted []*ParsedEvent) ([]*ParsedEvent, error) {
	for _, p := range e.PrevEventStrs {
		if !visited[p] {
			pe := eventsByHash[p]
			if pe == nil {
				err := RpcErrorf(Err_BAD_EVENT, "MakeStreamView: prev event not found, prev_event_hash=%s, event=%s", FormatHashFromString(p), e.ShortDebugStr())
				if DebugCorruptionPrint() {
					fmt.Printf("%d\n", len(eventsByHash))
					degugLogEvents(events, e.HashStr, err)
				}
				return nil, err
			}
			visited[p] = true
			sorted2, err := dfs(pe, visited, events, eventsByHash, sorted)
			if err != nil {
				return nil, err
			}
			sorted = sorted2
		}
	}
	return append(sorted, e), nil
}

func MakeStreamView(envelopes []*Envelope) (*streamViewImpl, error) {
	unsortedEvents, err := ParseEvents(envelopes)
	if err != nil {
		return nil, err
	}
	return MakeStreamViewFromParsedEvents(unsortedEvents)
}

func MakeStreamViewFromParsedEvents(unsortedEvents []*ParsedEvent) (*streamViewImpl, error) {
	// TODO: HNT-1854: Change storage to be block-aware.
	//
	// Currently this function reconstructs blocks from flat events, since this is what current
	// storage implemntation returns. In the future storage will be updated to represent blocks
	// and minipool directly, and this function will be updated to use them.
	//
	// Currently storage returns events in non-append order, so we need to sort them.

	if len(unsortedEvents) <= 0 {
		return nil, RpcErrorf(Err_STREAM_EMPTY, "MakeStreamView: No events")
	}

	eventsByHash := make(map[string]*ParsedEvent)

	for _, e := range unsortedEvents {
		if _, ok := eventsByHash[e.HashStr]; !ok {
			eventsByHash[e.HashStr] = e
		} else {
			err := RpcErrorf(Err_DUPLICATE_EVENT, "MakeStreamView: Duplicate event hash, event=%s", e.ShortDebugStr())
			if DebugCorruptionPrint() {
				degugLogEvents(unsortedEvents, e.HashStr, err)
			}
			return nil, err
		}
	}

	events, err := topologicalSort(unsortedEvents, eventsByHash)
	if err != nil {
		return nil, err
	}

	if events[0].Event.GetInceptionPayload() == nil {
		return nil, RpcErrorf(Err_BAD_EVENT, "MakeStreamView: First event is not inception")
	}

	streamId := events[0].Event.GetInceptionPayload().GetStreamId()

	var snapshot *Snapshot
	blocks := make([]*miniblockInfo, 0, len(events)/8)
	for _, event := range events {
		header := event.Event.GetMiniblockHeader()
		if header != nil {
			if header.MiniblockNum != int64(len(blocks)) {
				return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: block number mismatch, expected=%d, actual=%d", len(blocks), header.MiniblockNum)
			}

			if header.GetSnapshot() != nil {
				snapshot = header.GetSnapshot()
			}

			if len(blocks) > 0 {
				if header.PrevMiniblockHash == nil {
					return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: block hash is nil, block=%s", event.ShortDebugStr())
				}
				if !bytes.Equal(blocks[len(blocks)-1].headerEvent.Hash, header.PrevMiniblockHash) {
					return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: block hash mismatch, block=%s", event.ShortDebugStr())
				}
			} else {
				if header.PrevMiniblockHash != nil {
					return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: block hash is not nil, block=%s", event.ShortDebugStr())
				}
			}

			delete(eventsByHash, event.HashStr)

			blockEvents := make([]*ParsedEvent, 0, len(header.EventHashes))
			for _, hash := range header.EventHashes {
				eventHashStr := string(hash)
				e := eventsByHash[eventHashStr]
				if e == nil {
					return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: block event not found, block=%s, event_hash=%s", e.ShortDebugStr(), FormatHashFromString(eventHashStr))
				}
				delete(eventsByHash, eventHashStr)
				blockEvents = append(blockEvents, e)
			}

			blocks = append(blocks, &miniblockInfo{
				headerEvent: event,
				events:      blockEvents,
			})
		}
	}

	if len(blocks) <= 0 {
		return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: No blocks")
	}

	if snapshot == nil {
		return nil, RpcErrorf(Err_BAD_BLOCK, "MakeStreamView: No snapshot")
	}

	// Now eventsByHash contains events that are not in any block, and thus are part of the minipool.
	minipoolEvents := NewOrderedMap[string, *ParsedEvent](len(eventsByHash))
	for _, e := range events {
		if _, ok := eventsByHash[e.HashStr]; ok {
			minipoolEvents.Set(e.HashStr, e)
		}
	}

	return &streamViewImpl{
		streamId: streamId,
		blocks:   blocks,
		minipool: newMiniPoolInstance(minipoolEvents),
		snapshot: snapshot,
	}, nil
}

type streamViewImpl struct {
	streamId string

	blocks   []*miniblockInfo
	minipool *minipoolInstance
	snapshot *Snapshot
}

func (r *streamViewImpl) copyAndAddEvent(event *ParsedEvent) (*streamViewImpl, error) {
	if event.Event.GetMiniblockHeader() != nil {
		return r.copyAndApplyBlock(event)
	}

	// TODO: HNT-1843: Re-enable block-aware event duplicate checks
	// There is a need to reject duplicate events, but there is no efficient way to do it without scanning
	// all blocks (and minipool). Also, this doesn't work in presense of snapshots.
	// The fix for this is to allow events to be added only if they reference "recent" block and
	// to check only recent blocks for duplicates.

	r = &streamViewImpl{
		streamId: r.streamId,
		blocks:   r.blocks,
		minipool: r.minipool.copyAndAddEvent(event),
		snapshot: r.snapshot,
	}
	return r, nil
}

func (r *streamViewImpl) lastBlock() *miniblockInfo {
	return r.blocks[len(r.blocks)-1]
}

func (r *streamViewImpl) makeMiniblockHeader(ctx context.Context) *MiniblockHeader {

	log := dlog.CtxLog(ctx)
	hashes := make([][]byte, 0, r.minipool.events.Len())
	for _, e := range r.minipool.events.Values {
		hashes = append(hashes, e.Hash)
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
	}
}

// In 1.21 there is built-in max! (facepalm)
func MaxInt_(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (r *streamViewImpl) copyAndApplyBlock(headerEvent *ParsedEvent) (*streamViewImpl, error) {
	header := headerEvent.Event.GetMiniblockHeader()
	if header == nil {
		return nil, RpcErrorf(Err_INTERNAL_ERROR, "streamViewImpl: non block event not allowed, stream=%s, event=%s", r.streamId, headerEvent.ShortDebugStr())
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

	eventsInBlock := make([]*ParsedEvent, 0, len(header.EventHashes))
	for _, hash := range header.EventHashes {
		eventHashStr := string(hash)
		if e, ok := remaining[eventHashStr]; ok {
			eventsInBlock = append(eventsInBlock, e)
			delete(remaining, eventHashStr)
		} else {
			return nil, RpcErrorf(Err_BAD_BLOCK, "streamViewImpl: block event not found, stream=%s, event_hash=%s", r.streamId, FormatHashFromString(eventHashStr))
		}
	}

	minipoolEvents := NewOrderedMap[string, *ParsedEvent](len(remaining))
	for _, e := range r.minipool.events.Values {
		if _, ok := remaining[e.HashStr]; ok {
			minipoolEvents.Set(e.HashStr, e)
		}
	}

	var snapshot *Snapshot
	if header.Snapshot != nil {
		snapshot = header.Snapshot
	} else {
		snapshot = r.snapshot
	}

	return &streamViewImpl{
		streamId: r.streamId,
		blocks:   append(r.blocks, &miniblockInfo{headerEvent: headerEvent, events: eventsInBlock}),
		minipool: newMiniPoolInstance(minipoolEvents),
		snapshot: snapshot,
	}, nil
}

func (r *streamViewImpl) StreamId() string {
	return r.streamId
}

func (r *streamViewImpl) InceptionEvent() *ParsedEvent {
	return r.blocks[0].events[0]
}

func (r *streamViewImpl) InceptionPayload() IsInceptionPayload {
	return r.InceptionEvent().Event.GetInceptionPayload()
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

func (r *streamViewImpl) RiverDeviceIds() (map[[TOWNS_HASH_SIZE]byte]interface{}, error) {
	ids := make(map[[TOWNS_HASH_SIZE]byte]interface{})

	_ = r.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_UserDeviceKeyPayload:
			switch devicePayload := payload.UserDeviceKeyPayload.Content.(type) {
			case *UserDeviceKeyPayload_UserDeviceKey_:
				if deviceKeys := devicePayload.UserDeviceKey.GetDeviceKeys(); ids != nil {
					deviceId, err := hex.DecodeString(deviceKeys.DeviceId)
					if err != nil {
						return false, err
					}
					if len(deviceId) != TOWNS_HASH_SIZE {
						return false, RpcErrorf(Err_BAD_ARGS, "riverDeviceIds: bad deviceId, deviceId=%v", deviceId)
					}
					rdkId := [TOWNS_HASH_SIZE]byte(deviceId)
					switch devicePayload.UserDeviceKey.GetRiverKeyOp() {
					case RiverKeyOp_RDKO_KEY_REGISTER:
						ids[rdkId] = struct{}{}
					case RiverKeyOp_RDKO_KEY_REVOKE:
						delete(ids, rdkId)
					default:
						break
					}
				}
			}
		default:
			break
		}
		return true, nil
	})

	return ids, nil
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

func (r *streamViewImpl) Envelopes() []*Envelope {
	envelopes := make([]*Envelope, 0, len(r.blocks)*8)
	_ = r.forEachEvent(0, func(e *ParsedEvent) (bool, error) {
		envelopes = append(envelopes, e.Envelope)
		return true, nil
	})
	return envelopes
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
	// find index of oldest block without snapshot
	lastSnapshotBlockIndex := len(r.blocks)
	for i := len(r.blocks) - 1; i >= 0; i-- {
		block := r.blocks[i]
		if block.header().Snapshot != nil {
			break
		}
		lastSnapshotBlockIndex = i
	}
	// add events from blocks without snapshot
	for i := lastSnapshotBlockIndex; i < len(r.blocks); i++ {
		block := r.blocks[i]
		returnVal = append(returnVal, block.events...)
	}
	// add the minipool
	returnVal = append(returnVal, r.minipool.events.Values...)
	return returnVal
}
