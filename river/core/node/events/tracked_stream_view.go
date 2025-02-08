package events

import (
	"context"

	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// TrackedStreamView presents an interface that can be used to apply the returned
// data structures of a stream synced from another node in order to render an up-to-date
// view of the stream locally.
type TrackedStreamView interface {
	// ApplyBlock applies the block to the internal view, updating the stream with the latest
	// membership if it is a channel.
	ApplyBlock(miniblock *Miniblock) error

	// ApplyEvent applies the event to the internal view and notifies if the event unseen
	ApplyEvent(ctx context.Context, event *Envelope) error

	// SendEventNotification notifies via the internal callback, but does not apply the event
	// to the internal view state. This method can be used to invoke the callback on events
	// that were added to this streamView via ApplyBlock
	SendEventNotification(ctx context.Context, event *ParsedEvent) error
}

// TrackedStreamViewImpl can function on it's own as an object, or can be used as a mixin
// by classes that want to encapsulate it with the required callback.
// TrackedStreamView implements to functionality of applying blocks and events to a wrapped
// stream view, and of notifying via the callback on unseen events.
type TrackedStreamViewImpl struct {
	streamID   shared.StreamId
	view       *StreamView
	cfg        crypto.OnChainConfiguration
	onNewEvent func(ctx context.Context, view *StreamView, event *ParsedEvent) error
}

// The TrackedStreamView tracks the current state of a remote stream by applying blocks and events to
// that stream in order to internally render an up-to-date view of the stream, upon which callbacks are
// executed. It is used by the notification service and the bot registry service to track the state of
// relevant streams. It is essentially a wrapper around StreamView, to apply events, and to execute callbacks.
// onNewEvent is called whenever a new event is added to the view, ensuring that the onNewEvent callback is
// never called twice for the same event.
func (ts *TrackedStreamViewImpl) Init(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *StreamAndCookie,
	onNewEvent func(ctx context.Context, view *StreamView, event *ParsedEvent) error,
) (*StreamView, error) {
	view, err := MakeRemoteStreamView(ctx, stream)
	if err != nil {
		return nil, err
	}

	ts.streamID = streamID
	ts.onNewEvent = onNewEvent
	ts.view = view
	ts.cfg = cfg

	return view, nil
}

func (ts *TrackedStreamViewImpl) ApplyBlock(
	miniblock *Miniblock,
) error {
	mb, err := NewMiniblockInfoFromProto(miniblock, NewParsedMiniblockInfoOpts())
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

func (ts *TrackedStreamViewImpl) applyBlock(
	miniblock *MiniblockInfo,
	cfg *crypto.OnChainSettings,
) error {
	if lastBlock := ts.view.LastBlock(); lastBlock != nil {
		if miniblock.Ref.Num <= lastBlock.Ref.Num {
			return nil
		}
	}

	view, _, err := ts.view.copyAndApplyBlock(miniblock, cfg)
	if err != nil {
		return err
	}

	ts.view = view
	return nil
}

func (ts *TrackedStreamViewImpl) addEvent(ctx context.Context, event *ParsedEvent) error {
	if ts.view.minipool.events.Has(event.Hash) || event.Event.GetMiniblockHeader() != nil {
		return nil
	}

	view, err := ts.view.copyAndAddEvent(event)
	if err != nil {
		return err
	}
	ts.view = view

	return ts.SendEventNotification(ctx, event)
}

func (ts *TrackedStreamViewImpl) SendEventNotification(ctx context.Context, event *ParsedEvent) error {
	if ts.view == nil {
		return nil
	}

	return ts.onNewEvent(ctx, ts.view, event)
}
