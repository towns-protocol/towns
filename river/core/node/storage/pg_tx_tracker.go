package storage

import (
	"fmt"
	"strings"
	"sync"
	"time"
)

type pgTxTrackerEntry struct {
	time time.Time
	op   string
	name string
	tags []any
}

type pgTxTracker struct {
	enabled bool
	mu      sync.Mutex
	next    int
	entries []pgTxTrackerEntry
}

func (t *pgTxTracker) enable() {
	t.enabled = true
	t.entries = make([]pgTxTrackerEntry, 40)
}

func (t *pgTxTracker) track(op string, name string, tags ...any) {
	if !t.enabled {
		return
	}

	t.mu.Lock()
	defer t.mu.Unlock()

	t.entries[t.next] = pgTxTrackerEntry{
		time: time.Now(),
		op:   op,
		name: name,
		tags: tags,
	}
	t.next++
	if t.next >= len(t.entries) {
		t.next = 0
	}
}

func (t *pgTxTracker) dump() string {
	if !t.enabled {
		return "not_tracking"
	}

	now := time.Now()
	t.mu.Lock()
	defer t.mu.Unlock()

	var sb strings.Builder
	sb.WriteString("pgTxTracker:\n")
	c := t.next
	for {
		entry := &t.entries[c]
		if !entry.time.IsZero() {
			sb.WriteString(fmt.Sprintf("%s %s %v\n", entry.name, entry.op, now.Sub(entry.time)))
			if len(entry.tags) > 0 {
				tags := entry.tags
				if len(tags)%2 == 1 {
					tags = tags[:len(tags)-1]
				}
				for i := 0; i < len(tags); i += 2 {
					sb.WriteString(fmt.Sprintf("        %v: %v\n", tags[i], tags[i+1]))
				}
			}
		}
		c++
		if c == len(t.entries) {
			c = 0
		}
		if c == t.next {
			break
		}
	}
	return sb.String()
}
