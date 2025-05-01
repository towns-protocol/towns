package client

import (
	"github.com/ethereum/go-ethereum/common"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type sharedSyncerManager struct {
	syncers map[common.Address]*remoteSharedSyncer
}

type remoteSharedSyncer struct {
	// syncID -> streamID
	clients map[string]StreamId
	syncer  *remoteSyncer
}

func newRemoteSharedSyncer(syncer *remoteSyncer) *remoteSharedSyncer {

}
