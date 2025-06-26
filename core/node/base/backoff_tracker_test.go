package base

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	. "github.com/towns-protocol/towns/core/node/protocol"
)

func TestBackoffTrackerErrorTimeout(t *testing.T) {
	tracker := &BackoffTracker{
		NextDelay:  10 * time.Millisecond,
		Multiplier: 2,
		Divisor:    1,
	}

	var (
		err                error
		expectedErr        = errors.New("expected error contents")
		ctxTimeout, cancel = context.WithTimeout(t.Context(), 150*time.Millisecond)
	)
	defer cancel()

	for {
		err = tracker.Wait(ctxTimeout, expectedErr)
		if err != nil {
			assert.Equal(t, Err_DEADLINE_EXCEEDED, AsRiverError(err).Code)
			assert.ErrorIs(t, err, expectedErr)
			return
		}
	}
}

func TestBackoffTrackerErrorCancelled(t *testing.T) {
	tracker := &BackoffTracker{
		NextDelay:  10 * time.Millisecond,
		Multiplier: 2,
		Divisor:    1,
	}

	var (
		err                   error
		expectedErr           = context.Canceled
		ctxWithCancel, cancel = context.WithCancel(t.Context())
	)
	defer cancel()

	for i := range 10 {
		err = tracker.Wait(ctxWithCancel, expectedErr)
		if err != nil {
			break
		}

		if i >= 5 {
			cancel()
		}
	}

	assert.Equal(t, Err_CANCELED, AsRiverError(err).Code)
	assert.ErrorIs(t, err, expectedErr)
}
