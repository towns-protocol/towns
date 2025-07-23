package events

import (
	"bytes"
	"encoding/hex"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

type MiniblockInfo struct {
	Ref   *MiniblockRef
	Proto *Miniblock

	// Snapshot is not nil if this miniblock has associated snapshot.
	// If SnapshotEvelope was provided, Snapshot is set to the snapshot from the envelope.
	// For legacy snapshots, Snapshot is set to the snapshot from the header.
	Snapshot *Snapshot

	// SnapshotEnvelope is not nil if this miniblock has associated snapshot envelope.
	// Hash of the snapshot envelope matches hash in the miniblock header.
	// SnapshotEnvelope is nil for miniblocks with legacy snapshots that are stored in the header.
	SnapshotEnvelope *Envelope

	headerEvent        *ParsedEvent
	useGetterForEvents []*ParsedEvent // Use events(). Getter checks if events have been initialized.
}

// NewMiniblockInfoFromProto initializes a MiniblockInfo from a proto, applying validation based
// on whatever is set in the opts. If an empty opts is passed in, the method will still perform
// some minimal validation to confirm that event counts between the header and body match.
//
// If snapshotEnvelope is provided, behaviour is controlled by the ApplyOnlyMatchingSnapshot and
// SkipSnapshotValidation options:
//
// 1. If ApplyOnlyMatchingSnapshot is true, the snapshotEnvelope is only used if the hash in the
// miniblock header matches the hash in the snapshotEnvelope.
//
// 2. If SkipSnapshotValidation is false, the snapshotEnvelope hash should match the hash in the
// miniblock header.
func NewMiniblockInfoFromProto(
	mbProto *Miniblock,
	snapshotEnvelope *Envelope,
	opts *ParsedMiniblockInfoOpts,
) (*MiniblockInfo, error) {
	headerEvent, err := ParseEvent(mbProto.Header)
	if err != nil {
		return nil, AsRiverError(
			err,
			Err_BAD_EVENT,
		).Message("Error parsing header event").
			Func("NewMiniblockInfoFromProto")
	}

	blockHeader := headerEvent.Event.GetMiniblockHeader()
	if blockHeader == nil {
		return nil, RiverError(Err_BAD_EVENT, "Header event must be a block header").Func("NewMiniblockInfoFromProto")
	}

	if opts.HasExpectedBlockNumber() && blockHeader.MiniblockNum != opts.GetExpectedBlockNumber() {
		return nil, RiverError(Err_BAD_BLOCK_NUMBER, "block number does not equal expected").
			Func("NewMiniblockInfoFromProto").
			Tag("expected", opts.GetExpectedBlockNumber()).
			Tag("actual", blockHeader.MiniblockNum)
	}

	// Validate the number of events matches event hashes
	// We will validate that the hashes match if the events are parsed.
	if len(blockHeader.EventHashes) != len(mbProto.Events) {
		return nil, RiverError(
			Err_BAD_BLOCK,
			"Length of events in block does not match length of event hashes in header",
		).Func("NewMiniblockInfoFromProto").
			Tag("eventHashesLength", len(blockHeader.EventHashes)).
			Tag("eventsLength", len(mbProto.Events))
	}

	var events []*ParsedEvent
	if !opts.DoNotParseEvents() {
		events, err = ParseEvents(mbProto.Events)
		if err != nil {
			return nil, AsRiverError(err, Err_BAD_EVENT_HASH).Func("NewMiniblockInfoFromProto")
		}

		// Validate event hashes match the hashes stored in the header.
		for i, event := range events {
			if event.Hash != common.Hash(blockHeader.EventHashes[i]) {
				return nil, RiverError(
					Err_BAD_BLOCK,
					"Block event hash did not match hash in header",
				).Func("NewMiniblockInfoFromProto").
					Tag("eventIndex", i).
					Tag("blockEventHash", event.Hash).
					Tag("headerEventHash", blockHeader.EventHashes[i])
			}
		}
	}

	if opts.HasExpectedPrevMiniblockHash() {
		expectedHash := opts.GetExpectedPrevMiniblockHash()
		// In the case of block 0, the last miniblock hash should be unset on the block,
		// meaning a byte array of 0 length, but the opts signify the unset value with a zero
		// common.Hash value. Otherwise, we expect the bytes to match.
		if !bytes.Equal(expectedHash[:], blockHeader.PrevMiniblockHash) &&
			(expectedHash != common.Hash{} || len(blockHeader.PrevMiniblockHash) != 0) {
			return nil, RiverError(
				Err_BAD_BLOCK,
				"Last miniblock hash does not equal expected",
			).Func("NewMiniblockInfoFromProto").
				Tag("expectedLastMiniblockHash", opts.GetExpectedPrevMiniblockHash()).
				Tag("prevMiniblockHash", hex.EncodeToString(blockHeader.PrevMiniblockHash))
		}
	}

	if opts.HasExpectedEventNumOffset() &&
		opts.GetExpectedEventNumOffset() != blockHeader.EventNumOffset {
		return nil, RiverError(
			Err_BAD_BLOCK,
			"Miniblock header eventNumOffset does not equal expected",
		).Func("NewMiniblockInfoFromProto").
			Tag("expectedEventNumOffset", opts.GetExpectedEventNumOffset()).
			Tag("eventNumOffset", blockHeader.EventNumOffset)
	}

	if opts.HasExpectedMinimumTimestampExclusive() &&
		!blockHeader.Timestamp.AsTime().After(opts.GetExpectedMinimumTimestampExclusive()) {
		return nil, RiverError(
			Err_BAD_BLOCK,
			"Expected header timestamp to occur after minimum time",
		).Func("NewMiniblockInfoFromProto").
			Tag("headerTimestamp", blockHeader.Timestamp.AsTime()).
			Tag("minimumTimeExclusive", opts.GetExpectedMinimumTimestampExclusive())
	}

	if opts.HasExpectedPrevSnapshotMiniblockNum() &&
		blockHeader.GetPrevSnapshotMiniblockNum() != opts.GetExpectedPrevSnapshotMiniblockNum() {
		return nil, RiverError(
			Err_BAD_BLOCK,
			"Previous snapshot miniblock num did not match expected",
		).Func("NewMiniblockInfoFromProto").
			Tag("expectedPrevSnapshotMiniblockNum", opts.GetExpectedPrevSnapshotMiniblockNum()).
			Tag("prevSnapshotMiniblockNum", blockHeader.PrevSnapshotMiniblockNum)
	}

	if opts.ApplyOnlyMatchingSnapshot() && snapshotEnvelope != nil {
		if !bytes.Equal(snapshotEnvelope.Hash, blockHeader.GetSnapshotHash()) {
			snapshotEnvelope = nil
		}
	}

	var snapshot *Snapshot
	if snapshotEnvelope != nil {
		snapshot, err = ParseSnapshot(snapshotEnvelope, common.BytesToAddress(headerEvent.Event.CreatorAddress))
		if err != nil {
			return nil, AsRiverError(err, Err_BAD_EVENT).
				Message("Failed to parse snapshot").
				Func("NewMiniblockInfoFromProto")
		}
	} else if blockHeader.GetSnapshot() != nil {
		snapshot = blockHeader.GetSnapshot()
	}

	if !opts.SkipSnapshotValidation() && !opts.ApplyOnlyMatchingSnapshot() {
		expectedHash := blockHeader.GetSnapshotHash()
		if snapshotEnvelope != nil {
			if !bytes.Equal(snapshotEnvelope.Hash, expectedHash) {
				return nil, RiverError(
					Err_BAD_BLOCK,
					"Snapshot hash does not match snapshot envelope hash",
				).Func("NewMiniblockInfoFromProto").
					Tag("snapshotHash", hex.EncodeToString(blockHeader.GetSnapshotHash())).
					Tag("snapshotEnvelopeHash", hex.EncodeToString(snapshotEnvelope.Hash)).
					Tag("mbNum", blockHeader.MiniblockNum)
			}
		} else if len(expectedHash) != 0 {
			return nil, RiverError(
				Err_BAD_BLOCK,
				"Snapshot hash is set in the miniblock header, but no snapshot envelope is provided",
			).Func("NewMiniblockInfoFromProto").
				Tag("mbNum", blockHeader.MiniblockNum)
		}
	}

	return &MiniblockInfo{
		Ref: &MiniblockRef{
			Hash: headerEvent.Hash,
			Num:  blockHeader.MiniblockNum,
		},
		Proto:              mbProto,
		Snapshot:           snapshot,
		SnapshotEnvelope:   snapshotEnvelope,
		headerEvent:        headerEvent,
		useGetterForEvents: events,
	}, nil
}

func NewMiniblockInfoFromParsed(
	headerEvent *ParsedEvent,
	events []*ParsedEvent,
	parsedSnapshot *ParsedSnapshot,
) (*MiniblockInfo, error) {
	if headerEvent.Event.GetMiniblockHeader() == nil {
		return nil, RiverError(Err_BAD_EVENT, "header event must be a block header")
	}

	envelopes := make([]*Envelope, len(events))
	for i, e := range events {
		envelopes[i] = e.Envelope
	}

	var snapshot *Snapshot
	var snapshotEnvelope *Envelope
	if parsedSnapshot != nil {
		snapshot = parsedSnapshot.Snapshot
		snapshotEnvelope = parsedSnapshot.Envelope
	} else if headerEvent.Event.GetMiniblockHeader().GetSnapshot() != nil {
		snapshot = headerEvent.Event.GetMiniblockHeader().GetSnapshot()
	}

	return &MiniblockInfo{
		Ref: &MiniblockRef{
			Hash: headerEvent.Hash,
			Num:  headerEvent.Event.GetMiniblockHeader().MiniblockNum,
		},
		Proto: &Miniblock{
			Header: headerEvent.Envelope,
			Events: envelopes,
		},
		Snapshot:           snapshot,
		SnapshotEnvelope:   snapshotEnvelope,
		headerEvent:        headerEvent,
		useGetterForEvents: events,
	}, nil
}

func NewMiniblockInfoFromHeaderAndParsed(
	wallet *crypto.Wallet,
	header *MiniblockHeader,
	events []*ParsedEvent,
	snapshot *ParsedSnapshot,
) (*MiniblockInfo, error) {
	headerEvent, err := MakeParsedEventWithPayload(
		wallet,
		Make_MiniblockHeader(header),
		&MiniblockRef{
			Hash: common.BytesToHash(header.PrevMiniblockHash),
			Num:  max(header.MiniblockNum-1, 0),
		},
	)
	if err != nil {
		return nil, err
	}

	return NewMiniblockInfoFromParsed(headerEvent, events, snapshot)
}

func NewMiniblockInfoFromDescriptor(mb *storage.MiniblockDescriptor) (*MiniblockInfo, error) {
	opts := NewParsedMiniblockInfoOpts()
	if mb.Number > -1 {
		opts = opts.WithExpectedBlockNumber(mb.Number)
	}
	return NewMiniblockInfoFromDescriptorWithOpts(mb, opts)
}

func NewMiniblockInfoFromDescriptorWithOpts(
	mb *storage.MiniblockDescriptor,
	opts *ParsedMiniblockInfoOpts,
) (*MiniblockInfo, error) {
	var pb Miniblock
	if err := proto.Unmarshal(mb.Data, &pb); err != nil {
		return nil, AsRiverError(err, Err_INVALID_ARGUMENT).
			Message("Failed to decode miniblock from bytes").
			Func("NewMiniblockInfoFromDescriptorWithOpts")
	}

	var snapshot *Envelope
	if len(mb.Snapshot) > 0 {
		snapshot = &Envelope{}
		if err := proto.Unmarshal(mb.Snapshot, snapshot); err != nil {
			return nil, AsRiverError(err, Err_INVALID_ARGUMENT).
				Message("Failed to decode snapshot from bytes").
				Func("NewMiniblockInfoFromDescriptor")
		}
	}

	return NewMiniblockInfoFromProto(&pb, snapshot, opts)
}

func (b *MiniblockInfo) Events() []*ParsedEvent {
	if len(b.useGetterForEvents) == 0 && len(b.Proto.Events) > 0 {
		panic("DontParseEvents option was used, events are not initialized")
	}
	return b.useGetterForEvents
}

func (b *MiniblockInfo) HeaderEvent() *ParsedEvent {
	return b.headerEvent
}

func (b *MiniblockInfo) Header() *MiniblockHeader {
	return b.headerEvent.Event.GetMiniblockHeader()
}

func (b *MiniblockInfo) lastEvent() *ParsedEvent {
	events := b.Events()
	if len(events) > 0 {
		return events[len(events)-1]
	} else {
		return nil
	}
}

// AsStorageMb returns a storage miniblock with the data from the MiniblockInfo.
func (b *MiniblockInfo) AsStorageMb() (*storage.WriteMiniblockData, error) {
	serializedMb, err := proto.Marshal(b.Proto)
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Failed to serialize miniblock info to bytes").
			Func("AsStorageMb")
	}

	// Serialize snapshot if the miniblock header contains a snapshot hash instead of a full snapshot.
	// Here the DB record is controlled by the header, so we need to serialize the snapshot.
	// IMPORTANT: Genesis miniblocks use the legacy format of snapshots.
	var serializedSn []byte
	if b.SnapshotEnvelope != nil && (len(b.Header().GetSnapshotHash()) > 0 && b.Header().GetSnapshot() == nil) {
		if serializedSn, err = proto.Marshal(b.SnapshotEnvelope); err != nil {
			return nil, AsRiverError(err, Err_INTERNAL).
				Message("Failed to serialize snapshot to bytes").
				Func("AsStorageMb")
		}
	} else if b.Header().GetSnapshot() != nil {
		// TODO: Remove it after enabling new snapshot format
		serializedSn = make([]byte, 0)
	}

	return &storage.WriteMiniblockData{
		Number:   b.Ref.Num,
		Hash:     b.Ref.Hash,
		Snapshot: serializedSn,
		Data:     serializedMb,
	}, nil
}

