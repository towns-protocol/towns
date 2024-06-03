package infra

import (
	"sync"

	"github.com/prometheus/client_golang/prometheus"
)

type MetricsFactory interface {
	NewCounter(opts prometheus.CounterOpts) prometheus.Counter
	NewCounterEx(name string, help string) prometheus.Counter
	NewCounterFunc(opts prometheus.CounterOpts, function func() float64) prometheus.CounterFunc

	NewCounterVec(opts prometheus.CounterOpts, labelNames []string) *prometheus.CounterVec
	NewCounterVecEx(name string, help string, labels ...string) *prometheus.CounterVec

	NewGauge(opts prometheus.GaugeOpts) prometheus.Gauge
	NewGaugeEx(name string, help string) prometheus.Gauge
	NewGaugeFunc(opts prometheus.GaugeOpts, function func() float64) prometheus.GaugeFunc

	NewGaugeVec(opts prometheus.GaugeOpts, labelNames []string) *prometheus.GaugeVec
	NewGaugeVecEx(name string, help string, labels ...string) *prometheus.GaugeVec

	NewHistogram(opts prometheus.HistogramOpts) prometheus.Histogram
	NewHistogramEx(name string, help string, buckets []float64) prometheus.Histogram

	NewHistogramVec(opts prometheus.HistogramOpts, labelNames []string) *prometheus.HistogramVec
	NewHistogramVecEx(name string, help string, buckets []float64, labels ...string) *prometheus.HistogramVec

	NewSummary(opts prometheus.SummaryOpts) prometheus.Summary
	NewSummaryEx(name string, help string, objectives map[float64]float64) prometheus.Summary

	NewSummaryVec(opts prometheus.SummaryOpts, labelNames []string) *prometheus.SummaryVec
	NewSummaryVecEx(name string, help string, objectives map[float64]float64, labels ...string) *prometheus.SummaryVec

	NewUntypedFunc(opts prometheus.UntypedOpts, function func() float64) prometheus.UntypedFunc

	NewStatusCounterVec(opts prometheus.CounterOpts, labelNames []string) *StatusCounterVec
	NewStatusCounterVecEx(name string, help string, labels ...string) *StatusCounterVec

	Registry() *prometheus.Registry
}

// NewMetricsFactory creates a new MetricsFactory.
// All counters are automatically registered with the created registry, namespace and subsystem are
// always set to the provided values.
// namespace and subsystem can be empty.
// NewXxx maybe called multiple times with the same name, the same counter created on the first call will be returned.
func NewMetricsFactory(namespace string, subsystem string) MetricsFactory {
	return &metricsFactory{
		namespace: namespace,
		subsystem: subsystem,
		registry:  prometheus.NewRegistry(),
		counters:  make(map[string]any),
	}
}

type metricsFactory struct {
	namespace string
	subsystem string
	registry  *prometheus.Registry
	counters  map[string]any
	mu        sync.Mutex
}

func getCounter[Counter prometheus.Collector](f *metricsFactory, name string, maker func() Counter) Counter {
	f.mu.Lock()
	defer f.mu.Unlock()

	c, ok := f.counters[name]
	if ok {
		return c.(Counter)
	}

	cc := maker()
	f.registry.MustRegister(cc)
	f.counters[name] = cc
	return cc
}

func (f *metricsFactory) NewCounter(opts prometheus.CounterOpts) prometheus.Counter {
	return getCounter(f, opts.Name, func() prometheus.Counter {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewCounter(opts)
	})
}

func (f *metricsFactory) NewCounterEx(name string, help string) prometheus.Counter {
	return f.NewCounter(prometheus.CounterOpts{
		Name: name,
		Help: help,
	})
}

func (f *metricsFactory) NewCounterFunc(opts prometheus.CounterOpts, function func() float64) prometheus.CounterFunc {
	return getCounter(f, opts.Name, func() prometheus.CounterFunc {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewCounterFunc(opts, function)
	})
}

func (f *metricsFactory) NewCounterVec(opts prometheus.CounterOpts, labelNames []string) *prometheus.CounterVec {
	return getCounter(f, opts.Name, func() *prometheus.CounterVec {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewCounterVec(opts, labelNames)
	})
}

func (f *metricsFactory) NewCounterVecEx(name string, help string, labels ...string) *prometheus.CounterVec {
	return f.NewCounterVec(prometheus.CounterOpts{
		Name: name,
		Help: help,
	}, labels)
}

