#
# TODO: rename this script
# install go deps required to work with protobufs, format and analyze go code
# run this script if your version doesn't match the checked in proto version
# note 7/2023 - At some point we should probaby freeze these and update them by hand? For now just get latest.
#


go install github.com/bufbuild/buf/cmd/buf@latest
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest
go install honnef.co/go/tools/cmd/staticcheck@latest
go install mvdan.cc/gofumpt@latest
go install github.com/segmentio/golines@latest
