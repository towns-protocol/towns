package rpc

import (
	"context"
	"net"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
)

func (s *Service) startArchiveMode() error {
	var err error
	s.startTime = time.Now()

	s.initInstance(ServerModeArchive)

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

	err = s.initArchiver()
	if err != nil {
		return AsRiverError(err).Message("Failed to init archiver").LogError(s.defaultLogger)
	}

	go s.riverChain.ChainMonitor.RunWithBlockPeriod(
		s.serverCtx,
		s.riverChain.Client,
		s.riverChain.InitialBlockNum,
		time.Duration(s.riverChain.Config.BlockTimeMs)*time.Millisecond,
	)

	s.registerDebugHandlers()

	s.SetStatus("OK")

	// Retrieve the TCP address of the listener
	tcpAddr := s.listener.Addr().(*net.TCPAddr)

	// Get the port as an integer
	port := tcpAddr.Port
	// convert the integer to a string
	url := "localhost:" + strconv.Itoa(port) + "/debug/multi"
	if s.config.UseHttps {
		url = "https://" + url
	} else {
		url = "http://" + url
	}
	s.defaultLogger.Info("Server started", "port", port, "https", s.config.UseHttps, "url", url)
	return nil
}

func (s *Service) initArchiver() error {
	s.Archiver = NewArchiver(&s.config.Archive, s.registryContract, s.nodeRegistry, s.storage)
	go s.Archiver.Start(s.serverCtx, s.exitSignal)
	return nil
}

func StartServerInArchiveMode(
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

	err := streamService.startArchiveMode()
	if err != nil {
		streamService.Close()
		return nil, err
	}

	return streamService, nil
}

func RunArchive(ctx context.Context, cfg *config.Config) error {
	log := dlog.FromCtx(ctx)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	service, error := StartServerInArchiveMode(ctx, cfg, nil, nil)
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
