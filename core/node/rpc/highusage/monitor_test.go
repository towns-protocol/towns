package highusage

import (
	"context"
	"math/big"
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/config"
)

func TestMonitorPerMinuteThreshold(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(true, map[CallType][]Threshold{
		CallTypeEvent: {
			{Window: time.Minute, Count: 2},
		},
	})
	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()
	user := common.HexToAddress("0x1")
	base := time.Unix(0, 0)

	monitor.RecordCall(user.Bytes(), base, CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(base), 0)

	monitor.RecordCall(user.Bytes(), base.Add(200*time.Millisecond), CallTypeEvent)
	snapshot := monitor.GetHighUsageInfo(base.Add(500 * time.Millisecond))
	require.Len(t, snapshot, 1)
	require.Equal(t, user, snapshot[0].User)
	require.Len(t, snapshot[0].Violations, 1)
	require.Equal(t, uint32(2), snapshot[0].Violations[0].Count)
	require.Equal(t, uint32(2), snapshot[0].Violations[0].Limit)

	// After the per-minute window moves forward, the offender should disappear.
	snapshot = monitor.GetHighUsageInfo(base.Add(61 * time.Second))
	require.Len(t, snapshot, 0)
}

func TestMonitorPerDayThreshold(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(true, map[CallType][]Threshold{
		CallTypeMediaEvent: {
			{Window: 24 * time.Hour, Count: 3},
		},
	})

	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()
	user := common.HexToAddress("0x2")
	base := time.Unix(0, 0)

	for i := 0; i < 3; i++ {
		monitor.RecordCall(user.Bytes(), base.Add(time.Duration(i)*2*time.Hour), CallTypeMediaEvent)
	}

	snapshot := monitor.GetHighUsageInfo(base.Add(6 * time.Hour))
	require.Len(t, snapshot, 1)
	require.Equal(t, CallTypeMediaEvent, snapshot[0].CallType)
	require.Len(t, snapshot[0].Violations, 1)
	require.Equal(t, uint32(3), snapshot[0].Violations[0].Count)
	require.Equal(t, uint32(3), snapshot[0].Violations[0].Limit)
}

func TestMonitorCleanupRemovesIdleUsers(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(true, map[CallType][]Threshold{
		CallTypeEvent: {
			{Window: time.Minute, Count: 1},
		},
	})

	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()
	user := common.HexToAddress("0x3")
	base := time.Unix(0, 0)

	monitor.RecordCall(user.Bytes(), base, CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(base.Add(time.Second)), 1)

	impl := monitor.(*inMemoryCallRateMonitor)
	impl.cleanupLocked(base.Add(25 * time.Hour))
	require.Len(t, monitor.GetHighUsageInfo(base.Add(25*time.Hour)), 0)
}

func TestMonitorMultipleCallTypesSameUser(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(true, map[CallType][]Threshold{
		CallTypeEvent: {
			{Window: time.Minute, Count: 1},
		},
		CallTypeMediaEvent: {
			{Window: time.Minute, Count: 2},
		},
	})
	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()
	user := common.HexToAddress("0x42")
	base := time.Unix(0, 0)

	monitor.RecordCall(user.Bytes(), base, CallTypeEvent)
	monitor.RecordCall(user.Bytes(), base.Add(500*time.Millisecond), CallTypeMediaEvent)
	monitor.RecordCall(user.Bytes(), base.Add(800*time.Millisecond), CallTypeMediaEvent)

	usage := monitor.GetHighUsageInfo(base.Add(time.Second))
	require.Len(t, usage, 2)
}

func TestMonitorWraparoundInCircularBuffer(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(true, map[CallType][]Threshold{
		CallTypeEvent: {
			{Window: 3 * time.Second, Count: 3},
		},
	})
	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()
	user := common.HexToAddress("0xab")
	start := time.Unix(0, 0)
	for i := 0; i < 3; i++ {
		monitor.RecordCall(user.Bytes(), start.Add(time.Duration(i)*time.Second), CallTypeEvent)
	}
	require.Len(t, monitor.GetHighUsageInfo(start.Add(2500*time.Millisecond)), 1)
	monitor.RecordCall(user.Bytes(), start.Add(3500*time.Millisecond), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(start.Add(4*time.Second)), 0)
}

