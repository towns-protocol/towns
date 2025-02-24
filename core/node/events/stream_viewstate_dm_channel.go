package events

import (
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

type DMChannelStreamView interface {
	JoinableStreamView
	GetDMChannelInception() (*DmChannelPayload_Inception, error)
}

var _ DMChannelStreamView = (*StreamView)(nil)

func (r *StreamView) GetDMChannelInception() (*DmChannelPayload_Inception, error) {
	i := r.InceptionPayload()
	c, ok := i.(*DmChannelPayload_Inception)
	if ok {
		return c, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected dm stream", "streamId", i.GetStreamId())
	}
}
