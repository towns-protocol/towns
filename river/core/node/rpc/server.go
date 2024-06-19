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
	"os/signal"
	"strings"
	"syscall"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/auth"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/registries"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/xchain/entitlement"
	"github.com/rs/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	httptrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/net/http"
)

const (
	ServerModeFull    = "full"
	ServerModeInfo    = "info"
	ServerModeArchive = "archive"
)

func (s *Service) Close() {
	if s.httpServer != nil {
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
		s.defaultLogger.Info("Shutting down http server", "timeout", timeout)
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
			s.defaultLogger.Info("http server shutdown")
		}
	}

	// Try closing listener just in case: maybe httpServer was not started
	if s.listener != nil {
		s.listener.Close()
	}

	if s.storage != nil {
		s.storage.Close(s.serverCtx)
	}

	s.defaultLogger.Info("Server closed")
}

func (s *Service) start() error {
	s.startTime = time.Now()

	s.initInstance(ServerModeFull)

	err := s.initWallet()
	if err != nil {
		return AsRiverError(err).Message("Failed to init wallet").LogError(s.defaultLogger)
	}

	err = s.initEntitlements()
	if err != nil {
		return AsRiverError(err).Message("Failed to init entitlements").LogError(s.defaultLogger)
	}

	err = s.initBaseChain()
	if err != nil {
		return AsRiverError(err).Message("Failed to init base chain").LogError(s.defaultLogger)
	}

	err = s.initRiverChain()
	if err != nil {
		return AsRiverError(err).Message("Failed to init river chain").LogError(s.defaultLogger)
	}

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

	go s.riverChain.ChainMonitor.RunWithBlockPeriod(
		s.serverCtx,
		s.riverChain.Client,
		s.riverChain.InitialBlockNum,
		time.Duration(s.riverChain.Config.BlockTimeMs)*time.Millisecond,
		s.metrics,
	)

	s.initHandlers()

	s.SetStatus("OK")

	// Retrieve the TCP address of the listener
	tcpAddr := s.listener.Addr().(*net.TCPAddr)

	// Get the port as an integer
	port := tcpAddr.Port
	s.defaultLogger.Info("Server started", "port", port, "https", s.config.UseHttps)
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
	s.defaultLogger = dlog.FromCtx(s.serverCtx).With(
		"port", port,
		"instanceId", s.instanceId,
		"nodeType", "stream",
		"mode", mode,
	)
	s.serverCtx = dlog.CtxWithLog(s.serverCtx, s.defaultLogger)
	s.defaultLogger.Info("Starting server", "config", s.config, "mode", mode)

	subsystem := mode
	if mode == ServerModeFull {
		subsystem = "stream"
	}
	s.metrics = infra.NewMetrics("river", subsystem)
	s.metrics.StartMetricsServer(s.serverCtx, s.config.Metrics)
	s.rpcDuration = s.metrics.NewHistogramVecEx(
		"rpc_duration_seconds",
		"RPC duration in seconds",
		infra.DefaultDurationBucketsSeconds,
		"method",
	)
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
	s.defaultLogger = s.defaultLogger.With("nodeAddress", wallet.Address.Hex())
	s.serverCtx = dlog.CtxWithLog(ctx, s.defaultLogger)
	slog.SetDefault(s.defaultLogger)

	return nil
}

func (s *Service) initBaseChain() error {
	ctx := s.serverCtx
	cfg := s.config

	if !s.config.DisableBaseChain {
		var err error
		s.baseChain, err = crypto.NewBlockchain(ctx, &s.config.BaseChain, nil, s.metrics)
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
		s.riverChain, err = crypto.NewBlockchain(ctx, &s.config.RiverChain, s.wallet, s.metrics)
		if err != nil {
			return err
		}
	}

	s.registryContract, err = registries.NewRiverRegistryContract(ctx, s.riverChain, &s.config.RegistryContract)
	if err != nil {
		return err
	}

	var walletAddress common.Address
	if s.wallet != nil {
		walletAddress = s.wallet.Address
	}
	s.nodeRegistry, err = nodes.LoadNodeRegistry(
		ctx, s.registryContract, walletAddress, s.riverChain.InitialBlockNum, s.riverChain.ChainMonitor)
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

		pool, err := storage.CreateAndValidatePgxPool(s.serverCtx, &s.config.Database, schema)
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
		log.Info("Listening", "addr", address)
	} else {
		if cfg.Port != 0 {
			log.Warn("Port is ignored when listener is provided")
		}
	}

	mux := httptrace.NewServeMux(
		httptrace.WithResourceNamer(
			func(r *http.Request) string {
				return r.Method + " " + r.URL.Path
			},
		),
	)
	s.mux = mux

	mux.HandleFunc("/info", s.handleInfo)
	mux.HandleFunc("/status", s.handleStatus)

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
			"x-river-request-id",
		},
	})

	address := fmt.Sprintf("%s:%d", cfg.Address, cfg.Port)
	if cfg.UseHttps {
		log.Info("Using TLS server")
		if (cfg.TLSConfig.Cert == "") || (cfg.TLSConfig.Key == "") {
			return RiverError(Err_BAD_CONFIG, "TLSConfig.Cert and TLSConfig.Key must be set if UseHttps is true")
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

		go s.serveTLS()

		return nil
	} else {
		log.Info("Using H2C server")
		s.httpServer, err = createH2CServer(ctx, address, corsMiddleware.Handler(mux))
		if err != nil {
			return err
		}

		go s.serveH2C()

		return nil
	}
}

