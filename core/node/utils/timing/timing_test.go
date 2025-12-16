package timing

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"testing"
	"time"
)

// GreatGrandchild is a new timed function.
func GreatGrandchild(ctx context.Context) {
	ctx = StartSpan(ctx, "GreatGrandchild")
	defer func() { ctx = End(ctx) }()
	time.Sleep(5 * time.Millisecond) // New sleep duration
}

func Grandchild(ctx context.Context) {
	ctx = StartSpan(ctx, "Grandchild")
	defer func() { ctx = End(ctx) }()
	time.Sleep(10 * time.Millisecond) // Changed sleep duration
	GreatGrandchild(ctx)              // Call new GreatGrandchild
}

func Child1(ctx context.Context) {
	ctx = StartSpan(ctx, "Child1")
	defer func() { ctx = End(ctx) }()
	time.Sleep(10 * time.Millisecond) // Changed sleep duration
	Grandchild(ctx)
}

// Child2 is a timed function.
func Child2(ctx context.Context) {
	ctx = StartSpan(ctx, "Child2")
	defer func() { ctx = End(ctx) }()
	time.Sleep(15 * time.Millisecond) // Changed sleep duration
}

func TestTimer(t *testing.T) {
	timer := NewTimer("Root")
	ctx := timer.Start(context.Background())

	Child1(ctx)
	Child2(ctx)

	summary := timer.String()
	t.Log(summary)

	// --- Structural checks ---
	if !strings.Contains(summary, "- Root:") {
		t.Errorf("summary should contain the root span name")
	}
	if !strings.Contains(summary, "  - Child1:") {
		t.Errorf("summary should contain the first child span")
	}
	if !strings.Contains(summary, "    - Grandchild:") {
		t.Errorf("summary should contain the grandchild span")
	}
	if !strings.Contains(summary, "      - GreatGrandchild:") { // New structural check
		t.Errorf("summary should contain the greatgrandchild span")
	}
	if !strings.Contains(summary, "  - Child2:") {
		t.Errorf("summary should contain the second child span")
	}

	// --- Percentage checks ---
	checkPercentage(t, summary, "Child1", 55, 70)         // Approx 62.5%
	checkPercentage(t, summary, "Grandchild", 30, 45)     // Approx 37.5%
	checkPercentage(t, summary, "GreatGrandchild", 5, 20) // Approx 12.5%
	checkPercentage(t, summary, "Child2", 30, 45)         // Approx 37.5%
}

// checkPercentage is a helper to find a span's percentage and assert it's within a range.
func checkPercentage(t *testing.T, summary, spanName string, min, max float64) {
	t.Helper()
	// Regex to find: "- <spanName>: <duration> (<percentage>%)"
	re := regexp.MustCompile(fmt.Sprintf(`- %s: .*?\((\d+\.\d+)\%%\).*`, regexp.QuoteMeta(spanName)))
	matches := re.FindStringSubmatch(summary)

	if len(matches) < 2 {
		t.Errorf("could not find percentage for span %q", spanName)
		return
	}

	percentage, err := strconv.ParseFloat(matches[1], 64)
	if err != nil {
		t.Errorf("could not parse percentage for span %q: %v", spanName, err)
		return
	}

	if percentage < min || percentage > max {
		t.Errorf(
			"expected percentage for %q to be between %.2f%% and %.2f%%, but got %.2f%%",
			spanName,
			min,
			max,
			percentage,
		)
	}
}

func TestTimer_Report(t *testing.T) {
	timer := NewTimer("Root")
	ctx := timer.Start(context.Background())

	Child1(ctx)
	Child2(ctx)

	report := timer.Report()
	jsonData, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal report to json: %v", err)
	}

	jsonString := string(jsonData)
	t.Log(jsonString)

	if !strings.Contains(jsonString, `"name": "Root"`) {
		t.Errorf("json report should contain root span name")
	}
	if !strings.Contains(jsonString, `"name": "Child1"`) {
		t.Errorf("json report should contain child span name")
	}
	if !strings.Contains(jsonString, `"name": "Grandchild"`) {
		t.Errorf("json report should contain grandchild span name")
	}
	if !strings.Contains(jsonString, `"name": "GreatGrandchild"`) { // New structural check for report
		t.Errorf("json report should contain greatgrandchild span name")
	}
	if !strings.Contains(jsonString, `"name": "Child2"`) {
		t.Errorf("json report should contain child2 span name")
	}
	if !strings.Contains(jsonString, `"children": [`) {
		t.Errorf("json report should contain children array")
	}
	if !strings.Contains(jsonString, `"percentage":`) {
		t.Errorf("json report should contain percentage field")
	}
}

func TestTimer_WithError(t *testing.T) {
	// This function simulates work that can fail.
	failingFunc := func(ctx context.Context) (err error) {
		ctx = StartSpan(ctx, "FailingFunc")
		defer func() { ctx = End(ctx, err) }() // Pass named return 'err' to End.

		// Simulate work
		time.Sleep(10 * time.Millisecond)

		// Simulate an error occurring.
		err = errors.New("something went wrong")
		return err
	}

	timer := NewTimer("RootProcessWithFailure")
	ctx := timer.Start(context.Background())

	_ = failingFunc(ctx)

	// --- Check String Output ---
	summary := timer.String()
	t.Log(summary)
	if !strings.Contains(summary, "ERROR: something went wrong") {
		t.Errorf("string summary should contain the error message")
	}

	// --- Check JSON Report Output ---
	report := timer.Report()
	jsonData, jsonErr := json.MarshalIndent(report, "", "  ")
	if jsonErr != nil {
		t.Fatalf("failed to marshal report to json: %v", jsonErr)
	}
	jsonString := string(jsonData)
	t.Log(jsonString)

	if !strings.Contains(jsonString, `"error": "something went wrong"`) {
		t.Errorf("json report should contain the error field and message")
	}
}
