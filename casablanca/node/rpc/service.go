package rpc

import (
	"casablanca/node/auth"
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/nodes"
	. "casablanca/node/protocol/protocolconnect"
)

var (
	serviceRequests = infra.NewSuccessMetrics("service_requests", nil)
)

type Service struct {
	cache          events.StreamCache
	townsContract  auth.TownsContract
	wallet         *crypto.Wallet
	exitSignal     chan error
	nodeRegistry   nodes.NodeRegistry
	streamRegistry nodes.StreamRegistry
	streamConfig   config.StreamConfig
	notification   nodes.PushNotification
	syncHandler    SyncHandler
}

var _ StreamServiceHandler = (*Service)(nil)
var _ NodeToNodeHandler = (*Service)(nil)