func (b *MiniblockInfo) forEachEvent(
	op func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error),
) (bool, error) {
	blockNum := b.Header().MiniblockNum
	eventNum := b.Header().EventNumOffset
	for _, event := range b.Events() {
		c, err := op(event, blockNum, eventNum)
		eventNum++
		if err != nil || !c {
			return false, err
		}
	}

	c, err := op(b.headerEvent, blockNum, eventNum)
	if err != nil || !c {
		return false, err
	}
	return true, nil
}

type ParsedMiniblockInfoOpts struct {
	// Do not access the following directly, instead use has/getter/setter.
	expectedBlockNumber               *int64
	expectedPrevMiniblockHash         *common.Hash
	expectedEventNumOffset            *int64
	expectedMinimumTimestampExclusive *time.Time
	expectedPrevSnapshotMiniblockNum  *int64
	dontParseEvents                   bool
	skipSnapshotValidation            bool
	applyOnlyMatchingSnapshot         bool
}

func NewParsedMiniblockInfoOpts() *ParsedMiniblockInfoOpts {
	return &ParsedMiniblockInfoOpts{}
}

func (p *ParsedMiniblockInfoOpts) HasExpectedBlockNumber() bool {
	return p.expectedBlockNumber != nil
}

// Do not use this get method without checking the associated has method.
func (p *ParsedMiniblockInfoOpts) GetExpectedBlockNumber() int64 {
	return *p.expectedBlockNumber
}

