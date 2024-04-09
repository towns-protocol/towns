package cmd

import (
	"bufio"
	"context"
	xc "core/xchain/client_simulator"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/river-build/river/core/node/dlog"
	"github.com/spf13/cobra"
)

func keyboardInput(input chan rune) {
	// Create a new reader to read from standard input
	reader := bufio.NewReader(os.Stdin)

	log.Println("Press Q to Exit, C to simulate a client...")

	for {
		// Read a single character
		char, _, err := reader.ReadRune()
		if err != nil {
			log.Fatal(err)
		}
		input <- char
	}
}

func runClientSimulator() error {
	bc := context.Background()
	pid := os.Getpid()

	log := dlog.FromCtx(bc).With("pid", pid)
	log.Info("Main started")
	input := make(chan rune)

	go func() {
		keyboardInput(input)
	}()

	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

out:

	for {
		log.Info("Main Loop")
		select {
		case char := <-input:
			log.Info("Input", "char", char)
			if char == 'c' {
				go xc.ClientSimulator()
			}
		case <-interrupt:
			log.Info("Main Interrupted")
			break out
		}
	}

	log.Info("Shutdown")
	return nil
}

func init() {
	cmd := &cobra.Command{
		Use:   "run-cs",
		Short: "Runs the client simulator",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runClientSimulator()
		},
	}

	rootCmd.AddCommand(cmd)
}
