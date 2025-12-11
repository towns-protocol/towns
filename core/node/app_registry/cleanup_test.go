package app_registry

import (
	"context"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/infra"
)

// mockCleanupStore implements EnqueuedMessagesCleanupStore for testing.
type mockCleanupStore struct {
	deleteExpiredCalled    bool
	deleteExpiredThreshold time.Time
	deleteExpiredReturn    int64
	deleteExpiredErr       error

	trimCalled bool
	trimMax    int
	trimReturn int64
	trimErr    error

	countReturn int64
	countErr    error
}

func (m *mockCleanupStore) DeleteExpiredEnqueuedMessages(ctx context.Context, olderThan time.Time) (int64, error) {
	m.deleteExpiredCalled = true
	m.deleteExpiredThreshold = olderThan
	return m.deleteExpiredReturn, m.deleteExpiredErr
}

func (m *mockCleanupStore) TrimEnqueuedMessagesPerBot(ctx context.Context, maxMessages int) (int64, error) {
	m.trimCalled = true
	m.trimMax = maxMessages
	return m.trimReturn, m.trimErr
}

func (m *mockCleanupStore) GetEnqueuedMessagesCount(ctx context.Context) (int64, error) {
	return m.countReturn, m.countErr
}

func TestNewEnqueuedMessagesCleaner_AppliesDefaults(t *testing.T) {
	require := require.New(t)

	store := &mockCleanupStore{}
	metricsFactory := infra.NewMetricsFactory(prometheus.NewRegistry(), "", "")

	// Empty config - should use defaults
	cleaner := NewEnqueuedMessagesCleaner(store, config.EnqueuedMessageRetentionConfig{}, metricsFactory)

	require.Equal(DefaultEnqueuedMessageTTL, cleaner.cfg.TTL)
	require.Equal(DefaultMaxMessagesPerBot, cleaner.cfg.MaxMessagesPerBot)
	require.Equal(DefaultEnqueuedMessageCleanupInterval, cleaner.cfg.CleanupInterval)
}

func TestNewEnqueuedMessagesCleaner_UsesProvidedConfig(t *testing.T) {
	require := require.New(t)

	store := &mockCleanupStore{}
	metricsFactory := infra.NewMetricsFactory(prometheus.NewRegistry(), "", "")

	cfg := config.EnqueuedMessageRetentionConfig{
		TTL:               24 * time.Hour,
		MaxMessagesPerBot: 500,
		CleanupInterval:   10 * time.Minute,
	}

	cleaner := NewEnqueuedMessagesCleaner(store, cfg, metricsFactory)

	require.Equal(24*time.Hour, cleaner.cfg.TTL)
	require.Equal(500, cleaner.cfg.MaxMessagesPerBot)
	require.Equal(10*time.Minute, cleaner.cfg.CleanupInterval)
}

func TestEnqueuedMessagesCleaner_Cleanup(t *testing.T) {
	require := require.New(t)

	store := &mockCleanupStore{
		deleteExpiredReturn: 5,
		trimReturn:          3,
	}
	metricsFactory := infra.NewMetricsFactory(prometheus.NewRegistry(), "", "")

	cfg := config.EnqueuedMessageRetentionConfig{
		TTL:               7 * 24 * time.Hour,
		MaxMessagesPerBot: 1000,
		CleanupInterval:   5 * time.Minute,
	}

	cleaner := NewEnqueuedMessagesCleaner(store, cfg, metricsFactory)

	// Call cleanup directly
	beforeCleanup := time.Now()
	cleaner.cleanup(context.Background())
	afterCleanup := time.Now()

	// Verify delete expired was called
	require.True(store.deleteExpiredCalled)
	// Threshold should be approximately 7 days ago
	expectedThreshold := beforeCleanup.Add(-7 * 24 * time.Hour)
	require.True(store.deleteExpiredThreshold.After(expectedThreshold.Add(-time.Second)))
	require.True(store.deleteExpiredThreshold.Before(afterCleanup.Add(-7*24*time.Hour + time.Second)))

	// Verify trim was called with correct max
	require.True(store.trimCalled)
	require.Equal(1000, store.trimMax)
}

func TestEnqueuedMessagesCleaner_Run_StopsOnContextCancel(t *testing.T) {
	require := require.New(t)

	store := &mockCleanupStore{}
	metricsFactory := infra.NewMetricsFactory(prometheus.NewRegistry(), "", "")

	cfg := config.EnqueuedMessageRetentionConfig{
		TTL:               1 * time.Hour,
		MaxMessagesPerBot: 100,
		CleanupInterval:   100 * time.Millisecond, // Short interval for testing
	}

	cleaner := NewEnqueuedMessagesCleaner(store, cfg, metricsFactory)

	ctx, cancel := context.WithCancel(context.Background())

	// Start the cleaner in a goroutine
	done := make(chan struct{})
	go func() {
		cleaner.Run(ctx)
		close(done)
	}()

	// Wait a bit for at least one cleanup cycle
	time.Sleep(250 * time.Millisecond)

	// Cancel the context
	cancel()

	// Wait for the cleaner to stop
	select {
	case <-done:
		// Success - cleaner stopped
	case <-time.After(1 * time.Second):
		require.Fail("Cleaner did not stop after context cancellation")
	}

	// Verify cleanup was called at least once
	require.True(store.deleteExpiredCalled || store.trimCalled, "Expected at least one cleanup call")
}

func TestEnqueuedMessagesCleaner_Constants(t *testing.T) {
	require := require.New(t)

	// Verify default constants are reasonable
	require.Equal(7*24*time.Hour, DefaultEnqueuedMessageTTL)
	require.Equal(1000, DefaultMaxMessagesPerBot)
	require.Equal(5*time.Minute, DefaultEnqueuedMessageCleanupInterval)
}
