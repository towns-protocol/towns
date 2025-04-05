package events

import (
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

type SpaceStreamView interface {
	JoinableStreamView
	GetSpaceInception() (*SpacePayload_Inception, error)
	GetSpaceSnapshotContent() (*SpacePayload_Snapshot, error)
	GetChannelInfo(channelId shared.StreamId) (*SpacePayload_ChannelMetadata, error)
}

var _ SpaceStreamView = (*StreamView)(nil)

func (r *StreamView) GetSpaceInception() (*SpacePayload_Inception, error) {
	i := r.InceptionPayload()
	c, ok := i.(*SpacePayload_Inception)
	if ok {
		return c, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected space stream", "streamId", r.streamId)
	}
}

func (r *StreamView) GetSpaceSnapshotContent() (*SpacePayload_Snapshot, error) {
	s := r.snapshot.Content
	c, ok := s.(*Snapshot_SpaceContent)
	if ok {
		return c.SpaceContent, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected space stream", "streamId", r.streamId)
	}
}

func (r *StreamView) GetChannelInfo(channelId shared.StreamId) (*SpacePayload_ChannelMetadata, error) {
	snap, err := r.GetSpaceSnapshotContent()
	if err != nil {
		return nil, err
	}
	channel, _ := findChannel(snap.Channels, channelId[:])

	updateFn := func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_SpacePayload:
			switch spacePayload := payload.SpacePayload.Content.(type) {
			case *SpacePayload_Channel:
				if channelId.EqualsBytes(spacePayload.Channel.ChannelId) {
					channel = &SpacePayload_ChannelMetadata{
						ChannelId:         spacePayload.Channel.ChannelId,
						Op:                spacePayload.Channel.Op,
						OriginEvent:       spacePayload.Channel.OriginEvent,
						UpdatedAtEventNum: eventNum,
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

	err = r.forEachEvent(r.snapshotIndex+1, updateFn)
	if err != nil {
		return nil, err
	}

	return channel, nil
}
