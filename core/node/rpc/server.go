package rpc

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"net"
	"net/http"
	"slices"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/rs/cors"
	"go.uber.org/zap"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/auth"
	"github.com/towns-protocol/towns/core/node/authentication"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/events/remoteprovider"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/nodes/streamplacement"
	"github.com/towns-protocol/towns/core/node/notifications"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/rpc/headers"
	"github.com/towns-protocol/towns/core/node/rpc/highusage"
	"github.com/towns-protocol/towns/core/node/rpc/node2nodeauth"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3"
	"github.com/towns-protocol/towns/core/node/scrub"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/track_streams"
	"github.com/towns-protocol/towns/core/node/utils"
	"github.com/towns-protocol/towns/core/river_node/version"
	"github.com/towns-protocol/towns/core/xchain/entitlement"
	"github.com/towns-protocol/towns/core/xchain/util"
)

const (
	ServerModeFull         = "full"
	ServerModeInfo         = "info"
	ServerModeArchive      = "archive"
	ServerModeNotification = "notification"
	ServerModeAppRegistry  = "app_registry"
)

func (s *Service) httpServerClose() {
	timeout := s.config.ShutdownTimeout
	if timeout < 0 {
		timeout = 0
	}
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel := context.WithTimeout(s.serverCtx, timeout)
		defer cancel()
		if !s.config.Log.Simplify {
			s.defaultLogger.Infow("Shutting down http server", "timeout", timeout)
		}
		err := s.httpServer.Shutdown(ctx)
		if err != nil {
			if err != context.DeadlineExceeded {
				s.defaultLogger.Errorw("failed to shutdown http server", "error", err)
			}
			s.defaultLogger.Warnw("forcing http server close")
			err = s.httpServer.Close()
			if err != nil {
				s.defaultLogger.Errorw("failed to close http server", "error", err)
			}
		} else {
			if !s.config.Log.Simplify {
				s.defaultLogger.Infow("http server shutdown")
			}
		}
	} else {
		if !s.config.Log.Simplify {
			s.defaultLogger.Infow("shutting down http server immediately")
		}
		err := s.httpServer.Close()
		if err != nil {
			s.defaultLogger.Errorw("failed to close http server", "error", err)
		}
		if !s.config.Log.Simplify {
			s.defaultLogger.Infow("http server closed")
		}
	}
}

func (s *Service) Close() {
	s.serverCtxCancel()

	onClose := s.onCloseFuncs
	slices.Reverse(onClose)
	for _, f := range onClose {
		f()
	}

	if s.Archiver != nil {
		s.Archiver.Close()
	}

	if !s.config.Log.Simplify {
		s.defaultLogger.Infow("Server closed")
	}
}

func (s *Service) onClose(f any) {
	switch f := f.(type) {
	case func():
		s.onCloseFuncs = append(s.onCloseFuncs, f)
	case func() error:
		s.onCloseFuncs = append(s.onCloseFuncs, func() {
			_ = f()
		})
	case func(context.Context):
		s.onCloseFuncs = append(s.onCloseFuncs, func() {
			f(s.serverCtx)
		})
	case func(context.Context) error:
		s.onCloseFuncs = append(s.onCloseFuncs, func() {
			_ = f(s.serverCtx)
		})
	case context.CancelFunc:
		s.onCloseFuncs = append(s.onCloseFuncs, func() { f() })
	default:
		panic("unsupported onClose type")
	}
}

