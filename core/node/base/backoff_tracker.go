package base

import (
	"context"
	"errors"
	"time"

	. "github.com/towns-protocol/towns/core/node/protocol"
)

type BackoffTracker struct {
	// NextDelay is the delay for the next attempt.
	// If set to 0, the first attempt is made immediately.
	NextDelay time.Duration

	// NumAttempts is the number of attempts made so far.
	NumAttempts int

	// MaxAttempts is the maximum number of attempts to make.
	// If set to 0, the backoff will continue until the context is cancelled.
	MaxAttempts int

	// StartDelay is used for the second attempt if NextDelay is 0.
	// If set to 0, 50ms is used.
	StartDelay time.Duration

	// Multiplier is the multiplier for the delay.
	// If set to 0, 3 is used.
	Multiplier int

	// Divisor is the divisor for the delay.
	// If set to 0, 2 is used.
	Divisor int
}

// Wait waits for the next attempt.
// If the context is cancelled, the function returns the context error.
// If the context times out, the function returns a deadline exceeded error with lastErr as the base error if given.
// If the maximum number of attempts is reached, the function returns the last error.
func (b *BackoffTracker) Wait(ctx context.Context, lastErr error) error {
	b.NumAttempts++

	if b.MaxAttempts > 0 && b.NumAttempts >= b.MaxAttempts {
		if lastErr != nil {
			return lastErr
		}
		return RiverError(Err_RESOURCE_EXHAUSTED, "max attempts reached")
	}

	if b.NextDelay == 0 {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		b.NextDelay = b.StartDelay
		if b.NextDelay == 0 {
			b.NextDelay = 50 * time.Millisecond
		}
		return nil
	}

	select {
	case <-ctx.Done():
		if ctxErr := ctx.Err(); ctxErr != nil {
			if errors.Is(ctxErr, context.Canceled) {
				return ctxErr
			}

			if errors.Is(ctxErr, context.DeadlineExceeded) {
				if lastErr != nil {
					return RiverErrorWithBases(Err_DEADLINE_EXCEEDED, "operation timed out", []error{lastErr})
				}
				return RiverError(Err_DEADLINE_EXCEEDED, "operation timed out")
			}
		}

		return ctx.Err()
	case <-time.After(b.NextDelay):
		if b.Multiplier <= 0 {
			b.Multiplier = 3
		}
		if b.Divisor <= 0 {
			b.Divisor = 2
		}
		b.NextDelay = b.NextDelay * time.Duration(b.Multiplier) / time.Duration(b.Divisor)
		return nil
	}
}
