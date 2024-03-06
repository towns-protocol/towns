package rpc

import (
	"context"
	"net/http"

	"github.com/river-build/river/core/node/auth"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/storage"
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
	syncHandler    SyncHandler
	serverCtx      context.Context
	httpServer     *http.Server
}

var (
	_ StreamServiceHandler = (*Service)(nil)
	_ NodeToNodeHandler    = (*Service)(nil)
)
