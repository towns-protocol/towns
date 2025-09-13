package rpc

import (
	"context"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/log"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/utils"
)

func (s *Service) AllocateEphemeralStream(
	ctx context.Context,
	req *connect.Request[AllocateEphemeralStreamRequest],
) (*connect.Response[AllocateEphemeralStreamResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 10*time.Second, 20*time.Second)
	defer cancel()
	log.Debug("AllocateEphemeralStream ENTER")
	r, e := s.allocateEphemeralStream(ctx, req.Msg)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("AllocateEphemeralStream").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("AllocateEphemeralStream LEAVE", "response", r)
	return connect.NewResponse(r), nil
}

func (s *Service) allocateEphemeralStream(
	ctx context.Context,
	req *AllocateEphemeralStreamRequest,
) (*AllocateEphemeralStreamResponse, error) {
	streamId, err := StreamIdFromBytes(req.StreamId)
	if err != nil {
		return nil, err
	}

	mbInfo, err := NewMiniblockInfoFromProto(
		req.GetMiniblock(),
		req.GetSnapshot(),
		NewParsedMiniblockInfoOpts().WithExpectedBlockNumber(0),
	)
	if err != nil {
		return nil, err
	}

	storageMb, err := mbInfo.AsStorageMb()
	if err != nil {
		return nil, err
	}

	if s.config.MediaStreamDataStorage != storage.StreamStorageTypePostgres {
		uploadID, err := s.externalMediaStorage.CreateExternalMediaStream(ctx, streamId, storageMb.Data)
		if err != nil {
			return nil, RiverError(Err_INTERNAL, "failed to create external media stream", "error", err)
		}
		if err := s.storage.CreateExternalMediaStreamUploadEntry(ctx, streamId, uploadID); err != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return nil, RiverError(
					Err_INTERNAL,
					"failed to write external media stream info",
					"error",
					err,
					"abortErr",
					abortErr,
				)
			}
			if deleteErr := s.storage.DeleteExternalMediaStreamUploadEntry(ctx, streamId); deleteErr != nil {
				return nil, RiverError(
					Err_INTERNAL,
					"failed to write external media stream info",
					"error",
					err,
					"deleteErr",
					deleteErr,
				)
			}
			return nil, RiverError(Err_INTERNAL, "failed to create external media stream upload entry", "error", err)
		}
	}
	if err = s.storage.CreateEphemeralStreamStorage(ctx, streamId, storageMb, s.config.ExternalMediaStreamDataBucket); err != nil {
		return nil, err
	}

	return &AllocateEphemeralStreamResponse{}, nil
}

