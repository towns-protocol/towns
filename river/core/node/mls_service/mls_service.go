package mls_service

/*
#cgo LDFLAGS: -lmls_lib
#include <stdlib.h>
#include <stdint.h>

// Define the function prototype
int process_mls_request(const uint8_t* input, size_t input_len, uint8_t** output_ptr, size_t* output_len);
void free_bytes(uint8_t* ptr, size_t len);
*/
import "C"

import (
	"fmt"
	"log"
	"unsafe"

	"google.golang.org/protobuf/proto"

	"github.com/river-build/river/core/node/mls_service/mls_tools"
)

func makeMlsRequest(request *mls_tools.MlsRequest) ([]byte, error) {
	var outputPtr *C.uint8_t
	var outputLen C.size_t
	bytes, err := proto.Marshal(request)
	if err != nil {
		log.Fatal("marshaling error: ", err)
		return nil, err
	}
	// Call the Rust function
	retCode := C.process_mls_request(
		(*C.uint8_t)(unsafe.Pointer(&bytes[0])),
		C.size_t(len(bytes)),
		&outputPtr,
		&outputLen,
	)

	if retCode != 0 {
		return nil, fmt.Errorf("error calling Rust function: %d", retCode)
	}

	// Convert the result to a Go slice
	output := C.GoBytes(unsafe.Pointer(outputPtr), C.int(outputLen))
	C.free_bytes(outputPtr, outputLen)
	return output, nil
}

func InitialGroupInfoRequest(request *mls_tools.InitialGroupInfoRequest) (*mls_tools.InitialGroupInfoResponse, error) {
	r := &mls_tools.MlsRequest{
		Content: &mls_tools.MlsRequest_InitialGroupInfo{
			InitialGroupInfo: request,
		},
	}
	responseBytes, err := makeMlsRequest(r)
	if err != nil {
		return nil, err
	}
	result := mls_tools.InitialGroupInfoResponse{}
	err = proto.Unmarshal(responseBytes, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func ExternalJoinRequest(request *mls_tools.ExternalJoinRequest) (*mls_tools.ExternalJoinResponse, error) {
	r := &mls_tools.MlsRequest{
		Content: &mls_tools.MlsRequest_ExternalJoin{
			ExternalJoin: request,
		},
	}
	responseBytes, err := makeMlsRequest(r)
	if err != nil {
		return nil, err
	}
	result := mls_tools.ExternalJoinResponse{}
	err = proto.Unmarshal(responseBytes, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func SnapshotExternalGroupRequest(request *mls_tools.SnapshotExternalGroupRequest) (*mls_tools.SnapshotExternalGroupResponse, error) {
	r := &mls_tools.MlsRequest{
		Content: &mls_tools.MlsRequest_SnapshotExternalGroup{
			SnapshotExternalGroup: request,
		},
	}
	responseBytes, err := makeMlsRequest(r)
	if err != nil {
		return nil, err
	}
	result := mls_tools.SnapshotExternalGroupResponse{}
	err = proto.Unmarshal(responseBytes, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func KeyPackageRequest(request *mls_tools.KeyPackageRequest) (*mls_tools.KeyPackageResponse, error) {
	r := &mls_tools.MlsRequest{
		Content: &mls_tools.MlsRequest_KeyPackage{
			KeyPackage: request,
		},
	}
	responseBytes, err := makeMlsRequest(r)
	if err != nil {
		return nil, err
	}
	result := mls_tools.KeyPackageResponse{}
	err = proto.Unmarshal(responseBytes, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func WelcomeMessageRequest(request *mls_tools.WelcomeMessageRequest) (*mls_tools.WelcomeMessageResponse, error) {
	r := &mls_tools.MlsRequest{
		Content: &mls_tools.MlsRequest_WelcomeMessage{
			WelcomeMessage: request,
		},
	}
	responseBytes, err := makeMlsRequest(r)
	if err != nil {
		return nil, err
	}
	result := mls_tools.WelcomeMessageResponse{}
	err = proto.Unmarshal(responseBytes, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}
