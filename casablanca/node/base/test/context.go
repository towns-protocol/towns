package test

import (
	"context"
	"os"

	"golang.org/x/exp/slog"

	"github.com/river-build/river/dlog"
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
