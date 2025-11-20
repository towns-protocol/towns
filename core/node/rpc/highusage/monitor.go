// Package highusage provides a lightweight in-memory CallRateMonitor that tracks how
// often each account invokes specific RPC call types. It keeps per-user counters
// across configurable sliding time windows by storing counts in circular buckets
// (ring buffers) and maintaining running totals, so lookups are O(1) without
// retaining every individual request. The monitor exposes a simple API for
// recording a call and retrieving the current offenders, which higher layers can
// feed into status endpoints or mitigation logic.
//
// Memory usage: each active user consumes roughly ~2KB per tracked call type
// (window slots + metadata), so about 4k users equates to ~8–10MB of heap. The
// cleanup watermark keeps the set bounded while remaining configurable.
package highusage

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/config"
)

// CallType identifies the RPC operation category being tracked.
type CallType int

const (
	CallTypeEvent CallType = iota
	CallTypeMediaEvent
	CallTypeCreateMediaStream

	callTypeCount
)

var callTypeNames = [...]string{
	"event",
	"media_event",
	"create_media_stream",
}

var callTypeLookup = map[string]CallType{
	"event":               CallTypeEvent,
	"media_event":         CallTypeMediaEvent,
	"create_media_stream": CallTypeCreateMediaStream,
}

func (ct CallType) String() string {
	if ct >= 0 && int(ct) < len(callTypeNames) {
		return callTypeNames[ct]
	}
	return fmt.Sprintf("call_type_%d", ct)
}

// Threshold defines a maximum count per time window.
type Threshold struct {
	Window time.Duration
	Count  uint32
}

// UsageViolation captures the counts that exceeded a specific threshold.
type UsageViolation struct {
	Window time.Duration
	Count  uint32
	Limit  uint32
}

// HighUsageInfo represents a single offending account for a specific call type.
type HighUsageInfo struct {
	User       common.Address
	CallType   CallType
	Violations []UsageViolation
	LastSeen   time.Time
}

// CallRateMonitor tracks per-user call rates across multiple call types and exposes
// aggregated high-usage data.
type CallRateMonitor interface {
	RecordCall(user []byte, now time.Time, callType CallType)
	GetHighUsageInfo(now time.Time) []HighUsageInfo
}

// inMemoryCallRateMonitor keeps per-user counters for each call type, storing a
// circular buffer (ring) of slot totals per configured threshold. RecordCall
// looks up the call type spec (precomputed slot duration + bucket count),
// advances the ring to "now", increments the current slot, and tracks a running
// sum so threshold comparisons are O(1). Cleanup compacts the user map by
// evicting entries whose last seen timestamp falls outside the longest window.
type inMemoryCallRateMonitor struct {
	mu           sync.Mutex
	cfg          config.HighUsageDetectionConfig
	users        map[common.Address]*userStats
	cleanupAfter time.Duration
	callSpecs    []*callTypeSpec
	lastCleanup  time.Time
	logger       *zap.Logger
}

const (
	defaultCleanupAge  = 1 * time.Hour
	defaultMaxResults  = 50
	cleanupMinInterval = 30 * time.Second

	targetSlotsPerWindow = 60
	maxSlotsPerWindow    = 1024
	minSlotDuration      = 100 * time.Millisecond
	defaultSlotDuration  = time.Second
)

// NewCallRateMonitor builds a CallRateMonitor using the provided configuration.
func NewCallRateMonitor(ctx context.Context, cfg config.HighUsageDetectionConfig, logger *zap.Logger) CallRateMonitor {
	if !cfg.Enabled {
		return noopCallRateMonitor{}
	}

	if cfg.MaxResults <= 0 {
		cfg.MaxResults = defaultMaxResults
	}

	thresholds := convertThresholds(cfg)
	specs, maxWindow := buildCallSpecs(thresholds)
	cleanupWindow := defaultCleanupAge
	if maxWindow > 0 {
		cleanupWindow = maxWindow
	}

	if logger == nil {
		logger = zap.NewNop()
	}

	m := &inMemoryCallRateMonitor{
		cfg:          cfg,
		users:        make(map[common.Address]*userStats),
		cleanupAfter: cleanupWindow,
		callSpecs:    specs,
		lastCleanup:  time.Now(),
		logger:       logger.Named("highusage_monitor"),
	}
	if cleanupMinInterval > 0 {
		ticker := time.NewTicker(cleanupMinInterval)
		go m.cleanupLoop(ctx, ticker)
	}
	callTypeKeys := make([]string, 0, len(specs))
	for ct, spec := range specs {
		if spec == nil {
			continue
		}
		callTypeKeys = append(callTypeKeys, CallType(ct).String())
	}
	m.logger.Info(
		"highusage monitor initialized",
		zap.Duration("cleanup_after", cleanupWindow),
		zap.Int("call_type_count", len(callTypeKeys)),
		zap.Strings("call_types", callTypeKeys),
	)
	return m
}

