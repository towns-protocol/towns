package rpc

import (
	"os"

	"connectrpc.com/otelconnect"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/exporters/zipkin"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/node/utils"
	"github.com/towns-protocol/towns/core/river_node/version"
)

func (s *Service) initTracing() {
	if !s.config.PerformanceTracking.TracingEnabled {
		return
	}

	var exporters []trace.TracerProviderOption

	if s.config.PerformanceTracking.OtlpFile != "" {
		f, err := os.OpenFile(s.config.PerformanceTracking.OtlpFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			s.defaultLogger.Errorw("initTracing: failed to create trace file", "error", err)
		} else {
			s.onClose(f.Close)

			exporter, err := stdouttrace.New(
				stdouttrace.WithWriter(f),
			)
			if err != nil {
				s.defaultLogger.Errorw("initTracing: failed to create stdout exporter", "error", err)
			} else {
				s.onClose(exporter.Shutdown)

				exporters = append(exporters, trace.WithBatcher(exporter))
			}
		}
	}

	if s.config.PerformanceTracking.OtlpEnableHttp {
		// Exporter is configured with OTLP env variables as described here:
		// go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
		opts := []otlptracehttp.Option{}
		if s.config.PerformanceTracking.OtlpInsecure {
			opts = append(opts, otlptracehttp.WithInsecure())
		}
		exp, err := otlptracehttp.New(s.serverCtx, opts...)
		if err == nil {
			s.onClose(exp.Shutdown)
			exporters = append(exporters, trace.WithBatcher(exp))
		} else {
			s.defaultLogger.Errorw("Failed to create http OTLP exporter", "error", err)
		}
	}

	if s.config.PerformanceTracking.OtlpEnableGrpc {
		// Exporter is configured with OTLP env variables as described here:
		// go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
		opts := []otlptracegrpc.Option{}
		if s.config.PerformanceTracking.OtlpInsecure {
			opts = append(opts, otlptracegrpc.WithInsecure())
		}
		exp, err := otlptracegrpc.New(s.serverCtx, opts...)
		if err == nil {
			s.onClose(exp.Shutdown)
			exporters = append(exporters, trace.WithBatcher(exp))
		} else {
			s.defaultLogger.Errorw("Failed to create grpc OTLP exporter", "error", err)
		}
	}

	if s.config.PerformanceTracking.ZipkinUrl != "" {
		exp, err := zipkin.New(
			s.config.PerformanceTracking.ZipkinUrl+"/api/v2/spans",
			zipkin.WithLogger(utils.NewLevelLogger(s.defaultLogger, zap.WarnLevel)),
		)
		if err == nil {
			s.onClose(exp.Shutdown)
			exporters = append(exporters, trace.WithBatcher(exp))
		} else {
			s.defaultLogger.Errorw("Failed to create zipkin exporter", "error", err)
		}
	}

	if len(exporters) == 0 {
		s.defaultLogger.Warnw("Tracing is enabled, but no exporters are configured, skipping tracing setup")
		return
	}

	res, err := resource.New(
		s.serverCtx,
		resource.WithAttributes(
			semconv.ServiceName("river-stream"),
			semconv.ServiceInstanceID(s.wallet.String()),
			semconv.ServiceVersion(version.GetFullVersion()),
		),
	)
	if err != nil {
		s.defaultLogger.Errorw("Failed to create resource", "error", err)
		return
	}

	// Create a new tracer provider with the exporter
	traceProvider := trace.NewTracerProvider(
		append(exporters, trace.WithResource(res))...,
	)
	s.onClose(traceProvider.Shutdown)
	s.otelTraceProvider = traceProvider

	s.otelTracer = s.otelTraceProvider.Tracer("")

	s.otelConnectIterceptor, err = otelconnect.NewInterceptor(
		otelconnect.WithTracerProvider(traceProvider),
		otelconnect.WithoutMetrics(),
		otelconnect.WithTrustRemote(),
		otelconnect.WithoutServerPeerAttributes(),
		otelconnect.WithPropagator(propagation.TraceContext{}),
	)
	if err != nil {
		s.defaultLogger.Errorw("Failed to create otel interceptor", "error", err)
	}
}
