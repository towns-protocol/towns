package rpc

import (
	"context"
	"net"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/app_registry"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

func (s *Service) startAppRegistryMode(opts *ServerStartOpts) error {
	var err error
	s.startTime = time.Now()

	s.initInstance(ServerModeAppRegistry, opts)

	err = s.initRiverChain()
	if err != nil {
		return AsRiverError(err).Message("Failed to init river chain").LogError(s.defaultLogger)
	}

	err = s.initBaseChain()
	if err != nil {
		return AsRiverError(err).Message("Failed to init base chain").LogError(s.defaultLogger)
	}

	// At this time, the app registry database requires serializable isolation level in order
	// for the postgres implementation of message queueing to function properly. It's possible
	// this could be relaxed with row locking.
	if s.config.Database.IsolationLevel != "serializable" {
		logging.FromCtx(s.serverCtx).
			Warnw("Minimum isolation level of postgres for app registry service is serializable, setting to serializable", "configuredLevel", s.config.Database.IsolationLevel)
		s.config.Database.IsolationLevel = "serializable"
	}

	err = s.prepareStore()
	if err != nil {
		return err
	}

	err = s.initAppRegistryStore()
	if err != nil {
		return AsRiverError(err).Message("Failed to init store").LogError(s.defaultLogger)
	}

	httpClient, err := s.httpClientMaker(s.serverCtx, s.config)
	if err != nil {
		return err
	}

	var registries []nodes.NodeRegistry
	for range 11 {
		registry, err := nodes.LoadNodeRegistry(
			s.serverCtx,
			s.registryContract,
			common.Address{},
			s.riverChain.InitialBlockNum,
			s.riverChain.ChainMonitor,
			s.chainConfig,
			httpClient,
			httpClient,
			s.otelConnectIterceptor,
		)
		if err != nil {
			return err
		}

		registries = append(registries, registry)
	}

	var streamEventListener track_streams.StreamEventListener
	if opts != nil {
		streamEventListener = opts.StreamEventListener
	}

	// If insecure webhook calls are desired, override the configured http client with an h2c client.
	webhookHttpClient := httpClient
	if s.config.AppRegistry.AllowInsecureWebhooks {
		if webhookHttpClient, err = http_client.GetH2cHttpClient(s.serverCtx, s.config); err != nil {
			return AsRiverError(err).Message("Failed to initialize webhook http client")
		}
		// Go routine clean-up of client connections on server shutdown.
		s.onClose(webhookHttpClient.CloseIdleConnections)
	}

	if s.AppRegistryService, err = app_registry.NewService(
		s.serverCtx,
		s.config.AppRegistry,
		s.chainConfig,
		s.appStore,
		s.registryContract,
		registries,
		s.metrics,
		streamEventListener,
		webhookHttpClient,
		s.baseChain,
		&s.config.AppRegistryContract,
	); err != nil {
		return AsRiverError(err).Message("Failed to instantiate app registry service").LogError(s.defaultLogger)
	}

	s.SetStatus("OK")

	err = s.runHttpServer()
	if err != nil {
		return AsRiverError(err).Message("Failed to run http server").LogError(s.defaultLogger)
	}

	if err := s.initAppRegistryHandlers(); err != nil {
		return err
	}

	s.AppRegistryService.Start(s.serverCtx)

	// Retrieve the TCP address of the listener
	tcpAddr := s.listener.Addr().(*net.TCPAddr)

	// Get the port as an integer
	port := tcpAddr.Port

	// build the url by converting the integer to a string
	url := s.config.UrlSchema() + "://localhost:" + strconv.Itoa(port)
	s.defaultLogger.Infow("Server started", "port", port, "https", !s.config.DisableHttps, "url", url)

	return nil
}

func StartServerInAppRegistryMode(
	ctx context.Context,
	cfg *config.Config,
	opts *ServerStartOpts,
) (*Service, error) {
	ctx = config.CtxWithConfig(ctx, cfg)
	ctx, ctxCancel := context.WithCancel(ctx)

	service := &Service{
		serverCtx:       ctx,
		serverCtxCancel: ctxCancel,
		config:          cfg,
		exitSignal:      make(chan error, 1),
	}

	err := service.startAppRegistryMode(opts)
	if err != nil {
		service.Close()
		return nil, err
	}

	return service, nil
}

func RunAppRegistryService(ctx context.Context, cfg *config.Config) error {
	log := logging.FromCtx(ctx)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	service, err := StartServerInAppRegistryMode(ctx, cfg, nil)
	if err != nil {
		log.Errorw("Failed to start server", "error", err)
		return err
	}
	defer service.Close()

	osSignal := make(chan os.Signal, 1)
	signal.Notify(osSignal, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-osSignal
		log.Infow("Got OS signal", "signal", sig.String())
		service.exitSignal <- nil
	}()

	err = <-service.exitSignal
	return err
}
