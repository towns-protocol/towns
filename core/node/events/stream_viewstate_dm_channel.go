package events

import (
	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"
)

type DMChannelStreamView interface {
	JoinableStreamView
	GetDMChannelInception() (*DmChannelPayload_Inception, error)
}

var _ DMChannelStreamView = (*streamViewImpl)(nil)

func (r *streamViewImpl) GetDMChannelInception() (*DmChannelPayload_Inception, error) {
	i := r.InceptionPayload()
	c, ok := i.(*DmChannelPayload_Inception)
	if ok {
		return c, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected dm stream", "streamId", i.GetStreamId())
	}
}
