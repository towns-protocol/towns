package events

import (
	"bytes"
	"encoding/hex"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"
)

func Make_GenesisMiniblockHeader(parsedEvents []*ParsedEvent) (*MiniblockHeader, error) {
	if len(parsedEvents) <= 0 {
		return nil, RiverError(Err_STREAM_EMPTY, "no events to make genisis miniblock header")
	}
	if parsedEvents[0].Event.GetInceptionPayload() == nil {
		return nil, RiverError(Err_STREAM_NO_INCEPTION_EVENT, "first event must be inception event")
	}
	for _, event := range parsedEvents[1:] {
		if event.Event.GetInceptionPayload() != nil {
			return nil, RiverError(Err_BAD_EVENT, "inception event can only be first event")
		}
		if event.Event.GetMiniblockHeader() != nil {
			return nil, RiverError(Err_BAD_EVENT, "block header can't be a block event")
		}
	}

	snapshot, err := Make_GenesisSnapshot(parsedEvents)
	if err != nil {
		return nil, err
	}

	eventHashes := make([][]byte, len(parsedEvents))
	for i, event := range parsedEvents {
		eventHashes[i] = event.Hash.Bytes()
	}

	return &MiniblockHeader{
		MiniblockNum: 0,
		Timestamp:    NextMiniblockTimestamp(nil),
		EventHashes:  eventHashes,
		Snapshot:     snapshot,
		Content: &MiniblockHeader_None{
			None: &emptypb.Empty{},
		},
	}, nil
}

func MakeGenesisMiniblock(wallet *crypto.Wallet, genesisMiniblockEvents []*ParsedEvent) (*Miniblock, error) {
	header, err := Make_GenesisMiniblockHeader(genesisMiniblockEvents)
	if err != nil {
		return nil, err
	}

	headerEnvelope, err := MakeEnvelopeWithPayload(
		wallet,
		Make_MiniblockHeader(header),
		nil,
	)
	if err != nil {
		return nil, err
	}

	envelopes := make([]*Envelope, len(genesisMiniblockEvents))
	for i, e := range genesisMiniblockEvents {
		envelopes[i] = e.Envelope
	}

	return &Miniblock{
		Events: envelopes,
		Header: headerEnvelope,
	}, nil
}

func NextMiniblockTimestamp(prevBlockTimestamp *timestamppb.Timestamp) *timestamppb.Timestamp {
	now := timestamppb.Now()

	if prevBlockTimestamp != nil {
		if now.Seconds < prevBlockTimestamp.Seconds ||
			(now.Seconds == prevBlockTimestamp.Seconds && now.Nanos <= prevBlockTimestamp.Nanos) {
			now.Seconds = prevBlockTimestamp.Seconds + 1
			now.Nanos = 0
		}
	}

	return now
}

