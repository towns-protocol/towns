package base

import (
	"errors"
	"testing"

	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/protocol"
)

func TestRiverError(t *testing.T) {
	log := dlog.Log()

	e := RiverError(
		protocol.Err_INVALID_ARGUMENT,
		"test error",
		"int", 1,
		"bool", true,
		"string", "hello",
		"float", 1.0,
		"struct", struct {
			Value        string
			AnotherValue int
		}{"test", 5},
		"bytes", []byte("test 123213 123123 12312312312 123"),
		"error", errors.New("test error"),
	).Func("TestRiverError").Tag("int", 3)
	println(e.Error())
	log.Error("test error", "error", e)
	_ = e.Log(log)

	e = AsRiverError(errors.New("base error"))
	println(e.Error())
	log.Error("test error", "error", e)
	_ = e.LogInfo(log)

	e = AsRiverError(e).Func("TestRiverError").Func("TopLevelFunc").Tag("int", 1).LogWarn(log)
	log.Warn("test error", "error", e)

	_ = WrapRiverError(protocol.Err_OUT_OF_RANGE, errors.New("test error")).
		Func("InnerFunc").Message("inner message").
		Func("OuterFunc").Message("outer message").
		Tag("int", 1).
		LogInfo(log)
}
