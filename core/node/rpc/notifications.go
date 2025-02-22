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
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/notifications"
	"github.com/towns-protocol/towns/core/node/notifications/push"
)

func (s *Service) startNotificationMode(notifier push.MessageNotifier, opts *ServerStartOpts) error {
	var err error
	s.startTime = time.Now()

	s.initInstance(ServerModeNotification, opts)

	err = s.initRiverChain()
	if err != nil {
		return AsRiverError(err).Message("Failed to init river chain").LogError(s.defaultLogger)
	}

	err = s.prepareStore()
	if err != nil {
		return AsRiverError(err).Message("Failed to prepare store").LogError(s.defaultLogger)
	}

	err = s.initNotificationsStore()
	if err != nil {
		return AsRiverError(err).Message("Failed to init store").LogError(s.defaultLogger)
	}

	if notifier == nil {
		if s.config.Notifications.Simulate {
			logging.FromCtx(s.serverCtx).Infow("Simulate sending notifications (dev mode)")
			notifier = push.NewMessageNotificationsSimulator(s.metrics)
		} else {
			notifier, err = push.NewMessageNotifier(&s.config.Notifications, s.metrics)
			if err != nil {
				return err
			}
		}
	}

	processor := notifications.NewNotificationMessageProcessor(
		s.serverCtx,
		s.notifications,
		s.config.Notifications,
		notifier,
	)

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

	s.NotificationService, err = notifications.NewService(
		s.serverCtx,
		s.config.Notifications,
		s.chainConfig,
		s.notifications,
		s.registryContract,
		registries,
		s.metrics,
		processor,
	)
	if err != nil {
		return AsRiverError(err).Message("Failed to instantiate notification service").LogError(s.defaultLogger)
	}

	s.SetStatus("OK")

	err = s.runHttpServer()
	if err != nil {
		return AsRiverError(err).Message("Failed to run http server").LogError(s.defaultLogger)
	}

	if err := s.initNotificationHandlers(); err != nil {
		return err
	}

	s.NotificationService.Start(s.serverCtx)

	// Retrieve the TCP address of the listener
	tcpAddr := s.listener.Addr().(*net.TCPAddr)

	// Get the port as an integer
	port := tcpAddr.Port

	// build the url by converting the integer to a string
	url := s.config.UrlSchema() + "://localhost:" + strconv.Itoa(port)
	s.defaultLogger.Infow("Server started", "port", port, "https", !s.config.DisableHttps, "url", url)

	return nil
}

func StartServerInNotificationMode(
	ctx context.Context,
	cfg *config.Config,
	notifier push.MessageNotifier,
	opts *ServerStartOpts,
) (*Service, error) {
	ctx = config.CtxWithConfig(ctx, cfg)
	ctx, ctxCancel := context.WithCancel(ctx)

	notificationService := &Service{
		serverCtx:       ctx,
		serverCtxCancel: ctxCancel,
		config:          cfg,
		exitSignal:      make(chan error, 1),
	}

	err := notificationService.startNotificationMode(notifier, opts)
	if err != nil {
		notificationService.Close()
		return nil, err
	}

	return notificationService, nil
}

func RunNotificationService(ctx context.Context, cfg *config.Config) error {
	log := logging.FromCtx(ctx)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	service, err := StartServerInNotificationMode(ctx, cfg, nil, nil)
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
	// log.Infow("Notification stats", "stats", service.Archiver.GetStats())
	return err
}
