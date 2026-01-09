package crypto

import (
	"crypto/rand"
	"math"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/mitchellh/mapstructure"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/logging"
)

var addresses = []common.Address{
	common.BytesToAddress(
		[]byte{
			0x12,
			0x34,
			0x56,
			0x78,
			0x90,
			0x12,
			0x34,
			0x56,
			0x78,
			0x90,
			0x12,
			0x34,
			0x56,
			0x78,
			0x90,
			0x12,
			0x34,
			0x56,
			0x78,
			0x90,
		},
	),
	common.BytesToAddress(
		[]byte{
			0x00,
			0x00,
			0x00,
			0x00,
			0x43,
			0x43,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x00,
			0x04,
			0x34,
			0x30,
			0x00,
		},
	),
	common.BytesToAddress(
		[]byte{
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
			0xff,
		},
	),
}

func TestOnChainConfigSettingMultipleActiveBlockValues(t *testing.T) {
	require := require.New(t)
	assert := assert.New(t)
	ctx := test.NewTestContext(t)

	settings, err := makeOnChainConfig(ctx, nil, nil, 1)
	require.NoError(err)

	keyId := HashSettingName(StreamReplicationFactorConfigKey)
	settings.applyEvent(ctx, &river.RiverConfigV1ConfigurationChanged{
		Key:   keyId,
		Block: 20,
		Value: ABIEncodeUint64(3),
	})
	settings.applyEvent(ctx, &river.RiverConfigV1ConfigurationChanged{
		Key:   keyId,
		Block: 5,
		Value: ABIEncodeUint64(2),
	})
	settings.applyEvent(ctx, &river.RiverConfigV1ConfigurationChanged{
		Key:   keyId,
		Block: 10,
		Value: ABIEncodeUint64(5),
	})
	settings.applyEvent(ctx, &river.RiverConfigV1ConfigurationChanged{
		Key:   keyId,
		Block: 30,
		Value: ABIEncodeUint64(100),
	})

	for _, tt := range []struct {
		block blockchain.BlockNumber
		value uint64
	}{
		{0, 1},
		{4, 1},
		{5, 2},
		{9, 2},
		{10, 5},
		{19, 5},
		{20, 3},
		{29, 3},
		{30, 100},
		{1000, 100},
	} {
		cfg := settings.GetOnBlock(tt.block)
		assert.Equal(tt.value, cfg.ReplicationFactor, "unexpected value at block %d", tt.block)
	}

	settings.applyEvent(ctx, &river.RiverConfigV1ConfigurationChanged{
		Key:     keyId,
		Block:   20,
		Deleted: true,
	})

	for _, tt := range []struct {
		block blockchain.BlockNumber
		value uint64
	}{
		{0, 1},
		{4, 1},
		{5, 2},
		{9, 2},
		{10, 5},
		{19, 5},
		{20, 5},
		{29, 5},
		{30, 100},
		{1000, 100},
	} {
		cfg := settings.GetOnBlock(tt.block)
		assert.Equal(tt.value, cfg.ReplicationFactor, "unexpected value at block %d", tt.block)
	}

	settings.applyEvent(ctx, &river.RiverConfigV1ConfigurationChanged{
		Key:     keyId,
		Block:   math.MaxUint64,
		Deleted: true,
	})

	for _, tt := range []struct {
		block blockchain.BlockNumber
		value uint64
	}{
		{0, 1},
		{4, 1},
		{5, 1},
		{9, 1},
		{10, 1},
		{19, 1},
		{20, 1},
		{29, 1},
		{30, 1},
		{1000, 1},
	} {
		cfg := settings.GetOnBlock(tt.block)
		assert.Equal(tt.value, cfg.ReplicationFactor, "unexpected value at block %d", tt.block)
	}
}

