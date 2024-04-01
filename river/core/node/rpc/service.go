package rpc

import (
	"context"
	"net/http"
	"time"

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
	riverChain     *crypto.Blockchain
	baseChain      *crypto.Blockchain
	storage        storage.StreamStorage
	cache          events.StreamCache
	chainAuth      auth.ChainAuth
	wallet         *crypto.Wallet
	exitSignal     chan error
	nodeRegistry   nodes.NodeRegistry
	streamRegistry nodes.StreamRegistry
	streamConfig   *config.StreamConfig
	networkConfig  *config.NetworkConfig
	syncHandler    SyncHandler
	serverCtx      context.Context
	httpServer     *http.Server
	startTime      time.Time
}

var (
	_ StreamServiceHandler = (*Service)(nil)
	_ NodeToNodeHandler    = (*Service)(nil)
)
