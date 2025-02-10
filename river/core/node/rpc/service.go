package rpc

import (
	"context"
	"net"
	"net/http"
	"sync/atomic"
	"time"

	"connectrpc.com/otelconnect"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/auth"
	"github.com/towns-protocol/towns/core/node/bot_registry"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/notifications"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	river_sync "github.com/towns-protocol/towns/core/node/rpc/sync"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/xchain/entitlement"
)

type HttpClientMakerFunc = func(context.Context, *config.Config) (*http.Client, error)

type Service struct {
	// Context and config
	serverCtx       context.Context
	serverCtxCancel context.CancelFunc
	config          *config.Config
	instanceId      string
	defaultLogger   *zap.SugaredLogger
	wallet          *crypto.Wallet
	startTime       time.Time
	mode            string

	// exitSignal is used to report critical errors from background task and RPC handlers
	// that should cause the service to stop. For example, if new instance for
	// the same database is started, the old one should stop.
	exitSignal chan error

	// Storage
	storagePoolInfo *storage.PgxPoolInfo
	storage         storage.StreamStorage

	// Streams
	cache       *StreamCache
	mbProducer  TestMiniblockProducer
	syncHandler river_sync.Handler

	// Notifications
	notifications notifications.UserPreferencesStore

	// Bot Registry
	botStore storage.BotRegistryStore

	// River chain
	riverChain       *crypto.Blockchain
	registryContract *registries.RiverRegistryContract
	nodeRegistry     nodes.NodeRegistry
	streamRegistry   nodes.StreamRegistry
	chainConfig      crypto.OnChainConfiguration

	// Base chain
	baseChain *crypto.Blockchain
	chainAuth auth.ChainAuth

	// Entitlements
	entitlementEvaluator *entitlement.Evaluator

	// Network
	listener        net.Listener
	httpServer      *http.Server
	mux             httpMux
	httpClientMaker HttpClientMakerFunc

	// Status string
	status atomic.Pointer[string]

	// Archiver is not nil if running in archive mode
	Archiver *Archiver

	// NotificationService is not nil if running in notification mode
	NotificationService *notifications.Service

	// BotRegistryService is not nil if running in bot registry mode
	BotRegistryService *bot_registry.Service

	// Metrics
	metrics               infra.MetricsFactory
	metricsPublisher      *infra.MetricsPublisher
	otelTraceProvider     trace.TracerProvider
	otelTracer            trace.Tracer
	otelConnectIterceptor *otelconnect.Interceptor

	// onCloseFuncs are called in reverse order from Service.Close()
	onCloseFuncs []func()
}

var (
	_ StreamServiceHandler = (*Service)(nil)
	_ NodeToNodeHandler    = (*Service)(nil)
)

func (s *Service) ExitSignal() chan error {
	return s.exitSignal
}

func (s *Service) SetStatus(status string) {
	s.status.Store(&status)
}

func (s *Service) GetStatus() string {
	status := s.status.Load()
	if status == nil {
		return "STARTING"
	}
	return *status
}

func (s *Service) Storage() storage.StreamStorage {
	return s.storage
}

func (s *Service) MetricsRegistry() *prometheus.Registry {
	return s.metrics.Registry()
}

func (s *Service) BaseChain() *crypto.Blockchain {
	return s.baseChain
}

func (s *Service) RiverChain() *crypto.Blockchain {
	return s.riverChain
}
