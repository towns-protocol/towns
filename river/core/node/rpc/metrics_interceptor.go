package rpc

import (
	"context"

	"connectrpc.com/connect"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/river-build/river/core/node/shared"
)

type streamIdProvider interface {
	GetStreamId() []byte
}

type metricsInterceptor struct {
	rpcDuration       *prometheus.HistogramVec
	unaryInflight     *prometheus.GaugeVec
	openClientStreams *prometheus.GaugeVec
	openServerStreams *prometheus.GaugeVec
}

func (s *Service) NewMetricsInterceptor() connect.Interceptor {
	return &metricsInterceptor{
		rpcDuration:       s.rpcDuration,
		unaryInflight:     s.metrics.NewGaugeVecEx("grpc_unary_inflight", "gRPC unary calls in flight", "proc"),
		openClientStreams: s.metrics.NewGaugeVecEx("grpc_open_client_streams", "gRPC open client streams", "proc"),
		openServerStreams: s.metrics.NewGaugeVecEx("grpc_open_server_streams", "gRPC open server streams", "proc"),
	}
}

func (i *metricsInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(
		ctx context.Context,
		req connect.AnyRequest,
	) (connect.AnyResponse, error) {
		var (
			proc = req.Spec().Procedure
			m    = i.unaryInflight.With(prometheus.Labels{"proc": proc})
		)
		m.Inc()

		defer func() {
			m.Dec()
			prometheus.NewTimer(i.rpcDuration.WithLabelValues(proc)).ObserveDuration()
		}()

		// add streamId to tracing span
		r, ok := req.Any().(streamIdProvider)
		if ok {
			id, err := shared.StreamIdFromBytes(r.GetStreamId())
			if err == nil {
				span := trace.SpanFromContext(ctx)
				span.SetAttributes(attribute.String("streamId", id.String()))
			}
		}

		return next(ctx, req)
	}
}

func (i *metricsInterceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return func(
		ctx context.Context,
		spec connect.Spec,
	) connect.StreamingClientConn {
		m := i.openClientStreams.With(prometheus.Labels{"proc": spec.Procedure})

		m.Inc()
		defer m.Dec()

		return next(ctx, spec)
	}
}

func (i *metricsInterceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return func(
		ctx context.Context,
		conn connect.StreamingHandlerConn,
	) error {
		m := i.openClientStreams.With(prometheus.Labels{"proc": conn.Spec().Procedure})

		m.Inc()
		defer m.Dec()

		return next(ctx, conn)
	}
}
