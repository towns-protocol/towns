// Package timing provides a simple, in-process profiler for timing nested function calls.
// It is primarily intended for debugging and development, not for production monitoring.
package timing

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"math"
	"strings"
	"sync"
	"time"
)

type contextKey int

const timerKey contextKey = 0

// Span represents a single timed operation in the call tree.
type Span struct {
	Name      string
	StartTime time.Time
	Duration  time.Duration
	Children  []*Span
	parent    *Span
	Error     error // New field for storing an error
	lock      sync.Mutex
}

func (s *Span) add(child *Span) {
	s.lock.Lock()
	defer s.lock.Unlock()
	s.Children = append(s.Children, child)
}

// Timer is the root of a timed session, managing the hierarchy of spans.
type Timer struct {
	root *Span
	lock sync.Mutex
}

// NewTimer creates a new timer with a root span.
func NewTimer(rootName string) *Timer {
	return &Timer{
		root: &Span{Name: rootName},
	}
}

// Start creates the root span and embeds it in the context.
// The root span is automatically ended when the entire context is summarized.
func (t *Timer) Start(ctx context.Context) context.Context {
	t.root.StartTime = time.Now()
	return context.WithValue(ctx, timerKey, t.root)
}

// StartSpan starts a new timed span as a child of the current span in the context.
// It returns a new context with the new span attached, which should be used for subsequent calls.
func StartSpan(ctx context.Context, name string) context.Context {
	parent, ok := ctx.Value(timerKey).(*Span)
	if !ok {
		return ctx // Or handle error, but failing silently is robust.
	}

	span := &Span{
		Name:      name,
		StartTime: time.Now(),
		parent:    parent,
	}

	parent.add(span)
	return context.WithValue(ctx, timerKey, span)
}

// End finishes the current span, calculating its duration and optionally recording an error.
// It returns the context of the parent span.
func End(ctx context.Context, err ...error) context.Context {
	current, ok := ctx.Value(timerKey).(*Span)
	if !ok || current.parent == nil { // Cannot end the root span manually.
		return ctx
	}
	current.Duration = time.Since(current.StartTime)

	// Record the first non-nil error passed.
	if len(err) > 0 {
		for _, e := range err {
			if e != nil {
				current.Error = e
				break
			}
		}
	}

	return context.WithValue(ctx, timerKey, current.parent)
}

// String returns a formatted string summarizing the entire timing session.
func (t *Timer) String() string {
	t.lock.Lock()
	defer t.lock.Unlock()

	// Ensure the root span's duration is calculated if it hasn't been.
	if t.root.Duration == 0 {
		t.root.Duration = time.Since(t.root.StartTime)
	}

	var buf bytes.Buffer
	t.root.writeSummary(&buf, 0, t.root.Duration)
	return buf.String()
}

func (s *Span) writeSummary(w io.Writer, depth int, totalDuration time.Duration) {
	s.lock.Lock()
	defer s.lock.Unlock()

	indent := strings.Repeat("  ", depth)
	percentage := 0.0
	if totalDuration > 0 {
		percentage = (float64(s.Duration) / float64(totalDuration)) * 100
	}

	fmt.Fprintf(w, "%s- %s: %s (%.2f%%)\n", indent, s.Name, s.Duration, percentage)

	// If there is an error, print it.
	if s.Error != nil {
		errorIndent := strings.Repeat("  ", depth+1)
		fmt.Fprintf(w, "%sERROR: %v\n", errorIndent, s.Error)
	}

	for _, child := range s.Children {
		child.writeSummary(w, depth+1, totalDuration)
	}
}

// SpanReport is the serializable representation of a timed span.
type SpanReport struct {
	Name       string        `json:"name"`
	Duration   string        `json:"duration"`
	Took       time.Duration `json:"took"`
	Percentage float64       `json:"percentage"`
	Error      string        `json:"error,omitempty"`
	Children   []*SpanReport `json:"children,omitempty"`
}

// Report generates a serializable report of the timed session.
func (t *Timer) Report() *SpanReport {
	t.lock.Lock()
	defer t.lock.Unlock()

	// Ensure the root span's duration is calculated if it hasn't been.
	if t.root.Duration == 0 {
		t.root.Duration = time.Since(t.root.StartTime)
	}

	return t.root.toReport(t.root.Duration)
}

// toReport converts a Span and its children to a SpanReport for serialization.
func (s *Span) toReport(totalDuration time.Duration) *SpanReport {
	s.lock.Lock()
	defer s.lock.Unlock()

	percentage := 0.0
	if totalDuration > 0 {
		percentage = (float64(s.Duration) / float64(totalDuration)) * 100
	}
	// Round to 2 decimal places
	percentage = math.Round(percentage*100) / 100

	report := &SpanReport{
		Name:       s.Name,
		Duration:   s.Duration.String(),
		Took:       s.Duration,
		Percentage: percentage,
	}

	if s.Error != nil {
		report.Error = s.Error.Error()
	}

	if len(s.Children) > 0 {
		report.Children = make([]*SpanReport, 0, len(s.Children))
		for _, child := range s.Children {
			report.Children = append(report.Children, child.toReport(totalDuration))
		}
	}

	return report
}