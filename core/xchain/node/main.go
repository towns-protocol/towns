package main

import (
	"context"
	"core/xchain/cmd"

	"github.com/river-build/river/core/node/dlog"
)

func main() {
	log := dlog.FromCtx(context.Background())

	cmd.Execute()

	log.Info("Shutdown")
}
