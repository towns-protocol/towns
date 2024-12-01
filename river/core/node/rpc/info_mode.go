package rpc

import (
	"context"
	"net"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/river-build/river/core/config"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
)

func (s *Service) startInfoMode(opts *ServerStartOpts) error {
	var err error
	s.startTime = time.Now()

	s.initInstance(ServerModeInfo, opts)

	// TODO: no need for base chain yet in the info mode
	// err = s.initBaseChain()
	// if err != nil {
	// 	return AsRiverError(err).Message("Failed to init base chain").LogError(s.defaultLogger)
	// }

	err = s.initRiverChain()
	if err != nil {
		return AsRiverError(err).Message("Failed to init river chain").LogError(s.defaultLogger)
	}

	err = s.runHttpServer()
	if err != nil {
		return AsRiverError(err).Message("Failed to run http server").LogError(s.defaultLogger)
	}

	s.riverChain.StartChainMonitor(s.serverCtx)

	s.registerDebugHandlers(s.config.EnableDebugEndpoints, s.config.DebugEndpoints)

	s.SetStatus("OK")

	// Retrieve the TCP address of the listener
	tcpAddr := s.listener.Addr().(*net.TCPAddr)

	// Get the port as an integer
	port := tcpAddr.Port
	// build the url by converting the integer to a string
	url := s.config.UrlSchema() + "://localhost:" + strconv.Itoa(port) + "/debug/multi"
	s.defaultLogger.Info("Server started", "port", port, "https", !s.config.DisableHttps, "url", url)
	return nil
}

func StartServerInInfoMode(
	ctx context.Context,
	cfg *config.Config,
	opts *ServerStartOpts,
) (*Service, error) {
	ctx = config.CtxWithConfig(ctx, cfg)
	ctx, ctxCancel := context.WithCancel(ctx)

	streamService := &Service{
		serverCtx:       ctx,
		serverCtxCancel: ctxCancel,
		config:          cfg,
		exitSignal:      make(chan error, 1),
	}

	err := streamService.startInfoMode(opts)
	if err != nil {
		streamService.Close()
		return nil, err
	}

	return streamService, nil
}

func RunInfoMode(ctx context.Context, cfg *config.Config) error {
	log := dlog.FromCtx(ctx)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	service, error := StartServerInInfoMode(ctx, cfg, nil)
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
