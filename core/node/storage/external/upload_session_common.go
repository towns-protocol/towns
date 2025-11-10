package external

import (
	"io"
	"net/http"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// uploadSessionBase contains common logic shared between GCS and S3 upload sessions.
type uploadSessionBase struct {
	streamID            StreamId
	totalMiniblockBytes uint64
	miniblocks          []MiniblockDescriptor
}

// addMiniblock records a miniblock descriptor for later retrieval.
func (u *uploadSessionBase) addMiniblock(miniblockNum int64, blockdata []byte) {
	u.miniblocks = append(u.miniblocks, MiniblockDescriptor{
		Number:              miniblockNum,
		StartByte:           u.totalMiniblockBytes,
		MiniblockDataLength: uint64(len(blockdata)),
	})
	u.totalMiniblockBytes += uint64(len(blockdata))
}

// validateSuccessResponse checks if the HTTP response indicates success (2xx status code).
func validateSuccessResponse(resp *http.Response) bool {
	return (resp.StatusCode / 100) == 2
}

// drainAndCloseResponseBody reads and discards the response body before closing it
// to allow HTTP connection reuse.
func drainAndCloseResponseBody(resp *http.Response) {
	if resp != nil && resp.Body != nil {
		_, _ = io.ReadAll(resp.Body)
		_ = resp.Body.Close()
	}
}

// handleUploadError processes upload errors and returns appropriate error responses.
func handleUploadError(
	streamID StreamId,
	err error,
	funcName string,
	message string,
) ([]MiniblockDescriptor, MiniblockDataStorageLocation, error) {
	return nil, MiniblockDataStorageLocationDB, RiverErrorWithBase(
		Err_DOWNSTREAM_NETWORK_ERROR,
		message,
		err,
	).
		Tag("streamId", streamID).
		Func(funcName)
}

// handleUploadStatusError processes HTTP status code errors.
func handleUploadStatusError(
	streamID StreamId,
	statusCode int,
	status string,
	funcName string,
	provider string,
) ([]MiniblockDescriptor, MiniblockDataStorageLocation, error) {
	return nil, MiniblockDataStorageLocationDB, RiverError(
		Err_DOWNSTREAM_NETWORK_ERROR,
		provider+" put object request failed",
	).
		Tag("streamId", streamID).
		Tag("statusCode", statusCode).
		Tag("status", status).
		Func(funcName)
}
