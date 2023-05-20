package rpc

import (
	"context"
	"errors"

	connect_go "github.com/bufbuild/connect-go"
	log "github.com/sirupsen/logrus"
	"google.golang.org/protobuf/encoding/protojson"

	. "casablanca/node/base"
	"casablanca/node/infra"
	"casablanca/node/protocol"
)

var (
	infoRequests = infra.NewSuccessMetrics("info_requests", serviceRequests)
)

func (s *Service) Info(ctx context.Context, req *connect_go.Request[protocol.InfoRequest]) (*connect_go.Response[protocol.InfoResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	log.Debugf("Info: request %s", protojson.Format((req.Msg)))

	res, err := s.info(ctx, req)
	if err != nil {
		log.Errorf("Info error: %v", err)
		infoRequests.Fail()
		return nil, RpcAddRequestId(err, requestId)
	}
	log.Debugf("Info: response %s", protojson.Format((res.Msg)))
	infoRequests.Pass()
	return res, nil
}

func (s *Service) info(_ context.Context, request *connect_go.Request[protocol.InfoRequest]) (*connect_go.Response[protocol.InfoResponse], error) {
	log.Trace("Info request: ", request)
	if request.Msg.Debug == "error" {
		// TODO: flag
		return nil, RpcError(protocol.Err_DEBUG_ERROR, "Error requested through Info request")
	} else if request.Msg.Debug == "panic" {
		// TODO: flag
		log.Panic("panic requested through Info request")
		return nil, errors.New("panic")
	} else {
		// TODO: set graffiti in config
		// TODO: return version
		return connect_go.NewResponse(&protocol.InfoResponse{
			Graffiti: "Towns.com node welcomes you!",
		}), nil
	}
}
