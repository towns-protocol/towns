package syncer

import (
	"github.com/ethereum/go-ethereum/common"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"

	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
	remoteSyncer struct{}
)

var _ StreamUpdateEmitter = (*remoteSyncer)(nil)

func NewRemote(client *protocolconnect.StreamServiceClient) *remoteSyncer {
	return &remoteSyncer{}
}

func (l *remoteSyncer) StreamID() StreamId {
	//TODO implement me
	panic("implement me")
}

func (l *remoteSyncer) Node() common.Address {
	//TODO implement me
	panic("implement me")
}

func (l *remoteSyncer) Subscribe(subscriber StreamSubscriber) {
	//TODO implement me
	panic("implement me")
}