func (s *Service) SaveEphemeralMiniblock(
	ctx context.Context,
	req *connect.Request[SaveEphemeralMiniblockRequest],
) (*connect.Response[SaveEphemeralMiniblockResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 5*time.Second, 10*time.Second)
	defer cancel()
	log.Debug("SaveEphemeralMiniblock ENTER")
	if err := s.saveEphemeralMiniblock(ctx, req.Msg); err != nil {
		return nil, AsRiverError(err).Func("SaveEphemeralMiniblock").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("SaveEphemeralMiniblock LEAVE")
	return connect.NewResponse(&SaveEphemeralMiniblockResponse{}), nil
}

func (s *Service) saveEphemeralMiniblock(ctx context.Context, req *SaveEphemeralMiniblockRequest) error {
	streamId, err := StreamIdFromBytes(req.GetStreamId())
	if err != nil {
		return err
	}

	mbInfo, err := NewMiniblockInfoFromProto(
		req.GetMiniblock(),
		req.GetSnapshot(),
		NewParsedMiniblockInfoOpts(),
	)
	if err != nil {
		return err
	}

	storageMb, err := mbInfo.AsStorageMb()
	if err != nil {
		return err
	}

	// Save the ephemeral miniblock.
	location, err := s.storage.GetMediaStreamLocation(ctx, streamId)
	if err != nil {
		return RiverError(Err_INTERNAL, "failed to get media stream location", "error", err)
	}
	if location != "" {
		if location != s.config.ExternalMediaStreamDataBucket {
			return RiverError(
				Err_INTERNAL,
				"external media stream storage changed after this ephemeral media was created.",
			)
		}
		uploadID, _, err := s.storage.GetExternalMediaStreamUploadInfo(ctx, streamId)
		if err != nil {
			return RiverError(Err_INTERNAL, "failed to get external media stream next part", "error", err)
		}
		etag, err := s.externalMediaStorage.UploadPartToExternalMediaStream(
			ctx,
			streamId,
			storageMb.Data,
			uploadID,
			storageMb.Number,
		)
		if err != nil {
			return RiverError(Err_INTERNAL, "failed to upload part to external media stream", "error", err)
		}
		if err = s.storage.WriteExternalMediaStreamPartUploadInfo(
			ctx,
			streamId,
			storageMb.Number,
			etag,
			len(storageMb.Data),
		); err != nil {
			return RiverError(Err_INTERNAL, "failed to write external media stream part info", "error", err)
		}
		storageMb.Data = []byte{}
	}
	return s.storage.WriteEphemeralMiniblock(ctx, streamId, storageMb)
}

func (s *Service) SealEphemeralStream(
	ctx context.Context,
	req *connect.Request[SealEphemeralStreamRequest],
) (*connect.Response[SealEphemeralStreamResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 10*time.Second, 20*time.Second)
	defer cancel()
	log.Debug("SealEphemeralStream ENTER")

	genesisMiniblockHash, err := s.sealEphemeralStream(ctx, req.Msg)
	if err != nil {
		return nil, AsRiverError(err).Func("SealEphemeralStream").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("SealEphemeralStream LEAVE")

	return connect.NewResponse(&SealEphemeralStreamResponse{
		GenesisMiniblockHash: genesisMiniblockHash[:],
	}), nil
}

func (s *Service) sealEphemeralStream(
	ctx context.Context,
	req *SealEphemeralStreamRequest,
) (common.Hash, error) {
	streamId, err := StreamIdFromBytes(req.GetStreamId())
	if err != nil {
		return common.Hash{}, AsRiverError(err).Func("sealEphemeralStream")
	}

	location, err := s.storage.GetMediaStreamLocation(ctx, streamId)
	if err != nil {
		return common.Hash{}, RiverError(Err_INTERNAL, "failed to get media stream location", "error", err)
	}
	if location != s.config.ExternalMediaStreamDataBucket {
		return common.Hash{}, RiverError(
			Err_INTERNAL,
			"external media stream storage changed after this ephemeral media was created.",
		)
	}
	if location != "" {
		uploadID, etags, err := s.storage.GetExternalMediaStreamUploadInfo(ctx, streamId)
		if err != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return common.Hash{}, RiverError(
					Err_INTERNAL,
					"failed to get external media stream info",
					"error",
					err,
					"abortErr",
					abortErr,
				)
			}
			return common.Hash{}, RiverError(Err_INTERNAL, "failed to get external media stream info", "error", err)
		}
		err = s.externalMediaStorage.CompleteMediaStreamUpload(ctx, streamId, uploadID, etags)
		if err != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return common.Hash{}, RiverError(
					Err_INTERNAL,
					"failed to complete multipart upload",
					"error",
					err,
					"abortErr",
					abortErr,
				)
			}
			return common.Hash{}, RiverError(Err_INTERNAL, "failed to complete multipart upload", "error", err)
		}
		if err = s.storage.DeleteExternalMediaStreamUploadEntry(ctx, streamId); err != nil {
			log.Error(
				"failed to delete external media stream upload entry, with error: %w",
				"streamId",
				streamId,
				"error",
				err,
			)
		}
	}
	return s.storage.NormalizeEphemeralStream(ctx, streamId)
}
