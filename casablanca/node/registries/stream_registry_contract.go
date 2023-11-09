package registries

type StreamRegistryContract interface {
	SetNodeAddressesForStream(streamId string, addresses []string) (bool, error)
	AddNodeAddressForStream(streamId string, address string) (bool, error)
	GetNodeAddressesForStream(streamId string) ([]string, error)
}
