package main

// Execute cobra root command from cmd

import (
	"fmt"
	"os"
	"runtime"
	"runtime/debug"

	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/cmd"
)

func main() {
	// Re-enable panic callstack printing even if setcap is used, see https://github.com/golang/go/issues/62474
	gotraceback := os.Getenv("TOWNS_GOTRACEBACK")
	if gotraceback == "" {
		gotraceback = "single"
	}
	debug.SetTraceback(gotraceback)

	// Capture panics and log them as single structured entries
	defer func() {
		if r := recover(); r != nil {
			// Capture the full stack trace
			buf := make([]byte, 1<<16)
			stackSize := runtime.Stack(buf, true)

			// Get global logger if available, otherwise use direct output
			logger := zap.L()
			if logger != nil {
				logger.Error("PANIC_DETECTED",
					zap.String("panic", fmt.Sprintf("%v", r)),
					zap.String("stack", string(buf[:stackSize])),
				)
			} else {
				// Fallback if logger not initialized
				fmt.Fprintf(os.Stderr, `{"level":"ERROR","msg":"PANIC_DETECTED","panic":"%v","stack":"%s"}`+"\n",
					r, string(buf[:stackSize]))
			}

			// Re-panic to maintain expected behavior
			panic(r)
		}
	}()

	cmd.Execute()
}
