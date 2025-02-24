package rpc

import (
	"context"
	"errors"
	"strings"

	"connectrpc.com/connect"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/shared"
)

type streamIdProvider interface {
	GetStreamId() []byte
}

type metricsInterceptor struct {
	rpcDuration             *prometheus.HistogramVec
	unaryInflight           *prometheus.GaugeVec
	unaryStatusCode         *prometheus.CounterVec
	openClientStreams       *prometheus.GaugeVec
	openServerStreams       *prometheus.GaugeVec
	serverStreamsStatusCode *prometheus.CounterVec
}

func (s *Service) NewMetricsInterceptor() connect.Interceptor {
	return &metricsInterceptor{
		rpcDuration: s.metrics.NewHistogramVecEx(
			"rpc_duration_seconds",
			"RPC duration in seconds",
			infra.DefaultRpcDurationBucketsSeconds,
			"method",
		),
		unaryInflight: s.metrics.NewGaugeVecEx("grpc_unary_inflight", "gRPC unary calls in flight", "method"),
		unaryStatusCode: s.metrics.NewCounterVecEx(
			"grpc_unary_status_code_counter",
			"gRPC unary status code",
			"method",
			"status",
		),
		openClientStreams: s.metrics.NewGaugeVecEx(
			"grpc_open_client_streams",
			"gRPC open client streams",
			"method",
		),
		openServerStreams: s.metrics.NewGaugeVecEx(
			"grpc_open_server_streams",
			"gRPC open server streams",
			"method",
		),
		serverStreamsStatusCode: s.metrics.NewCounterVecEx(
			"grpc_server_stream_status_code_counter",
			"gRPC server stream status code",
			"method",
			"status",
		),
	}
}

func (i *metricsInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(
		ctx context.Context,
		req connect.AnyRequest,
	) (connect.AnyResponse, error) {
		var (
			proc = req.Spec().Procedure
			m    = i.unaryInflight.With(prometheus.Labels{"method": proc})
			s, _ = i.unaryStatusCode.CurryWith(prometheus.Labels{"method": proc})
		)

		// add streamId to tracing span
		r, ok := req.Any().(streamIdProvider)
		if ok {
			id, err := shared.StreamIdFromBytes(r.GetStreamId())
			if err == nil {
				span := trace.SpanFromContext(ctx)
				span.SetAttributes(attribute.String("streamId", id.String()))
			}
		}

		m.Inc()
		timer := prometheus.NewTimer(i.rpcDuration.WithLabelValues(proc))
		resp, err := next(ctx, req)
		timer.ObserveDuration()
		m.Dec()

		s.With(prometheus.Labels{"status": errorToStatus(err)}).Inc()

		return resp, err
	}
}

func (i *metricsInterceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return func(
		ctx context.Context,
		spec connect.Spec,
	) connect.StreamingClientConn {
		m := i.openClientStreams.With(prometheus.Labels{"method": spec.Procedure})

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
		var (
			proc = conn.Spec().Procedure
			m    = i.openClientStreams.With(prometheus.Labels{"method": proc})
			s, _ = i.serverStreamsStatusCode.CurryWith(prometheus.Labels{"method": proc})
		)

		m.Inc()
		defer m.Dec()

		err := next(ctx, conn)

		s.With(prometheus.Labels{"status": errorToStatus(err)}).Inc()

		return err
	}
}

func errorToStatus(err error) string {
	if err == nil {
		return "success"
	}

	var riverErr *base.RiverErrorImpl
	if ok := errors.As(err, &riverErr); ok {
		return strings.ToLower(riverErr.Code.String())
	}

	var connectErr *connect.Error
	if ok := errors.As(err, &connectErr); ok {
		return connectErr.Code().String()
	}

	return "unknown"
}
