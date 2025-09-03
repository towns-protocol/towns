package rpc

import (
	"context"
	"fmt"
	"os"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
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

	// TODO use config file instead
	if os.Getenv("STORAGE_TYPE") == "external" {
		uploadID, err := s.externalMediaStorage.CreateExternalMediaStream(ctx, streamId, storageMb.Data)
		if err != nil {
			return nil, err
		}
		if s.storage.WriteExternalMediaStreamInfo(ctx, streamId, uploadID, 0) != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return nil, fmt.Errorf(
					"failed to write external media stream info: %w, and failed to abort upload: %v",
					err,
					abortErr,
				)
			}
			return nil, err
		}
		storageMb.Data = []byte{}
	}
	if err = s.storage.CreateEphemeralStreamStorage(ctx, streamId, storageMb, s.externalMediaStorage.GetBucket()); err != nil {
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
		return err
	}
	if location != "" {
		uploadID, bytes_uploaded, err := s.storage.GetExternalMediaStreamInfo(ctx, streamId)
		if err != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return fmt.Errorf(
					"failed to get external media stream info: %w, and failed to abort upload: %v",
					err,
					abortErr,
				)
			}
			return err
		}
		if location != s.externalMediaStorage.GetBucket() {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return fmt.Errorf(
					"failed to get external media stream info: %w, and failed to abort upload: %v",
					err,
					abortErr,
				)
			}
			return fmt.Errorf("external media stream storage changed after this ephemeral media was created.")
		}
		etags, err := s.storage.GetExternalMediaStreamEtags(ctx, streamId)
		if err != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return fmt.Errorf(
					"failed to get external media stream etags: %w, and failed to abort upload: %v",
					err,
					abortErr,
				)
			}
			return err
		}
		partNum := len(etags) + 1
		etag, err := s.externalMediaStorage.UploadChunkToExternalMediaStream(
			ctx,
			streamId,
			storageMb.Data,
			uploadID,
			partNum,
		)
		if err != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return fmt.Errorf("failed to upload chunk to S3: %w, and failed to abort upload: %v", err, abortErr)
			}
			return err
		}
		etags = append(etags, struct {
			PartNumber int
			Etag       string
		}{PartNumber: partNum, Etag: etag})
		new_bytes_uploaded := bytes_uploaded + int64(len(storageMb.Data))
		if s.storage.WriteExternalMediaStreamInfo(ctx, streamId, uploadID, new_bytes_uploaded) != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return fmt.Errorf(
					"failed to write external media stream info: %w, and failed to abort upload: %v",
					err,
					abortErr,
				)
			}
			return err
		}
		rangeHeader := fmt.Sprintf("bytes=%d-%d", bytes_uploaded, new_bytes_uploaded)
		if s.storage.WriteExternalMediaStreamChunkInfo(
			ctx,
			streamId,
			storageMb.Number,
			partNum,
			etag,
			rangeHeader,
		) != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return fmt.Errorf(
					"failed to write external media stream chunk info: %w, and failed to abort upload: %v",
					err,
					abortErr,
				)
			}
			return err
		}
	}
	err = s.storage.WriteEphemeralMiniblock(ctx, streamId, storageMb)
	if err != nil {
		return err
	}

	return nil
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
		return common.Hash{}, err
	}
	if location != "" {
		uploadID, _, err := s.storage.GetExternalMediaStreamInfo(ctx, streamId)
		if err != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return common.Hash{}, fmt.Errorf(
					"failed to get external media stream info: %w, and failed to abort upload: %v",
					err,
					abortErr,
				)
			}
			return common.Hash{}, err
		}
		if location != s.externalMediaStorage.GetBucket() {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return common.Hash{}, fmt.Errorf(
					"failed to get external media stream info: %w, and failed to abort upload: %v",
					err,
					abortErr,
				)
			}
			return common.Hash{}, fmt.Errorf(
				"external media stream storage changed after this ephemeral media was created.",
			)
		}
		etags, err := s.storage.GetExternalMediaStreamEtags(ctx, streamId)
		if err != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return common.Hash{}, fmt.Errorf(
					"failed to complete multipart upload: %w, and failed to abort upload: %v",
					err,
					abortErr,
				)
			}
			return common.Hash{}, err
		}
		err = s.externalMediaStorage.CompleteMediaStreamUpload(ctx, streamId, uploadID, etags)
		if err != nil {
			if abortErr := s.externalMediaStorage.AbortMediaStreamUpload(ctx, streamId, uploadID); abortErr != nil {
				return common.Hash{}, fmt.Errorf(
					"failed to complete multipart upload: %w, and failed to abort upload: %v",
					err,
					abortErr,
				)
			}
			return common.Hash{}, err
		}
	}
	return s.storage.NormalizeEphemeralStream(ctx, streamId)
}
