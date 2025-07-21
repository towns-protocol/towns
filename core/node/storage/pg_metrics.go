package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
)

// PostgresStats contains postgres pool stats
type PostgresStats struct {
	TotalConns              int32         `json:"total_conns"`
	AcquiredConns           int32         `json:"acquired_conns"`
	IdleConns               int32         `json:"idle_conns"`
	ConstructingConns       int32         `json:"constructing_conns"`
	MaxConns                int32         `json:"max_conns"`
	NewConnsCount           int64         `json:"new_conns_count"`
	AcquireCount            int64         `json:"acquire_count"`
	EmptyAcquireCount       int64         `json:"empty_acquire_count"`
	CanceledAcquireCount    int64         `json:"canceled_acquire_count"`
	AcquireDuration         time.Duration `json:"acquire_duration"`
	MaxLifetimeDestroyCount int64         `json:"max_lifetime_destroy_count"`
	MaxIdleDestroyCount     int64         `json:"max_idle_destroy_count"`
}

// newPostgresStats creates PostgresStats by the given pool
func newPostgresStats(pool *pgxpool.Pool) PostgresStats {
	poolStat := pool.Stat()

	return PostgresStats{
		TotalConns:              poolStat.TotalConns(),
		AcquiredConns:           poolStat.AcquiredConns(),
		IdleConns:               poolStat.IdleConns(),
		ConstructingConns:       poolStat.ConstructingConns(),
		MaxConns:                poolStat.MaxConns(),
		NewConnsCount:           poolStat.NewConnsCount(),
		AcquireCount:            poolStat.AcquireCount(),
		EmptyAcquireCount:       poolStat.EmptyAcquireCount(),
		CanceledAcquireCount:    poolStat.CanceledAcquireCount(),
		AcquireDuration:         poolStat.AcquireDuration(),
		MaxLifetimeDestroyCount: poolStat.MaxLifetimeDestroyCount(),
		MaxIdleDestroyCount:     poolStat.MaxIdleDestroyCount(),
	}
}

type PostgresStatusResult struct {
	RegularPoolStats   PostgresStats `json:"regular_pool_stats"`
	StreamingPoolStats PostgresStats `json:"streaming_pool_stats"`

	StreamCount int64

	Version  string `json:"version"`
	SystemId string `json:"system_id"`
}

// PreparePostgresStatus prepares PostgresStatusResult by the given pool
func PreparePostgresStatus(ctx context.Context, pool PgxPoolInfo) PostgresStatusResult {
	log := logging.FromCtx(ctx)

	// Query to get PostgreSQL version
	var version string
	err := pool.Pool.QueryRow(ctx, "SELECT version()").Scan(&version)
	if err != nil {
		version = fmt.Sprintf("Error: %v", err)
		log.Errorw("failed to get PostgreSQL version", "error", err)
	}

	var systemId string
	err = pool.Pool.QueryRow(ctx, "SELECT system_identifier FROM pg_control_system()").Scan(&systemId)
	if err != nil {
		systemId = fmt.Sprintf("Error: %v", err)
	}

	var streamCount int64
	err = pool.Pool.QueryRow(
		ctx,
		// This query should be fine to run even if the es table does not exist.
		fmt.Sprintf(
			`SELECT safe_table_count('es', '%v');`,
			pool.Schema,
		),
	).Scan(&streamCount)
	if err != nil {
		log.Errorw("Error calculating stream count", "error", err)
	}

	return PostgresStatusResult{
		RegularPoolStats:   newPostgresStats(pool.Pool),
		StreamingPoolStats: newPostgresStats(pool.StreamingPool),
		StreamCount:        streamCount,
		Version:            version,
		SystemId:           systemId,
	}
}

