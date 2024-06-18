package examples

import (
	"math/big"

	"github.com/ethereum/go-ethereum/common"
)

const (
	EthSepoliaChainIdUint64  = uint64(11155111)
	BaseSepoliaChainIdUint64 = uint64(84532)
)

var (
	// These constants are used for testing the entitlement system on real world networks. xchain is
	// not sufficiently tested locally by anvil, because anvil diverges from real ethereum networks
	// in ways that have led to outages in the past.
	EthSepoliaChainId  = new(big.Int).SetUint64(EthSepoliaChainIdUint64)
	BaseSepoliaChainId = new(big.Int).SetUint64(BaseSepoliaChainIdUint64)

	// This wallet has been loaded with 25 LINK tokens on base sepolia and 50 on ethereum sepolia
	SepoliaChainlinkWallet = common.HexToAddress("0x4BCfC6962Ab0297aF801da21216014F53B46E991")

	// Contract addresses for LINK on base sepolia and ethereum sepolia. It's relatively easy
	// to get LINK tokens from faucets on both networks.
	BaseSepoliaChainlinkContract = common.HexToAddress("0xE4aB69C077896252FAFBD49EFD26B5D171A32410")
	EthSepoliaChainlinkContract  = common.HexToAddress("0x779877A7B0D9E8603169DdbD7836e478b4624789")

	// We have a custom NFT contract deployed to both ethereum sepolia and base sepolia where we
	// can mint NFTs for testing.
	// Contract addresses for the test NFT contracts.
	EthSepoliaTestNftContract  = common.HexToAddress("0xb088b3f2b35511A611bF2aaC13fE605d491D6C19")
	BaseSepoliaTestNftContract = common.HexToAddress("0xb088b3f2b35511A611bF2aaC13fE605d491D6C19")
)
