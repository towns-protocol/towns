package external

import (
	"context"
	"fmt"
	"io"
	"net/http"

	"golang.org/x/oauth2"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
	// gcsUploadSession implements UploadSession to write miniblock data to GCS.
	gcsUploadSession struct {
		uploadSessionBase
		reqCancel context.CancelFunc
		gcStorage io.WriteCloser
		resp      chan struct {
			err  error
			resp *http.Response
		}
	}
)

var _ UploadSession = (*gcsUploadSession)(nil)

// newGcsUploadSession creates a new gcsUploadSession that writes miniblock data to GCS.
func newGcsUploadSession(
	ctx context.Context,
	streamID StreamId,
	schemaName string,
	bucket string,
	totalMiniblockDataSize uint64,
	token *oauth2.Token,
) (*gcsUploadSession, error) {
	var (
		reqCtx, reqCancel      = context.WithCancel(ctx)
		objectKey              = StorageObjectKey(schemaName, streamID)
		url                    = fmt.Sprintf("https://storage.googleapis.com/%s/%s", bucket, objectKey)
		contentLength          = totalMiniblockDataSize
		bodyReader, bodyWriter = io.Pipe()
	)

	// prepare gcs put object request
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPut, url, bodyReader)
	if err != nil {
		reqCancel()
		_ = bodyWriter.CloseWithError(err)
		return nil, RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR,
			"Unable to create Google Storage put object request", err).
			Tag("bucket", bucket).
			Tag("stream", streamID).
			Func("newGcsUploadSession")
	}
	req.ContentLength = int64(contentLength)
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Content-Type", "application/protobuf")

	respChan := make(chan struct {
		err  error
		resp *http.Response
	}, 1)

	// execute the request in a background task that streams data written to bodyWriter to GC Storage
	// data is written to bodyWriter in gcsExternalStorageWriter#WriteMiniblockData.
	// the valid response or the error are written to respChan that is read in gcsExternalStorageWriter#Finish.
	// otherwise the response is written to respChan that is read in gcsExternalStorageWriter#Finish.
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

	return &gcsUploadSession{
		uploadSessionBase: uploadSessionBase{
			streamID: streamID,
		},
		reqCancel: reqCancel,
		gcStorage: bodyWriter,
		resp:      respChan,
	}, nil
}

// WriteMiniblockData either writes the given blockdata to the external storage, or schedules it for writing
// when it's not big enough to be written at the moment.
func (g *gcsUploadSession) WriteMiniblockData(ctx context.Context, miniblockNum int64, blockdata []byte) error {
	// try to write blockdata to gcs, the background task writes this data to gcs.
	if _, err := g.gcStorage.Write(blockdata); err != nil {
		return RiverErrorWithBase(Err_DOWNSTREAM_NETWORK_ERROR, "Unable to write miniblock to GCS", err).
			Tag("streamId", g.streamID).
			Func("gcsUploadSession#WriteMiniblockData")
	}

	// store details about individual miniblocks that can be used to decode the miniblock later
	// when all parts are combined into a single external storage object.
	g.addMiniblock(miniblockNum, blockdata)

	return nil
}

// Finish writes pending miniblock data to external storage and returns the parts that are needed
// to decode miniblocks from the object stored in external storage.
func (g *gcsUploadSession) Finish(ctx context.Context) (
	[]MiniblockDescriptor,
	MiniblockDataStorageLocation,
	error,
) {
	// ensure that the background request is always canceled afterward
	defer g.reqCancel()

	// close the writer to gcs, this will finish the background http request
	if err := g.gcStorage.Close(); err != nil {
		return handleUploadError(g.streamID, err, "gcsUploadSession#Finish",
			"unable to finish writing miniblocks to gcs")
	}

	// wait until the http request reports the result of the put object request
	result := <-g.resp
	if result.err != nil {
		return handleUploadError(g.streamID, result.err, "gcsUploadSession#Finish",
			"gcs put object request failed")
	}

	defer drainAndCloseResponseBody(result.resp)

	// http error code 2xx indicates that the request was successful
	if validateSuccessResponse(result.resp) {
		return g.miniblocks, MiniblockDataStorageLocationGCS, nil
	}

	return handleUploadStatusError(g.streamID, result.resp.StatusCode, result.resp.Status,
		"gcsUploadSession#Finish", "GCS")
}

// Abort the pending upload session
func (g *gcsUploadSession) Abort() {
	g.miniblocks = nil
	g.reqCancel()
	_ = g.gcStorage.Close()
}
