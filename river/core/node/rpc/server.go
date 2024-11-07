package rpc

import (
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"slices"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/rs/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/auth"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/registries"
	"github.com/river-build/river/core/node/rpc/sync"
	"github.com/river-build/river/core/node/scrub"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/xchain/entitlement"
)

const (
	ServerModeFull    = "full"
	ServerModeInfo    = "info"
	ServerModeArchive = "archive"
)

func (s *Service) httpServerClose() {
	timeout := s.config.ShutdownTimeout
	if timeout == 0 {
		timeout = time.Second
	} else if timeout <= time.Millisecond {
		timeout = 0
	}
	ctx := s.serverCtx
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(s.serverCtx, timeout)
		defer cancel()
	}
	if !s.config.Log.Simplify {
		s.defaultLogger.Info("Shutting down http server", "timeout", timeout)
	}
	err := s.httpServer.Shutdown(ctx)
	if err != nil {
		if err != context.DeadlineExceeded {
			s.defaultLogger.Error("failed to shutdown http server", "error", err)
		}
		s.defaultLogger.Warn("forcing http server close")
		err = s.httpServer.Close()
		if err != nil {
			s.defaultLogger.Error("failed to close http server", "error", err)
		}
	} else {
		if !s.config.Log.Simplify {
			s.defaultLogger.Info("http server shutdown")
		}
	}
}

