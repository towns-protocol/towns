package auth

import (
	"github.com/ethereum/go-ethereum/ethclient"
)

func NewSpaceContractLocalhost(ethClient *ethclient.Client) (SpaceContract, error) {
	return NewSpaceContractLocalhostV3(ethClient)
}

func NewSpaceContractGoerli(ethClient *ethclient.Client) (SpaceContract, error) {
	return NewSpaceContractGoerliV3(ethClient)
}

func NewSpaceContractSepolia(ethClient *ethclient.Client) (SpaceContract, error) {
	return NewSpaceContractSepoliaV3(ethClient)
}
