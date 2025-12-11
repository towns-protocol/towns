package app_registry

import (
	"context"
	"time"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
)

// cleanupMetrics holds Prometheus metrics for the cleanup job.
type cleanupMetrics struct {
	enqueuedMessagesTotal prometheus.GaugeFunc
	deletedByTTL          prometheus.Counter
	deletedByLimit        prometheus.Counter
}

func newCleanupMetrics(factory infra.MetricsFactory, store EnqueuedMessagesCleanupStore) *cleanupMetrics {
	return &cleanupMetrics{
		enqueuedMessagesTotal: factory.NewGaugeFunc(
			prometheus.GaugeOpts{
				Name: "app_registry_enqueued_messages_total",
				Help: "Total number of messages in the enqueued_messages table",
			},
			func() float64 {
				count, _ := store.GetEnqueuedMessagesCount(context.Background())
				return float64(count)
			},
		),
		deletedByTTL: factory.NewCounterEx(
			"app_registry_enqueued_messages_deleted_by_ttl_total",
			"Total enqueued messages deleted due to TTL expiration",
		),
		deletedByLimit: factory.NewCounterEx(
			"app_registry_enqueued_messages_deleted_by_limit_total",
			"Total enqueued messages deleted due to per-bot limit",
		),
	}
}

// EnqueuedMessagesCleanupStore defines the storage methods needed for cleanup.
type EnqueuedMessagesCleanupStore interface {
	DeleteExpiredEnqueuedMessages(ctx context.Context, olderThan time.Time) (int64, error)
	TrimEnqueuedMessagesPerBot(ctx context.Context, maxMessages int) (int64, error)
	GetEnqueuedMessagesCount(ctx context.Context) (int64, error)
}

// EnqueuedMessagesCleaner runs periodic cleanup of old and excess enqueued messages.
type EnqueuedMessagesCleaner struct {
	store   EnqueuedMessagesCleanupStore
	cfg     config.EnqueuedMessageRetentionConfig
	metrics *cleanupMetrics
}

// NewEnqueuedMessagesCleaner creates a new cleaner with the given configuration.
func NewEnqueuedMessagesCleaner(
	store EnqueuedMessagesCleanupStore,
	cfg config.EnqueuedMessageRetentionConfig,
	metricsFactory infra.MetricsFactory,
) *EnqueuedMessagesCleaner {
	return &EnqueuedMessagesCleaner{
		store:   store,
		cfg:     cfg,
		metrics: newCleanupMetrics(metricsFactory, store),
	}
}

// Run starts the cleanup loop. It blocks until the context is cancelled.
func (c *EnqueuedMessagesCleaner) Run(ctx context.Context) {
	log := logging.FromCtx(ctx).With("component", "EnqueuedMessagesCleaner")
	log.Infow("Starting enqueued messages cleanup job",
		"ttl", c.cfg.TTL,
		"maxMessagesPerBot", c.cfg.MaxMessagesPerBot,
		"cleanupInterval", c.cfg.CleanupInterval,
	)

	ticker := time.NewTicker(c.cfg.CleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.cleanup(ctx)
		case <-ctx.Done():
			log.Infow("Stopping enqueued messages cleanup job")
			return
		}
	}
}

func (c *EnqueuedMessagesCleaner) cleanup(ctx context.Context) {
	log := logging.FromCtx(ctx).With("component", "EnqueuedMessagesCleaner")

	// 1. Delete messages older than TTL
	threshold := time.Now().Add(-c.cfg.TTL)
	expiredDeleted, err := c.store.DeleteExpiredEnqueuedMessages(ctx, threshold)
	if err != nil {
		log.Errorw("Failed to cleanup expired enqueued messages", "error", err)
	} else if expiredDeleted > 0 {
		log.Infow("Cleaned up expired enqueued messages", "count", expiredDeleted)
		c.metrics.deletedByTTL.Add(float64(expiredDeleted))
	}

	// 2. Trim per-bot queues exceeding the limit
	trimmed, err := c.store.TrimEnqueuedMessagesPerBot(ctx, c.cfg.MaxMessagesPerBot)
	if err != nil {
		log.Errorw("Failed to trim per-bot message queues", "error", err)
	} else if trimmed > 0 {
		log.Infow("Trimmed per-bot message queues", "count", trimmed)
		c.metrics.deletedByLimit.Add(float64(trimmed))
	}
}
