package base

import (
	"errors"
	"fmt"
	"testing"

	"connectrpc.com/connect"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/protocol"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRiverError(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()
	log := dlog.FromCtx(ctx)

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

type testStruct1 struct{}

func (t *testStruct1) GoString() string {
	return "testStruct1"
}

type testStruct2 struct{}

func (t testStruct2) GoString() string {
	return "testStruct2"
}

func TestRiverErrorGoString(t *testing.T) {
	assert := assert.New(t)
	assert.Contains(RiverError(protocol.Err_INTERNAL, "GoStringer", "val", &testStruct1{}).Error(), "testStruct1")
	assert.Contains(RiverError(protocol.Err_INTERNAL, "GoStringer", "val", testStruct2{}).Error(), "testStruct2")
	assert.Contains(RiverError(protocol.Err_INTERNAL, "GoStringer", "val", &testStruct2{}).Error(), "testStruct2")
}

func TestRiverErrorBytes(t *testing.T) {
	assert := assert.New(t)
	slice := []byte{1, 2, 3, 15}
	err := RiverError(protocol.Err_INTERNAL, "bytes", "val", slice)
	println(err.Error())
	assert.Contains(err.Error(), "0102030f")
	err = RiverError(protocol.Err_INTERNAL, "bytesPtr", "val", &slice)
	println(err.Error())
	assert.Contains(err.Error(), "0102030f")
}

func TestRiverErrorWrapsConnectNetworkingError(t *testing.T) {
	connectErr := connect.NewError(connect.CodeUnavailable, fmt.Errorf("node unavailable"))
	wrappedConnectError := AsRiverError(connectErr).AsConnectError()

	require.Equal(t, connect.CodeFailedPrecondition, wrappedConnectError.Code())
	require.Equal(t, "DOWNSTREAM_NETWORK_ERROR", wrappedConnectError.Meta().Values(RIVER_ERROR_HEADER)[0])
}

func TestIsConnectNetworkError(t *testing.T) {
	tests := map[string]struct {
		err            error
		isNetworkError bool
	}{
		"connect network error (unavailable)": {
			err:            connect.NewError(connect.CodeUnavailable, fmt.Errorf("node unavailable")),
			isNetworkError: true,
		},
		"river downstream network error": {
			err:            RiverError(protocol.Err_DOWNSTREAM_NETWORK_ERROR, "downstream network error"),
			isNetworkError: false,
		},
		"propogated connect network error": {
			err: AsRiverError(
				connect.NewError(connect.CodeUnavailable, fmt.Errorf("node unavailable")),
			).AsConnectError(),
			isNetworkError: false,
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			require.Equal(t, tc.isNetworkError, IsConnectNetworkError(tc.err))
		})
	}
}
