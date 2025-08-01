package rpc

import (
	"context"
	"net"
	"net/http"
	"sync/atomic"
	"time"

	"connectrpc.com/otelconnect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/app_registry"
	"github.com/towns-protocol/towns/core/node/auth"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/nodes/streamplacement"
	"github.com/towns-protocol/towns/core/node/notifications"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	river_sync "github.com/towns-protocol/towns/core/node/rpc/sync"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/xchain/entitlement"
)

type (
	HttpClientMakerFunc         = func(context.Context, *config.Config) (*http.Client, error)
	HttpClientMakerWithCertFunc = func(context.Context, *config.Config, http_client.GetClientCertFunc) (*http.Client, error)
)

type Service struct {
	// Context and config
	serverCtx       context.Context
	serverCtxCancel context.CancelFunc
	config          *config.Config
	instanceId      string
	defaultLogger   *logging.Log
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
	syncHandler river_sync.Handler

	// Notifications
	notifications notifications.UserPreferencesStore

	// App Registry
	appStore storage.AppRegistryStore

	// River chain
	riverChain       *crypto.Blockchain
	registryContract *registries.RiverRegistryContract
	nodeRegistry     nodes.NodeRegistry
	streamPlacer     streamplacement.Distributor
	chainConfig      crypto.OnChainConfiguration

	// Base chain
	baseChain *crypto.Blockchain
	chainAuth auth.ChainAuth

	// Entitlements
	entitlementEvaluator *entitlement.Evaluator

	// Network
	listener                net.Listener
	httpServer              *http.Server
	mux                     httpMux
	httpClientMaker         HttpClientMakerFunc
	httpClientMakerWithCert HttpClientMakerWithCertFunc

	// Status string
	status atomic.Pointer[string]

	// Archiver is not nil if running in archive mode
	Archiver *Archiver

	// NotificationService is not nil if running in notification mode
	NotificationService *notifications.Service

	// AppRegistryService is not nil if running in app registry mode
	AppRegistryService *app_registry.Service

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

func (s *Service) GetWalletAddress() common.Address {
	return s.wallet.Address
}