func TestMonitorEdgeCaseThresholdBoundaries(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(true, map[CallType][]Threshold{
		CallTypeEvent: {
			{Window: time.Minute, Count: 2},
		},
	})
	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()
	user := common.HexToAddress("0xcd")
	now := time.Unix(0, 0)
	monitor.RecordCall(user.Bytes(), now, CallTypeEvent)
	monitor.RecordCall(user.Bytes(), now.Add(10*time.Second), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(now.Add(20*time.Second)), 1)
	monitor.RecordCall(user.Bytes(), now.Add(70*time.Second), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(now.Add(80*time.Second)), 0)
}

func TestMonitorConfigValidation(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(true, map[CallType][]Threshold{
		CallTypeEvent: {
			{Window: time.Minute, Count: 0},
		},
	})
	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()
	user := common.HexToAddress("0xef")
	monitor.RecordCall(user.Bytes(), time.Unix(0, 0), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(time.Unix(30, 0)), 0)
}

func TestMonitorConcurrentRecordCall(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(true, map[CallType][]Threshold{
		CallTypeEvent: {
			{Window: time.Minute, Count: 200},
		},
	})
	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()

	user := common.HexToAddress("0x111")
	start := time.Unix(0, 0)

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(offset int) {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				monitor.RecordCall(
					user.Bytes(),
					start.Add(time.Duration(offset*j)*time.Millisecond),
					CallTypeEvent,
				)
			}
		}(i)
	}
	wg.Wait()

	usage := monitor.GetHighUsageInfo(start.Add(2 * time.Second))
	require.Len(t, usage, 1)
	require.Equal(t, uint32(500), usage[0].Violations[0].Count)
}

func TestMonitorGetWhileRecording(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(true, map[CallType][]Threshold{
		CallTypeEvent: {
			{Window: time.Minute, Count: 50},
		},
	})
	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()

	user := common.HexToAddress("0x123")
	start := time.Unix(0, 0)
	var getWG sync.WaitGroup

	go func() {
		for i := 0; i < 100; i++ {
			monitor.RecordCall(user.Bytes(), start.Add(time.Millisecond*time.Duration(i)), CallTypeEvent)
		}
	}()

	getWG.Add(1)
	go func() {
		defer getWG.Done()
		_ = monitor.GetHighUsageInfo(start.Add(3 * time.Second))
	}()
	getWG.Wait()
}

func TestMonitorDisabledConfig(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(false, nil)
	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()

	user := common.HexToAddress("0xaa")
	monitor.RecordCall(user.Bytes(), time.Now(), CallTypeEvent)
	require.Nil(t, monitor.GetHighUsageInfo(time.Now()))
}

func TestMonitorMultipleConcurrentUsers(t *testing.T) {
	t.Parallel()
	cfg := newDetectionConfig(true, map[CallType][]Threshold{
		CallTypeEvent: {
			{Window: time.Minute, Count: 10},
		},
	})
	monitor := NewCallRateMonitor(context.Background(), cfg, zap.NewNop())
	defer monitor.Close()

	var wg sync.WaitGroup
	start := time.Unix(0, 0)
	for u := 0; u < 5; u++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			addr := common.BigToAddress(big.NewInt(int64(idx + 1)))
			for i := 0; i < 12; i++ {
				monitor.RecordCall(addr.Bytes(), start.Add(time.Duration(i)*time.Second), CallTypeEvent)
			}
		}(u)
	}
	wg.Wait()

	usage := monitor.GetHighUsageInfo(start.Add(30 * time.Second))
	require.Len(t, usage, 5)
}

func newDetectionConfig(enabled bool, thresholds map[CallType][]Threshold) config.HighUsageDetectionConfig {
	cfg := config.HighUsageDetectionConfig{Enabled: enabled}
	if len(thresholds) == 0 {
		return cfg
	}

	for ct, values := range thresholds {
		if len(values) == 0 {
			continue
		}
		if len(values) > 1 {
			panic("test helper supports only one threshold per call type")
		}
		thr := values[0]
		switch ct {
		case CallTypeEvent:
			cfg.Thresholds.ThresholdAddEventWindow = thr.Window
			cfg.Thresholds.ThresholdAddEventCount = thr.Count
		case CallTypeMediaEvent:
			cfg.Thresholds.ThresholdAddMediaEventWindow = thr.Window
			cfg.Thresholds.ThresholdAddMediaEventCount = thr.Count
		case CallTypeCreateMediaStream:
			cfg.Thresholds.ThresholdCreateMediaStreamWindow = thr.Window
			cfg.Thresholds.ThresholdCreateMediaStreamCount = thr.Count
		default:
			panic("unsupported call type in test helper: " + ct.String())
		}
	}
	return cfg
}
