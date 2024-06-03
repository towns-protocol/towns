package entitlement

import (
	"context"
	"math/big"
	"testing"
	"time"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/xchain/examples"

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

	// These wallets have been loaded with custom test NFTs on ethereum sepolia and base sepolia, contract
	// addresses defined below. They have the same balance of NFTs on both networks.
	sepoliaTestNftWallet_1Token  = common.HexToAddress("0x1FDBA84c2153568bc22686B88B617CF64cdb0637")
	sepoliaTestNftWallet_3Tokens = common.HexToAddress("0xB79Af997239A334355F60DBeD75bEDf30AcD37bD")
	sepoliaTestNftWallet_2Tokens = common.HexToAddress("0x8cECcB1e5537040Fc63A06C88b4c1dE61880dA4d")
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

// These nft checks will be true or false depending on caller address.
var nftCheckEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.EthSepoliaChainId,
	ContractAddress: examples.EthSepoliaTestNftContract,
	Threshold:       big.NewInt(1),
}

var nftMultiCheckEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.EthSepoliaChainId,
	ContractAddress: examples.EthSepoliaTestNftContract,
	Threshold:       big.NewInt(6),
}

var nftMultiCheckHighThresholdEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.EthSepoliaChainId,
	ContractAddress: examples.EthSepoliaTestNftContract,
	Threshold:       big.NewInt(10),
}

var nftCheckBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: examples.BaseSepoliaTestNftContract,
	Threshold:       big.NewInt(1),
}

var nftMultiCheckBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: examples.EthSepoliaTestNftContract,
	Threshold:       big.NewInt(6),
}

var nftMultiCheckHighThresholdBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: examples.EthSepoliaTestNftContract,
	Threshold:       big.NewInt(10),
}

var chains = map[uint64]string{
	examples.BaseSepoliaChainId.Uint64(): "https://sepolia.base.org",
	examples.EthSepoliaChainId.Uint64():  "https://ethereum-sepolia-rpc.publicnode.com",
}

var cfg = &config.Config{
	Chains: chains,
}

var evaluator *Evaluator

func TestMain(m *testing.M) {
	var err error
	evaluator, err = NewEvaluatorFromConfig(context.Background(), cfg, infra.NewMetricsFactory("", ""))
	if err != nil {
		panic(err)
	}
	m.Run()
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

		result, error := evaluator.evaluateOp(context.Background(), tree, []common.Address{callerAddress})
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

		result, error := evaluator.evaluateOp(context.Background(), tree, []common.Address{callerAddress})
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
		a            Operation
		wallets      []common.Address
		expected     bool
		expectedTime int32
	}{
		{&fastTrueCheck, []common.Address{}, true, fast},
		{&slowTrueCheck, []common.Address{}, true, slow},
		{&fastFalseCheck, []common.Address{}, false, fast},
		{&slowFalseCheck, []common.Address{}, false, slow},
	}

	for _, tc := range testCases {
		startTime := time.Now() // Get the current time

		result, err := evaluator.evaluateOp(context.Background(), tc.a, tc.wallets)
		elapsedTime := time.Since(startTime)

		if err != nil {
			t.Errorf("evaluateCheckOperation error (%v) = %v; want %v", tc.a, err, nil)
		}
		if result != tc.expected {
			t.Errorf("evaluateCheckOperation result (%v) = %v; want %v", tc.a, result, tc.expected)
		}
		if !areDurationsClose(
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

func TestCheckOperation_Untimed(t *testing.T) {
	testCases := map[string]struct {
		a        Operation
		wallets  []common.Address
		expected bool
	}{
		// Note: these tests call out to base sepolia and ethereum sepolia, so they are not
		// really unit tests. However, we've had deploy failures since anvil does not always
		// behave the same as a real chain, so these tests are here to ensure that the
		// entitlement checks work on base and ethereum mainnets, which is where they will happen
		// in practice.
		// ERC20 checks with single wallet
		"ERC20 base sepolia":         {&erc20TrueCheckBaseSepolia, []common.Address{examples.SepoliaChainlinkWallet}, true},
		"ERC20 base sepolia (false)": {&erc20FalseCheckBaseSepolia, []common.Address{examples.SepoliaChainlinkWallet}, false},
		"ERC20 eth sepolia":          {&erc20TrueCheckEthereumSepolia, []common.Address{examples.SepoliaChainlinkWallet}, true},
		"ERC20 eth sepolia (false)":  {&erc20FalseCheckEthereumSepolia, []common.Address{examples.SepoliaChainlinkWallet}, false},

		// NFT checks with single and multiple NFTs, wallets
		"ERC721 eth sepolia":                        {&nftCheckEthereumSepolia, []common.Address{sepoliaTestNftWallet_1Token}, true},
		"ERC721 eth sepolia (no tokens)":            {&nftCheckEthereumSepolia, []common.Address{sepoliaTestNoNftsWallet}, false},
		"ERC721 eth sepolia (insufficient balance)": {&nftMultiCheckEthereumSepolia, []common.Address{sepoliaTestNftWallet_1Token}, false},
		"ERC721 multi-wallet eth sepolia": {
			&nftMultiCheckEthereumSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token, sepoliaTestNftWallet_2Tokens, sepoliaTestNftWallet_3Tokens},
			true,
		},
		"ERC721 multi-wallet eth sepolia (insufficient balance)": {
			&nftMultiCheckHighThresholdEthereumSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token, sepoliaTestNftWallet_2Tokens, sepoliaTestNftWallet_3Tokens},
			false,
		},
		"ERC721 base sepolia":                        {&nftCheckBaseSepolia, []common.Address{sepoliaTestNftWallet_1Token}, true},
		"ERC721 base sepolia (no tokens)":            {&nftCheckBaseSepolia, []common.Address{sepoliaTestNoNftsWallet}, false},
		"ERC721 base sepolia (insufficient balance)": {&nftMultiCheckBaseSepolia, []common.Address{sepoliaTestNftWallet_1Token}, false},
		"ERC721 multi-wallet base sepolia": {
			&nftMultiCheckEthereumSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token, sepoliaTestNftWallet_2Tokens, sepoliaTestNftWallet_3Tokens},
			true,
		},
		"ERC721 multi-wallet base sepolia (insufficient balance)": {
			&nftMultiCheckHighThresholdBaseSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token, sepoliaTestNftWallet_2Tokens, sepoliaTestNftWallet_3Tokens},
			false,
		},
	}

	for name, tc := range testCases {
		t.Run(name, func(t *testing.T) {
			result, err := evaluator.evaluateOp(context.Background(), tc.a, tc.wallets)

			if err != nil {
				t.Errorf("evaluateCheckOperation error (%v) = %v; want %v", tc.a, err, nil)
			}
			if result != tc.expected {
				t.Errorf("evaluateCheckOperation result (%v) = %v; want %v", tc.a, result, tc.expected)
			}
		})
	}
}
