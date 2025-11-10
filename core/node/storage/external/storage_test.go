package external

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestBuildRangeHeader(t *testing.T) {
	tests := []struct {
		name     string
		ranges   []byteRange
		expected string
	}{
		{
			name:     "empty ranges",
			ranges:   []byteRange{},
			expected: "",
		},
		{
			name: "single range",
			ranges: []byteRange{
				{start: 0, end: 100},
			},
			expected: "bytes=0-100",
		},
		{
			name: "multiple ranges",
			ranges: []byteRange{
				{start: 0, end: 100},
				{start: 200, end: 300},
			},
			expected: "bytes=0-100,200-300",
		},
		{
			name: "three ranges",
			ranges: []byteRange{
				{start: 0, end: 50},
				{start: 100, end: 150},
				{start: 200, end: 250},
			},
			expected: "bytes=0-50,100-150,200-250",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := buildRangeHeader(tt.ranges)
			require.Equal(t, tt.expected, result)
		})
	}
}

func TestExtractMiniblocks(t *testing.T) {
	// Create test data: a simple byte array with known values
	data := []byte{
		// Miniblock 0: bytes 0-9 (10 bytes)
		0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
		// Miniblock 1: bytes 10-19 (10 bytes)
		10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
		// Miniblock 2: bytes 20-29 (10 bytes)
		20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
	}

	tests := []struct {
		name       string
		data       []byte
		ranges     []byteRange
		miniblocks map[int64]MiniblockDescriptor
		expected   map[int64][]byte
		wantErr    bool
	}{
		{
			name: "extract single miniblock",
			data: data,
			ranges: []byteRange{
				{start: 0, end: 9},
			},
			miniblocks: map[int64]MiniblockDescriptor{
				0: {Number: 0, StartByte: 0, MiniblockDataLength: 10},
			},
			expected: map[int64][]byte{
				0: {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
			},
			wantErr: false,
		},
		{
			name: "extract multiple miniblocks",
			data: data,
			ranges: []byteRange{
				{start: 0, end: 29},
			},
			miniblocks: map[int64]MiniblockDescriptor{
				0: {Number: 0, StartByte: 0, MiniblockDataLength: 10},
				1: {Number: 1, StartByte: 10, MiniblockDataLength: 10},
				2: {Number: 2, StartByte: 20, MiniblockDataLength: 10},
			},
			expected: map[int64][]byte{
				0: {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
				1: {10, 11, 12, 13, 14, 15, 16, 17, 18, 19},
				2: {20, 21, 22, 23, 24, 25, 26, 27, 28, 29},
			},
			wantErr: false,
		},
		{
			name: "extract non-contiguous miniblocks",
			data: data,
			ranges: []byteRange{
				{start: 0, end: 29},
			},
			miniblocks: map[int64]MiniblockDescriptor{
				0: {Number: 0, StartByte: 0, MiniblockDataLength: 10},
				2: {Number: 2, StartByte: 20, MiniblockDataLength: 10},
			},
			expected: map[int64][]byte{
				0: {0, 1, 2, 3, 4, 5, 6, 7, 8, 9},
				2: {20, 21, 22, 23, 24, 25, 26, 27, 28, 29},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := extractMiniblocks(tt.data, tt.ranges, tt.miniblocks)

			if tt.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			require.Equal(t, len(tt.expected), len(result))

			for mbNum, expectedData := range tt.expected {
				actualData, ok := result[mbNum]
				require.True(t, ok, "miniblock %d not found in result", mbNum)
				require.Equal(t, expectedData, actualData, "miniblock %d data mismatch", mbNum)
			}
		})
	}
}

func TestObjectRangeMiniblocks(t *testing.T) {
	// Create test miniblock descriptors
	parts := []MiniblockDescriptor{
		{Number: 0, StartByte: 0, MiniblockDataLength: 10},
		{Number: 1, StartByte: 10, MiniblockDataLength: 15},
		{Number: 2, StartByte: 25, MiniblockDataLength: 20},
		{Number: 3, StartByte: 45, MiniblockDataLength: 25},
	}

	tests := []struct {
		name          string
		parts         []MiniblockDescriptor
		fromInclusive int64
		toExclusive   int64
		wantOffset    int64
		wantSize      int64
		wantParts     int
		wantErr       bool
	}{
		{
			name:          "first miniblock",
			parts:         parts,
			fromInclusive: 0,
			toExclusive:   1,
			wantOffset:    0,
			wantSize:      10,
			wantParts:     1,
			wantErr:       false,
		},
		{
			name:          "first two miniblocks",
			parts:         parts,
			fromInclusive: 0,
			toExclusive:   2,
			wantOffset:    0,
			wantSize:      25,
			wantParts:     2,
			wantErr:       false,
		},
		{
			name:          "middle range",
			parts:         parts,
			fromInclusive: 1,
			toExclusive:   3,
			wantOffset:    10,
			wantSize:      35, // 15 + 20
			wantParts:     2,
			wantErr:       false,
		},
		{
			name:          "all miniblocks",
			parts:         parts,
			fromInclusive: 0,
			toExclusive:   4,
			wantOffset:    0,
			wantSize:      70, // 10 + 15 + 20 + 25
			wantParts:     4,
			wantErr:       false,
		},
		{
			name:          "invalid range - not found",
			parts:         parts,
			fromInclusive: 5,
			toExclusive:   6,
			wantErr:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			offset, size, rangeParts, err := ObjectRangeMiniblocks(tt.parts, tt.fromInclusive, tt.toExclusive)

			if tt.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			require.Equal(t, tt.wantOffset, offset, "offset mismatch")
			require.Equal(t, tt.wantSize, size, "size mismatch")
			require.Equal(t, tt.wantParts, len(rangeParts), "parts count mismatch")
		})
	}
}

func TestIsRetryableError(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		statusCode int
		want       bool
	}{
		{
			name:       "429 rate limit",
			err:        nil,
			statusCode: http.StatusTooManyRequests,
			want:       true,
		},
		{
			name:       "500 internal server error",
			err:        nil,
			statusCode: http.StatusInternalServerError,
			want:       true,
		},
		{
			name:       "502 bad gateway",
			err:        nil,
			statusCode: http.StatusBadGateway,
			want:       true,
		},
		{
			name:       "503 service unavailable",
			err:        nil,
			statusCode: http.StatusServiceUnavailable,
			want:       true,
		},
		{
			name:       "504 gateway timeout",
			err:        nil,
			statusCode: http.StatusGatewayTimeout,
			want:       true,
		},
		{
			name:       "404 not found - not retryable",
			err:        nil,
			statusCode: http.StatusNotFound,
			want:       false,
		},
		{
			name:       "200 OK - not retryable",
			err:        nil,
			statusCode: http.StatusOK,
			want:       false,
		},
		{
			name:       "network error - retryable",
			err:        errors.New("network error"),
			statusCode: 0,
			want:       true,
		},
		{
			name:       "context canceled - not retryable",
			err:        context.Canceled,
			statusCode: 0,
			want:       false,
		},
		{
			name:       "context deadline exceeded - not retryable",
			err:        context.DeadlineExceeded,
			statusCode: 0,
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isRetryableError(tt.err, tt.statusCode)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestRetryWithBackoff(t *testing.T) {
	t.Run("succeeds on first attempt", func(t *testing.T) {
		ctx := context.Background()
		attempts := 0

		err := retryWithBackoff(ctx, "test operation", func() (int, error) {
			attempts++
			return http.StatusOK, nil
		})

		require.NoError(t, err)
		require.Equal(t, 1, attempts)
	})

	t.Run("succeeds on second attempt", func(t *testing.T) {
		ctx := context.Background()
		attempts := 0

		err := retryWithBackoff(ctx, "test operation", func() (int, error) {
			attempts++
			if attempts == 1 {
				return http.StatusServiceUnavailable, errors.New("service unavailable")
			}
			return http.StatusOK, nil
		})

		require.NoError(t, err)
		require.Equal(t, 2, attempts)
	})

	t.Run("fails after max retries", func(t *testing.T) {
		ctx := context.Background()
		attempts := 0

		err := retryWithBackoff(ctx, "test operation", func() (int, error) {
			attempts++
			return http.StatusServiceUnavailable, errors.New("service unavailable")
		})

		require.Error(t, err)
		require.Equal(t, maxRetries+1, attempts) // maxRetries + initial attempt
	})

	t.Run("does not retry on non-retryable error", func(t *testing.T) {
		ctx := context.Background()
		attempts := 0

		err := retryWithBackoff(ctx, "test operation", func() (int, error) {
			attempts++
			return http.StatusNotFound, errors.New("not found")
		})

		require.Error(t, err)
		require.Equal(t, 1, attempts) // Only initial attempt, no retries
	})

	t.Run("respects context cancellation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		attempts := 0

		// Cancel context after first failed attempt
		err := retryWithBackoff(ctx, "test operation", func() (int, error) {
			attempts++
			if attempts == 1 {
				// Cancel after first attempt
				cancel()
				return http.StatusServiceUnavailable, errors.New("service unavailable")
			}
			return http.StatusOK, nil
		})

		require.Error(t, err)
		require.Equal(t, context.Canceled, err)
		require.Equal(t, 1, attempts)
	})

	t.Run("backoff timing", func(t *testing.T) {
		ctx := context.Background()
		attempts := 0
		start := time.Now()

		err := retryWithBackoff(ctx, "test operation", func() (int, error) {
			attempts++
			if attempts < 3 {
				return http.StatusServiceUnavailable, errors.New("service unavailable")
			}
			return http.StatusOK, nil
		})

		elapsed := time.Since(start)

		require.NoError(t, err)
		require.Equal(t, 3, attempts)
		// Should have waited at least initialBackoff + (initialBackoff * backoffMultiplier)
		// = 100ms + 200ms = 300ms
		require.GreaterOrEqual(t, elapsed, 300*time.Millisecond)
	})
}
