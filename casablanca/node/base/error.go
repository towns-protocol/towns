package base

import (
	"casablanca/node/protocol"
	"errors"
	"fmt"

	connect_go "github.com/bufbuild/connect-go"
)

func RiverError(code protocol.Err, msg string) error {
	return connect_go.NewError(connect_go.CodeInvalidArgument, errors.New(fmt.Sprint(int32(code), ":", code, ": ", msg)))
}

func RiverErrorf(code protocol.Err, format string, a ...interface{}) error {
	return RiverError(code, fmt.Sprintf(format, a...))
}