func TestSetOnChain(t *testing.T) {
	require := require.New(t)
	assert := assert.New(t)
	ctx := test.NewTestContext(t)

	btc, err := NewBlockchainTestContext(ctx, TestParams{MineOnTx: true, AutoMine: true})
	require.NoError(err)
	defer btc.Close()

	btc.SetConfigValue(t, ctx, StreamReplicationFactorConfigKey, ABIEncodeUint64(3))
	btc.SetConfigValue(t, ctx, StreamMediaMaxChunkCountConfigKey, ABIEncodeUint64(1000))
	btc.SetConfigValue(t, ctx, StreamCacheExpirationMsConfigKey, ABIEncodeUint64(3000))
	btc.SetConfigValue(t, ctx, StreamRecencyConstraintsAgeSecConfigKey, ABIEncodeUint64(5))
	btc.SetConfigValue(t, ctx, "unknown key is fine", ABIEncodeUint64(5))
	btc.SetConfigValue(t, ctx, MediaStreamMembershipLimitsDMConfigKey, ABIEncodeUint64(5))
	btc.SetConfigValue(t, ctx, XChainBlockchainsConfigKey, ABIEncodeUint64Array([]uint64{1, 10, 100}))
	btc.SetConfigValue(t, ctx, NodeBlocklistConfigKey, ABIEncodeAddressArray(addresses))
	btc.SetConfigValue(t, ctx, StreamSnapshotIntervalInMiniblocksConfigKey, ABIEncodeUint64(1000))
	btc.SetConfigValue(t, ctx, StreamTrimActivationFactorConfigKey, ABIEncodeUint64(10))
	btc.SetConfigValue(t, ctx, ServerEnableNode2NodeAuthConfigKey, ABIEncodeUint64(1))

	s := btc.OnChainConfig.Get()
	assert.EqualValues(3, s.ReplicationFactor)
	assert.EqualValues(1000, s.MediaMaxChunkCount)
	assert.Equal(3*time.Second, s.StreamCacheExpiration)
	assert.Equal(5*time.Second, s.RecencyConstraintsAge)
	assert.EqualValues(5, s.MembershipLimits.DM)
	assert.EqualValues([]uint64{1, 10, 100}, s.XChain.Blockchains)
	assert.Equal(addresses, s.NodeBlocklist)
	assert.Equal(uint64(1000), s.StreamSnapshotIntervalInMiniblocks)
	assert.Equal(uint64(10), s.StreamTrimActivationFactor)
	assert.Equal(uint64(1), s.ServerEnableNode2NodeAuth)

	btc.SetConfigValue(t, ctx, StreamReplicationFactorConfigKey, []byte("invalid value is ignored"))
	assert.EqualValues(3, btc.OnChainConfig.Get().ReplicationFactor)
}

func TestDefaultAvailable(t *testing.T) {
	require := require.New(t)
	assert := assert.New(t)
	ctx := test.NewTestContext(t)

	btc, err := NewBlockchainTestContext(ctx, TestParams{MineOnTx: true, AutoMine: true})
	require.NoError(err)
	defer btc.Close()

	s := btc.OnChainConfig.Get()
	assert.EqualValues(1, s.ReplicationFactor)
	assert.EqualValues(21, s.MediaMaxChunkCount)
	assert.Equal(5*time.Minute, s.StreamCacheExpiration)
	assert.Equal(11*time.Second, s.RecencyConstraintsAge)
}

func TestConfigSwitchAfterNewBlock(t *testing.T) {
	var (
		ctx       = test.NewTestContext(t)
		require   = require.New(t)
		tc, errTC = NewBlockchainTestContext(ctx, TestParams{NumKeys: 1, MineOnTx: true, AutoMine: true})

		currentBlockNum = tc.BlockNum(ctx)
		activeBlockNum  = currentBlockNum + 5
		newValue        = uint64(3939232)
		newValueEncoded = ABIEncodeUint64(newValue)
	)

	require.NoError(errTC, "unable to construct block test context")

	require.EqualValues(1, tc.OnChainConfig.Get().ReplicationFactor, "invalid default config")

	// change config on the future block 'activeBlockNum'
	pendingTx, err := tc.DeployerBlockchain.TxPool.Submit(
		ctx,
		"SetConfiguration",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.Configuration.SetConfiguration(
				opts,
				HashSettingName(StreamReplicationFactorConfigKey),
				activeBlockNum.AsUint64(),
				newValueEncoded,
			)
		})

	require.NoError(err, "unable to set configuration")
	tc.Commit(ctx)
	receipt, err := pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(TransactionResultSuccess, receipt.Status, "tx failed")

	// make sure new change is not yet active, should happen on a future block
	require.EqualValues(1, tc.OnChainConfig.Get().ReplicationFactor, "invalid default config")

	// make sure new change becomes active when the chain reached activeBlockNum
	for {
		tc.Commit(ctx)
		if tc.OnChainConfig.ActiveBlock() >= activeBlockNum {
			require.Equal(newValue, tc.OnChainConfig.Get().ReplicationFactor, "invalid config")
			return
		}
	}
}

