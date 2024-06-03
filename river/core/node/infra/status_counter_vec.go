package infra

import "github.com/prometheus/client_golang/prometheus"

// StatusCounterVec is a wrapper around prometheus.CounterVec
// that adds "status" as last label.
// IncPass, InfFail are convenience methods
// to increment the counter with the corresponding status.
type StatusCounterVec struct {
	*prometheus.CounterVec
}

// NewStatusCounterVec creates a new StatusCounterVec.
func NewStatusCounterVec(opts prometheus.CounterOpts, labelNames []string) *StatusCounterVec {
	return &StatusCounterVec{
		CounterVec: prometheus.NewCounterVec(opts, append(labelNames, "status")),
	}
}

func (sc *StatusCounterVec) IncPass(labels ...string) {
	sc.WithLabelValues(append(labels, "pass")...).Inc()
}

func (sc *StatusCounterVec) IncFail(labels ...string) {
	sc.WithLabelValues(append(labels, "fail")...).Inc()
}

func (sc *StatusCounterVec) CurryWith(labels prometheus.Labels) (*StatusCounterVec, error) {
	cv, err := sc.CounterVec.CurryWith(labels)
	if err != nil {
		return nil, err
	}
	return &StatusCounterVec{CounterVec: cv}, nil
}

func (sc *StatusCounterVec) MustCurryWith(labels prometheus.Labels) *StatusCounterVec {
	return &StatusCounterVec{CounterVec: sc.CounterVec.MustCurryWith(labels)}
}
