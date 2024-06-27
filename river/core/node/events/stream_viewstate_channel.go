package events

import (
	"bytes"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

type ChannelStreamView interface {
	JoinableStreamView
	GetChannelInception() (*ChannelPayload_Inception, error)
	GetPinnedMessages() ([]*ChannelPayload_Pin, error)
}

var _ ChannelStreamView = (*streamViewImpl)(nil)

func (r *streamViewImpl) GetChannelInception() (*ChannelPayload_Inception, error) {
	i := r.InceptionPayload()
	c, ok := i.(*ChannelPayload_Inception)
	if ok {
		return c, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected channel stream", "streamId", i.GetStreamId())
	}
}

func (r *streamViewImpl) GetPinnedMessages() ([]*ChannelPayload_Pin, error) {
	s := r.snapshot.Content
	channelSnapshot := s.(*Snapshot_ChannelContent)
	// make a copy of the pins
	pins := make([]*ChannelPayload_Pin, len(channelSnapshot.ChannelContent.Pins))
	copy(pins, channelSnapshot.ChannelContent.Pins)

	updateFn := func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_ChannelPayload:
			switch payload := payload.ChannelPayload.Content.(type) {
			case *ChannelPayload_Pin_:
				pins = append(pins, payload.Pin)
			case *ChannelPayload_Unpin_:
				for i, pin := range pins {
					if bytes.Equal(pin.EventId, payload.Unpin.EventId) {
						pins = append(pins[:i], pins[i+1:]...)
						break
					}
				}
			default:
				break
			}
		default:
			break
		}
		return true, nil
	}

	err := r.forEachEvent(r.snapshotIndex+1, updateFn)
	if err != nil {
		return nil, err
	}
	return pins, nil
}
