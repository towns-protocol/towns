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
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/bot_registry"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
)

func (s *Service) startBotRegistryMode(opts *ServerStartOpts) error {
	var err error
	s.startTime = time.Now()

	s.initInstance(ServerModeBotRegistry, opts)

	err = s.initRiverChain()
	if err != nil {
		return AsRiverError(err).Message("Failed to init river chain").LogError(s.defaultLogger)
	}

	err = s.prepareStore()
	if err != nil {
		return err
	}

	err = s.initBotRegistryStore()
	if err != nil {
		return AsRiverError(err).Message("Failed to init store").LogError(s.defaultLogger)
	}

	httpClient, err := s.httpClientMaker(s.serverCtx, s.config)
	if err != nil {
		return err
	}

	var registries []nodes.NodeRegistry
	for range 10 {
		registry, err := nodes.LoadNodeRegistry(
			s.serverCtx,
			s.registryContract,
			common.Address{},
			s.riverChain.InitialBlockNum,
			s.riverChain.ChainMonitor,
			httpClient,
			s.otelConnectIterceptor,
		)
		if err != nil {
			return err
		}

		registries = append(registries, registry)
	}

	if s.BotRegistryService, err = bot_registry.NewService(
		s.serverCtx,
		s.config.BotRegistry,
		s.chainConfig,
		s.botStore,
		s.registryContract,
		registries,
		s.metrics,
		opts.StreamEventListener,
	); err != nil {
		return AsRiverError(err).Message("Failed to instantiate bot registry service").LogError(s.defaultLogger)
	}

	s.SetStatus("OK")

	err = s.runHttpServer()
	if err != nil {
		return AsRiverError(err).Message("Failed to run http server").LogError(s.defaultLogger)
	}

	if err := s.initBotRegistryHandlers(); err != nil {
		return err
	}

	s.BotRegistryService.Start(s.serverCtx)

	// Retrieve the TCP address of the listener
	tcpAddr := s.listener.Addr().(*net.TCPAddr)

	// Get the port as an integer
	port := tcpAddr.Port

	// build the url by converting the integer to a string
	url := s.config.UrlSchema() + "://localhost:" + strconv.Itoa(port)
	s.defaultLogger.Infow("Server started", "port", port, "https", !s.config.DisableHttps, "url", url)

	return nil
}

func StartServerInBotRegistryMode(
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

	err := service.startBotRegistryMode(opts)
	if err != nil {
		service.Close()
		return nil, err
	}

	return service, nil
}

func RunBotRegistryService(ctx context.Context, cfg *config.Config) error {
	log := logging.FromCtx(ctx)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	service, err := StartServerInBotRegistryMode(ctx, cfg, nil)
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