func (s *Service) start(opts *ServerStartOpts) error {
	s.startTime = time.Now()

	s.initInstance(ServerModeFull, opts)

	err := s.initWallet()
	if err != nil {
		return AsRiverError(err).Message("Failed to init wallet").LogError(s.defaultLogger)
	}

	s.initCallRateMonitor()

	s.initTracing("river-stream", s.wallet.String())

	// There is an order here to how components must be initialized.
	// 1. The river chain is needed in order to read on-chain configuration for instantiating entitlements.
	// 2. Entitlements need to be initialized in order to initialize the chain auth module when initializing
	// the base chain.
	err = s.initRiverChain()
	if err != nil {
		return AsRiverError(err).Message("Failed to init river chain").LogError(s.defaultLogger)
	}

	err = s.initEntitlements()
	if err != nil {
		return AsRiverError(err).Message("Failed to init entitlements").LogError(s.defaultLogger)
	}
	err = s.initBaseChain()
	if err != nil {
		return AsRiverError(err).Message("Failed to init base chain").LogError(s.defaultLogger)
	}

	s.initEthBalanceMetrics()

	err = s.prepareStore()
	if err != nil {
		return AsRiverError(err).Message("Failed to prepare store").LogError(s.defaultLogger)
	}

	err = s.runHttpServer()
	if err != nil {
		return AsRiverError(err).Message("Failed to run http server").LogError(s.defaultLogger)
	}

	if s.config.StandByOnStart {
		err = s.standby()
		if err != nil {
			return AsRiverError(err).Message("Failed to standby").LogError(s.defaultLogger)
		}
	}

	err = s.initStore()
	if err != nil {
		return AsRiverError(err).Message("Failed to init store").LogError(s.defaultLogger)
	}

	err = s.initCacheAndSync(opts)
	if err != nil {
		return AsRiverError(err).Message("Failed to init cache and sync").LogError(s.defaultLogger)
	}

	s.initHandlers()

	s.SetStatus("OK")

	addr := s.listener.Addr().String()
	if strings.HasPrefix(addr, "[::]") {
		addr = "localhost" + addr[4:]
	}
	addr = s.config.UrlSchema() + "://" + addr
	s.defaultLogger.Infow("Server started", "addr", addr+"/debug/multi")
	return nil
}

func (s *Service) initInstance(mode string, opts *ServerStartOpts) {
	s.mode = mode
	s.instanceId = GenShortNanoid()

	if opts != nil {
		s.riverChain = opts.RiverChain
		s.listener = opts.Listener
		s.httpClientMaker = opts.HttpClientMaker
		s.httpClientMakerWithCert = opts.HttpClientMakerWithCert
	}

	if s.httpClientMaker == nil {
		s.httpClientMaker = http_client.GetHttpClient
	}

	if s.httpClientMakerWithCert == nil {
		s.httpClientMakerWithCert = http_client.GetHttpClientWithCert
	}

	if !s.config.Log.Simplify {
		s.defaultLogger = logging.FromCtx(s.serverCtx).With(
			"instanceId", s.instanceId,
			"mode", mode,
			"nodeType", "stream",
		)
	} else {
		if s.config.Port != 0 {
			s.defaultLogger = logging.FromCtx(s.serverCtx).With(
				"port", s.config.Port,
			)
		} else {
			s.defaultLogger = logging.FromCtx(s.serverCtx)
		}
	}
	s.serverCtx = logging.CtxWithLog(s.serverCtx, s.defaultLogger)

	// TODO: refactor to load wallet before so node address is logged here as well
	s.defaultLogger.Infow(
		"Server config",
		"config", s.config,
		"version", version.GetFullVersion(),
	)

	if !utils.CgoEnabled {
		s.defaultLogger.Warnw("CGO is disabled, signature verification and hashing will be slower")
	}

	subsystem := mode
	switch mode {
	case ServerModeFull:
		subsystem = "stream"
	case ServerModeNotification:
		subsystem = "notification"
	case ServerModeAppRegistry:
		subsystem = "app_registry"
	}

	metricsRegistry := prometheus.NewRegistry()
	s.metrics = infra.NewMetricsFactory(metricsRegistry, "river", subsystem)
	s.metricsPublisher = infra.NewMetricsPublisher(metricsRegistry)
	s.metricsPublisher.StartMetricsServer(s.serverCtx, s.config.Metrics)
}

