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
	. "github.com/river-build/river/core/node/protocol"
)

func (s *Service) startArchiveMode(opts *ServerStartOpts, once bool) error {
	var err error
	s.startTime = time.Now()

	s.initInstance(ServerModeArchive, opts)

	if s.config.Archive.ArchiveId == "" {
		return RiverError(Err_BAD_CONFIG, "ArchiveId must be set").LogError(s.defaultLogger)
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

	err = s.initStore()
	if err != nil {
		return AsRiverError(err).Message("Failed to init store").LogError(s.defaultLogger)
	}

	err = s.initArchiver(once)
	if err != nil {
		return AsRiverError(err).Message("Failed to init archiver").LogError(s.defaultLogger)
	}

	s.riverChain.StartChainMonitor(s.serverCtx)

	s.registerDebugHandlers(s.config.EnableDebugEndpoints, s.config.DebugEndpoints)

	s.SetStatus("OK")

	// Retrieve the TCP address of the listener
	tcpAddr := s.listener.Addr().(*net.TCPAddr)

	// Get the port as an integer
	port := tcpAddr.Port
	// construct the URL by converting the integer to a string
	url := s.config.UrlSchema() + "://localhost:" + strconv.Itoa(port) + "/debug/multi"
	s.defaultLogger.Info("Server started", "port", port, "https", !s.config.DisableHttps, "url", url)
	return nil
}

func (s *Service) initArchiver(once bool) error {
	s.Archiver = NewArchiver(&s.config.Archive, s.registryContract, s.nodeRegistry, s.storage)
	go s.Archiver.Start(s.serverCtx, once, s.exitSignal)
	return nil
}

func StartServerInArchiveMode(
	ctx context.Context,
	cfg *config.Config,
	opts *ServerStartOpts,
	once bool,
) (*Service, error) {
	streamService := &Service{
		serverCtx:  ctx,
		config:     cfg,
		exitSignal: make(chan error, 1),
	}

	err := streamService.startArchiveMode(opts, once)
	if err != nil {
		streamService.Close()
		return nil, err
	}

	return streamService, nil
}

func RunArchive(ctx context.Context, cfg *config.Config, once bool) error {
	log := dlog.FromCtx(ctx)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	service, err := StartServerInArchiveMode(ctx, cfg, nil, once)
	if err != nil {
		log.Error("Failed to start server", "error", err)
		return err
	}
	defer service.Close()

	osSignal := make(chan os.Signal, 1)
	signal.Notify(osSignal, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-osSignal
		log.Info("Got OS signal", "signal", sig.String())
		service.exitSignal <- nil
	}()

	if once {
		go func() {
			service.Archiver.WaitForStart()
			service.Archiver.WaitForTasks()
			service.exitSignal <- nil
		}()
	}

	err = <-service.exitSignal
	log.Info("Archiver stats", "stats", service.Archiver.GetStats())
	return err
}
