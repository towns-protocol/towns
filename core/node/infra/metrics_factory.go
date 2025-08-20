package infra

import (
	"fmt"
	"sync"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
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

	// GetMetricsAsMap returns all metrics as a structured map suitable for JSON logging.
	// This is intended for debugging purposes only.
	GetMetricsAsMap() (map[string]interface{}, error)
}

// NewMetricsFactory creates a new MetricsFactory.
// All counters are automatically registered with the created registry, namespace and subsystem are
// always set to the provided values.
// namespace and subsystem can be empty.
// NewXxx maybe called multiple times with the same name, the same counter created on the first call will be returned.
func NewMetricsFactory(registry *prometheus.Registry, namespace string, subsystem string) MetricsFactory {
	if registry == nil {
		registry = prometheus.NewRegistry()
	}
	return &metricsFactory{
		namespace: namespace,
		subsystem: subsystem,
		registry:  registry,
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

func (f *metricsFactory) GetMetricsAsMap() (map[string]interface{}, error) {
	if f.registry == nil {
		return nil, fmt.Errorf("no metrics registry available")
	}

	// Gather all metrics from the registry
	metricFamilies, err := f.registry.Gather()
	if err != nil {
		return nil, fmt.Errorf("failed to gather metrics: %w", err)
	}

	result := make(map[string]interface{})

	// Add metadata
	result["namespace"] = f.namespace
	result["subsystem"] = f.subsystem
	result["metric_count"] = len(metricFamilies)

	metrics := make(map[string]interface{})

	for _, mf := range metricFamilies {
		metricName := mf.GetName()
		metricType := mf.GetType()

		switch metricType {
		case dto.MetricType_GAUGE:
			if len(mf.Metric) == 1 && len(mf.Metric[0].Label) == 0 {
				// Simple gauge without labels
				metrics[metricName] = mf.Metric[0].Gauge.GetValue()
			} else {
				// Gauge with labels
				labeledValues := make(map[string]float64)
				for _, m := range mf.Metric {
					labelKey := buildLabelKey(m.Label)
					labeledValues[labelKey] = m.Gauge.GetValue()
				}
				metrics[metricName] = labeledValues
			}

		case dto.MetricType_COUNTER:
			if len(mf.Metric) == 1 && len(mf.Metric[0].Label) == 0 {
				// Simple counter without labels
				metrics[metricName] = mf.Metric[0].Counter.GetValue()
			} else {
				// Counter with labels
				labeledValues := make(map[string]float64)
				for _, m := range mf.Metric {
					labelKey := buildLabelKey(m.Label)
					labeledValues[labelKey] = m.Counter.GetValue()
				}
				metrics[metricName] = labeledValues
			}

		case dto.MetricType_HISTOGRAM:
			histogramData := make(map[string]interface{})
			for _, m := range mf.Metric {
				labelKey := buildLabelKey(m.Label)
				if labelKey == "" {
					labelKey = "default"
				}

				hist := m.Histogram
				histData := map[string]interface{}{
					"count": float64(hist.GetSampleCount()),
					"sum":   hist.GetSampleSum(),
				}

				// Add average if count > 0
				if hist.GetSampleCount() > 0 {
					histData["avg"] = hist.GetSampleSum() / float64(hist.GetSampleCount())
				}

				// Add bucket summary (simplified)
				if len(hist.Bucket) > 0 {
					buckets := make(map[string]uint64)
					for _, b := range hist.Bucket {
						buckets[fmt.Sprintf("le_%.0f", b.GetUpperBound())] = b.GetCumulativeCount()
					}
					histData["buckets"] = buckets
				}

				histogramData[labelKey] = histData
			}
			metrics[metricName] = histogramData

		case dto.MetricType_SUMMARY:
			summaryData := make(map[string]interface{})
			for _, m := range mf.Metric {
				labelKey := buildLabelKey(m.Label)
				if labelKey == "" {
					labelKey = "default"
				}

				summary := m.Summary
				sumData := map[string]interface{}{
					"count": float64(summary.GetSampleCount()),
					"sum":   summary.GetSampleSum(),
				}

				// Add quantiles if available
				if len(summary.Quantile) > 0 {
					quantiles := make(map[string]float64)
					for _, q := range summary.Quantile {
						quantiles[fmt.Sprintf("q%.2f", q.GetQuantile())] = q.GetValue()
					}
					sumData["quantiles"] = quantiles
				}

				summaryData[labelKey] = sumData
			}
			metrics[metricName] = summaryData

		case dto.MetricType_GAUGE_HISTOGRAM:
			gaugeHistogramData := make(map[string]interface{})
			for _, m := range mf.Metric {
				labelKey := buildLabelKey(m.Label)
				if labelKey == "" {
					labelKey = "default"
				}

				// GaugeHistogram uses the same Histogram field as regular histograms
				hist := m.Histogram
				ghData := map[string]interface{}{
					"count": float64(hist.GetSampleCount()),
					"sum":   hist.GetSampleSum(),
				}

				// Add average if count > 0
				if hist.GetSampleCount() > 0 {
					ghData["avg"] = hist.GetSampleSum() / float64(hist.GetSampleCount())
				}

				// Add bucket summary
				if len(hist.Bucket) > 0 {
					buckets := make(map[string]float64)
					for _, b := range hist.Bucket {
						buckets[fmt.Sprintf("le_%.0f", b.GetUpperBound())] = float64(b.GetCumulativeCount())
					}
					ghData["buckets"] = buckets
				}

				gaugeHistogramData[labelKey] = ghData
			}
			metrics[metricName] = gaugeHistogramData

		case dto.MetricType_UNTYPED:
			if len(mf.Metric) == 1 && len(mf.Metric[0].Label) == 0 {
				// Simple untyped metric without labels
				metrics[metricName] = mf.Metric[0].Untyped.GetValue()
			} else {
				// Untyped metric with labels
				labeledValues := make(map[string]float64)
				for _, m := range mf.Metric {
					labelKey := buildLabelKey(m.Label)
					labeledValues[labelKey] = m.Untyped.GetValue()
				}
				metrics[metricName] = labeledValues
			}
		}
	}

	result["metrics"] = metrics
	return result, nil
}

// buildLabelKey creates a readable key from label pairs
func buildLabelKey(labels []*dto.LabelPair) string {
	if len(labels) == 0 {
		return ""
	}

	// For single label, just use the value
	if len(labels) == 1 {
		return labels[0].GetValue()
	}

	// For multiple labels, create a map
	labelMap := make(map[string]string)
	for _, lp := range labels {
		labelMap[lp.GetName()] = lp.GetValue()
	}

	// Create a consistent string representation
	result := ""
	for k, v := range labelMap {
		if result != "" {
			result += "_"
		}
		result += k + ":" + v
	}
	return result
}
