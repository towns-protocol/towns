package entitlement

import (
	"context"
	"fmt"
	"math/big"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/xchain/examples"

	"github.com/ethereum/go-ethereum/common"

	"github.com/river-build/river/core/contracts/river"
	. "github.com/river-build/river/core/contracts/types"
)

const (
	slow = 500
	fast = 10
)

var (
	timingThreshold = 100 * time.Millisecond

	fastThresholdParams = ThresholdParams{
		Threshold: big.NewInt(fast),
	}
	fastEncodedParams, _ = fastThresholdParams.AbiEncode()
	slowThresholdParams  = ThresholdParams{
		Threshold: big.NewInt(slow),
	}
	slowEncodedParams, _ = slowThresholdParams.AbiEncode()
)

var fastTrueCheck = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(MOCK),
	ChainID:         big.NewInt(1),
	ContractAddress: common.Address{},
	Params:          fastEncodedParams,
}

var slowTrueCheck = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(MOCK),
	ChainID:         big.NewInt(1),
	ContractAddress: common.Address{},
	Params:          slowEncodedParams,
}

var fastFalseCheck = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(MOCK),
	ChainID:         big.NewInt(0),
	ContractAddress: common.Address{},
	Params:          fastEncodedParams,
}

var slowFalseCheck = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(MOCK),
	ChainID:         big.NewInt(0),
	ContractAddress: common.Address{},
	Params:          slowEncodedParams,
}

var fastErrorCheck = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(MOCK),
	ChainID:         big.NewInt(1),
	ContractAddress: common.HexToAddress("1"),
	Params:          fastEncodedParams,
}

var slowErrorCheck = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(MOCK),
	ChainID:         big.NewInt(0),
	ContractAddress: common.HexToAddress("2"),
	Params:          slowEncodedParams,
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

	// ERC1155 test contracts and wallets
	baseSepoliaErc1155Contract                  = common.HexToAddress("0x60327B4F2936E02B910e8A236d46D0B7C1986DCB")
	baseSepoliaErc1155Wallet_TokenId0_700Tokens = common.HexToAddress("0x1FDBA84c2153568bc22686B88B617CF64cdb0637")
	baseSepoliaErc1155Wallet_TokenId0_300Tokens = common.HexToAddress("0xB79Af997239A334355F60DBeD75bEDf30AcD37bD")
	baseSepoliaErc1155Wallet_TokenId1_100Tokens = common.HexToAddress("0x1FDBA84c2153568bc22686B88B617CF64cdb0637")
	baseSepoliaErc1155Wallet_TokenId1_50Tokens  = common.HexToAddress("0xB79Af997239A334355F60DBeD75bEDf30AcD37bD")
)

func encodeThresholdParams(threshold *big.Int) []byte {
	thresholdParams := ThresholdParams{
		Threshold: threshold,
	}
	encodedParams, _ := thresholdParams.AbiEncode()
	return encodedParams
}

func encodeErc1155Params(threshold, tokenId *big.Int) []byte {
	erc1155Params := ERC1155Params{
		Threshold: threshold,
		TokenId:   tokenId,
	}
	encodedParams, _ := erc1155Params.AbiEncode()
	return encodedParams
}

var erc1155CheckBaseSepolia_TokenId0_700Tokens = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC1155),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: baseSepoliaErc1155Contract,
	Params:          encodeErc1155Params(big.NewInt(700), big.NewInt(0)),
}

var erc1155CheckBaseSepolia_TokenId0_1000Tokens = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC1155),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: baseSepoliaErc1155Contract,
	Params:          encodeErc1155Params(big.NewInt(1000), big.NewInt(0)),
}

var erc1155CheckBaseSepolia_TokenId0_1001Tokens = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC1155),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: baseSepoliaErc1155Contract,
	Params:          encodeErc1155Params(big.NewInt(1001), big.NewInt(0)),
}

var erc1155CheckBaseSepolia_TokenId1_100Tokens = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC1155),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: baseSepoliaErc1155Contract,
	Params:          encodeErc1155Params(big.NewInt(100), big.NewInt(1)),
}

var erc1155CheckBaseSepolia_TokenId1_150Tokens = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC1155),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: baseSepoliaErc1155Contract,
	Params:          encodeErc1155Params(big.NewInt(150), big.NewInt(1)),
}