func (f *metricsFactory) NewGauge(opts prometheus.GaugeOpts) prometheus.Gauge {
	return getCounter(f, opts.Name, func() prometheus.Gauge {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewGauge(opts)
	})
}

func (f *metricsFactory) NewGaugeEx(name string, help string) prometheus.Gauge {
	return f.NewGauge(prometheus.GaugeOpts{
		Name: name,
		Help: help,
	})
}

func (f *metricsFactory) NewGaugeFunc(opts prometheus.GaugeOpts, function func() float64) prometheus.GaugeFunc {
	return getCounter(f, opts.Name, func() prometheus.GaugeFunc {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewGaugeFunc(opts, function)
	})
}

func (f *metricsFactory) NewGaugeVec(opts prometheus.GaugeOpts, labelNames []string) *prometheus.GaugeVec {
	return getCounter(f, opts.Name, func() *prometheus.GaugeVec {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewGaugeVec(opts, labelNames)
	})
}

func (f *metricsFactory) NewGaugeVecEx(name string, help string, labels ...string) *prometheus.GaugeVec {
	return f.NewGaugeVec(prometheus.GaugeOpts{
		Name: name,
		Help: help,
	}, labels)
}

func (f *metricsFactory) NewHistogram(opts prometheus.HistogramOpts) prometheus.Histogram {
	return getCounter(f, opts.Name, func() prometheus.Histogram {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewHistogram(opts)
	})
}

func (f *metricsFactory) NewHistogramEx(name string, help string, buckets []float64) prometheus.Histogram {
	return f.NewHistogram(prometheus.HistogramOpts{
		Name:    name,
		Help:    help,
		Buckets: buckets,
	})
}

func (f *metricsFactory) NewHistogramVec(opts prometheus.HistogramOpts, labelNames []string) *prometheus.HistogramVec {
	return getCounter(f, opts.Name, func() *prometheus.HistogramVec {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewHistogramVec(opts, labelNames)
	})
}

func (f *metricsFactory) NewHistogramVecEx(
	name string,
	help string,
	buckets []float64,
	labels ...string,
) *prometheus.HistogramVec {
	return f.NewHistogramVec(prometheus.HistogramOpts{
		Name:    name,
		Help:    help,
		Buckets: buckets,
	}, labels)
}

func (f *metricsFactory) NewSummary(opts prometheus.SummaryOpts) prometheus.Summary {
	return getCounter(f, opts.Name, func() prometheus.Summary {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewSummary(opts)
	})
}

func (f *metricsFactory) NewSummaryEx(name string, help string, objectives map[float64]float64) prometheus.Summary {
	return f.NewSummary(prometheus.SummaryOpts{
		Name:       name,
		Help:       help,
		Objectives: objectives,
	})
}

func (f *metricsFactory) NewSummaryVec(opts prometheus.SummaryOpts, labelNames []string) *prometheus.SummaryVec {
	return getCounter(f, opts.Name, func() *prometheus.SummaryVec {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewSummaryVec(opts, labelNames)
	})
}

func (f *metricsFactory) NewSummaryVecEx(
	name string,
	help string,
	objectives map[float64]float64,
	labels ...string,
) *prometheus.SummaryVec {
	return f.NewSummaryVec(prometheus.SummaryOpts{
		Name:       name,
		Help:       help,
		Objectives: objectives,
	}, labels)
}

func (f *metricsFactory) NewUntypedFunc(opts prometheus.UntypedOpts, function func() float64) prometheus.UntypedFunc {
	return getCounter(f, opts.Name, func() prometheus.UntypedFunc {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return prometheus.NewUntypedFunc(opts, function)
	})
}

func (f *metricsFactory) NewStatusCounterVec(opts prometheus.CounterOpts, labelNames []string) *StatusCounterVec {
	return getCounter(f, opts.Name, func() *StatusCounterVec {
		opts.Namespace = f.namespace
		opts.Subsystem = f.subsystem
		return NewStatusCounterVec(opts, labelNames)
	})
}

func (f *metricsFactory) NewStatusCounterVecEx(name string, help string, labels ...string) *StatusCounterVec {
	return f.NewStatusCounterVec(prometheus.CounterOpts{
		Name: name,
		Help: help,
	}, labels)
}

func (f *metricsFactory) Registry() *prometheus.Registry {
	return f.registry
}
