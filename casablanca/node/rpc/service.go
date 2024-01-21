package rpc

import (
	"github.com/river-build/river/auth"
	"github.com/river-build/river/config"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/events"
	"github.com/river-build/river/infra"
	"github.com/river-build/river/nodes"
	. "github.com/river-build/river/protocol/protocolconnect"
)

var serviceRequests = infra.NewSuccessMetrics(infra.RPC_CATEGORY, nil)

type Service struct {
	cache          events.StreamCache
	authChecker    auth.AuthChecker
	wallet         *crypto.Wallet
	exitSignal     chan error
	nodeRegistry   nodes.NodeRegistry
	streamRegistry nodes.StreamRegistry
	streamConfig   config.StreamConfig
	notification   nodes.PushNotification
	syncHandler    SyncHandler
}

var (
	_ StreamServiceHandler = (*Service)(nil)
	_ NodeToNodeHandler    = (*Service)(nil)
)
