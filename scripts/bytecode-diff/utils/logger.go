package utils

import (
	"github.com/rs/zerolog"
)

var Log zerolog.Logger

func SetLogger(logger zerolog.Logger) {
	Log = logger
}
