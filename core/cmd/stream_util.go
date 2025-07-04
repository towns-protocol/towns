package cmd

import (
	"math"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

type streamInfo struct {
	mbsByNum     map[int64]*MiniblockInfo
	mbsByHash    map[common.Hash]*MiniblockInfo
	eventsByHash map[common.Hash]*eventInfo
	minKnownMb   int64
}

type eventInfo struct {
	parsedEvent *ParsedEvent
	mbNum       int64
	pos         int
}

func (si *streamInfo) addMb(mb *MiniblockInfo) error {
	if _, exists := si.mbsByNum[mb.Ref.Num]; exists {
		return RiverError(Err_INTERNAL, "Duplicate miniblock number", "mb", mb.Ref)
	}
	si.mbsByNum[mb.Ref.Num] = mb
	if _, exists := si.mbsByHash[mb.Ref.Hash]; exists {
		return RiverError(Err_INTERNAL, "Duplicate miniblock hash", "mb", mb.Ref)
	}
	si.mbsByHash[mb.Ref.Hash] = mb

	for i, event := range mb.Events() {
		if err := si.addEvent(event, mb.Ref.Num, i); err != nil {
			return err
		}
	}
	if err := si.addEvent(mb.HeaderEvent(), mb.Ref.Num, -1); err != nil {
		return err
	}

	if mb.Ref.Num < si.minKnownMb {
		si.minKnownMb = mb.Ref.Num
	}

	return nil
}

func (si *streamInfo) addMbProtos(mbs []*Miniblock, expectedFirst int64) error {
	var prev *MiniblockInfo
	for _, mb := range mbs {
		opts := NewParsedMiniblockInfoOpts()
		if prev != nil {
			opts = opts.WithExpectedBlockNumber(prev.Ref.Num + 1).WithExpectedPrevMiniblockHash(prev.Ref.Hash)
		} else if expectedFirst > -1 {
			opts = opts.WithExpectedBlockNumber(expectedFirst)
		}
		mbInfo, err := NewMiniblockInfoFromProto(mb, nil, opts)
		if err != nil {
			return err
		}
		if err := si.addMb(mbInfo); err != nil {
			return err
		}
		prev = mbInfo
	}
	if expectedFirst > -1 && prev != nil {
		nextBlockNum := prev.Ref.Num + 1
		if nextBlock, exists := si.mbsByNum[nextBlockNum]; exists {
			if common.Hash(nextBlock.HeaderEvent().Event.PrevMiniblockHash) != prev.Ref.Hash {
				return RiverError(Err_INTERNAL, "Next block's hash doesn't match current block's hash",
					"current_block", prev.Ref.Num,
					"current_hash", prev.Ref.Hash.Hex(),
					"next_block", nextBlockNum,
					"next_hash", nextBlock.HeaderEvent().Hash.Hex())
			}
		} else {
			return RiverError(Err_INTERNAL, "Expected next block not found",
				"current", prev.Ref.Num,
				"expected_next", nextBlockNum)
		}
	}
	return nil
}

func (si *streamInfo) addEvent(event *ParsedEvent, mbNum int64, pos int) error {
	if _, exists := si.eventsByHash[event.Hash]; exists {
		return RiverError(Err_INTERNAL, "Duplicate event hash", "event", event.Hash.Hex())
	}
	si.eventsByHash[event.Hash] = &eventInfo{
		parsedEvent: event,
		mbNum:       mbNum,
		pos:         pos,
	}
	return nil
}

func (si *streamInfo) addEventProto(event *Envelope, mbNum int64, pos int) error {
	parsedEvent, err := ParseEvent(event)
	if err != nil {
		return err
	}
	return si.addEvent(parsedEvent, mbNum, pos)
}

func (si *streamInfo) init(stream *StreamAndCookie) error {
	si.mbsByNum = make(map[int64]*MiniblockInfo)
	si.mbsByHash = make(map[common.Hash]*MiniblockInfo)
	si.eventsByHash = make(map[common.Hash]*eventInfo)
	si.minKnownMb = math.MaxInt64

	if err := si.addMbProtos(stream.Miniblocks, -1); err != nil {
		return err
	}
	for i, event := range stream.Events {
		if err := si.addEventProto(event, -1, i); err != nil {
			return err
		}
	}
	return nil
}

func (si *streamInfo) validateEventMbRefs() error {
	for _, e := range si.eventsByHash {
		event := e.parsedEvent
		if event.MiniblockRef == nil {
			return RiverError(Err_INTERNAL, "Event has no miniblock reference", "event", event.Hash.Hex())
		}
		mb, exists := si.mbsByHash[event.MiniblockRef.Hash]
		if !exists && e.mbNum != 0 {
			return RiverError(Err_INTERNAL, "Event has miniblock reference to non-existent miniblock",
				"event", event.Hash.Hex(), "miniblock", event.MiniblockRef.Hash.Hex())
		}
		if event.MiniblockRef.Num != -1 && mb.Ref.Num != event.MiniblockRef.Num {
			return RiverError(Err_INTERNAL, "Event has miniblock reference to wrong miniblock",
				"event", event.Hash.Hex(), "miniblock", event.MiniblockRef.Hash.Hex(), "expected", event.MiniblockRef.Num, "got", mb.Ref.Num)
		}
	}
	return nil
}