func (s *Service) initWallet() error {
	ctx := s.serverCtx
	var wallet *crypto.Wallet
	if s.riverChain == nil {
		var err error
		wallet, err = util.LoadWallet(ctx)
		if err != nil {
			return err
		}
	} else {
		wallet = s.riverChain.Wallet
	}
	s.wallet = wallet

	// Add node address info to the logger
	if !s.config.Log.Simplify {
		s.defaultLogger = s.defaultLogger.With("nodeAddress", wallet.Address.Hex())
		s.serverCtx = logging.CtxWithLog(ctx, s.defaultLogger)
		zap.ReplaceGlobals(s.defaultLogger.RootLogger)
	}

	return nil
}

func (s *Service) initCallRateMonitor() {
	var monitorLogger *zap.Logger
	if s.defaultLogger != nil && s.defaultLogger.RootLogger != nil {
		monitorLogger = s.defaultLogger.RootLogger.Named("highusage")
	}
	s.callRateMonitor = highusage.NewCallRateMonitor(
		s.serverCtx,
		s.config.HighUsageDetection,
		monitorLogger,
		s.wallet.Address,
	)
}

func (s *Service) initBaseChain() error {
	ctx := s.serverCtx
	cfg := s.config

	if !s.config.DisableBaseChain {
		var err error
		// Initialize the base chain with a wallet so that a transaction pool is created. This is not used by
		// the stream service, but it is used by the xchain service, which shares the same crypto.Blockchain.
		// In practice, we expect these services to run together most of the time.
		s.baseChain, err = crypto.NewBlockchain(ctx, &s.config.BaseChain, s.wallet, s.metrics, s.otelTracer)
		if err != nil {
			return err
		}

		// Only construct a chainAuth if we're not in app registry mode.
		// The app registry service will construct its own specific contracts.
		if s.mode != ServerModeAppRegistry {
			chainAuth, err := auth.NewChainAuth(
				ctx,
				s.baseChain,
				s.entitlementEvaluator,
				&cfg.ArchitectContract,
				&cfg.AppRegistryContract,
				cfg.BaseChain.LinkedWalletsLimit,
				cfg.BaseChain.ContractCallsTimeoutMs,
				s.metrics,
			)
			if err != nil {
				return err
			}
			s.chainAuth = chainAuth
		}
	} else {
		if !s.config.Log.Simplify {
			s.defaultLogger.Warnw("Using fake auth for testing")
		}
		s.chainAuth = auth.NewFakeChainAuth()
	}
	return nil
}

func (s *Service) initRiverChain() error {
	ctx := s.serverCtx
	var err error
	if s.riverChain == nil {
		s.riverChain, err = crypto.NewBlockchain(ctx, &s.config.RiverChain, s.wallet, s.metrics, s.otelTracer)
		if err != nil {
			return err
		}
	}

	s.registryContract, err = registries.NewRiverRegistryContract(
		ctx,
		s.riverChain,
		&s.config.RegistryContract,
		&s.config.RiverRegistry,
	)
	if err != nil {
		return err
	}

	s.chainConfig, err = crypto.NewOnChainConfig(
		ctx, s.riverChain.Client, s.registryContract.Address, s.riverChain.InitialBlockNum, s.riverChain.ChainMonitor)
	if err != nil {
		return err
	}

	var walletAddress common.Address
	if s.wallet != nil {
		walletAddress = s.wallet.Address
	}

	httpClient, err := s.httpClientMaker(ctx, s.config)
	if err != nil {
		return err
	}

	httpClientWithCert, err := s.httpClientMakerWithCert(
		ctx, s.config, node2nodeauth.CertGetter(s.defaultLogger, s.wallet, s.riverChain.ChainId),
	)
	if err != nil {
		return err
	}

	s.nodeRegistry, err = nodes.LoadNodeRegistry(
		ctx,
		s.registryContract,
		walletAddress,
		s.riverChain.InitialBlockNum,
		s.riverChain.ChainMonitor,
		s.chainConfig,
		httpClient,
		httpClientWithCert,
		s.otelConnectIterceptor,
	)
	if err != nil {
		return err
	}

	s.streamPlacer, err = streamplacement.NewDistributor(
		ctx,
		s.chainConfig,
		s.riverChain.InitialBlockNum,
		s.riverChain.ChainMonitor,
		s.registryContract,
	)
	if err != nil {
		return err
	}

	return nil
}