var erc1155CheckBaseSepolia_TokenId1_151Tokens = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC1155),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: baseSepoliaErc1155Contract,
	Params:          encodeErc1155Params(big.NewInt(151), big.NewInt(1)),
}

var ethBalance_gt_0_7 = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ETH_BALANCE),
	ContractAddress: common.Address{},
	// .7ETH in Wei
	Params: encodeThresholdParams(big.NewInt(700_000_000_000_000_001)),
}

var ethBalance0_7 = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ETH_BALANCE),
	ContractAddress: common.Address{},
	// .7ETH in Wei
	Params: encodeThresholdParams(big.NewInt(700_000_000_000_000_000)),
}

var ethBalance0_5 = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ETH_BALANCE),
	ContractAddress: common.Address{},
	// .5ETH in Wei
	Params: encodeThresholdParams(big.NewInt(500_000_000_000_000_000)),
}

var ethBalance0_4 = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ETH_BALANCE),
	ContractAddress: common.Address{},
	// .4ETH in Wei
	Params: encodeThresholdParams(big.NewInt(400_000_000_000_000_000)),
}

var erc20TrueCheckBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC20),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: examples.BaseSepoliaChainlinkContract,
	Params:          encodeThresholdParams(TwentyChainlinkTokens),
}

var erc20FalseCheckBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC20),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: examples.BaseSepoliaChainlinkContract,
	Params:          encodeThresholdParams(ThirtyChainlinkTokens),
}

var erc20TrueCheckEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC20),
	ChainID:         examples.EthSepoliaChainId,
	ContractAddress: examples.EthSepoliaChainlinkContract,
	Params:          encodeThresholdParams(TwentyChainlinkTokens),
}

var erc20FalseCheckEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC20),
	ChainID:         examples.EthSepoliaChainId,
	ContractAddress: examples.EthSepoliaChainlinkContract,
	Params:          encodeThresholdParams(SixtyChainlinkTokens),
}

// These nft checks will be true or false depending on caller address.
var nftCheckEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.EthSepoliaChainId,
	ContractAddress: examples.EthSepoliaTestNftContract,
	Params:          encodeThresholdParams(big.NewInt(1)),
}

var nftMultiCheckEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.EthSepoliaChainId,
	ContractAddress: examples.EthSepoliaTestNftContract,
	Params:          encodeThresholdParams(big.NewInt(6)),
}

var nftMultiCheckHighThresholdEthereumSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.EthSepoliaChainId,
	ContractAddress: examples.EthSepoliaTestNftContract,
	Params:          encodeThresholdParams(big.NewInt(10)),
}

var nftCheckBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: examples.BaseSepoliaTestNftContract,
	Params:          encodeThresholdParams(big.NewInt(1)),
}

var nftMultiCheckBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: examples.EthSepoliaTestNftContract,
	Params:          encodeThresholdParams(big.NewInt(6)),
}

var nftMultiCheckHighThresholdBaseSepolia = CheckOperation{
	OpType:          CHECK,
	CheckType:       CheckOperationType(ERC721),
	ChainID:         examples.BaseSepoliaChainId,
	ContractAddress: examples.EthSepoliaTestNftContract,
	Params:          encodeThresholdParams(big.NewInt(10)),
}

var cfg = &config.Config{
	ChainConfigs: map[uint64]*config.ChainConfig{
		examples.EthSepoliaChainIdUint64: {
			NetworkUrl:  "https://ethereum-sepolia-rpc.publicnode.com",
			ChainId:     examples.EthSepoliaChainIdUint64,
			BlockTimeMs: 12000,
		},
		examples.BaseSepoliaChainIdUint64: {
			NetworkUrl:  "https://sepolia.base.org",
			ChainId:     examples.BaseSepoliaChainIdUint64,
			BlockTimeMs: 2000,
		},
	},
}

type MockOnChainCfg struct {
	settings *crypto.OnChainSettings
}

func (m *MockOnChainCfg) ActiveBlock() crypto.BlockNumber { return 0 }
func (m *MockOnChainCfg) Get() *crypto.OnChainSettings    { return m.settings }
func (m *MockOnChainCfg) GetOnBlock(block crypto.BlockNumber) *crypto.OnChainSettings {
	return m.settings
}

func (m *MockOnChainCfg) All() []*crypto.OnChainSettings {
	return []*crypto.OnChainSettings{m.settings}
}
func (m *MockOnChainCfg) LastAppliedEvent() *river.RiverConfigV1ConfigurationChanged { return nil }

