package main

import (
	"bufio"
	"context"
	xc "core/xchain/client_simulator"
	"core/xchain/server"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/river-build/river/core/node/dlog"
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

func main() {
	bc, cancel := context.WithCancel(context.Background())
	pid := os.Getpid()

	log := dlog.FromCtx(bc).With("pid", pid)

	ctx := dlog.CtxWithLog(bc, log)

	numWorkers := 100
	shutdown := make(chan struct{})
	var once sync.Once
	closeShutdown := func() {
		once.Do(func() {
			close(shutdown)
			cancel()
			log.Info("Channel shutdown closed")
		})
	}
	wgDone := make(chan struct{})
	input := make(chan rune)

	// Start the worker goroutines
	var wg sync.WaitGroup
	var startedWg sync.WaitGroup
	startedWg.Add(numWorkers)

	for i := 1; i <= numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			startedWg.Done()
			server.RunServer(ctx, workerID, shutdown)
		}(i)
	}

	startedWg.Wait()
	go func() {
		wg.Wait()
		close(wgDone)
	}()

	go func() {
		keyboardInput(input)
	}()

	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

out:

	for {
		select {
		case char := <-input:
			log.Info("Input", "char", char)
			if char == 27 || char == 'q' {
				closeShutdown()
			} else if char == 'c' {
				go xc.ClientSimulator()
			}
		case <-interrupt:
			log.Info("Main Interrupted")
			closeShutdown()
		case <-wgDone:
			log.Info("Done")
			break out
		}
	}

	log.Info("Shutdown")
}