func (s *Service) prepareStore() error {
	switch s.config.StorageType {
	case storage.StreamStorageTypePostgres:
		var schema string
		switch s.mode {
		case ServerModeFull:
			schema = storage.DbSchemaNameFromAddress(s.wallet.Address.Hex())
		case ServerModeArchive:
			schema = storage.DbSchemaNameForArchive(s.config.Archive.ArchiveId)
		case ServerModeNotification:
			schema = storage.DbSchemaNameForNotifications(s.config.RiverChain.ChainId)
		case ServerModeAppRegistry:
			schema = storage.DbSchemaNameForAppRegistryService(s.config.AppRegistry.AppRegistryId)
		default:
			return RiverError(
				Err_BAD_CONFIG,
				"Server mode not supported for storage",
				"mode",
				s.mode,
			).Func("prepareStore")
		}

		pool, err := storage.CreateAndValidatePgxPool(s.serverCtx, &s.config.Database, schema, s.otelTraceProvider)
		if err != nil {
			return err
		}
		s.storagePoolInfo = pool

		return nil
	default:
		return RiverError(
			Err_BAD_CONFIG,
			"Unknown storage type",
			"storageType",
			s.config.StorageType,
		).Func("prepareStore")
	}
}

func (s *Service) loadTLSConfig() (*tls.Config, error) {
	certStr := s.config.TLSConfig.Cert
	keyStr := s.config.TLSConfig.Key
	if (certStr == "") || (keyStr == "") {
		return nil, RiverError(
			Err_BAD_CONFIG, "TLSConfig.Cert and TLSConfig.Key must be set if HTTPS is enabled",
		)
	}

	// Base 64 encoding can't contain ., if . is present then it's assumed it's a file path
	var cert *tls.Certificate
	var err error
	if strings.Contains(certStr, ".") || strings.Contains(keyStr, ".") {
		cert, err = loadCertFromFiles(certStr, keyStr)
		if err != nil {
			return nil, err
		}

	} else {
		cert, err = loadCertFromBase64(certStr, keyStr)
		if err != nil {
			return nil, err
		}
	}

	cfg := &tls.Config{
		Certificates: []tls.Certificate{*cert},
		NextProtos:   []string{"h2"},
	}

	if s.chainConfig.Get().ServerEnableNode2NodeAuth == 1 {
		// Since both stream and internode services are running on the same server,
		// the client certificate is required for the internode service only so it should be optional here.
		cfg.ClientAuth = tls.RequestClientCert
		cfg.VerifyPeerCertificate = node2nodeauth.VerifyPeerCertificate(
			s.defaultLogger,
			func(addr common.Address) error {
				_, err := s.nodeRegistry.GetNode(addr)
				return err
			},
		)
	}

	return cfg, nil
}

func (s *Service) createListener(addr string) (net.Listener, error) {
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, err
	}

	if !s.config.DisableHttps {
		tlsConfig, err := s.loadTLSConfig()
		if err != nil {
			return nil, err
		}
		listener = tls.NewListener(listener, tlsConfig)
	}

	if !s.config.Log.Simplify {
		s.defaultLogger.Infow("Listening", "addr", addr)
	}

	s.onClose(listener.Close)

	return listener, nil
}

