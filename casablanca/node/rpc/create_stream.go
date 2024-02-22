package rpc

import (
	"context"
	"sync"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/dlog"
	. "github.com/river-build/river/events"
	"github.com/river-build/river/infra"
	. "github.com/river-build/river/nodes"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/rules"
	. "github.com/river-build/river/shared"
	"google.golang.org/protobuf/proto"

	"connectrpc.com/connect"
)

var createStreamRequests = infra.NewSuccessMetrics("create_stream_requests", serviceRequests)

func (s *Service) createStreamImpl(
	ctx context.Context,
	req *connect.Request[CreateStreamRequest],
) (*connect.Response[CreateStreamResponse], error) {
	stream, err := s.createStream(ctx, req.Msg)
	if err != nil {
		createStreamRequests.FailInc()
		return nil, AsRiverError(err).Func("localCreateStream")
	}
	createStreamRequests.PassInc()
	resMsg := &CreateStreamResponse{
		Stream: stream,
	}
	return connect.NewResponse(resMsg), nil
}

func (s *Service) createStream(ctx context.Context, req *CreateStreamRequest) (*StreamAndCookie, error) {
	log := dlog.FromCtx(ctx)

	if len(req.Events) == 0 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "no events")
	}

	parsedEvents, err := ParseEvents(req.Events)
	if err != nil {
		return nil, err
	}

	log.Debug("localCreateStream", "parsedEvents", parsedEvents)

	csRules, err := rules.CanCreateStream(ctx, s.streamConfig, req.StreamId, parsedEvents)

	if err != nil {
		return nil, err
	}

	// check that the creator satisfies the required memberships reqirements
	if csRules.RequiredMemberships != nil {
		// load the creator's user stream
		_, creatorStreamView, err := s.loadStream(ctx, csRules.CreatorStreamId)
		if err != nil {
			return nil, RiverError(Err_PERMISSION_DENIED, "failed to load creator stream", "err", err)
		}
		for _, streamId := range csRules.RequiredMemberships {
			if !creatorStreamView.(UserStreamView).IsMemberOf(streamId) {
				return nil, RiverError(Err_PERMISSION_DENIED, "not a member of", "requiredStreamId", streamId)
			}
		}
	}

	// check that all required users exist in the system
	for _, userId := range csRules.RequiredUsers {
		userStreamId, err := UserStreamIdFromId(userId)
		if err != nil {
			return nil, RiverError(Err_PERMISSION_DENIED, "invalid user id", "requiredUserId", userId)
		}
		_, _, err = s.streamRegistry.GetStreamInfo(ctx, userStreamId)
		if err != nil {
			return nil, RiverError(Err_PERMISSION_DENIED, "user does not exist", "requiredUserId", userId)
		}
	}

	// check entitlements
	if csRules.ChainAuth != nil {
		err := s.chainAuth.IsEntitled(ctx, csRules.ChainAuth)
		if err != nil {
			return nil, err
		}
	}

	// create the stream
	resp, err := s.createReplicatedStream(ctx, req.StreamId, parsedEvents)
	if err != nil && AsRiverError(err).Code != Err_ALREADY_EXISTS {
		return nil, err
	}

	// add derived events
	if csRules.DerivedEvents != nil {
		for _, de := range csRules.DerivedEvents {
			err := s.addEventPayload(ctx, de.StreamId, de.Payload)
			if err != nil {
				return nil, RiverError(Err_INTERNAL, "failed to add derived event", "err", err)
			}
		}
	}

	return resp, nil
}

func (s *Service) createReplicatedStream(
	ctx context.Context,
	streamId string,
	parsedEvents []*ParsedEvent,
) (*StreamAndCookie, error) {
	mb, err := MakeGenesisMiniblock(s.wallet, parsedEvents)
	if err != nil {
		return nil, err
	}

	mbBytes, err := proto.Marshal(mb)
	if err != nil {
		return nil, err
	}

	nodesList, err := s.streamRegistry.AllocateStream(ctx, streamId, mb.Header.Hash, mbBytes)
	if err != nil {
		return nil, err
	}

	nodes := NewStreamNodes(nodesList, s.wallet.AddressStr)
	sender := newQuorumPool(nodes.NumRemotes())

	var localSyncCookie *SyncCookie
	if nodes.IsLocal() {
		sender.GoLocal(func() error {
			_, sv, err := s.cache.CreateStream(ctx, streamId)
			if err != nil {
				return err
			}
			localSyncCookie = sv.SyncCookie(s.wallet.AddressStr)
			return nil
		})
	}

	var remoteSyncCookie *SyncCookie
	var remoteSyncCookieOnce sync.Once
	if nodes.NumRemotes() > 0 {
		for _, n := range nodes.GetRemotes() {
			sender.GoRemote(
				n,
				func(node string) error {
					stub, err := s.nodeRegistry.GetNodeToNodeClientForAddress(node)
					if err != nil {
						return err
					}
					r, err := stub.AllocateStream(
						ctx,
						connect.NewRequest[AllocateStreamRequest](
							&AllocateStreamRequest{
								StreamId:  streamId,
								Miniblock: mb,
							},
						),
					)
					if err != nil {
						return err
					}
					remoteSyncCookieOnce.Do(func() {
						remoteSyncCookie = r.Msg.SyncCookie
					})
					return nil
				},
			)
		}
	}

	err = sender.Wait()
	if err != nil {
		return nil, err
	}

	cookie := localSyncCookie
	if cookie == nil {
		cookie = remoteSyncCookie
	}

	return &StreamAndCookie{
		NextSyncCookie: cookie,
		Miniblocks:     []*Miniblock{mb},
	}, nil
}
