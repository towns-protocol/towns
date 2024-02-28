package rpc

import (
	"context"
	"net/http"

	"github.com/river-build/river/auth"
	"github.com/river-build/river/config"
	"github.com/river-build/river/crypto"
	"github.com/river-build/river/events"
	"github.com/river-build/river/infra"
	"github.com/river-build/river/nodes"
	. "github.com/river-build/river/protocol/protocolconnect"
	"github.com/river-build/river/storage"
)

var serviceRequests = infra.NewSuccessMetrics(infra.RPC_CATEGORY, nil)

type Service struct {
	storage        storage.StreamStorage
	cache          events.StreamCache
	chainAuth      auth.ChainAuth
	wallet         *crypto.Wallet
	exitSignal     chan error
	nodeRegistry   nodes.NodeRegistry
	streamRegistry nodes.StreamRegistry
	streamConfig   *config.StreamConfig
	notification   PushNotification
	syncHandler    SyncHandler
	serverCtx      context.Context
	httpServer     *http.Server
}

var (
	_ StreamServiceHandler = (*Service)(nil)
	_ NodeToNodeHandler    = (*Service)(nil)
)