func (s *Service) createHttpServer(listener net.Listener, handler http.Handler) (*http.Server, error) {
	// TODO: set http2 settings here
	http2Server := &http2.Server{}

	if s.config.DisableHttps {
		handler = h2c.NewHandler(handler, http2Server)
		s.defaultLogger.Warnw("Starting H2C server without TLS")
	}

	httpServer := &http.Server{
		Addr:    listener.Addr().String(),
		Handler: handler,
		BaseContext: func(listener net.Listener) context.Context {
			return s.serverCtx
		},
		ErrorLog: utils.NewHttpLogger(s.serverCtx),
	}
	// ensure that x/http2 is used
	// https://github.com/golang/go/issues/42534
	err := http2.ConfigureServer(httpServer, http2Server)
	if err != nil {
		return nil, err
	}

	go s.serve(httpServer, listener)

	return httpServer, nil
}

func (s *Service) serve(httpServer *http.Server, listener net.Listener) {
	err := httpServer.Serve(listener)
	if err != nil && err != http.ErrServerClosed {
		s.defaultLogger.Errorw("Serve failed", "error", err, "addr", listener.Addr().String())
	} else {
		s.defaultLogger.Infow("Serve stopped", "addr", listener.Addr().String())
	}
}

func (s *Service) runHttpServer() error {
	ctx := s.serverCtx
	log := logging.FromCtx(ctx)
	cfg := s.config

	var address string
	var err error
	if s.listener == nil {
		if cfg.Port == 0 {
			return RiverError(Err_BAD_CONFIG, "Port is not set")
		}

		address = fmt.Sprintf("%s:%d", cfg.Address, cfg.Port)

		s.listener, err = s.createListener(address)
		if err != nil {
			return err
		}
	} else {
		if cfg.Port != 0 {
			log.Warnw("Port is ignored when listener is provided")
		}

		s.onClose(s.listener.Close)
	}

	mux := http.NewServeMux()
	s.mux = mux

	mux.HandleFunc("/info", s.handleInfo)
	mux.HandleFunc("/status", s.handleStatus)

	if cfg.Metrics.Enabled && !cfg.Metrics.DisablePublic {
		mux.Handle("/metrics", s.metricsPublisher.CreateHandler())
	}

	// Build allowed headers for CORS, optionally including the test-bypass header when enabled.
	allowedHeaders := []string{
		"Origin",
		"X-Requested-With",
		"Accept",
		"Content-Type",
		"X-Grpc-Web",
		"X-User-Agent",
		"User-Agent",
		"Connect-Protocol-Version",
		"Connect-Timeout-Ms",
		"x-river-request-id",
		"Authorization",
		headers.RiverUseSharedSyncHeaderName, // TODO: remove after the legacy syncer is removed
		headers.RiverClientVersionHeader,
	}
	if s.config.TestEntitlementsBypassSecret != "" {
		allowedHeaders = append(allowedHeaders, headers.RiverTestBypassHeaderName)
	}

	corsMiddleware := cors.New(cors.Options{
		AllowCredentials: false,
		Debug:            cfg.Log.Level == "debug",
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
		// AllowedHeaders: []string{"*"} also works for CORS issues w/ OPTIONS requests
		AllowedHeaders: allowedHeaders,
	})

	handler := corsMiddleware.Handler(mux)

	s.httpServer, err = s.createHttpServer(s.listener, handler)
	if err != nil {
		return err
	}

	s.onClose(s.httpServerClose)
	return nil
}

func (s *Service) initEntitlements() error {
	var err error
	s.entitlementEvaluator, err = entitlement.NewEvaluatorFromConfig(
		s.serverCtx,
		s.config,
		s.chainConfig,
		s.metrics,
		s.otelTracer,
	)
	if err != nil {
		return err
	}
	return nil
}

