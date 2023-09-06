package main

import (
	"casablanca/node/dlog"
	"context"
	"servers/xchain/cmd"
)

func main() {
	log := dlog.CtxLog(context.Background())

	cmd.Execute()

	log.Info("Shutdown")
}
