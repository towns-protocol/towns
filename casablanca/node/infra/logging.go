package infra

import (
	"context"

	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type ContextKey string

var townsLoggerKey = ContextKey("townsLogger")

func SetLoggerWithRequestId(ctx context.Context) (context.Context, *log.Entry) {
	requestId := uuid.NewString()
	log := log.WithFields(log.Fields{
		"requestId": requestId,
	})
	return context.WithValue(ctx, townsLoggerKey, log), log
}

func SetLoggerWithProcess(ctx context.Context, name string) (context.Context, *log.Entry) {
	log := log.WithFields(log.Fields{
		"process": name,
	})
	return context.WithValue(ctx, townsLoggerKey, log), log
}

func GetLogger(ctx context.Context) *log.Entry {
	if ctx.Value(townsLoggerKey) == nil {
		return log.WithFields(log.Fields{})
	}
	return ctx.Value(townsLoggerKey).(*log.Entry)
}
