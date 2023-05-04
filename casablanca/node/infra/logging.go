package infra

import (
	"context"
	"errors"

	"github.com/google/uuid"
	log "github.com/sirupsen/logrus"
)

type ContextKey string

var townsLoggerKey = ContextKey("townsLogger")
var EventsLogger = log.New()

func SetLoggerWithRequestId(ctx context.Context) (context.Context, *log.Entry, string) {
	requestId := uuid.NewString()
	log := log.WithFields(log.Fields{
		"requestId": requestId,
	})
	return context.WithValue(ctx, townsLoggerKey, log), log, requestId
}

func SetLoggerWithProcess(ctx context.Context, name string) (context.Context, *log.Entry) {
	log := log.WithFields(log.Fields{
		"requestId": name,
	})
	return context.WithValue(ctx, townsLoggerKey, log), log
}

func GetLogger(ctx context.Context) *log.Entry {
	if ctx.Value(townsLoggerKey) == nil {
		return log.WithFields(log.Fields{})
	}
	return ctx.Value(townsLoggerKey).(*log.Entry)
}

func EnsureRequestId(ctx context.Context) error {
	if ctx.Value(townsLoggerKey) == nil {
		return errors.New("no requestId")
	}
	return nil
}

func GetRequestId(ctx context.Context) string {
	// fails hard
	return ctx.Value(townsLoggerKey).(*log.Entry).Data["requestId"].(string)
}
