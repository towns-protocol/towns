package abuse

import (
	"sort"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

// CallType identifies the RPC operation category being tracked.
type CallType string

const (
	CallTypeEvent             CallType = "event"
	CallTypeMediaEvent        CallType = "media_event"
	CallTypeCreateMediaStream CallType = "create_media_stream"
)

// Threshold defines a maximum count per time window.
type Threshold struct {
	Window time.Duration
	Count  uint32
}

// Config drives the monitor behavior.
type Config struct {
	Enabled    bool
	MaxResults int
	Thresholds map[CallType][]Threshold
}

// WindowViolation captures the counts that exceeded a specific threshold.
type WindowViolation struct {
	Window time.Duration
	Count  uint32
	Limit  uint32
}

// AbuserInfo represents a single offending account for a specific call type.
type AbuserInfo struct {
	User       common.Address
	CallType   CallType
	Violations []WindowViolation
	LastSeen   time.Time
}

// CallRateMonitor tracks per-user call rates across multiple call types and exposes
// aggregated abuse data.
type CallRateMonitor interface {
	RecordCall(user common.Address, now time.Time, callType CallType)
	GetAbuserInfo(now time.Time) []AbuserInfo
}

type inMemoryCallRateMonitor struct {
	mu           sync.Mutex
	cfg          Config
	users        map[common.Address]*userStats
	cleanupAfter time.Duration
	callSpecs    map[CallType]*callTypeSpec
}

const (
	defaultCleanupAge = 1 * time.Hour
	defaultMaxResults = 50
	// cleanupHighWatermark bounds how many user entries we keep before forcing cleanup.
	// Each active user consumes roughly ~2KB (per call type windows + metadata), so 4,096 users
	// is on the order of 8–10MB of heap.
	cleanupHighWatermark = 4096

	targetSlotsPerWindow = 60
	maxSlotsPerWindow    = 1024
	minSlotDuration      = 100 * time.Millisecond
	defaultSlotDuration  = time.Second
)

// NewCallRateMonitor builds a CallRateMonitor using the provided configuration.
func NewCallRateMonitor(cfg Config) CallRateMonitor {
	if !cfg.Enabled {
		return noopCallRateMonitor{}
	}

	if cfg.MaxResults <= 0 {
		cfg.MaxResults = defaultMaxResults
	}

	specs, maxWindow := buildCallSpecs(cfg.Thresholds)
	cleanupWindow := defaultCleanupAge
	if maxWindow > 0 {
		cleanupWindow = maxWindow
	}

	return &inMemoryCallRateMonitor{
		cfg:          cfg,
		users:        make(map[common.Address]*userStats),
		cleanupAfter: cleanupWindow,
		callSpecs:    specs,
	}
}

// RecordCall increments the counters for the given user and call type.
func (m *inMemoryCallRateMonitor) RecordCall(user common.Address, now time.Time, callType CallType) {
	if user == (common.Address{}) {
		return
	}

	spec := m.callSpecs[callType]
	if spec == nil {
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	stats := m.users[user]
	if stats == nil {
		stats = newUserStats()
		m.users[user] = stats
	}

	stats.record(now, callType, spec, 1)
	stats.lastSeen = now

	if len(m.users) > cleanupHighWatermark {
		m.cleanupLocked(now)
	}
}

// GetAbuserInfo returns the current list of abusive users ordered by severity.
func (m *inMemoryCallRateMonitor) GetAbuserInfo(now time.Time) []AbuserInfo {
	m.mu.Lock()
	defer m.mu.Unlock()

	result := make([]AbuserInfo, 0)

	for addr, stats := range m.users {
		for callType, cs := range stats.perType {
			violations := cs.violations(now)
			if len(violations) == 0 {
				continue
			}
			result = append(result, AbuserInfo{
				User:       addr,
				CallType:   callType,
				Violations: violations,
				LastSeen:   stats.lastSeen,
			})
		}
	}

	if len(result) == 0 {
		return nil
	}

	sort.Slice(result, func(i, j int) bool {
		severityI := maxSeverity(result[i])
		severityJ := maxSeverity(result[j])
		if severityI != severityJ {
			return severityI > severityJ
		}
		return result[i].LastSeen.After(result[j].LastSeen)
	})

	if len(result) > m.cfg.MaxResults {
		result = result[:m.cfg.MaxResults]
	}

	return append([]AbuserInfo(nil), result...)
}

// Cleanup removes idle users whose last activity is older than the retention window.
func (m *inMemoryCallRateMonitor) cleanupLocked(now time.Time) {
	if m.cleanupAfter == 0 {
		m.cleanupAfter = defaultCleanupAge
	}
	expireBefore := now.Add(-m.cleanupAfter)
	for addr, stats := range m.users {
		if stats.lastSeen.Before(expireBefore) {
			delete(m.users, addr)
		}
	}
}

type userStats struct {
	perType  map[CallType]*callStats
	lastSeen time.Time
}

func newUserStats() *userStats {
	return &userStats{
		perType: make(map[CallType]*callStats),
	}
}

func (us *userStats) record(now time.Time, callType CallType, spec *callTypeSpec, delta uint32) {
	stats := us.perType[callType]
	if stats == nil {
		stats = newCallStats(spec)
		us.perType[callType] = stats
	}
	stats.record(now, delta)
}

type callStats struct {
	spec    *callTypeSpec
	windows []window
}

func newCallStats(spec *callTypeSpec) *callStats {
	windows := make([]window, len(spec.thresholds))
	for i, th := range spec.thresholds {
		windows[i] = newWindow(th.slotDuration, th.slots)
	}
	return &callStats{
		spec:    spec,
		windows: windows,
	}
}

func (cs *callStats) record(now time.Time, delta uint32) {
	for i := range cs.windows {
		cs.windows[i].add(now, delta)
	}
}

func (cs *callStats) violations(now time.Time) []WindowViolation {
	var res []WindowViolation
	for i := range cs.windows {
		cs.windows[i].advance(now)
		total := cs.windows[i].total()
		limit := cs.spec.thresholds[i].threshold.Count
		if limit > 0 && total >= limit {
			res = append(res, WindowViolation{
				Window: cs.spec.thresholds[i].threshold.Window,
				Count:  total,
				Limit:  limit,
			})
		}
	}
	return res
}

type callTypeSpec struct {
	callType   CallType
	thresholds []thresholdSpec
}

type thresholdSpec struct {
	threshold    Threshold
	slotDuration time.Duration
	slots        int
}

type window struct {
	slots        []uint32
	head         int
	lastSlotTime time.Time
	slotDuration time.Duration
	sum          uint32
}

func newWindow(slotDuration time.Duration, size int) window {
	if size <= 0 {
		size = 1
	}
	if slotDuration <= 0 {
		slotDuration = defaultSlotDuration
	}
	return window{
		slots:        make([]uint32, size),
		slotDuration: slotDuration,
	}
}

func (w *window) advance(now time.Time) {
	if len(w.slots) == 0 {
		return
	}

	aligned := now.Truncate(w.slotDuration)

	if w.lastSlotTime.IsZero() {
		w.lastSlotTime = aligned
		w.head = 0
		return
	}

	if aligned.Before(w.lastSlotTime) {
		return
	}

	diff := int(aligned.Sub(w.lastSlotTime) / w.slotDuration)
	if diff == 0 {
		return
	}

	if diff >= len(w.slots) {
		for i := range w.slots {
			w.slots[i] = 0
		}
		w.sum = 0
		w.head = (w.head + diff) % len(w.slots)
		w.lastSlotTime = aligned
		return
	}

	for i := 0; i < diff; i++ {
		w.head = (w.head + 1) % len(w.slots)
		w.sum -= w.slots[w.head]
		w.slots[w.head] = 0
	}

	w.lastSlotTime = aligned
}

func (w *window) add(now time.Time, delta uint32) {
	w.advance(now)
	w.slots[w.head] += delta
	w.sum += delta
}

func (w *window) total() uint32 {
	return w.sum
}

func buildCallTypeSpec(callType CallType, thresholds []Threshold) *callTypeSpec {
	spec := &callTypeSpec{callType: callType}
	for _, th := range thresholds {
		if th.Window <= 0 || th.Count == 0 {
			continue
		}
		slotDuration, slots := computeWindowBuckets(th.Window)
		spec.thresholds = append(spec.thresholds, thresholdSpec{
			threshold:    th,
			slotDuration: slotDuration,
			slots:        slots,
		})
	}
	if len(spec.thresholds) == 0 {
		return nil
	}
	return spec
}

func buildCallSpecs(thresholds map[CallType][]Threshold) (map[CallType]*callTypeSpec, time.Duration) {
	specs := make(map[CallType]*callTypeSpec, len(thresholds))
	var maxWindow time.Duration

	for callType, values := range thresholds {
		spec := buildCallTypeSpec(callType, values)
		if spec == nil {
			continue
		}
		specs[callType] = spec
		for _, th := range spec.thresholds {
			if th.threshold.Window > maxWindow {
				maxWindow = th.threshold.Window
			}
		}
	}

	return specs, maxWindow
}

func computeWindowBuckets(window time.Duration) (time.Duration, int) {
	if window <= 0 {
		return defaultSlotDuration, 1
	}

	slot := window / time.Duration(targetSlotsPerWindow)
	if slot <= 0 {
		slot = minSlotDuration
	}
	if slot < minSlotDuration {
		slot = minSlotDuration
	}

	slots := safeDiv(window, slot)
	for slots > maxSlotsPerWindow {
		slot *= 2
		slots = safeDiv(window, slot)
		if slot >= window {
			slot = window
			slots = 1
			break
		}
	}
	if slots <= 0 {
		slots = 1
	}
	return slot, slots
}

func safeDiv(window, slot time.Duration) int {
	if slot <= 0 {
		return 1
	}
	res := int(window / slot)
	if res <= 0 {
		res = 1
	}
	return res
}

func maxSeverity(info AbuserInfo) float64 {
	var max float64
	for _, v := range info.Violations {
		if v.Limit == 0 {
			continue
		}
		sev := float64(v.Count) / float64(v.Limit)
		if sev > max {
			max = sev
		}
	}
	return max
}

type noopCallRateMonitor struct{}

func (noopCallRateMonitor) RecordCall(common.Address, time.Time, CallType) {}
func (noopCallRateMonitor) GetAbuserInfo(time.Time) []AbuserInfo           { return nil }
