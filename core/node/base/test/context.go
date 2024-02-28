package test

import (
	"context"
	"os"

	"log/slog"

	"github.com/river-build/river/core/node/dlog"
)

func NewTestContext() context.Context {
	//lint:ignore LE0000 context.Background() used correctly
	return dlog.CtxWithLog(
		context.Background(),
		slog.New(
			dlog.NewPrettyTextHandler(
				os.Stdout,
				&dlog.PrettyHandlerOptions{
					Level:         slog.LevelDebug,
					PrintLongTime: false,
					Colors:        dlog.ColorMap_Enabled,
				},
			),
		),
	)
}
