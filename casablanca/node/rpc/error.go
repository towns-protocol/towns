package rpc

import (
	"casablanca/node/protocol"
	"errors"
	"fmt"

	connect_go "github.com/bufbuild/connect-go"
)

func RpcError(code protocol.Err, msg string) error {
	return connect_go.NewError(connect_go.CodeInvalidArgument, errors.New(fmt.Sprint(int32(code), ":", code, ": ", msg)))
}

func RpcErrorf(code protocol.Err, format string, a ...interface{}) error {
	return RpcError(code, fmt.Sprintf(format, a...))
}
