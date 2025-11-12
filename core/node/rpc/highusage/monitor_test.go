package highusage

import (
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
)

func TestMonitorPerMinuteThreshold(t *testing.T) {
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 2},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
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
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeMediaEvent: {
				{Window: 24 * time.Hour, Count: 3},
			},
		},
	}

	monitor := NewCallRateMonitor(cfg)
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
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 1},
			},
		},
	}

	monitor := NewCallRateMonitor(cfg)
	user := common.HexToAddress("0x3")
	base := time.Unix(0, 0)

	monitor.RecordCall(user, base, CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(base.Add(time.Second)), 1)

	impl := monitor.(*inMemoryCallRateMonitor)
	impl.cleanupLocked(base.Add(25 * time.Hour))
	require.Len(t, monitor.GetHighUsageInfo(base.Add(25*time.Hour)), 0)
}

func TestMonitorMultipleCallTypesSameUser(t *testing.T) {
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
	user := common.HexToAddress("0x42")
	base := time.Unix(0, 0)

	monitor.RecordCall(user, base, CallTypeEvent)
	monitor.RecordCall(user, base.Add(500*time.Millisecond), CallTypeMediaEvent)
	monitor.RecordCall(user, base.Add(800*time.Millisecond), CallTypeMediaEvent)

	usage := monitor.GetHighUsageInfo(base.Add(time.Second))
	require.Len(t, usage, 2)
}

func TestMonitorWraparoundInCircularBuffer(t *testing.T) {
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: 3 * time.Second, Count: 3},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
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
	cfg := Config{
		Enabled: true,
		Thresholds: map[CallType][]Threshold{
			CallTypeEvent: {
				{Window: time.Minute, Count: 2},
			},
		},
	}
	monitor := NewCallRateMonitor(cfg)
	user := common.HexToAddress("0xcd")
	now := time.Unix(0, 0)
	monitor.RecordCall(user, now, CallTypeEvent)
	monitor.RecordCall(user, now.Add(10*time.Second), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(now.Add(20*time.Second)), 1)
	monitor.RecordCall(user, now.Add(70*time.Second), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(now.Add(80*time.Second)), 0)
}

func TestMonitorConfigValidation(t *testing.T) {
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
	user := common.HexToAddress("0xef")
	monitor.RecordCall(user, time.Unix(0, 0), CallTypeEvent)
	require.Len(t, monitor.GetHighUsageInfo(time.Unix(30, 0)), 0)
}
