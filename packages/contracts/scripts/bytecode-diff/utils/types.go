package utils

type BaseConfig struct {
	BaseRpcUrl        string
	BaseSepoliaRpcUrl string
	EtherscanAPIKey   string
}

type RiverChainConfig struct {
	MainnetRpcUrl   string
	DevnetRpcUrl    string
	RiverScanApiKey string
}

type ChainName string

const (
	BASE  ChainName = "base"
	RIVER ChainName = "river"
)