var allSepoliaChains_onChainConfig = &MockOnChainCfg{
	settings: &crypto.OnChainSettings{
		XChain: crypto.XChainSettings{
			Blockchains: []uint64{
				examples.EthSepoliaChainIdUint64,
				examples.BaseSepoliaChainIdUint64,
			},
		},
	},
}

var evaluator *Evaluator

func TestMain(m *testing.M) {
	var err error
	evaluator, err = NewEvaluatorFromConfig(
		context.Background(),
		cfg,
		allSepoliaChains_onChainConfig,
		infra.NewMetricsFactory(nil, "", ""),
	)
	if err != nil {
		panic(err)
	}
	os.Exit(m.Run())
}

var (
	errSlow = fmt.Errorf("intentional failure (02)")
	errFast = fmt.Errorf("intentional failure (01)")
)

func TestAndOperation(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()

	testCases := []struct {
		description  string
		a            Operation
		b            Operation
		expected     bool
		expectedTime int32
		expectedErr  error
	}{
		{"fast true, fast true", &fastTrueCheck, &fastTrueCheck, true, fast, nil},
		{"fast true, slow true", &fastTrueCheck, &slowTrueCheck, true, slow, nil},
		{"slow true, fast true", &slowTrueCheck, &fastTrueCheck, true, slow, nil},
		{"slow true, slow true", &slowTrueCheck, &slowTrueCheck, true, slow, nil},
		{"fast false, fast false", &fastFalseCheck, &fastFalseCheck, false, fast, nil},
		{"slow false, slow false", &slowFalseCheck, &slowFalseCheck, false, slow, nil},
		{"slow false, fast false", &slowFalseCheck, &fastFalseCheck, false, fast, nil},
		{"fast false, slow false", &fastFalseCheck, &slowFalseCheck, false, fast, nil},
		{"fast true, fast false", &fastTrueCheck, &fastFalseCheck, false, fast, nil},
		{"fast true, slow false", &fastTrueCheck, &slowFalseCheck, false, slow, nil},
		{"slow true, fast false", &slowTrueCheck, &fastFalseCheck, false, fast, nil},
		{"slow true, slow false", &slowTrueCheck, &slowFalseCheck, false, slow, nil},

		// Error handling
		// For (error, true) - expect an error returned with the maximum execution time of both operations.
		// For (error, false) - expect false returned with timing of false operation.
		{"slow true, fast error", &slowTrueCheck, &fastErrorCheck, false, slow, errFast},
		{"fast true, fast error", &fastTrueCheck, &fastErrorCheck, false, fast, errFast},
		{"slow true, slow error", &slowTrueCheck, &slowErrorCheck, false, slow, errSlow},
		{"fast true, slow error", &fastTrueCheck, &slowErrorCheck, false, slow, errSlow},
		{"fast false, slow error", &fastFalseCheck, &slowErrorCheck, false, fast, nil},
		{"slow false, slow error", &slowFalseCheck, &slowErrorCheck, false, slow, nil},
		{"fast false, fast error", &fastFalseCheck, &fastErrorCheck, false, fast, nil},
		{"slow false, fast error", &slowFalseCheck, &fastErrorCheck, false, slow, nil},
		{"fast error, slow true", &fastErrorCheck, &slowTrueCheck, false, slow, errFast},
		{"fast error, fast true", &fastErrorCheck, &fastTrueCheck, false, fast, errFast},
		{"slow error, slow true", &slowErrorCheck, &slowTrueCheck, false, slow, errSlow},
		{"slow error, fast true", &slowErrorCheck, &fastTrueCheck, false, slow, errSlow},
		{"slow error, fast false", &slowErrorCheck, &fastFalseCheck, false, fast, nil},
		{"slow error, slow false", &slowErrorCheck, &slowFalseCheck, false, slow, nil},
		{"fast error, fast false", &fastErrorCheck, &fastFalseCheck, false, fast, nil},
		{"fast error, slow false", &fastErrorCheck, &slowFalseCheck, false, slow, nil},
		{
			"fast error, slow error",
			&fastErrorCheck,
			&slowErrorCheck,
			false,
			slow,
			fmt.Errorf("%w; %w", errFast, errSlow),
		},
	}

	for _, tc := range testCases {
		t.Run(tc.description, func(t *testing.T) {
			tree := &AndOperation{
				OpType:         LOGICAL,
				LogicalType:    LogicalOperationType(AND),
				LeftOperation:  tc.a,
				RightOperation: tc.b,
			}
			startTime := time.Now() // Get the current time

			callerAddress := common.Address{}

			result, actualErr := evaluator.evaluateOp(ctx, tree, []common.Address{callerAddress})
			elapsedTime := time.Since(startTime)
			if tc.expectedErr != nil {
				require.EqualError(t, actualErr, tc.expectedErr.Error(), "Expected error was not found")
			} else {
				require.Nil(t, actualErr)
			}
			require.Equal(t, result, tc.expected, "Expected result was not found")
			expectedDuration := time.Duration(tc.expectedTime) * time.Millisecond
			if !areDurationsClose(
				elapsedTime,
				expectedDuration,
				timingThreshold,
			) {
				t.Errorf("evaluateAndOperation(%v) took %v; want %v", tc.description, elapsedTime, expectedDuration)
			}
		})
	}
}