func (s *Service) initStore() error {
	ctx := s.serverCtx
	log := s.defaultLogger

	switch s.config.StorageType {
	case storage.StreamStorageTypePostgres:
		store, err := storage.NewPostgresStreamStore(
			ctx,
			s.storagePoolInfo,
			s.instanceId,
			s.exitSignal,
			s.metrics,
			s.chainConfig,
			&s.config.ExternalMediaStreamStorage,
			s.config.TrimmingBatchSize,
		)
		if err != nil {
			return err
		}
		s.storage = store
		s.onClose(store.Close)

		streamsCount, err := store.GetStreamsNumber(ctx)
		if err != nil {
			return err
		}

		if !s.config.Log.Simplify {
			log.Infow(
				"Created postgres event store",
				"schema",
				s.storagePoolInfo.Schema,
				"totalStreamsCount",
				streamsCount,
			)
		}
		return nil
	default:
		return RiverError(
			Err_BAD_CONFIG,
			"Unknown storage type",
			"storageType",
			s.config.StorageType,
		).Func("createStore")
	}
}

func (s *Service) initNotificationsStore() error {
	ctx := s.serverCtx
	log := s.defaultLogger

	switch s.config.StorageType {
	case storage.NotificationStorageTypePostgres:
		pgstore, err := storage.NewPostgresNotificationStore(
			ctx,
			s.storagePoolInfo,
			s.exitSignal,
			s.metrics,
		)
		if err != nil {
			return err
		}

		s.notifications = notifications.NewUserPreferencesCache(pgstore)
		s.onClose(pgstore.Close)

		if !s.config.Log.Simplify {
			log.Infow(
				"Created postgres notifications store",
				"schema",
				s.storagePoolInfo.Schema,
			)
		}
		return nil
	default:
		return RiverError(
			Err_BAD_CONFIG,
			"Unknown storage type",
			"storageType",
			s.config.StorageType,
		).Func("createStore")
	}
}

func (s *Service) initAppRegistryStore() error {
	ctx := s.serverCtx
	log := s.defaultLogger

	switch s.config.StorageType {
	case storage.AppRegistryStorageTypePostgres:
		pgstore, err := storage.NewPostgresAppRegistryStore(
			ctx,
			s.storagePoolInfo,
			s.exitSignal,
			s.metrics,
		)
		if err != nil {
			return err
		}
		s.onClose(pgstore.Close)
		s.appStore = pgstore

		if !s.config.Log.Simplify {
			log.Infow(
				"Created postgres app registry store",
				"schema",
				s.storagePoolInfo.Schema,
			)
		}
		return nil
	default:
		return RiverError(
			Err_BAD_CONFIG,
			"Unknown storage type",
			"storageType",
			s.config.StorageType,
		).Func("createStore")
	}
}

func (s *Service) initCacheAndSync(opts *ServerStartOpts) error {
	cacheParams := &events.StreamCacheParams{
		ServerCtx:               s.serverCtx,
		Storage:                 s.storage,
		Wallet:                  s.wallet,
		RiverChain:              s.riverChain,
		Registry:                s.registryContract,
		ChainConfig:             s.chainConfig,
		Config:                  s.config,
		AppliedBlockNum:         s.riverChain.InitialBlockNum,
		ChainMonitor:            s.riverChain.ChainMonitor,
		Metrics:                 s.metrics,
		RemoteMiniblockProvider: remoteprovider.NewRemoteProvider(s.nodeRegistry),
		Tracer:                  s.otelTracer,
	}

	s.cache = events.NewStreamCache(cacheParams)

	// There is circular dependency between the cache and the scrubber, so the scrubber
	// needs to be patched into cache params after the cache is created.
	if opts != nil && opts.ScrubberMaker != nil {
		cacheParams.Scrubber = opts.ScrubberMaker(s.serverCtx, s)
	} else {
		cacheParams.Scrubber = scrub.NewStreamMembershipScrubTasksProcessor(
			s.serverCtx,
			s.cache,
			s,
			s.chainAuth,
			s.config,
			s.metrics,
			s.otelTracer,
		)
	}

	err := s.cache.Start(s.serverCtx, nil)
	if err != nil {
		return err
	}

	s.syncv3Svc = syncv3.NewService(
		s.serverCtx,
		s.wallet.Address,
		s.cache,
		s.nodeRegistry,
		s.metrics,
		s.otelTracer,
	)

	return nil
}