func (s *Service) serveTLS() {
	// Run the server with graceful shutdown
	err := s.httpServer.ServeTLS(s.listener, "", "")
	if err != nil && err != http.ErrServerClosed {
		s.defaultLogger.Error("ServeTLS failed", "err", err)
	} else {
		s.defaultLogger.Info("ServeTLS stopped")
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
	s.entitlementEvaluator, err = entitlement.NewEvaluatorFromConfig(s.serverCtx, s.config, s.metrics)
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
		store, err := storage.NewPostgresEventStore(ctx, s.storagePoolInfo, s.instanceId, s.exitSignal, s.metrics)
		if err != nil {
			return err
		}
		s.storage = store

		streamsCount, err := store.GetStreamsNumber(ctx)
		if err != nil {
			return err
		}

		log.Info("Created postgres event store", "schema", s.storagePoolInfo.Schema, "totalStreamsCount", streamsCount)
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
			Storage:     s.storage,
			Wallet:      s.wallet,
			RiverChain:  s.riverChain,
			Registry:    s.registryContract,
			ChainConfig: s.chainConfig,
		},
		s.riverChain.InitialBlockNum,
		s.riverChain.ChainMonitor,
		s.metrics,
	)
	if err != nil {
		return err
	}

	s.syncHandler = NewSyncHandler(
		s.wallet,
		s.cache,
		s.nodeRegistry,
		s.streamRegistry,
	)

	return nil
}

func (s *Service) initHandlers() {
	interceptors := connect.WithInterceptors(
		s.NewMetricsInterceptor(),
		NewTimeoutInterceptor(s.config.Network.RequestTimeout),
	)
	streamServicePattern, streamServiceHandler := protocolconnect.NewStreamServiceHandler(s, interceptors)
	s.mux.Handle(streamServicePattern, newHttpHandler(streamServiceHandler, s.defaultLogger, s.metrics))

	nodeServicePattern, nodeServiceHandler := protocolconnect.NewNodeToNodeHandler(s, interceptors)
	s.mux.Handle(nodeServicePattern, newHttpHandler(nodeServiceHandler, s.defaultLogger, s.metrics))

	s.registerDebugHandlers(s.config.EnableDebugEndpoints)
}

// StartServer starts the server with the given configuration.
// riverchain and listener can be provided for testing purposes.
// Returns Service.
// Service.Close should be called to close listener, db connection and stop stop the server.
// Error is posted to Serivce.exitSignal if DB conflict is detected (newer instance is started)
// and server must exit.
func StartServer(
	ctx context.Context,
	cfg *config.Config,
	riverChain *crypto.Blockchain,
	listener net.Listener,
) (*Service, error) {
	streamService := &Service{
		serverCtx:  ctx,
		config:     cfg,
		riverChain: riverChain,
		listener:   listener,
		exitSignal: make(chan error, 1),
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
	}, nil
}

// Struct to match the JSON structure.
type CertKey struct {
	Cert string `json:"cert"`
	Key  string `json:"key"`
}

func RunServer(ctx context.Context, cfg *config.Config) error {
	log := dlog.FromCtx(ctx)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	service, error := StartServer(ctx, cfg, nil, nil)
	if error != nil {
		log.Error("Failed to start server", "error", error)
		return error
	}
	defer service.Close()

	osSignal := make(chan os.Signal, 1)
	signal.Notify(osSignal, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-osSignal
		log.Info("Got OS signal", "signal", sig.String())
		service.exitSignal <- nil
	}()

	return <-service.exitSignal
}
