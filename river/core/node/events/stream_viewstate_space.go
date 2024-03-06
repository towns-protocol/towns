package events

import (
	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

type SpaceStreamView interface {
	JoinableStreamView
	GetSpaceInception() (*SpacePayload_Inception, error)
	GetSpaceSnapshotContent() (*SpacePayload_Snapshot, error)
	GetChannelInfo(channelId shared.StreamId) (*SpacePayload_Channel, error)
}

var _ SpaceStreamView = (*streamViewImpl)(nil)

func (r *streamViewImpl) GetSpaceInception() (*SpacePayload_Inception, error) {
	i := r.InceptionPayload()
	c, ok := i.(*SpacePayload_Inception)
	if ok {
		return c, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected space stream", "streamId", r.streamId)
	}
}

func (r *streamViewImpl) GetSpaceSnapshotContent() (*SpacePayload_Snapshot, error) {
	s := r.snapshot.Content
	c, ok := s.(*Snapshot_SpaceContent)
	if ok {
		return c.SpaceContent, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected space stream", "streamId", r.streamId)
	}
}

func (r *streamViewImpl) GetChannelInfo(channelId shared.StreamId) (*SpacePayload_Channel, error) {
	snap, err := r.GetSpaceSnapshotContent()
	if err != nil {
		return nil, err
	}
	channel, _ := findChannel(snap.Channels, channelId.Bytes())

	updateFn := func(e *ParsedEvent) (bool, error) {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_SpacePayload:
			switch spacePayload := payload.SpacePayload.Content.(type) {
			case *SpacePayload_Channel_:
				if channelId.EqualsBytes(spacePayload.Channel.ChannelId) {
					channel = spacePayload.Channel
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
