package infra

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/logging"
)

// DefaultRpcDurationBucketsSeconds are the default buckets for rpc duration metrics.
// In practice, most rpc calls seem to land between 10 and 50ms, sometimes up to 100ms.
// Entitlement calls can sometimes take up to 2s and calls that send and wait for chain
// transaction confirmation (CreateStream for instance) can sometimes take up to 15s.
var DefaultRpcDurationBucketsSeconds = []float64{
	.05,
	.1,
	.5,
	1.0,
	2.5,
	5.0,
	7.5,
	10.0,
	15.0,
}

// DefaultDbTxDurationBucketsSeconds are the default buckets for db tx duration metrics.
// Most db operations appear to complete in <= 60ms in practice.
var DefaultDbTxDurationBucketsSeconds = []float64{
	.001,
	.003,
	.005,
	.01,
	.05,
	.1,
	1,
}

// MetricsPublisher both provides handler to publish metrics from the given registry
// and optionally published metric on give address:port.
type MetricsPublisher struct {
	registry   *prometheus.Registry
	httpServer *http.Server
}

func NewMetricsPublisher(registry *prometheus.Registry) *MetricsPublisher {
	return &MetricsPublisher{
		registry: registry,
	}
}

func (m *MetricsPublisher) CreateHandler() http.Handler {
	return promhttp.HandlerFor(
		m.registry,
		promhttp.HandlerOpts{
			Registry:          m.registry,
			EnableOpenMetrics: true,
			ProcessStartTime:  time.Now(),
		},
	)
}

func (m *MetricsPublisher) StartMetricsServer(ctx context.Context, config config.MetricsConfig) {
	if !config.Enabled || config.Port == 0 {
		return
	}

	mux := http.NewServeMux()

	metricsHandler := m.CreateHandler()

	mux.Handle("/metrics", metricsHandler)

	m.httpServer = &http.Server{
		Addr:    fmt.Sprintf("%s:%d", config.Interface, config.Port),
		Handler: mux,
	}

	go m.serveHttp(ctx)
	go m.waitForClose(ctx)
}

func (m *MetricsPublisher) serveHttp(ctx context.Context) {
	log := logging.FromCtx(ctx)

	log.Infow("Starting metrics HTTP server", "url", fmt.Sprintf("http://%s/metrics", m.httpServer.Addr))
	err := m.httpServer.ListenAndServe()
	if err != nil {
		if err == http.ErrServerClosed {
			log.Infow("Metrics HTTP server closed")
		} else {
			log.Errorw("Metrics HTTP server error", "error", err)
		}
	}
}

func (m *MetricsPublisher) waitForClose(ctx context.Context) {
	<-ctx.Done()
	log := logging.FromCtx(ctx)

	err := m.httpServer.Close()
	if err != nil {
		log.Errorw("Error closing metrics HTTP server", "error", err)
	} else {
		log.Infow("Closing metrics HTTP server")
	}
}