func (s *Service) initHandlers() {
	ii := []connect.Interceptor{}
	if s.otelConnectIterceptor != nil {
		ii = append(ii, s.otelConnectIterceptor)
	}
	ii = append(ii, s.NewMetricsInterceptor())
	ii = append(ii, NewTimeoutInterceptor(s.config.Network.RequestTimeout))
	// Base interceptors used for all services
	baseInterceptors := ii

	// Stream service interceptors, optionally include test-bypass only for StreamService
	streamInterceptors := append([]connect.Interceptor{}, baseInterceptors...)
	if s.config.TestEntitlementsBypassSecret != "" {
		streamInterceptors = append(streamInterceptors, auth.NewTestBypassInterceptor(
			s.config.TestEntitlementsBypassSecret,
		))
	}

	streamServicePattern, streamServiceHandler := protocolconnect.NewStreamServiceHandler(
		s,
		connect.WithInterceptors(streamInterceptors...),
	)
	s.mux.Handle(streamServicePattern, newHttpHandler(streamServiceHandler, s.defaultLogger))

	// NodeToNode handler uses only base interceptors (no test-bypass)
	nodeServicePattern, nodeServiceHandler := protocolconnect.NewNodeToNodeHandler(
		s,
		connect.WithInterceptors(baseInterceptors...),
	)
	if s.chainConfig.Get().ServerEnableNode2NodeAuth == 1 {
		s.defaultLogger.Info("Enabling node2node authentication")
		nodeServiceHandler = node2nodeauth.RequireCertMiddleware(nodeServiceHandler)
	}
	s.mux.Handle(nodeServicePattern, newHttpHandler(nodeServiceHandler, s.defaultLogger))

	s.registerDebugHandlers()
}

func (s *Service) initNotificationHandlers() error {
	var ii []connect.Interceptor
	if s.otelConnectIterceptor != nil {
		ii = append(ii, s.otelConnectIterceptor)
	}
	ii = append(ii, s.NewMetricsInterceptor())
	ii = append(ii, NewTimeoutInterceptor(s.config.Network.RequestTimeout))

	authInceptor, err := authentication.NewAuthenticationInterceptor(
		s.NotificationService.ShortServiceName(),
		s.config.Notifications.Authentication.SessionToken.Key.Algorithm,
		s.config.Notifications.Authentication.SessionToken.Key.Key,
	)
	if err != nil {
		return err
	}

	ii = append(ii, authInceptor)

	interceptors := connect.WithInterceptors(ii...)
	notificationServicePattern, notificationServiceHandler := protocolconnect.NewNotificationServiceHandler(
		s.NotificationService,
		interceptors,
	)
	notificationAuthServicePattern, notificationAuthServiceHandler := protocolconnect.NewAuthenticationServiceHandler(
		s.NotificationService,
		interceptors,
	)

	s.mux.Handle(notificationServicePattern, newHttpHandler(notificationServiceHandler, s.defaultLogger))
	s.mux.Handle(notificationAuthServicePattern, newHttpHandler(notificationAuthServiceHandler, s.defaultLogger))

	s.registerDebugHandlers()

	return nil
}

