package stream_sync_monitor

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/pprof"
	"time"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/stream_sync_monitor/sync"
)

type Service struct {
	monitor         *sync.StreamSyncMonitor
	config          *config.Config
	debugServer     *http.Server
	metricsRegistry *prometheus.Registry
}

func NewService(
	ctx context.Context,
	cfg *config.Config,
	onChainConfig crypto.OnChainConfiguration,
	riverRegistry *registries.RiverRegistryContract,
	nodeRegistries []nodes.NodeRegistry,
	metricsFactory infra.DebugMetricsFactory,
) (*Service, error) {
	monitor, err := sync.NewStreamSyncMonitor(
		ctx,
		cfg,
		riverRegistry,
		onChainConfig,
		nodeRegistries,
		metricsFactory,
		nil, // otelTracer - can be added later
	)
	if err != nil {
		return nil, err
	}

	// Extract the prometheus registry from the metrics factory
	var metricsRegistry *prometheus.Registry
	if metricsFactory != nil {
		metricsRegistry = metricsFactory.Registry()
	}

	return &Service{
		monitor:         monitor,
		config:          cfg,
		metricsRegistry: metricsRegistry,
	}, nil
}

func (s *Service) Run(ctx context.Context) error {
	log := logging.FromCtx(ctx)
	log.Infow("Starting stream sync monitor service",
		"monitoredNodes", s.monitor.Config().MonitoredNodeAddresses,
		"lagThreshold", s.monitor.Config().LagThreshold,
		"stackTraceOutputDir", s.monitor.Config().StackTraceOutputDir,
		"debugPort", s.config.StreamSyncMonitor.DebugPort,
		"pprofEnabled", s.config.StreamSyncMonitor.EnablePProf,
	)

	// Start debug server if configured
	if s.config.StreamSyncMonitor.DebugPort > 0 {
		if err := s.startDebugServer(ctx); err != nil {
			log.Errorw("Failed to start debug server", "error", err)
			// Continue running even if debug server fails
		}
	}

	// Run the monitor - this blocks until context is cancelled
	err := s.monitor.Run(ctx)

	// Shutdown debug server if it was started
	if s.debugServer != nil {
		shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		if shutdownErr := s.debugServer.Shutdown(shutdownCtx); shutdownErr != nil {
			log.Errorw("Failed to shutdown debug server", "error", shutdownErr)
		}
	}

	return err
}

func (s *Service) startDebugServer(ctx context.Context) error {
	log := logging.FromCtx(ctx)
	mux := http.NewServeMux()

	// Register debug endpoints
	mux.HandleFunc("/debug/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<html>
<head><title>Stream Sync Monitor Debug</title></head>
<body>
<h1>Stream Sync Monitor Debug Endpoints</h1>
<ul>
`)
		if s.config.StreamSyncMonitor.EnablePProf {
			fmt.Fprintf(w, `<li><a href="/debug/pprof/">pprof</a></li>
`)
		}
		fmt.Fprintf(w, `<li><a href="/metrics">metrics</a></li>
</ul>
</body>
</html>
`)
	})

	// Register pprof handlers if enabled
	if s.config.StreamSyncMonitor.EnablePProf {
		mux.HandleFunc("/debug/pprof/", pprof.Index)
		mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
		mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
		mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
		mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
		mux.Handle("/debug/pprof/allocs", pprof.Handler("allocs"))
		mux.Handle("/debug/pprof/block", pprof.Handler("block"))
		mux.Handle("/debug/pprof/goroutine", pprof.Handler("goroutine"))
		mux.Handle("/debug/pprof/heap", pprof.Handler("heap"))
		mux.Handle("/debug/pprof/mutex", pprof.Handler("mutex"))
		mux.Handle("/debug/pprof/threadcreate", pprof.Handler("threadcreate"))
	}

	// Add metrics endpoint
	if s.metricsRegistry != nil {
		metricsPublisher := infra.NewMetricsPublisher(s.metricsRegistry)
		mux.Handle("/metrics", metricsPublisher.CreateHandler())
	}

	addr := fmt.Sprintf(":%d", s.config.StreamSyncMonitor.DebugPort)
	s.debugServer = &http.Server{
		Addr:    addr,
		Handler: mux,
		BaseContext: func(l net.Listener) context.Context {
			return ctx
		},
	}

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to create debug listener: %w", err)
	}

	go func() {
		log.Infow("Starting debug HTTP server", "addr", listener.Addr().String())
		if err := s.debugServer.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Errorw("Debug HTTP server failed", "error", err)
		}
	}()

	return nil
}
