package entitlement

import (
	"context"
	"core/xchain/config"
	"core/xchain/examples"
	"math/big"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

const (
	slow = 500
	fast = 10
)

var fastTrueCheck = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(MOCK),
	ChainID:         big.NewInt(1),
	ContractAddress: common.Address{},
	Threshold:       big.NewInt(fast),
}

var slowTrueCheck = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(MOCK),
	ChainID:         big.NewInt(1),
	ContractAddress: common.Address{},
	Threshold:       big.NewInt(slow),
}

var fastFalseCheck = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(MOCK),
	ChainID:         big.NewInt(0),
	ContractAddress: common.Address{},
	Threshold:       big.NewInt(fast),
}

var slowFalseCheck = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(MOCK),
	ChainID:         big.NewInt(0),
	ContractAddress: common.Address{},
	Threshold:       big.NewInt(slow),
}

var (
	// Token decimals for LINK
	ChainlinkExp = new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)

	// Constants to define LINK token amounts exponentiated by the token's decimals
	TwentyChainlinkTokens = new(big.Int).Mul(big.NewInt(20), ChainlinkExp)
	ThirtyChainlinkTokens = new(big.Int).Mul(big.NewInt(30), ChainlinkExp)
	SixtyChainlinkTokens  = new(big.Int).Mul(big.NewInt(60), ChainlinkExp)

	// This wallet has been loaded with a custom test NFT on ethereum sepolia and base sepolia, contract
	// addresses defined below.
	sepoliaTestNftWallet = common.HexToAddress("0x1FDBA84c2153568bc22686B88B617CF64cdb0637")
	// This wallet has been kept void of nfts on all testnets.
	sepoliaTestNoNftsWallet = examples.SepoliaChainlinkWallet
)

var erc20TrueCheckBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC20),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: examples.BaseSepoliaChainlinkContract,
	Threshold:       TwentyChainlinkTokens,
}

var erc20FalseCheckBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC20),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: examples.BaseSepoliaChainlinkContract,
	Threshold:       ThirtyChainlinkTokens,
}

var erc20TrueCheckEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC20),
	ChainID:         examples.EthSepoliaChainId,
	ContractAddress: examples.EthSepoliaChainlinkContract,
	Threshold:       TwentyChainlinkTokens,
}

var erc20FalseCheckEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC20),
	ChainID:         examples.EthSepoliaChainId,
	ContractAddress: examples.EthSepoliaChainlinkContract,
	Threshold:       SixtyChainlinkTokens,
}

// These neft checks will be true or false depending on caller address.
var nftCheckEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         big.NewInt(11155111),
	ContractAddress: examples.EthSepoliaTestNftContract,
	Threshold:       big.NewInt(1),
}

var nftCheckBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         big.NewInt(84532),
	ContractAddress: examples.BaseSepoliaTestNftContract,
	Threshold:       big.NewInt(1),
}

var chains = map[uint64]string{
	84532:    "https://sepolia.base.org",
	11155111: "https://ethereum-sepolia-rpc.publicnode.com",
}

var cfg = &config.Config{
	Chains: chains,
}

func TestAndOperation(t *testing.T) {
	testCases := []struct {
		a            Operation
		b            Operation
		expected     bool
		expectedTime int32
	}{
		{&fastTrueCheck, &fastTrueCheck, true, fast},
		{&fastTrueCheck, &slowTrueCheck, true, slow},
		{&slowTrueCheck, &fastTrueCheck, true, slow},
		{&slowTrueCheck, &slowTrueCheck, true, slow},
		{&fastFalseCheck, &fastFalseCheck, false, fast},
		{&slowFalseCheck, &slowFalseCheck, false, slow},
		{&slowFalseCheck, &fastFalseCheck, false, fast},
		{&fastFalseCheck, &slowFalseCheck, false, fast},
		{&fastTrueCheck, &fastFalseCheck, false, fast},
		{&fastTrueCheck, &slowFalseCheck, false, slow},
		{&slowTrueCheck, &fastFalseCheck, false, fast},
		{&slowTrueCheck, &slowFalseCheck, false, slow},
	}

	for idx, tc := range testCases {
		tree := &AndOperation{
			OpType:         LOGICAL,
			LogicalType:    LogicalOperationType(AND),
			LeftOperation:  tc.a,
			RightOperation: tc.b,
		}
		startTime := time.Now() // Get the current time

		callerAddress := common.Address{}

		result, error := evaluateOp(context.Background(), cfg, tree, &callerAddress)
		elapsedTime := time.Since(startTime)
		if error != nil {
			t.Errorf("evaluateAndOperation(%v) = %v; want %v", idx, error, nil)
		}
		if result != tc.expected {
			t.Errorf("evaluateAndOperation(%v) = %v; want %v", idx, result, tc.expected)
		}
		if !areDurationsClose(
			elapsedTime,
			time.Duration(tc.expectedTime*int32(time.Millisecond)),
			10*time.Millisecond,
		) {
			t.Errorf("evaluateAndOperation(%v) took %v; want %v", idx, elapsedTime, time.Duration(tc.expectedTime))
		}
	}
}

