package auth

import (
	"golang.org/x/exp/slog"

	"github.com/ethereum/go-ethereum/ethclient"
)

func NewSpaceContractLocalhost(ethClient *ethclient.Client, contractVersion string) (SpaceContract, error) {
	slog.Info("Using localhost", "contractVersion", contractVersion)
	switch contractVersion {
	case "v3":
		return NewSpaceContractLocalhostV3(ethClient)
	default:
		return NewSpaceContractLocalhostV2(ethClient)
	}
}

func NewSpaceContractGoerli(ethClient *ethclient.Client, contractVersion string) (SpaceContract, error) {
	slog.Error("Using goerli", "contractVersion", contractVersion)
	switch contractVersion {
	case "v3":
		return NewSpaceContractGoerliV3(ethClient)
	default:
		return NewSpaceContractGoerliV2(ethClient)
	}
}

func NewSpaceContractSepolia(ethClient *ethclient.Client, contractVersion string) (SpaceContract, error) {
	slog.Error("Using sepolia", "contractVersion", contractVersion)
	switch contractVersion {
	case "v3":
		return NewSpaceContractSepoliaV3(ethClient)
	default:
		return NewSpaceContractSepoliaV2(ethClient)
	}
}
