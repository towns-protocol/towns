package crypto

import (
	"context"
	"fmt"
	"math"
	"math/big"
	"reflect"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/mitchellh/mapstructure"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

const (
	// StreamMediaMaxChunkCountConfigKey defines the maximum number chunks of data a media stream can contain.
	StreamMediaMaxChunkCountConfigKey = "stream.media.maxChunkCount"
	// StreamMediaMaxChunkSizeConfigKey defines the maximum size of a data chunk that is allowed to be added to a media
	// stream in a single event.
	StreamMediaMaxChunkSizeConfigKey             = "stream.media.maxChunkSize"
	StreamRecencyConstraintsAgeSecConfigKey      = "stream.recencyConstraints.ageSeconds"
	StreamRecencyConstraintsGenerationsConfigKey = "stream.recencyConstraints.generations"
	// StreamReplicationFactorConfigKey is the key for how often a stream is replicated over nodes
	StreamReplicationFactorConfigKey                = "stream.replicationFactor"
	StreamDefaultMinEventsPerSnapshotConfigKey      = "stream.defaultMinEventsPerSnapshot"
	StreamMinEventsPerSnapshotUserInboxConfigKey    = "stream.minEventsPerSnapshot.a1"
	StreamMinEventsPerSnapshotUserSettingsConfigKey = "stream.minEventsPerSnapshot.a5"
	StreamMinEventsPerSnapshotUserConfigKey         = "stream.minEventsPerSnapshot.a8"
	StreamMinEventsPerSnapshotUserDeviceConfigKey   = "stream.minEventsPerSnapshot.ad"
	StreamCacheExpirationMsConfigKey                = "stream.cacheExpirationMs"
	StreamCacheExpirationPollIntervalMsConfigKey    = "stream.cacheExpirationPollIntervalMs"
	StreamGetMiniblocksMaxPageSizeConfigKey         = "stream.getMiniblocksMaxPageSize"
	MediaStreamMembershipLimitsGDMConfigKey         = "media.streamMembershipLimits.77"
	MediaStreamMembershipLimitsDMConfigKey          = "media.streamMembershipLimits.88"
	XChainBlockchainsConfigKey                      = "xchain.blockchains"
	StreamMiniblockRegistrationFrequencyKey         = "stream.miniblockRegistrationFrequency"
	StreamEphemeralStreamTTLMsKey                   = "stream.ephemeralStreamTTLMs"
	NodeBlocklistConfigKey                          = "node.blocklist"
	StreamSnapshotIntervalInMiniblocksConfigKey     = "stream.snapshotIntervalInMiniblocks"
	// StreamDefaultStreamTrimmingMiniblocksToKeepConfigKey is the key for how many miniblocks to keep before the last
	// snapshot for streams.
	StreamDefaultStreamTrimmingMiniblocksToKeepConfigKey     = "stream.defaultStreamTrimmingMiniblocksToKeep"
	StreamSpaceStreamTrimmingMiniblocksToKeepConfigKey       = "stream.streamTrimmingMiniblocksToKeep.10"
	StreamUserSettingStreamTrimmingMiniblocksToKeepConfigKey = "stream.streamTrimmingMiniblocksToKeep.a5"
	StreamEnableNewSnapshotFormatConfigKey                   = "stream.enableNewSnapshotFormat"
	ServerEnableNode2NodeAuthConfigKey                       = "server.enablenode2nodeauth"
	// StreamBackwardsReconciliationThresholdConfigKey is the threshold in miniblocks that determines
	// whether to use backwards or forward reconciliation. If a stream is behind by more than this
	// number of miniblocks, backwards reconciliation is used; otherwise forward reconciliation is used.
	StreamBackwardsReconciliationThresholdConfigKey = "stream.backwardsReconciliationThreshold"

	// StreamDistributionExtraCandidatesCountCountKey is the key for many extra nodes on top of
	// replication factor must be picked as candidates to place a stream on. From these candidates
	// the best replication factor nodes are picked.
	StreamDistributionExtraCandidatesCountCountKey = "stream.distribution.extracandidatescount"
)

var (
	knownOnChainSettingKeys map[string]string
	onceInitKeys            sync.Once
)

// AllKnownOnChainSettingKeys returns a map of all known on-chain setting keys and their Ethereum ABI types.
func AllKnownOnChainSettingKeys() map[string]string {
	onceInitKeys.Do(func() {
		result := map[string]any{}
		err := mapstructure.Decode(OnChainSettings{}, &result)
		if err != nil {
			panic(err)
		}
		knownOnChainSettingKeys = map[string]string{}
		for k, v := range result {
			if strings.HasSuffix(k, "Ms") || strings.HasSuffix(k, "Seconds") {
				knownOnChainSettingKeys[k] = "int64"
				continue
			}
			t := reflect.TypeOf(v).String()
			array := false
			if strings.HasPrefix(t, "[]") {
				t = t[2:]
				array = true
			}
			if t == "common.Address" {
				t = "address"
			}
			if array {
				t = t + "[]"
			}
			knownOnChainSettingKeys[k] = t
		}
	})
	return knownOnChainSettingKeys
}

// OnChainSettings holds the configuration settings that are stored on-chain.
// This data structure is immutable, so it is safe to access it concurrently.
type OnChainSettings struct {
	FromBlockNumber BlockNumber `mapstructure:"-"`

	MediaMaxChunkCount uint64 `mapstructure:"stream.media.maxChunkCount"`
	MediaMaxChunkSize  uint64 `mapstructure:"stream.media.maxChunkSize"`

	RecencyConstraintsAge time.Duration `mapstructure:"stream.recencyConstraints.ageSeconds"`
	RecencyConstraintsGen uint64        `mapstructure:"stream.recencyConstraints.generations"`

	ReplicationFactor uint64 `mapstructure:"stream.replicationFactor"`

	MinSnapshotEvents MinSnapshotEventsSettings `mapstructure:",squash"`
	// StreamEnableNewSnapshotFormat indicates whether the new snapshot format is enabled.
	// 0 means the old snapshot format is used, 1 means the new snapshot format is used.
	StreamEnableNewSnapshotFormat uint64 `mapstructure:"stream.enableNewSnapshotFormat"`

	// StreamMiniblockRegistrationFrequency indicates how often miniblocks are registered.
	// E.g. StreamMiniblockRegistrationFrequency=5 means that only 1 out of 5 miniblocks for a stream are registered.
	StreamMiniblockRegistrationFrequency uint64 `mapstructure:"stream.miniblockRegistrationFrequency"`

	StreamCacheExpiration    time.Duration `mapstructure:"stream.cacheExpirationMs"`
	StreamCachePollIntterval time.Duration `mapstructure:"stream.cacheExpirationPollIntervalMs"`

	StreamEphemeralStreamTTL time.Duration `mapstructure:"stream.ephemeralStreamTTLMs"`

	GetMiniblocksMaxPageSize uint64 `mapstructure:"stream.getMiniblocksMaxPageSize"`

	MembershipLimits MembershipLimitsSettings `mapstructure:",squash"`

	XChain XChainSettings `mapstructure:",squash"`

	NodeBlocklist []common.Address `mapstructure:"node.blocklist"`

	// StreamSnapshotIntervalInMiniblocks is the interval in miniblocks between snapshots.
	StreamSnapshotIntervalInMiniblocks uint64 `mapstructure:"stream.snapshotIntervalInMiniblocks"`

	// StreamTrimmingMiniblocksToKeep is the number of miniblocks to keep before the last snapshot.
	// Defined with the default value and per stream type.
	StreamTrimmingMiniblocksToKeep StreamTrimmingMiniblocksToKeepSettings `mapstructure:",squash"`

	// StreamDistribution holds settings for the stream distribution algorithm.
	StreamDistribution StreamDistribution `mapstructure:",squash"`

	// ServerEnableNode2NodeAuth indicates whether node-to-node authentication is enabled.
	// Options: 1 means enabled, 0 means disabled.
	ServerEnableNode2NodeAuth uint64 `mapstructure:"server.enablenode2nodeauth"`

	// StreamBackwardsReconciliationThreshold is the threshold in miniblocks that determines
	// whether to use backwards or forward reconciliation. If a stream is behind by more than this
	// number of miniblocks, backwards reconciliation is used; otherwise forward reconciliation is used.
	StreamBackwardsReconciliationThreshold uint64 `mapstructure:"stream.backwardsReconciliationThreshold"`
}

type XChainSettings struct {
	Blockchains []uint64 `mapstructure:"xchain.blockchains"`
}

type MinSnapshotEventsSettings struct {
	Default      uint64 `mapstructure:"stream.defaultMinEventsPerSnapshot"`
	UserInbox    uint64 `mapstructure:"stream.minEventsPerSnapshot.a1"`
	UserSettings uint64 `mapstructure:"stream.minEventsPerSnapshot.a5"`
	User         uint64 `mapstructure:"stream.minEventsPerSnapshot.a8"`
	UserDevice   uint64 `mapstructure:"stream.minEventsPerSnapshot.ad"`
}

func (m MinSnapshotEventsSettings) ForType(streamType byte) uint64 {
	switch streamType {
	case shared.STREAM_USER_INBOX_BIN:
		return m.UserInbox
	case shared.STREAM_USER_SETTINGS_BIN:
		return m.UserSettings
	case shared.STREAM_USER_BIN:
		return m.User
	case shared.STREAM_USER_METADATA_KEY_BIN:
		return m.UserDevice
	default:
		return m.Default
	}
}

type MembershipLimitsSettings struct {
	GDM uint64 `mapstructure:"media.streamMembershipLimits.77"`
	DM  uint64 `mapstructure:"media.streamMembershipLimits.88"`
}

func (m MembershipLimitsSettings) ForType(streamType byte) uint64 {
	switch streamType {
	case shared.STREAM_GDM_CHANNEL_BIN:
		return m.GDM
	case shared.STREAM_DM_CHANNEL_BIN:
		return m.DM
	default:
		return 0
	}
}

type StreamTrimmingMiniblocksToKeepSettings struct {
	Default     uint64 `mapstructure:"stream.defaultStreamTrimmingMiniblocksToKeep"`
	Space       uint64 `mapstructure:"stream.streamTrimmingMiniblocksToKeep.10"`
	UserSetting uint64 `mapstructure:"stream.streamTrimmingMiniblocksToKeep.a5"`
}

func (m StreamTrimmingMiniblocksToKeepSettings) ForType(streamType byte) uint64 {
	switch streamType {
	case shared.STREAM_SPACE_BIN:
		return m.Space
	case shared.STREAM_USER_SETTINGS_BIN:
		return m.UserSetting
	default:
		return m.Default
	}
}

// StreamDistribution holds settings for the stream distribution algorithm.
type StreamDistribution struct {
	// ExtraCandidatesCount is the number of extra candidate nodes to select when determining the
	// nodes to place a stream on. From these candidates the best replication factor nodes are picked.
	ExtraCandidatesCount uint64 `mapstructure:"stream.distribution.extracandidatescount"`
}

func DefaultOnChainSettings() *OnChainSettings {
	return &OnChainSettings{
		MediaMaxChunkCount: 21,
		MediaMaxChunkSize:  1200000,

		RecencyConstraintsAge: 11 * time.Second,
		RecencyConstraintsGen: 5,

		ReplicationFactor: 1,

		MinSnapshotEvents: MinSnapshotEventsSettings{
			Default:      100,
			UserInbox:    10,
			UserSettings: 10,
			User:         10,
			UserDevice:   10,
		},
		StreamEnableNewSnapshotFormat: 0,

		// 0 means space stream trimming is disabled
		StreamTrimmingMiniblocksToKeep: StreamTrimmingMiniblocksToKeepSettings{
			Default:     0,
			Space:       0,
			UserSetting: 0,
		},

		StreamCacheExpiration:    5 * time.Minute,
		StreamCachePollIntterval: 30 * time.Second,

		StreamEphemeralStreamTTL:           time.Minute * 10,
		StreamSnapshotIntervalInMiniblocks: 0, // 0 means snapshots trimming is disabled

		// TODO: Set it to the default value when the client side is updated.
		GetMiniblocksMaxPageSize: 0,

		StreamMiniblockRegistrationFrequency: 1,

		MembershipLimits: MembershipLimitsSettings{
			GDM: 48,
			DM:  2,
		},
		XChain: XChainSettings{
			Blockchains: []uint64{},
		},

		ServerEnableNode2NodeAuth: 0,

		StreamBackwardsReconciliationThreshold: 50,
	}
}

type OnChainConfiguration interface {
	ActiveBlock() BlockNumber

	Get() *OnChainSettings
	GetOnBlock(block BlockNumber) *OnChainSettings

	All() []*OnChainSettings

	// LastAppliedEvent returns the last applied event.
	// This is a test helper for checking that the settings was set.
	LastAppliedEvent() *river.RiverConfigV1ConfigurationChanged
}

type configEntry struct {
	name  string
	value []byte
}

// This datastructure mimics the on-chain configuration storage so updates
// from events can be applied consistently.
type rawSettingsMap map[string]map[BlockNumber][]byte

func (r rawSettingsMap) init(
	ctx context.Context,
	keyHashToName map[common.Hash]string,
	retrievedSettings []river.Setting,
) {
	for _, setting := range retrievedSettings {
		if setting.BlockNumber == math.MaxUint64 {
			logging.FromCtx(ctx).
				Warnw("Invalid block number, ignoring", "key", setting.Key, "value", setting.Value)
			continue
		}
		name, ok := keyHashToName[setting.Key]
		if !ok {
			logging.FromCtx(ctx).
				Infow("Skipping unknown setting key", "key", setting.Key, "value", setting.Value, "block", setting.BlockNumber)
			continue
		}
		blockMap, ok := r[name]
		if !ok {
			blockMap = make(map[BlockNumber][]byte)
			r[name] = blockMap
		}
		blockNum := BlockNumber(setting.BlockNumber)
		oldVal, ok := blockMap[blockNum]
		if ok {
			logging.FromCtx(ctx).
				Warnw("Duplicate setting", "key", setting.Key, "block", blockNum, "oldValue",
					oldVal, "newValue", setting.Value)
		}
		blockMap[blockNum] = setting.Value
	}
}

func (r rawSettingsMap) apply(
	ctx context.Context,
	keyHashToName map[common.Hash]string,
	event *river.RiverConfigV1ConfigurationChanged,
) {
	name, ok := keyHashToName[event.Key]
	if !ok {
		logging.FromCtx(ctx).
			Infow("Skipping unknown setting key", "key", event.Key, "value", event.Value, "block", event.Block, "deleted", event.Deleted)
		return
	}
	if event.Deleted {
		if blockMap, ok := r[name]; ok {
			// block number == max uint64 means delete all settings for this key
			if event.Block == math.MaxUint64 {
				delete(r, name)
			} else {
				blockNum := BlockNumber(event.Block)
				if _, ok := blockMap[blockNum]; ok {
					delete(blockMap, blockNum)
					if len(blockMap) == 0 {
						delete(r, name)
					}
				} else {
					logging.FromCtx(ctx).
						Warnw("Got delete event for non-existing block", "key", event.Key, "block", event.Block)
				}
			}
		} else {
			logging.FromCtx(ctx).
				Warnw("Got delete event for non-existing setting", "key", event.Key, "block", event.Block)
		}
	} else {
		if _, ok := r[name]; !ok {
			r[name] = make(map[BlockNumber][]byte)
		}
		r[name][BlockNumber(event.Block)] = event.Value
	}
}

func (r rawSettingsMap) transform() (map[BlockNumber][]*configEntry, []BlockNumber) {
	result := make(map[BlockNumber][]*configEntry)
	for name, blockMap := range r {
		for block, value := range blockMap {
			result[block] = append(result[block], &configEntry{
				name:  name,
				value: value,
			})
		}
	}

	var blockNums []BlockNumber
	for key := range result {
		blockNums = append(blockNums, key)
	}
	slices.Sort(blockNums)

	return result, blockNums
}

type onChainConfiguration struct {
	// contract interacts with the on-chain contract and provide metadata for decoding events
	contract      *river.RiverConfigV1Caller
	defaultsMap   map[string]interface{}
	keyHashToName map[common.Hash]string

	// activeBlock holds the current block on which the node is active
	activeBlock      atomic.Uint64
	cfg              atomic.Pointer[[]*OnChainSettings]
	lastAppliedEvent atomic.Pointer[river.RiverConfigV1ConfigurationChanged]

	mu               sync.Mutex
	loadedSettingMap rawSettingsMap
}

var _ OnChainConfiguration = (*onChainConfiguration)(nil)

func (occ *onChainConfiguration) ActiveBlock() BlockNumber {
	return BlockNumber(occ.activeBlock.Load())
}

func (occ *onChainConfiguration) Get() *OnChainSettings {
	return occ.GetOnBlock(occ.ActiveBlock())
}

func (occ *onChainConfiguration) GetOnBlock(block BlockNumber) *OnChainSettings {
	settings := *occ.cfg.Load()
	// Go in reverse order to find the most recent settings
	for i := len(settings) - 1; i >= 0; i-- {
		if block >= settings[i].FromBlockNumber {
			return settings[i]
		}
	}
	// First element should always be the default settings with block number 0.
	panic("never")
}

func (occ *onChainConfiguration) All() []*OnChainSettings {
	return *occ.cfg.Load()
}

func (occ *onChainConfiguration) LastAppliedEvent() *river.RiverConfigV1ConfigurationChanged {
	return occ.lastAppliedEvent.Load()
}

func HashSettingName(name string) common.Hash {
	return crypto.Keccak256Hash([]byte(strings.ToLower(name)))
}

func (occ *onChainConfiguration) processRawSettings(
	ctx context.Context,
	blockNum BlockNumber,
) {
	log := logging.FromCtx(ctx)

	byBlockNum, blockNums := occ.loadedSettingMap.transform()

	// First settings are the default settings
	settings := []*OnChainSettings{DefaultOnChainSettings()}

	decodeHook := abiBytesToTypeDecoder(ctx)
	for _, blockNum := range blockNums {
		input := make(map[string]any)

		for _, v := range byBlockNum[blockNum] {
			input[v.name] = v.value
		}

		// Copy values from the previous block
		setting := *settings[len(settings)-1]
		setting.FromBlockNumber = blockNum

		decoder, err := mapstructure.NewDecoder(&mapstructure.DecoderConfig{
			Result:     &setting,
			DecodeHook: decodeHook,
		})
		if err != nil {
			log.Errorw("SHOULD NOT HAPPEN: failed to create decoder", "error", err)
			continue
		}
		err = decoder.Decode(input)
		if err != nil {
			log.Errorw("SHOULD NOT HAPPEN: failed to decode settings", "error", err)
			continue
		}

		settings = append(settings, &setting)
	}

	occ.cfg.Store(&settings)

	log.Infow("OnChainConfig: applied", "settings", settings[len(settings)-1], "currentBlock", blockNum)
}

func NewOnChainConfig(
	ctx context.Context,
	riverClient BlockchainClient,
	riverRegistry common.Address,
	appliedBlockNum BlockNumber,
	chainMonitor ChainMonitor,
) (*onChainConfiguration, error) {
	caller, err := river.NewRiverConfigV1Caller(riverRegistry, riverClient)
	if err != nil {
		return nil, err
	}

	retrievedSettings, err := caller.GetAllConfiguration(&bind.CallOpts{
		Context:     ctx,
		BlockNumber: appliedBlockNum.AsBigInt(),
	})
	if err != nil {
		return nil, AsRiverError(err, Err_CANNOT_CALL_CONTRACT).
			Message("Failed to retrieve on-chain configuration").
			Func("NewOnChainConfig")
	}

	cfg, err := makeOnChainConfig(ctx, retrievedSettings, caller, appliedBlockNum)
	if err != nil {
		return nil, err
	}

	// on block sets the current block number that is used to determine the active configuration setting.
	chainMonitor.OnBlock(cfg.onBlock)

	cfgABI, err := river.RiverConfigV1MetaData.GetAbi()
	if err != nil {
		panic(fmt.Sprintf("RiverConfigV1 ABI invalid: %v", err))
	}

	// each time configuration stored on chain changed the ConfigurationChanged event is raised.
	// Register a callback that updates the in-memory configuration when this happens.
	chainMonitor.OnContractWithTopicsEvent(
		appliedBlockNum+1,
		riverRegistry,
		[][]common.Hash{{cfgABI.Events["ConfigurationChanged"].ID}},
		cfg.onConfigChanged,
	)

	return cfg, nil
}

func makeOnChainConfig(
	ctx context.Context,
	retrievedSettings []river.Setting,
	contract *river.RiverConfigV1Caller,
	appliedBlockNum BlockNumber,
) (*onChainConfiguration, error) {
	log := logging.FromCtx(ctx)

	// Get defaults to use if the setting is deleted
	defaultsMap := make(map[string]interface{})
	err := mapstructure.Decode(DefaultOnChainSettings(), &defaultsMap)
	if err != nil {
		return nil, err
	}

	keyHashToName := make(map[common.Hash]string)
	for key, value := range defaultsMap {
		hash := HashSettingName(key)
		log.Debugw("OnChainConfig monitoring key", "key", key, "hash", hash, "default", value)
		keyHashToName[hash] = key
	}

	rawSettings := make(rawSettingsMap)
	rawSettings.init(ctx, keyHashToName, retrievedSettings)

	cfg := &onChainConfiguration{
		contract:         contract,
		keyHashToName:    keyHashToName,
		defaultsMap:      defaultsMap,
		loadedSettingMap: rawSettings,
	}
	cfg.processRawSettings(ctx, appliedBlockNum)

	// set the current block number as the current active block. This is used to determine which settings are currently
	// active. Settings can be queued and become active after a future block.
	cfg.activeBlock.Store(appliedBlockNum.AsUint64())

	return cfg, nil
}

func (occ *onChainConfiguration) onBlock(_ context.Context, blockNumber BlockNumber) {
	occ.activeBlock.Store(blockNumber.AsUint64())
}

func (occ *onChainConfiguration) onConfigChanged(ctx context.Context, event types.Log) {
	var e river.RiverConfigV1ConfigurationChanged
	if err := occ.contract.BoundContract().UnpackLog(&e, "ConfigurationChanged", event); err != nil {
		logging.FromCtx(ctx).Errorw("OnChainConfiguration: unable to decode ConfigurationChanged event")
		return
	}
	occ.applyEvent(ctx, &e)
	occ.lastAppliedEvent.Store(&e)
}

func (occ *onChainConfiguration) applyEvent(ctx context.Context, event *river.RiverConfigV1ConfigurationChanged) {
	occ.mu.Lock()
	defer occ.mu.Unlock()
	occ.loadedSettingMap.apply(ctx, occ.keyHashToName, event)
	occ.processRawSettings(ctx, BlockNumber(event.Block))
}

var (
	AbiTypeName_Int64        = "int64"
	AbiTypeName_Uint64       = "uint64"
	AbiTypeName_Uint64Array  = "uint64[]"
	AbiTypeName_Uint256      = "uint256"
	AbiTypeName_String       = "string"
	AbiTypeName_Address      = "address"
	AbiTypeName_AddressArray = "address[]"

	AbiTypeName_All = []string{
		AbiTypeName_Int64,
		AbiTypeName_Uint64,
		AbiTypeName_Uint64Array,
		AbiTypeName_Uint256,
		AbiTypeName_String,
		AbiTypeName_Address,
		AbiTypeName_AddressArray,
	}

	int64Type, _               = abi.NewType(AbiTypeName_Int64, "", nil)
	uint64Type, _              = abi.NewType(AbiTypeName_Uint64, "", nil)
	uint64DynamicArrayType, _  = abi.NewType(AbiTypeName_Uint64Array, "", nil)
	uint256Type, _             = abi.NewType(AbiTypeName_Uint256, "", nil)
	stringType, _              = abi.NewType(AbiTypeName_String, "", nil)
	addressType, _             = abi.NewType(AbiTypeName_Address, "", nil)
	addressDynamicArrayType, _ = abi.NewType(AbiTypeName_AddressArray, "", nil)
)

// ABIEncodeInt64 returns Solidity abi.encode(i)
func ABIEncodeInt64(i int64) []byte {
	value, _ := abi.Arguments{{Type: int64Type}}.Pack(i)
	return value
}

func ABIDecodeInt64(data []byte) (int64, error) {
	args, err := abi.Arguments{{Type: int64Type}}.Unpack(data)
	if err != nil {
		return 0, err
	}
	return args[0].(int64), nil
}

// ABIEncodeUint64 returns Solidity abi.encode(i)
func ABIEncodeUint64(i uint64) []byte {
	value, _ := abi.Arguments{{Type: uint64Type}}.Pack(i)
	return value
}

func ABIDecodeUint64(data []byte) (uint64, error) {
	args, err := abi.Arguments{{Type: uint64Type}}.Unpack(data)
	if err != nil {
		return 0, err
	}
	return args[0].(uint64), nil
}

func ABIEncodeUint64Array(values []uint64) []byte {
	value, _ := abi.Arguments{{Type: uint64DynamicArrayType}}.Pack(values)
	return value
}

func ABIDecodeUint64Array(data []byte) ([]uint64, error) {
	args, err := abi.Arguments{{Type: uint64DynamicArrayType}}.Unpack(data)
	if err != nil {
		return []uint64{}, err
	}
	return args[0].([]uint64), nil
}

// ABIEncodeUint256 returns Solidity abi.encode(i)
func ABIEncodeUint256(i *big.Int) []byte {
	value, _ := abi.Arguments{{Type: uint256Type}}.Pack(i)
	return value
}

func ABIDecodeUint256(data []byte) (*big.Int, error) {
	args, err := abi.Arguments{{Type: uint256Type}}.Unpack(data)
	if err != nil {
		return nil, err
	}
	return args[0].(*big.Int), nil
}

// ABIEncodeString returns Solidity abi.encode(s)
func ABIEncodeString(s string) []byte {
	value, _ := abi.Arguments{{Type: stringType}}.Pack(s)
	return value
}

func ABIDecodeString(data []byte) (string, error) {
	args, err := abi.Arguments{{Type: stringType}}.Unpack(data)
	if err != nil {
		return "", err
	}
	return args[0].(string), nil
}

func ABIEncodeAddress(address common.Address) []byte {
	value, _ := abi.Arguments{{Type: addressType}}.Pack(address)
	return value
}

func ABIDecodeAddress(data []byte) (common.Address, error) {
	args, err := abi.Arguments{{Type: addressType}}.Unpack(data)
	if err != nil {
		return common.Address{}, err
	}
	return args[0].(common.Address), nil
}

func ABIEncodeAddressArray(addresses []common.Address) []byte {
	value, _ := abi.Arguments{{Type: addressDynamicArrayType}}.Pack(addresses)
	return value
}

func ABIDecodeAddressArray(data []byte) ([]common.Address, error) {
	args, err := abi.Arguments{{Type: addressDynamicArrayType}}.Unpack(data)
	if err != nil {
		return []common.Address{}, err
	}
	return args[0].([]common.Address), nil
}

var (
	commonAddressType      = reflect.TypeOf(common.Address{})
	commonAddressArrayType = reflect.TypeOf([]common.Address{})
)

func abiBytesToTypeDecoder(ctx context.Context) mapstructure.DecodeHookFuncValue {
	log := logging.FromCtx(ctx)
	return func(from reflect.Value, to reflect.Value) (interface{}, error) {
		// This function ignores decoding errors.
		// If there is bad setting value on chain, it will be ignored.
		if from.Kind() == reflect.Map {
			// Preprocess durations based on name suffix.
			mapValue, ok := from.Interface().(map[string]interface{})
			if ok {
				var badKeys []string
				for key, value := range mapValue {
					ms := strings.HasSuffix(key, "Ms")
					sec := strings.HasSuffix(key, "Seconds")
					bb, ok := value.([]byte)
					if (ms || sec) && ok {
						vv, err := ABIDecodeInt64(bb)
						if err != nil {
							log.Errorw("failed to decode int64", "key", key, "error", err, "bytes", bb)
							badKeys = append(badKeys, key)
							continue
						}
						var result time.Duration
						if ms {
							result = time.Duration(vv) * time.Millisecond
						} else {
							result = time.Duration(vv) * time.Second
						}
						mapValue[key] = result
					}
				}
				for _, key := range badKeys {
					delete(mapValue, key)
				}
			}
		} else if from.Kind() == reflect.Slice && from.Type().Elem().Kind() == reflect.Uint8 {
			if to.Kind() == reflect.Int64 || to.Kind() == reflect.Int {
				v, err := ABIDecodeInt64(from.Bytes())
				if err == nil {
					return v, nil
				}
				log.Errorw("failed to decode int64", "error", err, "bytes", from.Bytes())
			} else if to.Kind() == reflect.Uint64 || to.Kind() == reflect.Uint {
				v, err := ABIDecodeUint64(from.Bytes())
				if err == nil {
					return v, nil
				}
				log.Errorw("failed to decode uint64", "error", err, "bytes", from.Bytes())
			} else if to.Kind() == reflect.String {
				v, err := ABIDecodeString(from.Bytes())
				if err == nil {
					return v, nil
				}
				log.Errorw("failed to decode string", "error", err, "bytes", from.Bytes())
			} else if to.Kind() == reflect.Slice && to.Type().Elem().Kind() == reflect.Uint64 {
				v, err := ABIDecodeUint64Array(from.Bytes())
				if err == nil {
					return v, nil
				}
				log.Errorw("failed to decode []uint64", "error", err, "bytes", from.Bytes())
			} else if to.Type() == commonAddressType {
				v, err := ABIDecodeAddress(from.Bytes())
				if err == nil {
					return v, nil
				}
				log.Errorw("failed to decode []address", "error", err, "bytes", from.Bytes())
			} else if to.Type() == commonAddressArrayType {
				v, err := ABIDecodeAddressArray(from.Bytes())
				if err == nil {
					return v, nil
				}
				log.Errorw("failed to decode []address", "error", err, "bytes", from.Bytes())
			} else {
				log.Errorw("unsupported type for setting decoding", "type", to.Kind(), "bytes", from.Bytes())
			}
			// Failed to decode, return unchanged value.
			return to.Interface(), nil
		}
		return from.Interface(), nil
	}
}