func setupPostgresMetrics(ctx context.Context, pool PgxPoolInfo, factory infra.MetricsFactory) error {
	// Create a function to safely evaluate the count of a table that may or may not exist in the
	// schema without triggering a postgres error, since not all runnable node services use postgres
	// to store streams. It is easy enough to ignore these errors from the node, but it can make the
	// postgres logs difficult to navigate.
	if _, err := pool.Pool.Exec(
		ctx,
		fmt.Sprintf(
			`
			CREATE OR REPLACE FUNCTION "%s".safe_table_count(tablename text, schemaname text default 'public')
			RETURNS integer AS $$
			DECLARE
				total integer := 0;
			BEGIN
				IF to_regclass(format('"%%I".%%I', schemaname, tablename)) IS NOT NULL THEN
					EXECUTE format('SELECT COUNT(*) FROM "%%I".%%I', schemaname, tablename)
					INTO total;
				END IF;
				RETURN total;
			END;
			$$ LANGUAGE plpgsql;
			`,
			pool.Schema,
		),
	); err != nil {
		return base.WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("Unable to create stats query function")
	}

	getStatus := func() PostgresStatusResult {
		return PreparePostgresStatus(ctx, pool)
	}

	// Metrics for postgres pool stats numeric values
	// There are two pools so the metrics below should be labeled accordingly.
	numericPoolStatsMetrics := []struct {
		name     string
		help     string
		getValue func(stats PostgresStats) float64
	}{
		{
			"postgres_total_conns",
			"Total number of connections in the pool",
			func(s PostgresStats) float64 { return float64(s.TotalConns) },
		},
		{
			"postgres_acquired_conns",
			"Number of currently acquired connections",
			func(s PostgresStats) float64 { return float64(s.AcquiredConns) },
		},
		{
			"postgres_idle_conns",
			"Number of idle connections",
			func(s PostgresStats) float64 { return float64(s.IdleConns) },
		},
		{
			"postgres_constructing_conns",
			"Number of connections with construction in progress",
			func(s PostgresStats) float64 { return float64(s.ConstructingConns) },
		},
		{
			"postgres_max_conns",
			"Maximum number of connections allowed",
			func(s PostgresStats) float64 { return float64(s.MaxConns) },
		},
		{
			"postgres_new_conns_count",
			"Total number of new connections opened",
			func(s PostgresStats) float64 { return float64(s.NewConnsCount) },
		},
		{
			"postgres_acquire_count",
			"Total number of successful connection acquisitions",
			func(s PostgresStats) float64 { return float64(s.AcquireCount) },
		},
		{
			"postgres_empty_acquire_count",
			"Total number of successful acquires that waited for a connection",
			func(s PostgresStats) float64 { return float64(s.EmptyAcquireCount) },
		},
		{
			"postgres_canceled_acquire_count",
			"Total number of acquires canceled by context",
			func(s PostgresStats) float64 { return float64(s.CanceledAcquireCount) },
		},
		{
			"postgres_acquire_duration_seconds",
			"Duration of connection acquisitions",
			func(s PostgresStats) float64 { return s.AcquireDuration.Seconds() },
		},
		{
			"postgres_max_lifetime_destroy_count",
			"Total number of connections destroyed due to MaxConnLifetime",
			func(s PostgresStats) float64 { return float64(s.MaxLifetimeDestroyCount) },
		},
		{
			"postgres_max_idle_destroy_count",
			"Total number of connections destroyed due to MaxConnIdleTime",
			func(s PostgresStats) float64 { return float64(s.MaxIdleDestroyCount) },
		},
	}

	for _, metric := range numericPoolStatsMetrics {
		status := getStatus()

		// Register stat metric for the regular pool
		factory.NewGaugeFunc(
			prometheus.GaugeOpts{
				Name:        metric.name,
				Help:        metric.help,
				ConstLabels: map[string]string{"pool": "regular"},
			},
			func(getValue func(PostgresStats) float64) func() float64 {
				return func() float64 {
					return getValue(status.RegularPoolStats)
				}
			}(metric.getValue),
		)

		// Register stat metric for the streaming pool
		factory.NewGaugeFunc(
			prometheus.GaugeOpts{
				Name:        metric.name,
				Help:        metric.help,
				ConstLabels: map[string]string{"pool": "streaming"},
			},
			func(getValue func(PostgresStats) float64) func() float64 {
				return func() float64 {
					return getValue(status.StreamingPoolStats)
				}
			}(metric.getValue),
		)
	}

	// Metrics for numeric values
	numericMetrics := []struct {
		name     string
		help     string
		getValue func(PostgresStatusResult) float64
	}{
		{
			"postgres_stream_count",
			"Total streams stored in schema",
			func(s PostgresStatusResult) float64 { return float64(s.StreamCount) },
		},
	}
	for _, metric := range numericMetrics {
		factory.NewGaugeFunc(
			prometheus.GaugeOpts{
				Name: metric.name,
				Help: metric.help,
			},
			func(getValue func(PostgresStatusResult) float64) func() float64 {
				return func() float64 {
					return getValue(getStatus())
				}
			}(metric.getValue),
		)
	}

	// Metrics for version and system ID
	versionGauge := factory.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "postgres_version_info",
			Help: "PostgreSQL version information",
		},
		[]string{"version"},
	)

	systemIDGauge := factory.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "postgres_system_id_info",
			Help: "PostgreSQL system identifier information",
		},
		[]string{"system_id"},
	)

	// Function to update version and system ID
	var (
		lastVersion  string
		lastSystemID string
	)

	updateMetrics := func() {
		status := getStatus()

		if status.Version != lastVersion {
			versionGauge.Reset()
			versionGauge.WithLabelValues(status.Version).Set(1)
			lastVersion = status.Version
		}

		if status.SystemId != lastSystemID {
			systemIDGauge.Reset()
			systemIDGauge.WithLabelValues(status.SystemId).Set(1)
			lastSystemID = status.SystemId
		}
	}

	// Initial update
	updateMetrics()

	// Setup periodic updates
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				updateMetrics()
			}
		}
	}()

	return nil
}
