package storage

import (
	"context"
	"math"
	"time"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

// Retry configuration
const (
	maxRetries = 3
	baseDelay  = 100 * time.Millisecond
	maxDelay   = 5 * time.Second
)

// retryWithBackoff executes a function with exponential backoff retry logic
func retryWithBackoff(ctx context.Context, operation string, fn func() error) error {
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			// Calculate delay with exponential backoff
			delay := min(time.Duration(float64(baseDelay)*math.Pow(2, float64(attempt-1))), maxDelay)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
		}

		err := fn()
		if err == nil {
			return nil
		}

		lastErr = err

		// Don't retry on certain errors (e.g., authentication, invalid parameters)
		if !isRetryableError(err) {
			return err
		}
	}

	return RiverError(Err_INTERNAL, "operation", operation, "error", lastErr)
}

// isRetryableError determines if an error should be retried
func isRetryableError(err error) bool {
	// Add logic to check for retryable errors
	// For now, retry all errors except context cancellation
	return err != context.Canceled && err != context.DeadlineExceeded
}