func TestOrOperation(t *testing.T) {
	ctx, cancel := test.NewTestContext()
	defer cancel()

	testCases := []struct {
		description  string
		a            Operation
		b            Operation
		expected     bool
		expectedTime int32
		expectedErr  error
	}{
		{"fast true, fast true", &fastTrueCheck, &fastTrueCheck, true, fast, nil},
		{"fast true, slow true", &fastTrueCheck, &slowTrueCheck, true, fast, nil},
		{"slow true, fast true", &slowTrueCheck, &fastTrueCheck, true, fast, nil},
		{"slow true, slow true", &slowTrueCheck, &slowTrueCheck, true, slow, nil},
		{"fast false, fast false", &fastFalseCheck, &fastFalseCheck, false, fast, nil},
		{"slow false, slow false", &slowFalseCheck, &slowFalseCheck, false, slow, nil},
		{"slow false, fast false", &slowFalseCheck, &fastFalseCheck, false, slow, nil},
		{"fast false, slow false", &fastFalseCheck, &slowFalseCheck, false, slow, nil},
		{"fast true, fast false", &fastTrueCheck, &fastFalseCheck, true, fast, nil},
		{"fast true, slow false", &fastTrueCheck, &slowFalseCheck, true, fast, nil},
		{"slow true, fast false", &slowTrueCheck, &fastFalseCheck, true, slow, nil},
		{"slow true, slow false", &slowTrueCheck, &slowFalseCheck, true, slow, nil},

		// Error handling
		// For (true, error) - expect a true result with timing of true operation
		// For (false, error) - expect an error result with the slowest operation time
		{"slow true, fast error", &slowTrueCheck, &fastErrorCheck, true, slow, nil},
		{"fast true, fast error", &fastTrueCheck, &fastErrorCheck, true, fast, nil},
		{"slow true, slow error", &slowTrueCheck, &slowErrorCheck, true, slow, nil},
		{"fast true, slow error", &fastTrueCheck, &slowErrorCheck, true, fast, nil},
		{"fast false, slow error", &fastFalseCheck, &slowErrorCheck, false, slow, errSlow},
		{"slow false, slow error", &slowFalseCheck, &slowErrorCheck, false, slow, errSlow},
		{"fast false, fast error", &fastFalseCheck, &fastErrorCheck, false, fast, errFast},
		{"slow false, fast error", &slowFalseCheck, &fastErrorCheck, false, slow, errFast},
		{"fast error, slow true", &fastErrorCheck, &slowTrueCheck, true, slow, nil},
		{"fast error, fast true", &fastErrorCheck, &fastTrueCheck, true, fast, nil},
		{"slow error, slow true", &slowErrorCheck, &slowTrueCheck, true, slow, nil},
		{"slow error, fast true", &slowErrorCheck, &fastTrueCheck, true, fast, nil},
		{"slow error, fast false", &slowErrorCheck, &fastFalseCheck, false, slow, errSlow},
		{"slow error, slow false", &slowErrorCheck, &slowFalseCheck, false, slow, errSlow},
		{"fast error, fast false", &fastErrorCheck, &fastFalseCheck, false, fast, errFast},
		{"fast error, slow false", &fastErrorCheck, &slowFalseCheck, false, slow, errFast},
		{
			"fast error, slow error",
			&fastErrorCheck,
			&slowErrorCheck,
			false,
			slow,
			fmt.Errorf("%w; %w", errFast, errSlow),
		},
	}

	for _, tc := range testCases {
		t.Run(tc.description, func(t *testing.T) {
			tree := &OrOperation{
				OpType:         LOGICAL,
				LogicalType:    LogicalOperationType(OR),
				LeftOperation:  tc.a,
				RightOperation: tc.b,
			}
			startTime := time.Now() // Get the current time

			callerAddress := common.Address{}

			result, actualErr := evaluator.evaluateOp(ctx, tree, []common.Address{callerAddress})
			elapsedTime := time.Since(startTime)
			if tc.expectedErr != nil {
				require.EqualError(t, actualErr, tc.expectedErr.Error(), "Expected error was not found")
			} else {
				require.Nil(t, actualErr)
			}
			require.Equal(t, result, tc.expected, "Expected result was not found")
			expectedDuration := time.Duration(tc.expectedTime) * time.Millisecond
			if !areDurationsClose(
				elapsedTime,
				expectedDuration,
				timingThreshold,
			) {
				t.Errorf("evaluateOrOperation(%v) took %v; want %v", tc.description, elapsedTime, expectedDuration)
			}
		})
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
	ctx, cancel := test.NewTestContext()
	defer cancel()

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

		result, err := evaluator.evaluateOp(ctx, tc.a, tc.wallets)
		elapsedTime := time.Since(startTime)

		if err != nil {
			t.Errorf("evaluateCheckOperation error (%v) = %v; want %v", tc.a, err, nil)
		}
		if result != tc.expected {
			t.Errorf("evaluateCheckOperation result (%v) = %v; want %v", tc.a, result, tc.expected)
		}
		expectedDuration := time.Duration(tc.expectedTime) * time.Millisecond

		if !areDurationsClose(
			elapsedTime,
			expectedDuration,
			timingThreshold,
		) {
			t.Errorf(
				"evaluateCheckOperation(%v) took %v; want %v",
				fastFalseCheck,
				elapsedTime,
				expectedDuration,
			)
		}
	}
}

