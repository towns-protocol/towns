package base

import (
	"errors"
	"fmt"
	"testing"

	"connectrpc.com/connect"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

func TestRiverError(t *testing.T) {
	ctx := test.NewTestContext(t)
	log := logging.FromCtx(ctx)

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
	testfmt.Println(t, e.Error())
	log.Errorw("test error", "error", e)
	_ = e.Log(log)

	e = AsRiverError(errors.New("base error"))
	testfmt.Println(t, e.Error())
	log.Errorw("test error", "error", e)
	_ = e.LogInfo(log)

	e = AsRiverError(e).Func("TestRiverError").Func("TopLevelFunc").Tag("int", 1).LogWarn(log)
	log.Warnw("test error", "error", e)

	_ = WrapRiverError(protocol.Err_OUT_OF_RANGE, errors.New("test error")).
		Func("InnerFunc").Message("inner message").
		Func("OuterFunc").Message("outer message").
		Tag("int", 1).
		LogInfo(log)
}

func TestAsRiverErrorWithNil(t *testing.T) {
	assert := assert.New(t)
	assert.Nil(AsRiverError(nil), "river error expected to be nil")
	assert.Nil(AsRiverError(nil, protocol.Err_ALREADY_EXISTS), "river error expected to be nil")
	assert.Nil(AsRiverError(nil, protocol.Err_ALREADY_EXISTS, protocol.Err_INVALID_ARGUMENT), "river error expected to be nil")
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
	testfmt.Println(t, err.Error())
	assert.Contains(err.Error(), "0102030f")
	err = RiverError(protocol.Err_INTERNAL, "bytesPtr", "val", &slice)
	testfmt.Println(t, err.Error())
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

func TestIsOperationRetriableOnRemotes(t *testing.T) {
	tests := map[string]struct {
		err         error
		isRetriable bool
	}{
		"retriable error - UNKNOWN": {
			err:         RiverError(protocol.Err_UNKNOWN, "unknown error"),
			isRetriable: true,
		},
		"retriable error - DEADLINE_EXCEEDED": {
			err:         RiverError(protocol.Err_DEADLINE_EXCEEDED, "deadline exceeded"),
			isRetriable: true,
		},
		"retriable error - NOT_FOUND": {
			err:         RiverError(protocol.Err_NOT_FOUND, "not found"),
			isRetriable: true,
		},
		"retriable error - MINIBLOCKS_STORAGE_FAILURE": {
			err:         RiverError(protocol.Err_MINIBLOCKS_STORAGE_FAILURE, "miniblocks storage failure"),
			isRetriable: true,
		},
		"retriable error - MINIBLOCK_TOO_NEW": {
			err:         RiverError(protocol.Err_MINIBLOCK_TOO_NEW, "miniblock too new"),
			isRetriable: true,
		},
		"retriable error - STREAM_RECONCILIATION_REQUIRED": {
			err:         RiverError(protocol.Err_STREAM_RECONCILIATION_REQUIRED, "stream reconciliation required"),
			isRetriable: true,
		},
		"retriable error - BUFFER_FULL": {
			err:         RiverError(protocol.Err_BUFFER_FULL, "buffer full"),
			isRetriable: true,
		},
		"retriable error - MINIBLOCKS_NOT_FOUND": {
			err:         RiverError(protocol.Err_MINIBLOCKS_NOT_FOUND, "miniblocks not found"),
			isRetriable: true,
		},
		"non-retriable error - INVALID_ARGUMENT": {
			err:         RiverError(protocol.Err_INVALID_ARGUMENT, "invalid argument"),
			isRetriable: false,
		},
		"non-retriable error - PERMISSION_DENIED": {
			err:         RiverError(protocol.Err_PERMISSION_DENIED, "permission denied"),
			isRetriable: false,
		},
		"non-retriable error - BAD_STREAM_ID": {
			err:         RiverError(protocol.Err_BAD_STREAM_ID, "bad stream id"),
			isRetriable: false,
		},
		"non-river error": {
			err:         errors.New("plain error"),
			isRetriable: false,
		},
		"wrapped river error": {
			err:         AsRiverError(RiverError(protocol.Err_UNAVAILABLE, "unavailable")),
			isRetriable: true,
		},
		"connect error mapped to river error": {
			err:         AsRiverError(connect.NewError(connect.CodeUnavailable, fmt.Errorf("unavailable"))),
			isRetriable: false, // Maps to Err_DOWNSTREAM_NETWORK_ERROR which is not retriable
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			require.Equal(t, tc.isRetriable, IsOperationRetriableOnRemotes(tc.err))
		})
	}
}
