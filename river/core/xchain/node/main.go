package main

import (
	"context"

	"github.com/river-build/river/core/xchain/cmd"

	"github.com/river-build/river/core/node/dlog"
)

func main() {
	log := dlog.FromCtx(context.Background())

	cmd.Execute()

	log.Info("Shutdown")
}