func (p *ParsedMiniblockInfoOpts) WithExpectedBlockNumber(expectedBlockNumber int64) *ParsedMiniblockInfoOpts {
	p.expectedBlockNumber = &expectedBlockNumber
	return p
}

func (p *ParsedMiniblockInfoOpts) HasExpectedPrevMiniblockHash() bool {
	return p.expectedPrevMiniblockHash != nil
}

// Do not use this get method without checking the associated has method.
func (p *ParsedMiniblockInfoOpts) GetExpectedPrevMiniblockHash() common.Hash {
	return *p.expectedPrevMiniblockHash
}

func (p *ParsedMiniblockInfoOpts) WithExpectedPrevMiniblockHash(hash common.Hash) *ParsedMiniblockInfoOpts {
	p.expectedPrevMiniblockHash = &hash
	return p
}

func (p *ParsedMiniblockInfoOpts) HasExpectedEventNumOffset() bool {
	return p.expectedEventNumOffset != nil
}

// Do not use this get method without checking the associated has method.
func (p *ParsedMiniblockInfoOpts) GetExpectedEventNumOffset() int64 {
	return *p.expectedEventNumOffset
}

func (p *ParsedMiniblockInfoOpts) WithExpectedEventNumOffset(offset int64) *ParsedMiniblockInfoOpts {
	p.expectedEventNumOffset = &offset
	return p
}

