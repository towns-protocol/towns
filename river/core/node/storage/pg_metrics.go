package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/logging"
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

	Version  string `json:"version"`
	SystemId string `json:"system_id"`

	MigratedStreams   int64
	UnmigratedStreams int64
	NumPartitions     int64
}

// PreparePostgresStatus prepares PostgresStatusResult by the given pool
func PreparePostgresStatus(ctx context.Context, pool PgxPoolInfo) PostgresStatusResult {
	log := logging.FromCtx(ctx)

	// Query to get PostgreSQL version
	var version string
	err := pool.Pool.QueryRow(ctx, "SELECT version()").Scan(&version)
	if err != nil {
		version = fmt.Sprintf("Error: %v", err)
		log.Errorw("failed to get PostgreSQL version", "err", err)
	}

	var systemId string
	err = pool.Pool.QueryRow(ctx, "SELECT system_identifier FROM pg_control_system()").Scan(&systemId)
	if err != nil {
		systemId = fmt.Sprintf("Error: %v", err)
	}

	// Note: the following statistics apply to stream stores, and not to pg stores generally.
	// These tables may also not exist until migrations are run.
	var migratedStreams, unmigratedStreams, numPartitions int64
	err = pool.Pool.QueryRow(ctx, "SELECT count(*) FROM es WHERE migrated=false").Scan(&unmigratedStreams)
	if err != nil {
		// Ignore nonexistent table or missing column, which occurs when stats are collected before migration completes
		if pgerr, ok := err.(*pgconn.PgError); ok && pgerr.Code != pgerrcode.UndefinedTable &&
			pgerr.Code != pgerrcode.UndefinedColumn {
			log.Errorw("Error calculating unmigrated stream count", "error", err)
		}
	}

	err = pool.Pool.QueryRow(ctx, "SELECT count(*) FROM es WHERE migrated=true").Scan(&migratedStreams)
	if err != nil {
		// Ignore nonexistent table or missing column, which occurs when stats are collected before migration completes
		if pgerr, ok := err.(*pgconn.PgError); ok && pgerr.Code != pgerrcode.UndefinedTable &&
			pgerr.Code != pgerrcode.UndefinedColumn {
			log.Errorw("Error calculating migrated stream count", "error", err)
		}
	}

	err = pool.Pool.QueryRow(ctx, "SELECT num_partitions FROM settings WHERE single_row_key=true").Scan(&numPartitions)
	if err != nil {
		// Ignore nonexistent table, which occurs when stats are collected before migration
		if pgerr, ok := err.(*pgconn.PgError); ok && pgerr.Code != pgerrcode.UndefinedTable {
			log.Errorw("Error calculating partition count", "error", err)
		}
	}

	return PostgresStatusResult{
		RegularPoolStats:   newPostgresStats(pool.Pool),
		StreamingPoolStats: newPostgresStats(pool.StreamingPool),
		Version:            version,
		SystemId:           systemId,
		MigratedStreams:    migratedStreams,
		UnmigratedStreams:  unmigratedStreams,
		NumPartitions:      numPartitions,
	}
}

func setupPostgresMetrics(ctx context.Context, pool PgxPoolInfo, factory infra.MetricsFactory) {
	getStatus := func() PostgresStatusResult {
		return PreparePostgresStatus(ctx, pool)
	}

	// Metrics for numeric values
	numericMetrics := []struct {
		name     string
		help     string
		getValue func(PostgresStatusResult) float64
	}{
		{
			"postgres_unmigrated_streams",
			"Total streams stored in legacy schema layout",
			func(s PostgresStatusResult) float64 { return float64(s.UnmigratedStreams) },
		},
		{
			"postgres_migrated_streams",
			"Total streams stored in fixed partition schema layout",
			func(s PostgresStatusResult) float64 { return float64(s.MigratedStreams) },
		},
		{
			"postgres_num_stream_partitions",
			"Total partitions used in fixed partition schema layout",
			func(s PostgresStatusResult) float64 { return float64(s.NumPartitions) },
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

	// Metrics for version, system ID, and ES count
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

	// Function to update version, system ID, and ES count
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
}