// Disable this test case, which is relying on a public rpc endpoint.
func TestCheckOperation_Untimed(t *testing.T) {
	t.Skip("Disabling this test due to dependence on public endpoints")
	testCases := map[string]struct {
		op          Operation
		wallets     []common.Address
		expected    bool
		expectedErr error
	}{
		// Note: these tests call out to base sepolia and ethereum sepolia, so they are not
		// really unit tests. However, we've had deploy failures since anvil does not always
		// behave the same as a real chain, so these tests are here to ensure that the
		// entitlement checks work on base and ethereum mainnets, which is where they will happen
		// in practice.
		"ERC1155 base sepolia token id 0 empty wallets": {
			&erc1155CheckBaseSepolia_TokenId0_700Tokens,
			[]common.Address{},
			false,
			nil,
		},
		"ERC1155 base sepolia token id 0 insufficient balance (single wallet)": {
			&erc1155CheckBaseSepolia_TokenId0_700Tokens,
			[]common.Address{baseSepoliaErc1155Wallet_TokenId0_300Tokens},
			false,
			nil,
		},
		"ERC1155 base sepolia token id 0 (single wallet)": {
			&erc1155CheckBaseSepolia_TokenId0_700Tokens,
			[]common.Address{baseSepoliaErc1155Wallet_TokenId0_700Tokens},
			true,
			nil,
		},
		"ERC1155 base sepolia token id 0 insufficient balance (multiple wallets)": {
			&erc1155CheckBaseSepolia_TokenId0_1001Tokens,
			[]common.Address{baseSepoliaErc1155Wallet_TokenId0_700Tokens, baseSepoliaErc1155Wallet_TokenId0_300Tokens},
			false,
			nil,
		},
		"ERC1155 base sepolia token id 0 (multiple wallets)": {
			&erc1155CheckBaseSepolia_TokenId0_1000Tokens,
			[]common.Address{baseSepoliaErc1155Wallet_TokenId0_700Tokens, baseSepoliaErc1155Wallet_TokenId0_300Tokens},
			true,
			nil,
		},
		"ERC1155 base sepolia token id 1 empty wallets": {
			&erc1155CheckBaseSepolia_TokenId1_100Tokens,
			[]common.Address{},
			false,
			nil,
		},
		"ERC1155 base sepolia token id 1 insufficient balance (single wallet)": {
			&erc1155CheckBaseSepolia_TokenId1_100Tokens,
			[]common.Address{baseSepoliaErc1155Wallet_TokenId1_50Tokens},
			false,
			nil,
		},
		"ERC1155 base sepolia token id 1 (single wallet)": {
			&erc1155CheckBaseSepolia_TokenId1_100Tokens,
			[]common.Address{baseSepoliaErc1155Wallet_TokenId1_100Tokens},
			true,
			nil,
		},
		"ERC1155 base sepolia token id 1 insufficient balance (multiple wallets)": {
			&erc1155CheckBaseSepolia_TokenId1_151Tokens,
			[]common.Address{baseSepoliaErc1155Wallet_TokenId1_100Tokens, baseSepoliaErc1155Wallet_TokenId1_50Tokens},
			false,
			nil,
		},
		"ERC1155 base sepolia token id 1 (multiple wallets)": {
			&erc1155CheckBaseSepolia_TokenId1_150Tokens,
			[]common.Address{baseSepoliaErc1155Wallet_TokenId1_100Tokens, baseSepoliaErc1155Wallet_TokenId1_50Tokens},
			true,
			nil,
		},

		"ERC20 empty wallets": {
			&erc20TrueCheckBaseSepolia,
			[]common.Address{},
			false,
			nil,
		},
		"ERC20 invalid check (no chainId)": {
			&CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(ERC20),
				ContractAddress: examples.EthSepoliaChainlinkContract,
				Params:          encodeThresholdParams(big.NewInt(1)),
			},
			[]common.Address{examples.SepoliaChainlinkWallet},
			false,
			fmt.Errorf("validateCheckOperation: chain ID is nil for operation ERC20"),
		},
		"ERC20 invalid check (invalid threshold: 0)": {
			&CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(ERC20),
				ChainID:         examples.EthSepoliaChainId,
				ContractAddress: examples.EthSepoliaChainlinkContract,
				Params:          encodeThresholdParams(big.NewInt(0)),
			},
			[]common.Address{examples.SepoliaChainlinkWallet},
			false,
			fmt.Errorf("validateCheckOperation: threshold 0 is nonpositive for operation ERC20"),
		},
		"ERC20 invalid check (no contract address)": {
			&CheckOperation{
				OpType:    CHECK,
				CheckType: CheckOperationType(ERC20),
				ChainID:   examples.EthSepoliaChainId,
				Params:    encodeThresholdParams(big.NewInt(1)),
			},
			[]common.Address{examples.SepoliaChainlinkWallet},
			false,
			fmt.Errorf("validateCheckOperation: contract address is nil for operation ERC20"),
		},
		"ERC20 base sepolia": {
			&erc20TrueCheckBaseSepolia,
			[]common.Address{examples.SepoliaChainlinkWallet},
			true,
			nil,
		},
		"ERC20 base sepolia (false)": {
			&erc20FalseCheckBaseSepolia,
			[]common.Address{examples.SepoliaChainlinkWallet},
			false,
			nil,
		},
		"ERC20 eth sepolia": {
			&erc20TrueCheckEthereumSepolia,
			[]common.Address{examples.SepoliaChainlinkWallet},
			true,
			nil,
		},
		"ERC20 eth sepolia (false)": {
			&erc20FalseCheckEthereumSepolia,
			[]common.Address{examples.SepoliaChainlinkWallet},
			false,
			nil,
		},
		"Custom entitlement Contract Address is nil": {
			&CheckOperation{
				OpType:    CHECK,
				CheckType: CheckOperationType(ISENTITLED),
				ChainID:   examples.EthSepoliaChainId,
				Params:    encodeThresholdParams(big.NewInt(1)),
			},
			[]common.Address{examples.SepoliaChainlinkWallet},
			false,
			fmt.Errorf("validateCheckOperation: contract address is nil for operation ISENTITLED"),
		},
		"Custom entitlement check Chain ID is nil": {
			&CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(ISENTITLED),
				ContractAddress: examples.EthSepoliaChainlinkContract,
			},
			[]common.Address{examples.SepoliaChainlinkWallet},
			false,
			fmt.Errorf("validateCheckOperation: chain ID is nil for operation ISENTITLED"),
		},
		"ERC1155 Contract Address is nil": {
			&CheckOperation{
				OpType:    CHECK,
				CheckType: CheckOperationType(ERC1155),
				ChainID:   examples.EthSepoliaChainId,
				Params:    encodeErc1155Params(big.NewInt(1), big.NewInt(1)),
			},
			[]common.Address{examples.SepoliaChainlinkWallet},
			false,
			fmt.Errorf("validateCheckOperation: contract address is nil for operation ERC1155"),
		},
		"ERC1155 Threshold is zero (0)": {
			&CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(ERC1155),
				ChainID:         examples.EthSepoliaChainId,
				ContractAddress: examples.EthSepoliaChainlinkContract,
				Params:          encodeErc1155Params(big.NewInt(0), big.NewInt(1)),
			},
			[]common.Address{examples.SepoliaChainlinkWallet},
			false,
			fmt.Errorf("validateCheckOperation: threshold 0 is nonpositive for operation ERC1155"),
		},
		"ERC1155 Chain ID is nil": {
			&CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(ERC1155),
				ContractAddress: examples.EthSepoliaChainlinkContract,
				Params:          encodeErc1155Params(big.NewInt(1), big.NewInt(1)),
			},
			[]common.Address{examples.SepoliaChainlinkWallet},
			false,
			fmt.Errorf("validateCheckOperation: chain ID is nil for operation ERC1155"),
		},
		"ERC721 empty wallets": {
			&nftCheckEthereumSepolia,
			[]common.Address{},
			false,
			nil,
		},
		"ERC721 invalid check (no chainId)": {
			&CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(ERC721),
				ContractAddress: examples.EthSepoliaTestNftContract,
				Params:          encodeThresholdParams(big.NewInt(1)),
			},
			[]common.Address{sepoliaTestNftWallet_1Token},
			false,
			fmt.Errorf("validateCheckOperation: chain ID is nil for operation ERC721"),
		},
		"ERC721 invalid check (invalid threshold: 0)": {
			&CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(ERC721),
				ChainID:         examples.EthSepoliaChainId,
				ContractAddress: examples.EthSepoliaTestNftContract,
				Params:          encodeThresholdParams(big.NewInt(0)),
			},
			[]common.Address{sepoliaTestNftWallet_1Token},
			false,
			fmt.Errorf("validateCheckOperation: threshold 0 is nonpositive for operation ERC721"),
		},
		"ERC721 invalid check (no contract address)": {
			&CheckOperation{
				OpType:    CHECK,
				CheckType: CheckOperationType(ERC721),
				ChainID:   examples.EthSepoliaChainId,
				Params:    encodeThresholdParams(big.NewInt(1)),
			},
			[]common.Address{sepoliaTestNftWallet_1Token},
			false,
			fmt.Errorf("validateCheckOperation: contract address is nil for operation ERC721"),
		},
		"ERC721 eth sepolia": {
			&nftCheckEthereumSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token},
			true,
			nil,
		},
		"ERC721 eth sepolia (no tokens)": {
			&nftCheckEthereumSepolia,
			[]common.Address{sepoliaTestNoNftsWallet},
			false,
			nil,
		},
		"ERC721 eth sepolia (insufficient balance)": {
			&nftMultiCheckEthereumSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token},
			false,
			nil,
		},
		"ERC721 multi-wallet eth sepolia": {
			&nftMultiCheckEthereumSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token, sepoliaTestNftWallet_2Tokens, sepoliaTestNftWallet_3Tokens},
			true,
			nil,
		},
		"ERC721 multi-wallet eth sepolia (insufficient balance)": {
			&nftMultiCheckHighThresholdEthereumSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token, sepoliaTestNftWallet_2Tokens, sepoliaTestNftWallet_3Tokens},
			false,
			nil,
		},
		"ERC721 base sepolia": {
			&nftCheckBaseSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token},
			true,
			nil,
		},
		"ERC721 base sepolia (no tokens)": {
			&nftCheckBaseSepolia,
			[]common.Address{sepoliaTestNoNftsWallet},
			false,
			nil,
		},
		"ERC721 base sepolia (insufficient balance)": {
			&nftMultiCheckBaseSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token},
			false,
			nil,
		},
		"ERC721 multi-wallet base sepolia": {
			&nftMultiCheckEthereumSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token, sepoliaTestNftWallet_2Tokens, sepoliaTestNftWallet_3Tokens},
			true,
			nil,
		},
		"ERC721 multi-wallet base sepolia (insufficient balance)": {
			&nftMultiCheckHighThresholdBaseSepolia,
			[]common.Address{sepoliaTestNftWallet_1Token, sepoliaTestNftWallet_2Tokens, sepoliaTestNftWallet_3Tokens},
			false,
			nil,
		},
		"ETH balance empty wallets": {
			&ethBalance0_5,
			[]common.Address{},
			false,
			nil,
		},
		"ETH balance invalid check (invalid threshold: 0)": {
			&CheckOperation{
				OpType:          CHECK,
				CheckType:       CheckOperationType(ETH_BALANCE),
				ChainID:         examples.EthSepoliaChainId,
				Params:          encodeThresholdParams(big.NewInt(0)),
				ContractAddress: common.Address{},
			},
			[]common.Address{},
			false,
			fmt.Errorf("validateCheckOperation: threshold 0 is nonpositive for operation ETH_BALANCE"),
		},
		"ETH balance across chains": {
			&ethBalance0_5,
			[]common.Address{examples.EthWallet_0_5Eth},
			true,
			nil,
		},
		"Insufficient ETH balance": {
			&ethBalance0_5,
			[]common.Address{examples.EthWallet_0_2Eth},
			false,
			nil,
		},
		"ETH balance across chains, multiwallet": {
			&ethBalance0_7,
			[]common.Address{examples.EthWallet_0_5Eth, examples.EthWallet_0_2Eth},
			true,
			nil,
		},
		"ETH balance across chains, multiwallet, insufficient balance": {
			&ethBalance_gt_0_7,
			[]common.Address{examples.EthWallet_0_5Eth, examples.EthWallet_0_2Eth},
			false,
			nil,
		},
	}

	for name, tc := range testCases {
		t.Run(name, func(t *testing.T) {
			result, err := evaluator.evaluateOp(context.Background(), tc.op, tc.wallets)
			if tc.expectedErr == nil {
				require.NoError(t, err)
			} else {
				require.EqualError(t, err, tc.expectedErr.Error())
			}
			if result != tc.expected {
				t.Errorf("evaluateCheckOperation result (%v) = %v; want %v", tc.op, result, tc.expected)
			}
		})
	}
}