func TestConfigDefaultValue(t *testing.T) {
	var (
		ctx       = test.NewTestContext(t)
		require   = require.New(t)
		tc, errTC = NewBlockchainTestContext(ctx, TestParams{NumKeys: 1})
		newIntVal = int64(239398893)
		newValue  = ABIEncodeInt64(newIntVal)
	)

	require.NoError(errTC, "unable to construct block test context")

	require.EqualValues(1, tc.OnChainConfig.Get().ReplicationFactor)

	// set custom value to ensure that config falls back to default value when deleted
	pendingTx, err := tc.DeployerBlockchain.TxPool.Submit(
		ctx,
		"SetConfiguration",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.Configuration.SetConfiguration(
				opts,
				HashSettingName(StreamReplicationFactorConfigKey),
				0,
				newValue,
			)
		})

	require.NoError(err, "unable to set configuration")
	tc.Commit(ctx)
	receipt, err := pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(TransactionResultSuccess, receipt.Status, "tx failed")

	// make sure the chain config moved after the block the key was updated
	for {
		tc.Commit(ctx)
		if tc.OnChainConfig.ActiveBlock().AsUint64() > receipt.BlockNumber.Uint64() {
			break
		}
		time.Sleep(25 * time.Millisecond)
	}

	require.EqualValues(newIntVal, tc.OnChainConfig.Get().ReplicationFactor)

	// drop configuration and check that the chain config falls back to the default value
	pendingTx, err = tc.DeployerBlockchain.TxPool.Submit(
		ctx,
		"SetConfiguration",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.Configuration.DeleteConfiguration(opts, HashSettingName(StreamReplicationFactorConfigKey))
		})

	require.NoError(err, "unable to set configuration")
	tc.Commit(ctx)
	receipt, err = pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(TransactionResultSuccess, receipt.Status, "tx failed")

	// make sure the chain config moved after the block the key was deleted
	for {
		tc.Commit(ctx)
		if tc.OnChainConfig.ActiveBlock().AsUint64() > receipt.BlockNumber.Uint64() {
			break
		}
		time.Sleep(25 * time.Millisecond)
	}

	// ensure that the default value is returned
	require.EqualValues(1, tc.OnChainConfig.Get().ReplicationFactor)
}

type Cfg struct {
	C1 int64            `mapstructure:"foo.c1"`
	C2 uint64           `mapstructure:"foo.c2"`
	C3 time.Duration    `mapstructure:"foo.c3Ms"`
	C4 time.Duration    `mapstructure:"foo.c4Seconds"`
	C5 CfgInner         `mapstructure:",squash"`
	C6 []uint64         `mapstructure:"foo.c6"`
	C7 common.Address   `mapstructure:"foo.c7"`
	C8 []common.Address `mapstructure:"foo.c8"`
}

type CfgInner struct {
	F1 string   `mapstructure:"foo.f1"`
	F2 int      `mapstructure:"foo.f2"`
	F3 []uint64 `mapstructure:"foo.f3List"`
	F4 []uint64 `mapstructure:"foo.f4"`
}

// Disable color output for console testing.
func noColorLogger() *zap.SugaredLogger {
	logger, _ := zap.NewDevelopment()
	return logger.Sugar()
}

func TestDecoder(t *testing.T) {
	require := require.New(t)
	ctx := test.NewTestContext(t)
	ncl := noColorLogger()
	ctx = logging.CtxWithLog(ctx, &logging.Log{
		Default:   ncl.Named(string(logging.Default)),
		Rpc:       ncl.Named(string(logging.Rpc)),
		Miniblock: ncl.Named(string(logging.Miniblock)),
	})

	configMap := make(map[string]interface{})
	configMap["foo.c1"] = ABIEncodeInt64(1)
	configMap["foo.c2"] = ABIEncodeUint64(2)
	configMap["foo.c3Ms"] = ABIEncodeUint64(3000)
	configMap["foo.c4Seconds"] = ABIEncodeUint64(5)
	configMap["foo.f1"] = ABIEncodeString("hello")
	configMap["foo.f2"] = ABIEncodeInt64(42)
	configMap["foo.c6"] = ABIEncodeUint64Array([]uint64{100, 200, 300, 400})
	configMap["foo.f3List"] = ABIEncodeUint64Array([]uint64{1, 2, 3})
	configMap["foo.f4"] = ABIEncodeUint64Array([]uint64{})
	configMap["foo.c7"] = ABIEncodeAddress(addresses[0])
	configMap["foo.c8"] = ABIEncodeAddressArray(addresses)

	var decodedCfg Cfg
	decoder, err := mapstructure.NewDecoder(&mapstructure.DecoderConfig{
		DecodeHook: abiBytesToTypeDecoder(ctx),
		Result:     &decodedCfg,
	})
	require.NoError(err)

	err = decoder.Decode(configMap)
	require.NoError(err)

	require.Equal(int64(1), decodedCfg.C1)
	require.Equal(uint64(2), decodedCfg.C2)
	require.Equal(time.Duration(3000)*time.Millisecond, decodedCfg.C3)
	require.Equal(time.Duration(5)*time.Second, decodedCfg.C4)
	require.Equal("hello", decodedCfg.C5.F1)
	require.Equal(42, decodedCfg.C5.F2)
	require.Equal([]uint64{100, 200, 300, 400}, decodedCfg.C6)
	require.Equal([]uint64{1, 2, 3}, decodedCfg.C5.F3)
	require.Equal([]uint64{}, decodedCfg.C5.F4)
	require.Equal(addresses[0], decodedCfg.C7)
	require.Equal(addresses, decodedCfg.C8)
}

