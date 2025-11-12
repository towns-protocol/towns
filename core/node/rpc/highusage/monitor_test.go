package highusage

import (
	"math/big"
	"sync"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
)

func TestMonitorPerMinuteThreshold(t *testing.T) {
	t.Parallel()
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 2},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()
	user := common.HexToAddress("0x1")
	base := time.Unix(0, 0)

	monitor.RecordCall(user, base, CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(base), 0)

	monitor.RecordCall(user, base.Add(200*time.Millisecond), CallTypeEvent)
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
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeMediaEvent: {
				{Window: 24 * time.Hour, Count: 3},
			},
		},
	}

	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()
	user := common.HexToAddress("0x2")
	base := time.Unix(0, 0)

	for i := 0; i < 3; i++ {
		monitor.RecordCall(user, base.Add(time.Duration(i)*2*time.Hour), CallTypeMediaEvent)
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
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 1},
			},
		},
	}

	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()
	user := common.HexToAddress("0x3")
	base := time.Unix(0, 0)

	monitor.RecordCall(user, base, CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(base.Add(time.Second)), 1)

	impl := monitor.(*inMemoryCallRateMonitor)
	impl.cleanupLocked(base.Add(25 * time.Hour))
	require.Len(t, monitor.GetHighUsageInfo(base.Add(25*time.Hour)), 0)
}

func TestMonitorMultipleCallTypesSameUser(t *testing.T) {
	t.Parallel()
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 1},
			},
			CallTypeMediaEvent: {
				{Window: time.Minute, Count: 2},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()
	user := common.HexToAddress("0x42")
	base := time.Unix(0, 0)

	monitor.RecordCall(user, base, CallTypeEvent)
	monitor.RecordCall(user, base.Add(500*time.Millisecond), CallTypeMediaEvent)
	monitor.RecordCall(user, base.Add(800*time.Millisecond), CallTypeMediaEvent)

	usage := monitor.GetHighUsageInfo(base.Add(time.Second))
	require.Len(t, usage, 2)
}

func TestMonitorWraparoundInCircularBuffer(t *testing.T) {
	t.Parallel()
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: 3 * time.Second, Count: 3},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()
	user := common.HexToAddress("0xab")
	start := time.Unix(0, 0)
	for i := 0; i < 3; i++ {
		monitor.RecordCall(user, start.Add(time.Duration(i)*time.Second), CallTypeEvent)
	}
	require.Len(t, monitor.GetHighUsageInfo(start.Add(2500*time.Millisecond)), 1)
	monitor.RecordCall(user, start.Add(3500*time.Millisecond), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(start.Add(4*time.Second)), 0)
}

func TestMonitorEdgeCaseThresholdBoundaries(t *testing.T) {
	t.Parallel()
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 2},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()
	user := common.HexToAddress("0xcd")
	now := time.Unix(0, 0)
	monitor.RecordCall(user, now, CallTypeEvent)
	monitor.RecordCall(user, now.Add(10*time.Second), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(now.Add(20*time.Second)), 1)
	monitor.RecordCall(user, now.Add(70*time.Second), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(now.Add(80*time.Second)), 0)
}

func TestMonitorConfigValidation(t *testing.T) {
	t.Parallel()
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 0},
				{Window: 0, Count: 10},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()
	user := common.HexToAddress("0xef")
	monitor.RecordCall(user, time.Unix(0, 0), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(time.Unix(30, 0)), 0)
}

func TestMonitorConcurrentRecordCall(t *testing.T) {
	t.Parallel()
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 200},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
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
					user,
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
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 50},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()

	user := common.HexToAddress("0x123")
	start := time.Unix(0, 0)
	var getWG sync.WaitGroup

	go func() {
		for i := 0; i < 100; i++ {
			monitor.RecordCall(user, start.Add(time.Millisecond*time.Duration(i)), CallTypeEvent)
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
	cfg := Config{
		Enabled: false,
	}
	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()

	user := common.HexToAddress("0xaa")
	monitor.RecordCall(user, time.Now(), CallTypeEvent)
	require.Nil(t, monitor.GetHighUsageInfo(time.Now()))
}

func TestMonitorMultipleThresholdsPerCallType(t *testing.T) {
	t.Parallel()
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 10},
				{Window: 10 * time.Minute, Count: 20},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()

	user := common.HexToAddress("0xbb")
	base := time.Unix(0, 0)
	for i := 0; i < 25; i++ {
		monitor.RecordCall(user, base.Add(time.Duration(i)*time.Second), CallTypeEvent)
	}

	usage := monitor.GetHighUsageInfo(base.Add(30 * time.Second))
	require.Len(t, usage, 1)
	require.Len(t, usage[0].Violations, 2)
}

func TestMonitorMultipleConcurrentUsers(t *testing.T) {
	t.Parallel()
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 10},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
	defer monitor.Close()

	var wg sync.WaitGroup
	start := time.Unix(0, 0)
	for u := 0; u < 5; u++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			addr := common.BigToAddress(big.NewInt(int64(idx + 1)))
			for i := 0; i < 12; i++ {
				monitor.RecordCall(addr, start.Add(time.Duration(i)*time.Second), CallTypeEvent)
			}
		}(u)
	}
	wg.Wait()

	usage := monitor.GetHighUsageInfo(start.Add(30 * time.Second))
	require.Len(t, usage, 5)
}
