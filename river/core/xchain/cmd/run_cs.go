package cmd

import (
	"bufio"
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	xc "github.com/river-build/river/core/xchain/client_simulator"
	"github.com/river-build/river/core/xchain/util"

	"github.com/river-build/river/core/node/dlog"
	"github.com/spf13/cobra"
)

func keyboardInput(input chan rune) {
	// Create a new reader to read from standard input
	reader := bufio.NewReader(os.Stdin)

	log.Println("Press:")
	log.Println(" - 'q' to Exit")
	log.Println(" - 'a' to simulate ERC20")
	log.Println(" - 'b' to simulate ERC721")
	log.Println(" - 'c' to simulate custom IsEntitled")
	log.Println(" - 'd' to toggle custom IsEntitled")

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

	wallet, err := util.LoadWallet(bc)
	if err != nil {
		log.Error("error finding wallet")
		return err
	}

	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

out:

	for {
		log.Info("Main Loop")
		select {
		case char := <-input:
			log.Info("Input", "char", char)
			switch char {
			case 'a':
				go xc.RunClientSimulator(bc, loadedCfg, wallet, xc.ERC20)
			case 'b':
				go xc.RunClientSimulator(bc, loadedCfg, wallet, xc.ERC721)
			case 'c':
				go xc.RunClientSimulator(bc, loadedCfg, wallet, xc.ISENTITLED)
			case 'd':
				go xc.RunClientSimulator(bc, loadedCfg, wallet, xc.TOGGLEISENTITLED)
			case 'q':
				log.Info("Quit Exit")
				break out
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
