package infra

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/river-build/river/dlog"
	config "github.com/river-build/river/infra/config"
)

/* SuccessMetrics is a struct for tracking success/failure of various operations.
 * Parent represents the higher level service (e.g. all RPC calls). When the metric is updated,
 * the parent is also updated (recursively).
 */
type SuccessMetrics struct {
	Name   string
	Parent *SuccessMetrics
}

const (
	RPC_CATEGORY            = "rpc"
	DB_CALLS_CATEGORY       = "db_calls"
	CONTRACT_CALLS_CATEGORY = "contract_calls"
)

var registry = prometheus.DefaultRegisterer

var (
	functionDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "function_execution_duration_ms",
			Help:    "Duration of function execution",
			Buckets: []float64{1, 2, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800},
		},
		[]string{"name", "category"},
	)

	successMetrics = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "success_metrics",
			Help: "success metrics",
		},
		[]string{"name", "status", "category"},
	)
)

func NewSuccessMetrics(name string, parent *SuccessMetrics) *SuccessMetrics {
	return &SuccessMetrics{
		Name:   name,
		Parent: parent,
	}
}

func StoreExecutionTimeMetrics(name string, category string, startTime time.Time) {
	functionDuration.WithLabelValues(name, category).Observe(float64(time.Since(startTime).Milliseconds()))
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
	args := []string{m.Name, "pass"}
	if m.Parent != nil {
		args = append(args, m.Parent.Name)
	} else {
		args = append(args, "root")
	}
	successMetrics.WithLabelValues(args...).Inc()
	if m.Parent != nil {
		m.Parent.PassInc()
	}
}

/* Increment fail counter for this metric and its parent. */
func (m *SuccessMetrics) FailInc() {
	args := []string{m.Name, "fail"}
	if m.Parent != nil {
		args = append(args, m.Parent.Name)
	} else {
		args = append(args, "root")
	}
	successMetrics.WithLabelValues(args...).Inc()
	if m.Parent != nil {
		m.Parent.FailInc()
	}
}

// update counter for a child metric and recursively update itself
func (m *SuccessMetrics) PassIncForChild(child string) {
	// args are name, status, category
	successMetrics.WithLabelValues(child, "pass", m.Name).Inc()
	// recursively increment parent
	m.PassInc()
}

// update counter for a child metric and recursively update itself
func (m *SuccessMetrics) FailIncForChild(child string) {
	// args are name, status, category
	successMetrics.WithLabelValues(child, "fail", m.Name).Inc()
	// recursively increment parent
	m.FailInc()
}

func StartMetricsService(ctx context.Context, config config.MetricsConfig) {
	log := dlog.FromCtx(ctx)

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
