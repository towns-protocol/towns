package infra

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"
)

type MetricsConfig struct {
	Enabled   bool   `yaml:"enabled" default:"false"`
	Interface string `yaml:"interface" default:""`
	Port      int    `yaml:"port" default:"8080"`
}

type SuccessMetrics struct {
	Sucess prometheus.Counter
	Total  prometheus.Counter
	Parent *SuccessMetrics
}

var registry = prometheus.DefaultRegisterer

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
		log.Fatalf("Failed to register %s: %s", success, err)
	}
	err = registry.Register(total)
	if err != nil {
		log.Fatalf("Failed to register %s: %s", total, err)
	}

	return &SuccessMetrics{
		Sucess: success,
		Total:  total,
		Parent: parent,
	}
}

func NewCounter(name string, help string) prometheus.Counter {
	counter := prometheus.NewCounter(prometheus.CounterOpts{
		Name: name,
		Help: help,
	})
	err := registry.Register(counter)
	if err != nil {
		log.Fatalf("Failed to register %s: %s", counter, err)
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

func StartMetricsService(config MetricsConfig) {
	r := mux.NewRouter()

	r.Handle("/metrics", promhttp.Handler())
	log.Infof("Starting HTTP server on %s:%d", config.Interface, config.Port)
	err := http.ListenAndServe(fmt.Sprintf("%s:%d", config.Interface, config.Port), r)
	if err != nil {
		log.Fatal(err)
	}
}
