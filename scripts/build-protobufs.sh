

pushd "$(git rev-parse --show-toplevel)"
echo "building protobufs"

# typescript: we need to build the protobufs and generate the towns/proto package
yarn csb:cb

# golang
cd casablanca/node
go generate -v -x protocol/gen.go

popd