var singleEtherChainBlockChainInfo = map[uint64]config.BlockchainInfo{
	examples.EthSepoliaChainId.Uint64(): {
		ChainId:      examples.EthSepoliaChainId.Uint64(),
		Name:         "Ethereum Seplia",
		Blocktime:    12000,
		IsEtherBased: true,
	},
	examples.BaseSepoliaChainId.Uint64(): {
		ChainId:      examples.BaseSepoliaChainId.Uint64(),
		Name:         "Base Sepolia",
		Blocktime:    2000,
		IsEtherBased: false, // for the sake of testing
	},
}

// Disable this test case, which is relying on a public rpc endpoint.
func Test_evaluateEthBalance_withConfig(t *testing.T) {
	t.Skip("Disabling this test due to dependence on public endpoints")
	tests := map[string]struct {
		op          Operation
		wallets     []common.Address
		expected    bool
		expectedErr error
	}{
		"Ether chains < supported chains (positive result)": {
			op: &ethBalance0_4,
			wallets: []common.Address{
				examples.EthWallet_0_5Eth,
			},
			expected: true,
		},
		"Ether chains < supported chains (negative result)": {
			op: &ethBalance0_5,
			wallets: []common.Address{
				examples.EthWallet_0_5Eth,
			},
			expected: false, // This entitlement evaluation would pass if the balance of the wallet on both networks was considered
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			require := require.New(t)
			customEvaluator, err := NewEvaluatorFromConfigWithBlockchainInfo(
				context.Background(),
				cfg,
				allSepoliaChains_onChainConfig,
				singleEtherChainBlockChainInfo,
				infra.NewMetricsFactory(nil, "", ""),
			)
			require.NoError(err)

			result, err := customEvaluator.evaluateOp(context.Background(), tc.op, tc.wallets)
			if tc.expectedErr == nil {
				require.NoError(err)
			} else {
				require.EqualError(err, tc.expectedErr.Error())
			}
			if result != tc.expected {
				t.Errorf("evaluateCheckOperation result (%v) = %v; want %v", tc.op, result, tc.expected)
			}
		})
	}
}