func TestAddressEncoding(t *testing.T) {
	require := require.New(t)

	var (
		address  common.Address
		address2 common.Address
	)
	_, _ = rand.Read(address[:])
	_, _ = rand.Read(address2[:])

	encoded := ABIEncodeAddress(address)
	decoded, err := ABIDecodeAddress(encoded)
	require.NoError(err)
	require.Equal(address, decoded)

	encodedArray := ABIEncodeAddressArray([]common.Address{address, address2})
	decodedArray, err := ABIDecodeAddressArray(encodedArray)
	require.NoError(err)
	require.Equal(address, decodedArray[0])
	require.Equal(address2, decodedArray[1])
}

func TestStreamIdMiniblockEncoding(t *testing.T) {
	require := require.New(t)

	// Create test data
	streamId1 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(shared.STREAM_DM_CHANNEL_BIN)

	items := []StreamIdMiniblock{
		{StreamId: streamId1, MiniblockNum: 100},
		{StreamId: streamId2, MiniblockNum: 999999},
	}

	// Test encoding and decoding
	encoded := ABIEncodeStreamIdMiniblockArray(items)
	require.NotEmpty(encoded)

	decoded, err := ABIDecodeStreamIdMiniblockArray(encoded)
	require.NoError(err)
	require.Len(decoded, 2)
	require.EqualValues(streamId1, decoded[0].StreamId)
	require.EqualValues(100, decoded[0].MiniblockNum)
	require.EqualValues(streamId2, decoded[1].StreamId)
	require.EqualValues(999999, decoded[1].MiniblockNum)

	// Test empty array
	emptyEncoded := ABIEncodeStreamIdMiniblockArray([]StreamIdMiniblock{})
	emptyDecoded, err := ABIDecodeStreamIdMiniblockArray(emptyEncoded)
	require.NoError(err)
	require.Len(emptyDecoded, 0)
}

func TestStreamTrimByStreamIdConfig(t *testing.T) {
	require := require.New(t)
	assert := assert.New(t)
	ctx := test.NewTestContext(t)

	btc, err := NewBlockchainTestContext(ctx, TestParams{MineOnTx: true, AutoMine: true})
	require.NoError(err)
	defer btc.Close()

	// Default should be empty
	s := btc.OnChainConfig.Get()
	assert.Len(s.StreamTrimByStreamId, 0)

	// Set config with stream trim targets
	streamId1 := testutils.FakeStreamId(shared.STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(shared.STREAM_DM_CHANNEL_BIN)

	items := []StreamIdMiniblock{
		{StreamId: streamId1, MiniblockNum: 500},
		{StreamId: streamId2, MiniblockNum: 1000},
	}

	btc.SetConfigValue(t, ctx, StreamTrimByStreamIdConfigKey, ABIEncodeStreamIdMiniblockArray(items))

	s = btc.OnChainConfig.Get()
	require.Len(s.StreamTrimByStreamId, 2)
	assert.EqualValues(streamId1, s.StreamTrimByStreamId[0].StreamId)
	assert.EqualValues(500, s.StreamTrimByStreamId[0].MiniblockNum)
	assert.EqualValues(streamId2, s.StreamTrimByStreamId[1].StreamId)
	assert.EqualValues(1000, s.StreamTrimByStreamId[1].MiniblockNum)
}
