

pushd "$(git rev-parse --show-toplevel)"
echo "building protobufs"

# typescript: we need to build the protobufs and generate the river/proto package
yarn csb:build

# golang
cd casablanca/node
go generate -v -x protocol/gen.go

popd