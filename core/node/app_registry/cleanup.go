package app_registry

import (
	"context"
	"time"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/storage"
)

// cleanupMetrics holds Prometheus metrics for the cleanup job.
type cleanupMetrics struct {
	enqueuedMessagesTotal prometheus.Gauge
	deletedByTTL          prometheus.Counter
	deletedByLimit        prometheus.Counter
}

func newCleanupMetrics(factory infra.MetricsFactory) *cleanupMetrics {
	return &cleanupMetrics{
		enqueuedMessagesTotal: factory.NewGaugeEx(
			"app_registry_enqueued_messages_total",
			"Total number of messages in the enqueued_messages table",
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

// EnqueuedMessagesCleaner runs periodic cleanup of old and excess enqueued messages.
type EnqueuedMessagesCleaner struct {
	store   storage.AppRegistryStore
	cfg     config.EnqueuedMessageRetentionConfig
	metrics *cleanupMetrics
}

// NewEnqueuedMessagesCleaner creates a new cleaner with the given configuration.
func NewEnqueuedMessagesCleaner(
	store storage.AppRegistryStore,
	cfg config.EnqueuedMessageRetentionConfig,
	metricsFactory infra.MetricsFactory,
) *EnqueuedMessagesCleaner {
	return &EnqueuedMessagesCleaner{
		store:   store,
		cfg:     cfg,
		metrics: newCleanupMetrics(metricsFactory),
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

	// 1. Delete messages older than TTL (skip if TTL is 0 to avoid deleting all messages)
	if c.cfg.TTL > 0 {
		threshold := time.Now().Add(-c.cfg.TTL)
		expiredDeleted, err := c.store.DeleteExpiredEnqueuedMessages(ctx, threshold)
		if err != nil {
			log.Errorw("Failed to cleanup expired enqueued messages", "error", err)
		} else if expiredDeleted > 0 {
			log.Infow("Cleaned up expired enqueued messages", "count", expiredDeleted)
			c.metrics.deletedByTTL.Add(float64(expiredDeleted))
		}
	}

	// 2. Trim per-bot queues exceeding the limit (skip if limit is 0 to avoid deleting all messages)
	if c.cfg.MaxMessagesPerBot > 0 {
		trimmed, err := c.store.TrimEnqueuedMessagesPerBot(ctx, c.cfg.MaxMessagesPerBot)
		if err != nil {
			log.Errorw("Failed to trim per-bot message queues", "error", err)
		} else if trimmed > 0 {
			log.Infow("Trimmed per-bot message queues", "count", trimmed)
			c.metrics.deletedByLimit.Add(float64(trimmed))
		}
	}

	// 3. Update total count metric
	count, err := c.store.GetEnqueuedMessagesCountAprox(ctx)
	if err != nil {
		log.Errorw("Failed to get enqueued messages count", "error", err)
	} else {
		c.metrics.enqueuedMessagesTotal.Set(float64(count))
	}
}
