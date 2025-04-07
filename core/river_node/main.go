package main

// Execute cobra root command from cmd

import (
	"os"
	"runtime/debug"

	"github.com/towns-protocol/towns/core/cmd"
)

func main() {
	// Re-enable panic callstack printing even if setcap is used, see https://github.com/golang/go/issues/62474
	gotraceback := os.Getenv("TOWNS_GOTRACEBACK")
	if gotraceback == "" {
		gotraceback = "single"
	}
	debug.SetTraceback(gotraceback)
	cmd.Execute()
}