type MiniblockInfo struct {
	Ref                *MiniblockRef
	headerEvent        *ParsedEvent
	useGetterForEvents []*ParsedEvent // Use events(). Getter checks if events have been initialized.
	Proto              *Miniblock
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

func (b *MiniblockInfo) IsSnapshot() bool {
	return b.Header().GetSnapshot() != nil
}

func (b *MiniblockInfo) asStorageMb() (*storage.WriteMiniblockData, error) {
	bytes, err := b.ToBytes()
	if err != nil {
		return nil, err
	}
	return b.asStorageMbWithData(bytes), nil
}

func (b *MiniblockInfo) asStorageMbWithData(bytes []byte) *storage.WriteMiniblockData {
	return &storage.WriteMiniblockData{
		Number:   b.Ref.Num,
		Hash:     b.Ref.Hash,
		Snapshot: b.IsSnapshot(),
		Data:     bytes,
	}
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

func NewMiniblockFromBytesWithOpts(bytes []byte, opts *ParsedMiniblockInfoOpts) (*MiniblockInfo, error) {
	var pb Miniblock
	err := proto.Unmarshal(bytes, &pb)
	if err != nil {
		return nil, AsRiverError(err, Err_INVALID_ARGUMENT).
			Message("Failed to decode miniblock from bytes").
			Func("NewMiniblockInfoFromBytes")
	}

	return NewMiniblockInfoFromProto(&pb, opts)
}

func NewMiniblockInfoFromBytes(bytes []byte, expectedBlockNumber int64) (*MiniblockInfo, error) {
	var pb Miniblock
	err := proto.Unmarshal(bytes, &pb)
	if err != nil {
		return nil, AsRiverError(err, Err_INVALID_ARGUMENT).
			Message("Failed to decode miniblock from bytes").
			Func("NewMiniblockInfoFromBytes")
	}

	opts := NewParsedMiniblockInfoOpts()
	if expectedBlockNumber > -1 {
		opts = opts.WithExpectedBlockNumber(expectedBlockNumber)
	}
	return NewMiniblockInfoFromProto(&pb, opts)
}

func NewMiniblockInfoFromBytesWithOpts(bytes []byte, opts *ParsedMiniblockInfoOpts) (*MiniblockInfo, error) {
	var pb Miniblock
	err := proto.Unmarshal(bytes, &pb)
	if err != nil {
		return nil, AsRiverError(err, Err_INVALID_ARGUMENT).
			Message("Failed to decode miniblock from bytes").
			Func("NewMiniblockInfoFromBytesWithOpts")
	}

	return NewMiniblockInfoFromProto(&pb, opts)
}

type ParsedMiniblockInfoOpts struct {
	// Do not access the following directly, instead use has/getter/setter.
	expectedBlockNumber               *int64
	expectedPrevMiniblockHash         *common.Hash
	expectedEventNumOffset            *int64
	expectedMinimumTimestampExclusive *time.Time
	expectedPrevSnapshotMiniblockNum  *int64
	dontParseEvents                   bool
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

// NewMiniblockInfoFromProto initializes a MiniblockInfo from a proto, applying validation based
// on whatever is set in the opts. If an empty opts is passed in, the method will still perform
// some minimal validation if the requested miniblock is block 0.
func NewMiniblockInfoFromProto(pb *Miniblock, opts *ParsedMiniblockInfoOpts) (*MiniblockInfo, error) {
	headerEvent, err := ParseEvent(pb.Header)
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
	if len(blockHeader.EventHashes) != len(pb.Events) {
		return nil, RiverError(
			Err_BAD_BLOCK,
			"Length of events in block does not match length of event hashes in header",
		).Func("NewMiniblockInfoFromProto").
			Tag("eventHashesLength", len(blockHeader.EventHashes)).
			Tag("eventsLength", len(pb.Events))
	}

	var events []*ParsedEvent
	if !opts.DoNotParseEvents() {
		events, err = ParseEvents(pb.Events)
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

	// TODO: snapshot validation if requested
	// (How to think about versioning?)

	return &MiniblockInfo{
		Ref: &MiniblockRef{
			Hash: headerEvent.Hash,
			Num:  blockHeader.MiniblockNum,
		},
		headerEvent:        headerEvent,
		useGetterForEvents: events,
		Proto:              pb,
	}, nil
}

func NewMiniblocksInfoFromProtos(pbs []*Miniblock, opts *ParsedMiniblockInfoOpts) ([]*MiniblockInfo, error) {
	var err error
	mbs := make([]*MiniblockInfo, len(pbs))
	for i, pb := range pbs {
		o := opts
		mbs[i], err = NewMiniblockInfoFromProto(pb, o)
		if o.HasExpectedBlockNumber() {
			o.WithExpectedBlockNumber(o.GetExpectedBlockNumber() + 1)
		}
		if err != nil {
			return nil, AsRiverError(err, Err_BAD_BLOCK).Func("NewMiniblockInfoFromProtos").Tag("ithBlock", i)
		}
	}
	return mbs, nil
}

func NewMiniblockInfoFromParsed(headerEvent *ParsedEvent, events []*ParsedEvent) (*MiniblockInfo, error) {
	if headerEvent.Event.GetMiniblockHeader() == nil {
		return nil, RiverError(Err_BAD_EVENT, "header event must be a block header")
	}

	envelopes := make([]*Envelope, len(events))
	for i, e := range events {
		envelopes[i] = e.Envelope
	}

	return &MiniblockInfo{
		Ref: &MiniblockRef{
			Hash: headerEvent.Hash,
			Num:  headerEvent.Event.GetMiniblockHeader().MiniblockNum,
		},
		headerEvent:        headerEvent,
		useGetterForEvents: events,
		Proto: &Miniblock{
			Header: headerEvent.Envelope,
			Events: envelopes,
		},
	}, nil
}

func NewMiniblockInfoFromHeaderAndParsed(
	wallet *crypto.Wallet,
	header *MiniblockHeader,
	events []*ParsedEvent,
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

	return NewMiniblockInfoFromParsed(headerEvent, events)
}

func (b *MiniblockInfo) ToBytes() ([]byte, error) {
	serialized, err := proto.Marshal(b.Proto)
	if err == nil {
		return serialized, nil
	}
	return nil, AsRiverError(err, Err_INTERNAL).
		Message("Failed to serialize miniblockinfo to bytes").
		Func("ToBytes")
}
