// Package rpcinterface provides interfaces for RPC streams.
// connectrpc.com/connect returns streams  as pointers to classes,
// treating them as interfaces makes testing easier.
package rpcinterface

import "net/http"

type ServerStreamForClient[Res any] interface {
	Close() error
	Err() error
	Msg() *Res
	Receive() bool
	ResponseHeader() http.Header
	ResponseTrailer() http.Header
}