func TestOrOperation(t *testing.T) {
	testCases := []struct {
		a            Operation
		b            Operation
		expected     bool
		expectedTime int32
	}{
		{&fastTrueCheck, &fastTrueCheck, true, fast},
		{&fastTrueCheck, &slowTrueCheck, true, fast},
		{&slowTrueCheck, &fastTrueCheck, true, fast},
		{&slowTrueCheck, &slowTrueCheck, true, slow},
		{&fastFalseCheck, &fastFalseCheck, false, fast},
		{&slowFalseCheck, &slowFalseCheck, false, slow},
		{&slowFalseCheck, &fastFalseCheck, false, slow},
		{&fastFalseCheck, &slowFalseCheck, false, slow},
		{&fastTrueCheck, &fastFalseCheck, true, fast},
		{&fastTrueCheck, &slowFalseCheck, true, fast},
		{&slowTrueCheck, &fastFalseCheck, true, slow},
		{&slowTrueCheck, &slowFalseCheck, true, slow},
	}

	for idx, tc := range testCases {
		tree := &OrOperation{
			OpType:         LOGICAL,
			LogicalType:    LogicalOperationType(OR),
			LeftOperation:  tc.a,
			RightOperation: tc.b,
		}
		startTime := time.Now() // Get the current time

		callerAddress := common.Address{}

		result, error := evaluateOp(context.Background(), cfg, tree, &callerAddress)
		elapsedTime := time.Since(startTime)
		if error != nil {
			t.Errorf("evaluateOrOperation(%v) = %v; want %v", idx, error, nil)
		}
		if result != tc.expected {
			t.Errorf("evaluateOrOperation(%v) = %v; want %v", idx, result, tc.expected)
		}
		if !areDurationsClose(
			elapsedTime,
			time.Duration(tc.expectedTime*int32(time.Millisecond)),
			10*time.Millisecond,
		) {
			t.Errorf("evaluateOrOperation(%v) took %v; want %v", idx, elapsedTime, time.Duration(tc.expectedTime))
		}

	}
}

func areDurationsClose(d1, d2, threshold time.Duration) bool {
	diff := d1 - d2
	if diff < 0 {
		diff = -diff
	}
	return diff <= threshold
}

func TestCheckOperation(t *testing.T) {
	testCases := []struct {
		a             Operation
		callerAddress common.Address
		expected      bool
		expectedTime  int32
	}{
		{&fastTrueCheck, common.Address{}, true, fast},
		{&slowTrueCheck, common.Address{}, true, slow},
		{&fastFalseCheck, common.Address{}, false, fast},
		{&slowFalseCheck, common.Address{}, false, slow},
		// Note: these tests call out to base sepolia and ethereum sepolia, so they are not
		// really unit tests. However, we've had deploy failures since anvil does not always
		// behave the same as a real chain, so these tests are here to ensure that the
		// entitlement checks work on base and ethereum mainnets, which is where they will happen
		// in practice.
		{&erc20TrueCheckBaseSepolia, examples.SepoliaChainlinkWallet, true, 0},
		{&erc20FalseCheckBaseSepolia, examples.SepoliaChainlinkWallet, false, 0},
		{&erc20TrueCheckEthereumSepolia, examples.SepoliaChainlinkWallet, true, 0},
		{&erc20FalseCheckEthereumSepolia, examples.SepoliaChainlinkWallet, false, 0},
		{&nftCheckEthereumSepolia, sepoliaTestNftWallet, true, 0},
		{&nftCheckBaseSepolia, sepoliaTestNftWallet, true, 0},
		{&nftCheckEthereumSepolia, sepoliaTestNoNftsWallet, false, 0},
		{&nftCheckBaseSepolia, sepoliaTestNoNftsWallet, false, 0},
	}

	for _, tc := range testCases {

		startTime := time.Now() // Get the current time

		result, err := evaluateOp(context.Background(), cfg, tc.a, &tc.callerAddress)
		elapsedTime := time.Since(startTime)

		if err != nil {
			t.Errorf("evaluateCheckOperation error (%v) = %v; want %v", tc.a, err, nil)
		}
		if result != tc.expected {
			t.Errorf("evaluateCheckOperation result (%v) = %v; want %v", tc.a, result, tc.expected)
		}
		if tc.expectedTime != 0 && !areDurationsClose(
			elapsedTime,
			time.Duration(tc.expectedTime*int32(time.Millisecond)),
			10*time.Millisecond,
		) {
			t.Errorf(
				"evaluateCheckOperation(%v) took %v; want %v",
				fastFalseCheck,
				elapsedTime,
				time.Duration(tc.expectedTime),
			)
		}

	}
}
