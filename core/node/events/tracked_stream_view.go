package events

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// TrackedStreamView presents an interface that can be used to apply the returned
// data structures of a stream reconciled from another node in order to render an up-to-date
// view of the stream locally.
type TrackedStreamView interface {
	// ApplyBlock applies the block to the internal view, updating the stream with the latest
	// membership if it is a channel.
	ApplyBlock(miniblock *Miniblock, snapshot *Envelope) error

	// ApplyEvent applies the event to the internal view and notifies if the event unseen
	ApplyEvent(ctx context.Context, event *Envelope) error

	// SendEventNotification notifies via the internal callback, but does not apply the event
	// to the internal view state. This method can be used to invoke the callback on events
	// that were added to this streamView via ApplyBlock
	SendEventNotification(ctx context.Context, event *ParsedEvent) error

	// ShouldPersistCookie returns true if this stream's cookie should be persisted for resumption.
	// The default implementation returns false. Services that need cookie persistence (like app registry)
	// should override this method to implement their specific logic.
	ShouldPersistCookie(ctx context.Context) bool
}

// TrackedStreamViewImpl can function on it's own as an object, or can be used as a mixin
// by classes that want to encapsulate it with the required callback.
// TrackedStreamView implements to functionality of applying blocks and events to a wrapped
// stream view, and of notifying via the callback on unseen events.
type TrackedStreamViewImpl struct {
	streamID            shared.StreamId
	view                *StreamView
	cfg                 crypto.OnChainConfiguration
	onNewEvent          func(ctx context.Context, view *StreamView, event *ParsedEvent) error
	shouldPersistCookie func(ctx context.Context, view *StreamView) bool
}

// Init initializes the TrackedStreamView with the given stream and callbacks.
// onNewEvent is called whenever a new event is added to the view, ensuring that the callback is
// never called twice for the same event.
// shouldPersistCookie is an optional callback that determines if the stream's cookie should be persisted.
// If nil, ShouldPersistCookie will return false.
func (ts *TrackedStreamViewImpl) Init(
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *StreamAndCookie,
	onNewEvent func(ctx context.Context, view *StreamView, event *ParsedEvent) error,
	shouldPersistCookie func(ctx context.Context, view *StreamView) bool,
) (*StreamView, error) {
	view, err := MakeRemoteStreamView(stream)
	if err != nil {
		return nil, err
	}

	ts.streamID = streamID
	ts.onNewEvent = onNewEvent
	ts.shouldPersistCookie = shouldPersistCookie
	ts.view = view
	ts.cfg = cfg

	return view, nil
}

// ApplyBlock applies a miniblock to the view, updating internal state.
// IMPORTANT: This does NOT send notifications - blocks contain historical events
// that were already notified when they arrived via ApplyEvent.
// The view's minipool is automatically pruned - events included in the block
// are removed from the minipool (see copyAndApplyBlock).
func (ts *TrackedStreamViewImpl) ApplyBlock(
	miniblock *Miniblock,
	snapshot *Envelope,
) error {
	mb, err := NewMiniblockInfoFromProto(
		miniblock,
		snapshot,
		NewParsedMiniblockInfoOpts().WithApplyOnlyMatchingSnapshot(),
	)
	if err != nil {
		return err
	}

	return ts.applyBlock(mb, ts.cfg.Get())
}

func (ts *TrackedStreamViewImpl) ApplyEvent(
	ctx context.Context,
	event *Envelope,
) error {
	parsedEvent, err := ParseEvent(event)
	if err != nil {
		return err
	}

	// add event calls the message listener on events that have not been added
	// before.
	return ts.addEvent(ctx, parsedEvent)
}

// applyBlock updates the view with a new miniblock.
// Deduplication: skips blocks we've already processed by comparing block numbers.
// The returned view has a pruned minipool - events now in the block are removed.
func (ts *TrackedStreamViewImpl) applyBlock(
	miniblock *MiniblockInfo,
	cfg *crypto.OnChainSettings,
) error {
	// Skip duplicate blocks - already processed this block number
	if lastBlock := ts.view.LastBlock(); lastBlock != nil {
		if miniblock.Ref.Num <= lastBlock.Ref.Num {
			return nil
		}
	}

	// copyAndApplyBlock removes events from minipool that are now in the block
	view, _, err := ts.view.copyAndApplyBlock(miniblock, cfg)
	if err != nil {
		return err
	}

	ts.view = view
	return nil
}

// addEvent adds a real-time event to the view and sends notifications.
// This is the ONLY place where notifications are sent.
//
// Deduplication strategy:
// 1. minipool.events.Has(event.Hash) - skip if already in minipool (duplicate event)
// 2. GetMiniblockHeader() != nil - handle miniblock headers specially (prune minipool)
//
// Events are added to the minipool here, then removed when a miniblock is created
// (see ApplyBlock/copyAndApplyBlock). This keeps the minipool bounded to events
// waiting for the next miniblock.
func (ts *TrackedStreamViewImpl) addEvent(ctx context.Context, event *ParsedEvent) error {
	// Skip duplicates already in minipool
	if ts.view.minipool.events.Has(event.Hash) {
		return nil
	}

	// Handle miniblock headers - these signal a new block was created and we need to prune
	if event.Event.GetMiniblockHeader() != nil {
		return ts.applyMiniblockHeader(event)
	}

	// Add regular event to minipool
	view, err := ts.view.copyAndAddEvent(event)
	if err != nil {
		return err
	}
	ts.view = view

	// Send notification for real-time event
	return ts.SendEventNotification(ctx, event)
}

// applyMiniblockHeader handles a miniblock header event received during real-time sync.
// When the server creates a miniblock, it sends the header as an event. We need to:
// 1. Collect events from our minipool that match the header's event hashes
// 2. Create a MiniblockInfo from the header and events
// 3. Apply the block to prune our minipool
func (ts *TrackedStreamViewImpl) applyMiniblockHeader(headerEvent *ParsedEvent) error {
	header := headerEvent.Event.GetMiniblockHeader()

	// Collect events from minipool that are in this block
	events := make([]*ParsedEvent, 0, len(header.EventHashes))
	for _, hashBytes := range header.EventHashes {
		hash := common.BytesToHash(hashBytes)
		if event, ok := ts.view.minipool.events.Get(hash); ok {
			events = append(events, event)
		}
	}

	// Create MiniblockInfo from header event and collected events
	mb, err := NewMiniblockInfoFromParsed(headerEvent, events, nil)
	if err != nil {
		return err
	}

	return ts.applyBlock(mb, ts.cfg.Get())
}

func (ts *TrackedStreamViewImpl) SendEventNotification(ctx context.Context, event *ParsedEvent) error {
	if ts.view == nil {
		return nil
	}

	return ts.onNewEvent(ctx, ts.view, event)
}

// ShouldPersistCookie returns true if the stream's cookie should be persisted.
// It delegates to the shouldPersistCookie callback if provided, otherwise returns false.
func (ts *TrackedStreamViewImpl) ShouldPersistCookie(ctx context.Context) bool {
	if ts.shouldPersistCookie == nil {
		return false
	}
	return ts.shouldPersistCookie(ctx, ts.view)
}
