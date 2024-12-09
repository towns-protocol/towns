package testfmt

import (
	"os"
)

// TestingLogger is a subset of *testing.T that is used for logging.
type TestingLogger interface {
	Log(a ...any)
	Logf(format string, a ...any)
	Helper()
}

// Print logs a message to the testing logger if RIVER_TEST_PRINT is set.
func Print(t TestingLogger, a ...any) {
	if enabled {
		t.Helper()
		t.Log(a...)
	}
}

// Printf logs a formatted message to the testing logger if RIVER_TEST_PRINT is set.
func Printf(t TestingLogger, format string, a ...any) {
	if enabled {
		t.Helper()
		t.Logf(format, a...)
	}
}

// Println logs a message to the testing logger if RIVER_TEST_PRINT is set.
func Println(t TestingLogger, a ...any) {
	if enabled {
		t.Helper()
		t.Log(a...)
	}
}

// Log logs a message to the testing logger if RIVER_TEST_PRINT is set.
func Log(t TestingLogger, a ...any) {
	if enabled {
		t.Helper()
		t.Log(a...)
	}
}

// Logf logs a formatted message to the testing logger if RIVER_TEST_PRINT is set.
func Logf(t TestingLogger, format string, a ...any) {
	if enabled {
		t.Helper()
		t.Logf(format, a...)
	}
}

func Enabled() bool {
	return enabled
}

func Enable(v bool) {
	enabled = v
}

type TestFmt struct {
	t       TestingLogger
	enabled bool
}

// New returns a new TestFmt that logs to the given testing logger if RIVER_TEST_PRINT is set.
func New(t TestingLogger) *TestFmt {
	return &TestFmt{t, enabled}
}

func (f *TestFmt) Print(a ...any) {
	if f.enabled {
		f.t.Helper()
		f.t.Log(a...)
	}
}

func (f *TestFmt) Printf(format string, a ...any) {
	if f.enabled {
		f.t.Helper()
		f.t.Logf(format, a...)
	}
}

func (f *TestFmt) Println(a ...any) {
	if f.enabled {
		f.t.Helper()
		f.t.Log(a...)
	}
}

func (f *TestFmt) Log(a ...any) {
	if f.enabled {
		f.t.Helper()
		f.t.Log(a...)
	}
}

func (f *TestFmt) Logf(format string, a ...any) {
	if f.enabled {
		f.t.Helper()
		f.t.Logf(format, a...)
	}
}

func (f *TestFmt) Enabled() bool {
	return f.enabled
}

func (f *TestFmt) Enable(v bool) {
	f.enabled = v
}

var enabled bool

func init() {
	enabled = os.Getenv("RIVER_TEST_PRINT") != ""
}
