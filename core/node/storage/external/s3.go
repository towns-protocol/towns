package external

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	s3ServiceName        = "s3"
	s3UnsignedPayloadSHA = "UNSIGNED-PAYLOAD"
)

type (
	// s3UploadSession implements UploadSession to write miniblock data to AWS S3.
	s3UploadSession struct {
		uploadSessionBase
		reqCancel context.CancelFunc
		s3Writer  io.WriteCloser
		resp      chan struct {
			err  error
			resp *http.Response
		}
	}
)

var _ UploadSession = (*s3UploadSession)(nil)

// newS3UploadSession creates a new s3UploadSession that writes miniblock data to AWS S3.
func newS3UploadSession(
	ctx context.Context,
	streamID StreamId,
	schemaName string,
	bucketName string,
	region string,
	totalMiniblockDataSize uint64,
	signer *v4.Signer,
	creds aws.Credentials,
) (*s3UploadSession, error) {
	var (
		reqCtx, reqCancel      = context.WithCancel(ctx)
		objectKey              = StorageObjectKey(schemaName, streamID)
		url                    = fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, objectKey)
		contentLength          = int64(totalMiniblockDataSize)
		timestamp              = time.Now().UTC()
		host                   = fmt.Sprintf("%s.s3.%s.amazonaws.com", bucketName, region)
		bodyReader, bodyWriter = io.Pipe()
	)

	// prepare s3 put object request
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPut, url, bodyReader)
	if err != nil {
		reqCancel()
		_ = bodyWriter.CloseWithError(err)
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"Unable to create S3 put object request", err).
			Tag("bucket", bucketName).
			Tag("stream", streamID).
			Func("newS3UploadSession")
	}
	req.Host = host
	req.ContentLength = contentLength
	req.Header.Set("Content-Type", "application/protobuf")
	req.Header.Set("X-Amz-Content-Sha256", s3UnsignedPayloadSHA)

	// sign http request
	if err := signer.SignHTTP(reqCtx, creds, req, s3UnsignedPayloadSHA, "s3", region, timestamp); err != nil {
		reqCancel()
		_ = bodyWriter.CloseWithError(err)
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"Unable to sign S3 put object request", err).
			Tag("bucket", bucketName).
			Tag("stream", streamID).
			Func("newS3UploadSession")
	}

	respChan := make(chan struct {
		err  error
		resp *http.Response
	}, 1)

	go func() {
		defer close(respChan)
		defer reqCancel()

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			_ = bodyWriter.CloseWithError(err)
			respChan <- struct {
				err  error
				resp *http.Response
			}{err: err, resp: nil}
			return
		}

		_ = bodyWriter.Close()

		respChan <- struct {
			err  error
			resp *http.Response
		}{err: nil, resp: resp}
	}()

	return &s3UploadSession{
		uploadSessionBase: uploadSessionBase{
			streamID: streamID,
		},
		reqCancel: reqCancel,
		s3Writer:  bodyWriter,
		resp:      respChan,
	}, nil
}

// WriteMiniblockData writes the miniblock payload into the pending S3 upload.
func (s *s3UploadSession) WriteMiniblockData(ctx context.Context, miniblockNum int64, blockdata []byte) error {
	if _, err := s.s3Writer.Write(blockdata); err != nil {
		return RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to write miniblock to S3", err).
			Tag("streamId", s.streamID).
			Func("s3UploadSession#WriteMiniblockData")
	}

	s.addMiniblock(miniblockNum, blockdata)

	return nil
}

// Finish finalizes the pending upload and returns the miniblock descriptors and location.
func (s *s3UploadSession) Finish(ctx context.Context) (
	[]MiniblockDescriptor,
	MiniblockDataStorageLocation,
	error,
) {
	defer s.reqCancel()

	if err := s.s3Writer.Close(); err != nil {
		return handleUploadError(s.streamID, err, "s3UploadSession#Finish",
			"unable to finish writing miniblocks to S3")
	}

	result := <-s.resp
	if result.err != nil {
		return handleUploadError(s.streamID, result.err, "s3UploadSession#Finish",
			"S3 put object request failed")
	}

	defer drainAndCloseResponseBody(result.resp)

	if validateSuccessResponse(result.resp) {
		return s.miniblocks, MiniblockDataStorageLocationS3, nil
	}

	return handleUploadStatusError(s.streamID, result.resp.StatusCode, result.resp.Status,
		"s3UploadSession#Finish", "S3")
}

// Abort cancels the pending upload session.
func (s *s3UploadSession) Abort() {
	s.miniblocks = nil
	s.reqCancel()
	_ = s.s3Writer.Close()
}
