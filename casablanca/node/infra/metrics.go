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

type SuccessMetrics struct {
	Sucess prometheus.Counter
	Total  prometheus.Counter
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
)

func NewSuccessMetrics(name string, parent *SuccessMetrics) *SuccessMetrics {
	success := prometheus.NewCounter(prometheus.CounterOpts{
		Name: fmt.Sprintf("%s_success", name),
		Help: fmt.Sprintf("%s success", name),
	})
	total := prometheus.NewCounter(prometheus.CounterOpts{
		Name: fmt.Sprintf("%s_total", name),
		Help: fmt.Sprintf("%s total", name),
	})
	err := registry.Register(success)
	if err != nil {
		panic(err)
	}
	err = registry.Register(total)
	if err != nil {
		panic(err)
	}

	return &SuccessMetrics{
		Sucess: success,
		Total:  total,
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

func (m *SuccessMetrics) Pass() {
	m.Total.Inc()
	m.Sucess.Inc()
	if m.Parent != nil {
		m.Parent.Pass()
	}
}

func (m *SuccessMetrics) Fail() {
	m.Total.Inc()
	if m.Parent != nil {
		m.Parent.Fail()
	}
}

func StartMetricsService(ctx context.Context, config config.MetricsConfig) {
	log := dlog.CtxLog(ctx)

	r := mux.NewRouter()

	err := registry.Register(functionDuration)
	if err != nil {
		panic(err)
	}

	r.Handle("/metrics", promhttp.Handler())
	addr := fmt.Sprintf("%s:%d", config.Interface, config.Port)
	log.Info("Starting metrics HTTP server", "addr", addr)
	err = http.ListenAndServe(addr, r)
	if err != nil {
		panic(err)
	}
}
