package syncer

import (
	"github.com/ethereum/go-ethereum/common"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
	localSyncer struct{}
)

var _ StreamUpdateEmitter = (*localSyncer)(nil)

func NewLocal() *localSyncer {
	return &localSyncer{}
}

func (l *localSyncer) StreamID() StreamId {
	//TODO implement me
	panic("implement me")
}

func (l *localSyncer) Node() common.Address {
	//TODO implement me
	panic("implement me")
}

func (l *localSyncer) Subscribe(subscriber StreamSubscriber) {
	//TODO implement me
	panic("implement me")
}
