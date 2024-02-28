package events

import (
	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

type MediaStreamView interface {
	JoinableStreamView
	GetMediaInception() (*MediaPayload_Inception, error)
}

var _ MediaStreamView = (*streamViewImpl)(nil)

func (r *streamViewImpl) GetMediaInception() (*MediaPayload_Inception, error) {
	i := r.InceptionPayload()
	c, ok := i.(*MediaPayload_Inception)
	if ok {
		return c, nil
	} else {
		return nil, RiverError(Err_WRONG_STREAM_TYPE, "Expected media stream", "streamId", i.GetStreamId())
	}
}