func (s *Service) initAppRegistryHandlers() error {
	var ii []connect.Interceptor
	if s.otelConnectIterceptor != nil {
		ii = append(ii, s.otelConnectIterceptor)
	}
	ii = append(ii, s.NewMetricsInterceptor())
	ii = append(ii, NewTimeoutInterceptor(s.config.Network.RequestTimeout))

	authInceptor, err := authentication.NewAuthenticationInterceptor(
		s.AppRegistryService.ShortServiceName(),
		s.config.AppRegistry.Authentication.SessionToken.Key.Algorithm,
		s.config.AppRegistry.Authentication.SessionToken.Key.Key,
		"/river.AppRegistryService/GetStatus",
		"/river.AppRegistryService/GetAppMetadata",
		"/river.AppRegistryService/ValidateBotName",
	)
	if err != nil {
		return err
	}
	ii = append(ii, authInceptor)

	interceptors := connect.WithInterceptors(ii...)

	AppRegistryServicePattern, AppRegistryServiceHandler := protocolconnect.NewAppRegistryServiceHandler(
		s.AppRegistryService,
		interceptors,
	)
	AppRegistryAuthServicePattern, AppRegistryAuthServiceHandler := protocolconnect.NewAuthenticationServiceHandler(
		s.AppRegistryService,
		interceptors,
	)

	s.mux.Handle(AppRegistryServicePattern, newHttpHandler(AppRegistryServiceHandler, s.defaultLogger))
	s.mux.Handle(AppRegistryAuthServicePattern, newHttpHandler(AppRegistryAuthServiceHandler, s.defaultLogger))

	// s.registerDebugHandlers(s.config.EnableDebugEndpoints, s.config.DebugEndpoints)

	return nil
}

type ServerStartOpts struct {
	RiverChain              *crypto.Blockchain
	Listener                net.Listener
	HttpClientMaker         HttpClientMakerFunc
	HttpClientMakerWithCert HttpClientMakerWithCertFunc
	ScrubberMaker           func(context.Context, *Service) events.Scrubber
	StreamEventListener     track_streams.StreamEventListener
}

// StartServer starts the server with the given configuration.
// opts can be provided for testing purposes.
// Returns Service.
// Service.Close should be called to close listener, db connection and stop the server.
// Error is posted to Service.exitSignal if DB conflict is detected (newer instance is started)
// and server must exit.
func StartServer(
	ctx context.Context,
	ctxCancel context.CancelFunc,
	cfg *config.Config,
	opts *ServerStartOpts,
) (*Service, error) {
	ctx = config.CtxWithConfig(ctx, cfg)

	streamService := &Service{
		serverCtx:       ctx,
		serverCtxCancel: ctxCancel,
		config:          cfg,
		exitSignal:      make(chan error, 16),
	}

	err := streamService.start(opts)
	if err != nil {
		streamService.Close()
		return nil, err
	}

	return streamService, nil
}

func loadCertFromBase64(
	certStringBase64 string,
	keyStringBase64 string,
) (*tls.Certificate, error) {
	certBytes, err := base64.StdEncoding.DecodeString(certStringBase64)
	if err != nil {
		return nil, err
	}
	keyBytes, err := base64.StdEncoding.DecodeString(keyStringBase64)
	if err != nil {
		return nil, err
	}

	// Load the certificate and key from strings
	cert, err := tls.X509KeyPair(certBytes, keyBytes)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to create X509KeyPair from strings").
			Func("loadCertFromBase64")
	}

	return &cert, nil
}

func loadCertFromFiles(
	certFile string,
	keyFile string,
) (*tls.Certificate, error) {
	// Read certificate and key from files
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to LoadX509KeyPair from files").
			Func("loadCertFromFiles")
	}
	return &cert, nil
}

// Struct to match the JSON structure.
type CertKey struct {
	Cert string `json:"cert"`
	Key  string `json:"key"`
}

func (s *Service) getServerName() string {
	name := "name_not_set"
	if s.wallet != nil {
		name = s.wallet.String()
	}
	if s.mode == ServerModeArchive && s.config.Archive.ArchiveId != "" {
		name = s.config.Archive.ArchiveId
	}
	return fmt.Sprintf("%s_%s", s.mode, name)
}