func convertThresholds(cfg config.HighUsageDetectionConfig) [][]Threshold {
	configured := cfg.HighUsageThresholds()
	thresholds := make([][]Threshold, callTypeCount)

	for key, values := range configured {
		callType, ok := callTypeLookup[key]
		if !ok {
			continue
		}
		for _, value := range values {
			if value.Window <= 0 || value.Count == 0 {
				continue
			}
			idx := int(callType)
			if idx < 0 || idx >= len(thresholds) {
				continue
			}
			thresholds[idx] = append(thresholds[idx], Threshold{
				Window: value.Window,
				Count:  value.Count,
			})
		}
	}

	return thresholds
}

// RecordCall increments the counters for the given user and call type.
func (m *inMemoryCallRateMonitor) RecordCall(userBytes []byte, now time.Time, callType CallType) {
	if len(userBytes) == 0 {
		return
	}

	user := common.BytesToAddress(userBytes)
	if user == (common.Address{}) {
		return
	}

	if callType < 0 || int(callType) >= len(m.callSpecs) {
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
}

// GetHighUsageInfo returns the current list of high-usage accounts ordered by severity.
// The returned data should be treated as read-only; callers must not mutate it.
func (m *inMemoryCallRateMonitor) GetHighUsageInfo(now time.Time) []HighUsageInfo {
	m.mu.Lock()
	defer m.mu.Unlock()

	result := make([]HighUsageInfo, 0)

	for addr, stats := range m.users {
		for ct := CallType(0); ct < callTypeCount; ct++ {
			cs := stats.perType[ct]
			if cs == nil {
				continue
			}
			violations := cs.snapshot(now)
			if len(violations) == 0 {
				continue
			}
			result = append(result, HighUsageInfo{
				User:       addr,
				CallType:   ct,
				Violations: violations,
				LastSeen:   stats.lastSeen,
			})
			for _, v := range violations {
				m.logger.Warn(
					"highusage threshold exceeded",
					zap.String("addr", addr.Hex()),
					zap.String("call_type", ct.String()),
					zap.String("window", v.Window.String()),
					zap.Uint32("count", v.Count),
					zap.Uint32("threshold", v.Limit),
				)
			}
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

	return append([]HighUsageInfo(nil), result...)
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
	m.lastCleanup = now
}

func (m *inMemoryCallRateMonitor) cleanupLoop(ctx context.Context, ticker *time.Ticker) {
	defer ticker.Stop()
	for {
		select {
		case now := <-ticker.C:
			m.mu.Lock()
			m.cleanupLocked(now)
			m.mu.Unlock()
		case <-ctx.Done():
			return
		}
	}
}

type userStats struct {
	perType  [callTypeCount]*callStats
	lastSeen time.Time
}

func newUserStats() *userStats {
	return &userStats{}
}

func (us *userStats) record(now time.Time, callType CallType, spec *callTypeSpec, delta uint32) {
	idx := int(callType)
	if idx < 0 || idx >= len(us.perType) {
		return
	}
	stats := us.perType[idx]
	if stats == nil {
		stats = newCallStats(spec)
		us.perType[idx] = stats
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

func (cs *callStats) snapshot(now time.Time) []UsageViolation {
	if cs == nil || cs.spec == nil {
		return nil
	}
	var violations []UsageViolation
	for i := range cs.windows {
		cs.windows[i].advance(now)
		total := cs.windows[i].total()
		th := cs.spec.thresholds[i].threshold
		if th.Count > 0 && total >= th.Count {
			violations = append(violations, UsageViolation{
				Window: th.Window,
				Count:  total,
				Limit:  th.Count,
			})
		}
	}
	return violations
}

type callTypeSpec struct {
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

// advance moves the window's head to the bucket aligned with `now`, zeroing any
// expired buckets and updating the running sum so totals always reflect the
// most recent windowSize worth of observations.
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

func buildCallTypeSpec(_ CallType, thresholds []Threshold) *callTypeSpec {
	spec := &callTypeSpec{}
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

func buildCallSpecs(thresholds [][]Threshold) ([]*callTypeSpec, time.Duration) {
	specs := make([]*callTypeSpec, callTypeCount)
	var maxWindow time.Duration

	for ct := CallType(0); ct < callTypeCount; ct++ {
		idx := int(ct)
		values := thresholds[idx]
		if len(values) == 0 {
			continue
		}
		spec := buildCallTypeSpec(ct, values)
		if spec == nil {
			continue
		}
		specs[idx] = spec
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

func maxSeverity(info HighUsageInfo) float64 {
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

func (noopCallRateMonitor) RecordCall([]byte, time.Time, CallType)     {}
func (noopCallRateMonitor) GetHighUsageInfo(time.Time) []HighUsageInfo { return nil }
