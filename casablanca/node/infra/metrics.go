package infra

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"casablanca/node/dlog"
	config "casablanca/node/infra/config"
)

/* SuccessMetrics is a struct for tracking success/failure of various operations.
 * Parent represents the higher level service (e.g. all RPC calls). When the metric is updated,
 * the parent is also updated (recursively).
 */
type SuccessMetrics struct {
	Name   string
	Parent *SuccessMetrics
}

var registry = prometheus.DefaultRegisterer

var (
	functionDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "function_execution_duration_seconds",
			Help:    "Duration of function execution",
			Buckets: []float64{1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800},
		},
		[]string{"function_name"},
	)

	successMetrics = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "success_metrics",
			Help: "success metrics",
		},
		[]string{"name", "status"},
	)
)

func NewSuccessMetrics(name string, parent *SuccessMetrics) *SuccessMetrics {
	return &SuccessMetrics{
		Name:   name,
		Parent: parent,
	}
}

func StoreExecutionTimeMetrics(name string, startTime time.Time) {
	functionDuration.WithLabelValues(name).Observe(float64(time.Since(startTime).Milliseconds()))
}

func NewCounter(name string, help string) prometheus.Counter {
	counter := prometheus.NewCounter(prometheus.CounterOpts{
		Name: name,
		Help: help,
	})
	err := registry.Register(counter)
	if err != nil {
		panic(err)
	}
	return counter
}

/* Increment pass counter for this metric and its parent. */
func (m *SuccessMetrics) PassInc() {
	successMetrics.WithLabelValues(m.Name, "pass").Inc()
	if m.Parent != nil {
		m.Parent.PassInc()
	}
}

/* Increment fail counter for this metric and its parent. */
func (m *SuccessMetrics) FailInc() {
	successMetrics.WithLabelValues(m.Name, "fail").Inc()
	if m.Parent != nil {
		m.Parent.FailInc()
	}
}

func (m *SuccessMetrics) PassIncWithLabel(label string) {
	successMetrics.WithLabelValues(m.Name, label).Inc()
	m.PassInc()
}

func (m *SuccessMetrics) FailIncWithLabel(label string) {
	successMetrics.WithLabelValues(m.Name, label).Inc()
	m.FailInc()
}

func StartMetricsService(ctx context.Context, config config.MetricsConfig) {
	log := dlog.CtxLog(ctx)

	r := mux.NewRouter()

	err := registry.Register(functionDuration)
	if err != nil {
		panic(err)
	}

	err = registry.Register(successMetrics)
	if err != nil {
		panic(err)
	}

	handlerOpts := promhttp.HandlerOpts{
		EnableOpenMetrics: true,
	}
	metricsHandler := promhttp.HandlerFor(prometheus.DefaultGatherer, handlerOpts)

	r.Handle("/metrics", metricsHandler)
	addr := fmt.Sprintf("%s:%d", config.Interface, config.Port)
	log.Info("Starting metrics HTTP server", "addr", addr)
	err = http.ListenAndServe(addr, r)
	if err != nil {
		panic(err)
	}
}
