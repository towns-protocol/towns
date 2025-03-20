package main

// Execute cobra root command from cmd

import (
	"fmt"
	"runtime/debug"

	"github.com/towns-protocol/towns/core/cmd"
)

func main() {
	debug.SetTraceback("all")
	// Defer to recover from panics and log debug information
	defer func() {
		fmt.Println("Defer function called for panic recovery: in main")
		if r := recover(); r != nil {
			fmt.Printf("Panic occurred in main: %v\n", r)
			debug.PrintStack() // Print the stack trace
			panic(r)
		}
	}()
	cmd.Execute()
}