func (s *Service) Close() {
	onClose := s.onCloseFuncs
	slices.Reverse(onClose)
	for _, f := range onClose {
		f()
	}

	if !s.config.Log.Simplify {
		s.defaultLogger.Info("Server closed")
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

func (s *Service) start() error {
	s.startTime = time.Now()

	s.initInstance(ServerModeFull)

	err := s.initWallet()
	if err != nil {
		return AsRiverError(err).Message("Failed to init wallet").LogError(s.defaultLogger)
	}

	s.initTracing()

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

	err = s.initCacheAndSync()
	if err != nil {
		return AsRiverError(err).Message("Failed to init cache and sync").LogError(s.defaultLogger)
	}

	s.riverChain.StartChainMonitor(s.serverCtx)

	s.initHandlers()

	if err := s.initScrubbing(s.serverCtx); err != nil {
		return AsRiverError(err).Message("Failed to initialize scrubbing").LogError(s.defaultLogger)
	}

	s.SetStatus("OK")

	addr := s.listener.Addr().String()
	if strings.HasPrefix(addr, "[::]") {
		addr = "localhost" + addr[4:]
	}
	addr = s.config.UrlSchema() + "://" + addr
	s.defaultLogger.Info("Server started", "addr", addr+"/debug/multi")
	return nil
}

func (s *Service) initInstance(mode string) {
	s.mode = mode
	s.instanceId = GenShortNanoid()
	port := s.config.Port
	if port == 0 && s.listener != nil {
		addr := s.listener.Addr().(*net.TCPAddr)
		if addr != nil {
			port = addr.Port
		}
	}
	if !s.config.Log.Simplify {
		s.defaultLogger = dlog.FromCtx(s.serverCtx).With(
			"instanceId", s.instanceId,
			"nodeType", "stream",
			"mode", mode,
		)
	} else {
		s.defaultLogger = dlog.FromCtx(s.serverCtx).With(
			"port", port,
		)
	}
	s.serverCtx = dlog.CtxWithLog(s.serverCtx, s.defaultLogger)
	s.defaultLogger.Info(
		"Starting server",
		"config", s.config,
		"mode", mode,
	)

	subsystem := mode
	if mode == ServerModeFull {
		subsystem = "stream"
	}
	metricsRegistry := prometheus.NewRegistry()
	s.metrics = infra.NewMetricsFactory(metricsRegistry, "river", subsystem)
	s.metricsPublisher = infra.NewMetricsPublisher(metricsRegistry)
	s.metricsPublisher.StartMetricsServer(s.serverCtx, s.config.Metrics)
}

func (s *Service) initWallet() error {
	ctx := s.serverCtx
	var wallet *crypto.Wallet
	var err error
	if s.riverChain == nil {
		// Read env var WALLETPRIVATEKEY or PRIVATE_KEY
		privKey := os.Getenv("WALLETPRIVATEKEY")
		if privKey == "" {
			privKey = os.Getenv("PRIVATE_KEY")
		}
		if privKey != "" {
			wallet, err = crypto.NewWalletFromPrivKey(ctx, privKey)
		} else {
			wallet, err = crypto.LoadWallet(ctx, crypto.WALLET_PATH_PRIVATE_KEY)
		}
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
		s.serverCtx = dlog.CtxWithLog(ctx, s.defaultLogger)
		slog.SetDefault(s.defaultLogger)
	}

	return nil
}

func (s *Service) initBaseChain() error {
	ctx := s.serverCtx
	cfg := s.config

	if !s.config.DisableBaseChain {
		var err error
		s.baseChain, err = crypto.NewBlockchain(ctx, &s.config.BaseChain, nil, s.metrics, s.otelTracer)
		if err != nil {
			return err
		}

		chainAuth, err := auth.NewChainAuth(
			ctx,
			s.baseChain,
			s.entitlementEvaluator,
			&cfg.ArchitectContract,
			cfg.BaseChain.LinkedWalletsLimit,
			cfg.BaseChain.ContractCallsTimeoutMs,
			s.metrics,
		)
		if err != nil {
			return err
		}
		s.chainAuth = chainAuth
		return nil
	} else {
		s.defaultLogger.Warn("Using fake auth for testing")
		s.chainAuth = auth.NewFakeChainAuth()
		return nil
	}
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

	var walletAddress common.Address
	if s.wallet != nil {
		walletAddress = s.wallet.Address
	}
	s.nodeRegistry, err = nodes.LoadNodeRegistry(
		ctx,
		s.registryContract,
		walletAddress,
		s.riverChain.InitialBlockNum,
		s.riverChain.ChainMonitor,
		s.otelConnectIterceptor,
	)
	if err != nil {
		return err
	}

	s.chainConfig, err = crypto.NewOnChainConfig(
		ctx, s.riverChain.Client, s.registryContract.Address, s.riverChain.InitialBlockNum, s.riverChain.ChainMonitor)
	if err != nil {
		return err
	}

	s.streamRegistry = nodes.NewStreamRegistry(
		walletAddress,
		s.nodeRegistry,
		s.registryContract,
		s.chainConfig,
	)

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

func (s *Service) runHttpServer() error {
	ctx := s.serverCtx
	log := dlog.FromCtx(ctx)
	cfg := s.config

	var err error
	if s.listener == nil {
		if cfg.Port == 0 {
			return RiverError(Err_BAD_CONFIG, "Port is not set")
		}
		address := fmt.Sprintf("%s:%d", cfg.Address, cfg.Port)
		s.listener, err = net.Listen("tcp", address)
		if err != nil {
			return err
		}
		if !cfg.Log.Simplify {
			log.Info("Listening", "addr", address)
		}
	} else {
		if cfg.Port != 0 {
			log.Warn("Port is ignored when listener is provided")
		}
	}
	s.onClose(s.listener.Close)

	mux := http.NewServeMux()
	s.mux = mux

	mux.HandleFunc("/info", s.handleInfo)
	mux.HandleFunc("/status", s.handleStatus)

	if cfg.Metrics.Enabled && !cfg.Metrics.DisablePublic {
		mux.Handle("/metrics", s.metricsPublisher.CreateHandler())
	}

	corsMiddleware := cors.New(cors.Options{
		AllowCredentials: false,
		Debug:            cfg.Log.Level == "debug",
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
		// AllowedHeaders: []string{"*"} also works for CORS issues w/ OPTIONS requests
		AllowedHeaders: []string{
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
		},
	})

	address := fmt.Sprintf("%s:%d", cfg.Address, cfg.Port)
	if !cfg.DisableHttps {
		if !s.config.Log.Simplify {
			log.Info("Using TLS server")
		}
		if (cfg.TLSConfig.Cert == "") || (cfg.TLSConfig.Key == "") {
			return RiverError(
				Err_BAD_CONFIG, "TLSConfig.Cert and TLSConfig.Key must be set if HTTPS is enabled",
			)
		}

		// Base 64 encoding can't contain ., if . is present then it's assumed it's a file path
		if strings.Contains(cfg.TLSConfig.Cert, ".") || strings.Contains(cfg.TLSConfig.Key, ".") {
			s.httpServer, err = createServerFromFile(
				ctx,
				address,
				corsMiddleware.Handler(mux),
				cfg.TLSConfig.Cert,
				cfg.TLSConfig.Key,
			)
			if err != nil {
				return err
			}
		} else {
			s.httpServer, err = createServerFromBase64(ctx, address, corsMiddleware.Handler(mux), cfg.TLSConfig.Cert, cfg.TLSConfig.Key)
			if err != nil {
				return err
			}
		}

		// ensure that x/http2 is used
		// https://github.com/golang/go/issues/42534
		err = http2.ConfigureServer(s.httpServer, nil)
		if err != nil {
			return err
		}

		go s.serveTLS()
	} else {
		log.Info("Using H2C server")
		s.httpServer, err = createH2CServer(ctx, address, corsMiddleware.Handler(mux))
		if err != nil {
			return err
		}

		go s.serveH2C()
	}

	s.onClose(s.httpServerClose)
	return nil
}

func (s *Service) serveTLS() {
	// Run the server with graceful shutdown
	err := s.httpServer.ServeTLS(s.listener, "", "")
	if err != nil && err != http.ErrServerClosed {
		s.defaultLogger.Error("ServeTLS failed", "err", err)
	} else {
		if !s.config.Log.Simplify {
			s.defaultLogger.Info("ServeTLS stopped")
		}
	}
}

func (s *Service) serveH2C() {
	// Run the server with graceful shutdown
	err := s.httpServer.Serve(s.listener)
	if err != nil && err != http.ErrServerClosed {
		s.defaultLogger.Error("serveH2C failed", "err", err)
	} else {
		s.defaultLogger.Info("serveH2C stopped")
	}
}

func (s *Service) initEntitlements() error {
	var err error
	s.entitlementEvaluator, err = entitlement.NewEvaluatorFromConfig(s.serverCtx, s.config, s.chainConfig, s.metrics)
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
			log.Info(
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

func (s *Service) initCacheAndSync() error {
	var err error
	s.cache, err = events.NewStreamCache(
		s.serverCtx,
		&events.StreamCacheParams{
			Storage:                 s.storage,
			Wallet:                  s.wallet,
			RiverChain:              s.riverChain,
			Registry:                s.registryContract,
			ChainConfig:             s.chainConfig,
			Config:                  s.config,
			AppliedBlockNum:         s.riverChain.InitialBlockNum,
			ChainMonitor:            s.riverChain.ChainMonitor,
			Metrics:                 s.metrics,
			RemoteMiniblockProvider: s,
		},
	)
	if err != nil {
		return err
	}

	s.mbProducer = events.NewMiniblockProducer(s.serverCtx, s.cache, nil)

	s.syncHandler = sync.NewHandler(
		s.wallet.Address,
		s.cache,
		s.nodeRegistry,
		s.otelTracer,
	)

	return nil
}

func (s *Service) initScrubbing(ctx context.Context) (err error) {
	ctx, cancel := context.WithCancel(ctx)
	s.onClose(cancel)

	s.scrubTaskProcessor, err = scrub.NewStreamScrubTasksProcessor(
		ctx,
		s.cache,
		s,
		s.chainAuth,
		s.config,
		s.metrics,
		s.otelTracer,
		s.wallet.Address,
	)
	if err != nil {
		return AsRiverError(err, Err_BAD_CONFIG).Message("Unable to instantiate stream scrub task processor")
	}
	return nil
}

func (s *Service) initHandlers() {
	ii := []connect.Interceptor{}
	if s.otelConnectIterceptor != nil {
		ii = append(ii, s.otelConnectIterceptor)
	}
	ii = append(ii, s.NewMetricsInterceptor())
	ii = append(ii, NewTimeoutInterceptor(s.config.Network.RequestTimeout))

	interceptors := connect.WithInterceptors(ii...)
	streamServicePattern, streamServiceHandler := protocolconnect.NewStreamServiceHandler(s, interceptors)
	s.mux.Handle(streamServicePattern, newHttpHandler(streamServiceHandler, s.defaultLogger))

	nodeServicePattern, nodeServiceHandler := protocolconnect.NewNodeToNodeHandler(s, interceptors)
	s.mux.Handle(nodeServicePattern, newHttpHandler(nodeServiceHandler, s.defaultLogger))

	s.registerDebugHandlers(s.config.EnableDebugEndpoints, s.config.DebugEndpoints)
}

// StartServer starts the server with the given configuration.
// riverchain and listener can be provided for testing purposes.
// Returns Service.
// Service.Close should be called to close listener, db connection and stop the server.
// Error is posted to Service.exitSignal if DB conflict is detected (newer instance is started)
// and server must exit.
func StartServer(
	ctx context.Context,
	cfg *config.Config,
	riverChain *crypto.Blockchain,
	listener net.Listener,
) (*Service, error) {
	ctx = config.CtxWithConfig(ctx, cfg)

	streamService := &Service{
		serverCtx:  ctx,
		config:     cfg,
		riverChain: riverChain,
		listener:   listener,
		exitSignal: make(chan error, 16),
	}

	err := streamService.start()
	if err != nil {
		streamService.Close()
		return nil, err
	}

	return streamService, nil
}

func createServerFromBase64(
	ctx context.Context,
	address string,
	handler http.Handler,
	certStringBase64 string,
	keyStringBase64 string,
) (*http.Server, error) {
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
			Func("createServerFromStrings")
	}

	return &http.Server{
		Addr:    address,
		Handler: handler,
		TLSConfig: &tls.Config{
			Certificates: []tls.Certificate{cert},
		},
		BaseContext: func(listener net.Listener) context.Context {
			return ctx
		},
		ErrorLog: newHttpLogger(ctx),
	}, nil
}

func createServerFromFile(
	ctx context.Context,
	address string,
	handler http.Handler,
	certFile, keyFile string,
) (*http.Server, error) {
	// Read certificate and key from files
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_CONFIG).
			Message("Failed to LoadX509KeyPair from files").
			Func("createServerFromFile")
	}

	return &http.Server{
		Addr:    address,
		Handler: handler,
		TLSConfig: &tls.Config{
			Certificates: []tls.Certificate{cert},
		},
		BaseContext: func(listener net.Listener) context.Context {
			return ctx
		},
		ErrorLog: newHttpLogger(ctx),
	}, nil
}

func createH2CServer(ctx context.Context, address string, handler http.Handler) (*http.Server, error) {
	// Create an HTTP/2 server without TLS
	h2s := &http2.Server{}
	return &http.Server{
		Addr:    address,
		Handler: h2c.NewHandler(handler, h2s),
		BaseContext: func(listener net.Listener) context.Context {
			return ctx
		},
		ErrorLog: newHttpLogger(ctx),
	}, nil
}

// Struct to match the JSON structure.
type CertKey struct {
	Cert string `json:"cert"`
	Key  string `json:"key"`
}