func (p *ParsedMiniblockInfoOpts) HasExpectedMinimumTimestampExclusive() bool {
	return p.expectedMinimumTimestampExclusive != nil
}

// Do not use this get method without checking the associated has method.
func (p *ParsedMiniblockInfoOpts) GetExpectedMinimumTimestampExclusive() time.Time {
	return *p.expectedMinimumTimestampExclusive
}

func (p *ParsedMiniblockInfoOpts) WithExpectedMinimumTimestampExclusive(timestamp time.Time) *ParsedMiniblockInfoOpts {
	p.expectedMinimumTimestampExclusive = &timestamp
	return p
}

func (p *ParsedMiniblockInfoOpts) HasExpectedPrevSnapshotMiniblockNum() bool {
	return p.expectedPrevSnapshotMiniblockNum != nil
}

// Do not use this get method without checking the associated has method.
func (p *ParsedMiniblockInfoOpts) GetExpectedPrevSnapshotMiniblockNum() int64 {
	return *p.expectedPrevSnapshotMiniblockNum
}

func (p *ParsedMiniblockInfoOpts) WithExpectedPrevSnapshotMiniblockNum(blockNum int64) *ParsedMiniblockInfoOpts {
	p.expectedPrevSnapshotMiniblockNum = &blockNum
	return p
}

func (p *ParsedMiniblockInfoOpts) WithDoNotParseEvents(doNotParse bool) *ParsedMiniblockInfoOpts {
	p.dontParseEvents = doNotParse
	return p
}

func (p *ParsedMiniblockInfoOpts) DoNotParseEvents() bool {
	return p.dontParseEvents
}

func (p *ParsedMiniblockInfoOpts) WithSkipSnapshotValidation() *ParsedMiniblockInfoOpts {
	p.skipSnapshotValidation = true
	return p
}

func (p *ParsedMiniblockInfoOpts) SkipSnapshotValidation() bool {
	return p.skipSnapshotValidation
}

func (p *ParsedMiniblockInfoOpts) WithApplyOnlyMatchingSnapshot() *ParsedMiniblockInfoOpts {
	p.applyOnlyMatchingSnapshot = true
	return p
}

func (p *ParsedMiniblockInfoOpts) ApplyOnlyMatchingSnapshot() bool {
	return p.applyOnlyMatchingSnapshot
}
