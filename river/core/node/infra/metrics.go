package infra

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/dlog"
)

var DefaultDurationBucketsSeconds = []float64{
	0.001,
	0.002,
	0.005,
	0.01,
	0.02,
	0.03,
	0.06,
	0.12,
	0.3,
	0.6,
	1.2,
	1.8,
	2.8,
	3.6,
	4.8,
	10,
}

// Metrics provides MetricsFactory and runs an HTTP server to expose metrics
// registered with the MetricsFactory.
type Metrics struct {
	MetricsFactory

	httpServer *http.Server
}

func NewMetrics(namespace string, subsystem string) *Metrics {
	return &Metrics{
		MetricsFactory: NewMetricsFactory(namespace, subsystem),
	}
}

func (m *Metrics) StartMetricsServer(ctx context.Context, config config.MetricsConfig) {
	log := dlog.FromCtx(ctx)

	if !config.Enabled {
		log.Info("Metrics service is disabled")
		return
	}

	mux := http.NewServeMux()

	metricsHandler := promhttp.HandlerFor(
		m.Registry(),
		promhttp.HandlerOpts{
			Registry:          m.Registry(),
			EnableOpenMetrics: true,
			ProcessStartTime:  time.Now(),
		},
	)

	mux.Handle("/metrics", metricsHandler)

	m.httpServer = &http.Server{
		Addr:    fmt.Sprintf("%s:%d", config.Interface, config.Port),
		Handler: mux,
	}

	go m.serveHttp(ctx)
	go m.waitForClose(ctx)
}

func (m *Metrics) serveHttp(ctx context.Context) {
	log := dlog.FromCtx(ctx)

	log.Info("Starting metrics HTTP server", "url", fmt.Sprintf("http://%s/metrics", m.httpServer.Addr))
	err := m.httpServer.ListenAndServe()
	if err != nil {
		if err == http.ErrServerClosed {
			log.Info("Metrics HTTP server closed")
		} else {
			log.Error("Metrics HTTP server error", "err", err)
		}
	}
}

func (m *Metrics) waitForClose(ctx context.Context) {
	<-ctx.Done()
	log := dlog.FromCtx(ctx)

	err := m.httpServer.Close()
	if err != nil {
		log.Error("Error closing metrics HTTP server", "err", err)
	} else {
		log.Info("Closing metrics HTTP server")
	}
}
