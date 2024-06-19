package crypto

import (
	"context"
	"fmt"
	"math"
	"math/big"
	"sort"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

var (
	// StreamMediaMaxChunkCountConfigKey defines the maximum number chunks of data a media stream can contain.
	StreamMediaMaxChunkCountConfigKey = newChainKeyImpl(
		"stream.media.maxChunkCount", uint64Type, 50)
	// StreamMediaMaxChunkSizeConfigKey defines the maximum size of a data chunk that is allowed to be added to a media
	// stream in a single event.
	StreamMediaMaxChunkSizeConfigKey = newChainKeyImpl(
		"stream.media.maxChunkSize", uint64Type, 500000)
	StreamRecencyConstraintsAgeSecConfigKey = newChainKeyImpl(
		"stream.recencyConstraints.ageSeconds", uint64Type, 11)
	StreamRecencyConstraintsGenerationsConfigKey = newChainKeyImpl(
		"stream.recencyConstraints.generations", uint64Type, 5)
	// StreamReplicationFactorConfigKey is the key for how often a stream is replicated over nodes
	StreamReplicationFactorConfigKey = newChainKeyImpl(
		"stream.replicationFactor", uint64Type, 1)
	StreamDefaultMinEventsPerSnapshotConfigKey = newChainKeyImpl(
		"stream.defaultMinEventsPerSnapshot", uint64Type, 100)
	StreamMinEventsPerSnapshotUserInboxConfigKey = newChainKeyImpl(
		"stream.minEventsPerSnapshot.a1", uint64Type, 10)
	StreamMinEventsPerSnapshotUserSettingsConfigKey = newChainKeyImpl(
		"stream.minEventsPerSnapshot.a5", uint64Type, 10)
	StreamMinEventsPerSnapshotUserConfigKey = newChainKeyImpl(
		"stream.minEventsPerSnapshot.a8", uint64Type, 10)
	StreamMinEventsPerSnapshotUserDeviceConfigKey = newChainKeyImpl(
		"stream.minEventsPerSnapshot.ad", uint64Type, 10)
	StreamCacheExpirationMsConfigKey = newChainKeyImpl(
		"stream.cacheExpirationMs", uint64Type, 300000)
	StreamCacheExpirationPollIntervalMsConfigKey = newChainKeyImpl(
		"stream.cacheExpirationPollIntervalMs", uint64Type, 30000)
	MediaStreamMembershipLimitsGDMConfigKey = newChainKeyImpl(
		"media.streamMembershipLimits.77", uint64Type, 48)
	MediaStreamMembershipLimitsDMConfigKey = newChainKeyImpl(
		"media.streamMembershipLimits.88", uint64Type, 2)

	// mapping from setting id to its keys (needs to contain all config keys)
	configKeyIDToKey = map[common.Hash]chainKeyImpl{
		StreamMediaMaxChunkCountConfigKey.ID():               StreamMediaMaxChunkCountConfigKey,
		StreamMediaMaxChunkSizeConfigKey.ID():                StreamMediaMaxChunkSizeConfigKey,
		StreamRecencyConstraintsAgeSecConfigKey.ID():         StreamRecencyConstraintsAgeSecConfigKey,
		StreamRecencyConstraintsGenerationsConfigKey.ID():    StreamRecencyConstraintsGenerationsConfigKey,
		StreamReplicationFactorConfigKey.ID():                StreamReplicationFactorConfigKey,
		StreamDefaultMinEventsPerSnapshotConfigKey.ID():      StreamDefaultMinEventsPerSnapshotConfigKey,
		StreamMinEventsPerSnapshotUserInboxConfigKey.ID():    StreamMinEventsPerSnapshotUserInboxConfigKey,
		StreamMinEventsPerSnapshotUserSettingsConfigKey.ID(): StreamMinEventsPerSnapshotUserSettingsConfigKey,
		StreamMinEventsPerSnapshotUserConfigKey.ID():         StreamMinEventsPerSnapshotUserConfigKey,
		StreamMinEventsPerSnapshotUserDeviceConfigKey.ID():   StreamMinEventsPerSnapshotUserDeviceConfigKey,
		StreamCacheExpirationMsConfigKey.ID():                StreamCacheExpirationMsConfigKey,
		StreamCacheExpirationPollIntervalMsConfigKey.ID():    StreamCacheExpirationPollIntervalMsConfigKey,
		MediaStreamMembershipLimitsGDMConfigKey.ID():         MediaStreamMembershipLimitsGDMConfigKey,
		MediaStreamMembershipLimitsDMConfigKey.ID():          MediaStreamMembershipLimitsDMConfigKey,
	}

	streamTypeToMinEventsPerSnapshotKey = map[byte]ChainKey{
		shared.STREAM_USER_INBOX_BIN:      StreamMinEventsPerSnapshotUserInboxConfigKey,
		shared.STREAM_USER_SETTINGS_BIN:   StreamMinEventsPerSnapshotUserSettingsConfigKey,
		shared.STREAM_USER_BIN:            StreamMinEventsPerSnapshotUserConfigKey,
		shared.STREAM_USER_DEVICE_KEY_BIN: StreamMinEventsPerSnapshotUserDeviceConfigKey,
	}

	streamTypeToUserLimitKey = map[byte]ChainKey{
		shared.STREAM_GDM_CHANNEL_BIN: MediaStreamMembershipLimitsGDMConfigKey,
		shared.STREAM_DM_CHANNEL_BIN:  MediaStreamMembershipLimitsDMConfigKey,
	}

	uint64Type, _ = abi.NewType("uint64", "", nil)
	int64Type, _  = abi.NewType("int64", "", nil)
)

// ChainKey represents a key under which settings are stored in the RiverConfig smart contract.
type (
	ChainKey interface {
		// ID is the key under which the setting is stored in the RiverConfig smart contract.
		ID() common.Hash
		// Name is the human-readable name of the setting.
		Name() string
		// DefaultAsInt64 returns the default value for the key as an int64.
		// Panics if the default value isn't, or could not be converted to an int64.
		DefaultAsInt64() int64
	}

	allSettingValue struct {
		ActiveBlockNumber uint64
		Value             any
	}

	// AllSettings holds the collection of all settings loaded from the on-chain configuration facet
	AllSettings struct {
		// CurrentBlockNumber indicates which block is currently used to pick the active on-chain configuration
		CurrentBlockNumber uint64
		// Settings is the list with settings grouped by key
		Settings map[string][]allSettingValue
	}

	// OnChainConfiguration retrieves configuration settings from the RiverConfig facet smart contract.
	OnChainConfiguration interface {
		// ActiveBlock returns the blocknumber of the active config
		ActiveBlock() uint64
		// GetUint64 returns the setting value for the given key that is active on the current block.
		GetUint64(key ChainKey) (uint64, error)
		// GetInt64 returns the setting value for the given key that is active on the current block.
		GetInt64(key ChainKey) (int64, error)
		// GetInt returns the setting value for the given key that is active on the current block.
		GetInt(key ChainKey) (int, error)
		// GetUint64OnBlock returns the setting value for the given key that is active on the given block number.
		GetUint64OnBlock(blockNumber uint64, key ChainKey) (uint64, error)
		// GetInt64OnBlock returns the setting value for the given key that is active on the given block number.
		GetInt64OnBlock(blockNumber uint64, key ChainKey) (int64, error)
		// GetIntOnBlock returns the setting value for the given key that is active on the given block number.
		GetIntOnBlock(blockNumber uint64, key ChainKey) (int, error)
		// All returns the collection of all settings retrieved from the on-chain configuration facet
		All() (*AllSettings, error)
		// GetMinEventsPerSnapshot returns the minimum events in a stream before a snapshot is taken. If there is no
		// special setting for the requested stream the default value is returned.
		GetMinEventsPerSnapshot(streamType byte) (int, error)
		// GetStreamMembershipLimit returns the maximum number of clients that are allowed in a stream.
		GetStreamMembershipLimit(streamType byte) (int, error)
	}

	onChainConfiguration struct {
		// settings holds a list of values for a particular setting, indexed by key and sorted by block number
		// the setting becomes active.
		settings *onChainSettings
		// activeBlock holds the current block on which the node is active
		activeBlock atomic.Uint64
		// contract interacts with the on-chain contract and provide metadata for decoding events
		contract *contracts.RiverConfigV1Caller
	}

	// Settings holds a list of setting values for each type of setting.
	// For each key there can be multiple setting values, each active on a different
	// block number. Therefor to get the correct value users need to specify on
	// which block number they need to get the setting value.
	onChainSettings struct {
		mu sync.RWMutex
		s  map[common.Hash]settings
	}

	// settingValue represents a setting as store on-chain in the RiverConfig smart contract.
	settingValue struct {
		// ActiveFromBlockNumber is the block number from which this setting is active
		ActiveFromBlockNumber uint64
		// Value holds the decoded value from the RiverConfig smart contract
		Value any
	}

	// settings represents a list of setting values.
	settings []*settingValue

	// sort setting values by block number
	byBlockNumber []*settingValue

	// implements ChainKey
	chainKeyImpl struct {
		key          common.Hash
		name         string
		typ          abi.Type
		defaultValue any
	}
)

// NewOnChainConfig returns a OnChainConfiguration that syncs with the on-chain configuration contract.
func NewOnChainConfig(
	ctx context.Context,
	riverClient BlockchainClient,
	riverRegistry common.Address,
	appliedBlockNum BlockNumber,
	chainMonitor ChainMonitor,
) (*onChainConfiguration, error) {
	caller, err := contracts.NewRiverConfigV1Caller(riverRegistry, riverClient)
	if err != nil {
		return nil, err
	}

	cfg := &onChainConfiguration{
		settings: &onChainSettings{
			s: make(map[common.Hash]settings),
		},
		contract: caller,
	}

	// set the current block number as the current active block. This is used to determine which settings are currently
	// active. Settings can be queued and become active after a future block.
	cfg.activeBlock.Store(appliedBlockNum.AsUint64())

	// retrieve settings from the chain on appliedBlockNum
	if err := cfg.loadFromChain(ctx, appliedBlockNum.AsBigInt()); err != nil {
		return nil, err
	}

	// load default settings for config settings that have no active value at the current block height.
	cfg.loadMissing(ctx, appliedBlockNum.AsUint64())

	// on block sets the current block number that is used to determine the active configuration setting.
	chainMonitor.OnBlock(cfg.onBlock)

	cfgABI, err := contracts.RiverConfigV1MetaData.GetAbi()
	if err != nil {
		panic(fmt.Sprintf("RiverConfigV1 ABI invalid: %v", err))
	}

	// each time configuration stored on chain changed the ConfigurationChanged event is raised.
	// Register a callback that updates the in-memory configuration when this happens.
	chainMonitor.OnContractWithTopicsEvent(
		riverRegistry, [][]common.Hash{{cfgABI.Events["ConfigurationChanged"].ID}}, cfg.onConfigChanged)

	return cfg, nil
}

// loadFromChain retrieves the configuration from the chain on the given active block.
func (occ *onChainConfiguration) loadFromChain(ctx context.Context, activeBlock *big.Int) error {
	retrievedSettings, err := occ.contract.GetAllConfiguration(&bind.CallOpts{
		Context:     ctx,
		BlockNumber: activeBlock,
	})
	if err != nil {
		return AsRiverError(err, Err_CANNOT_CONNECT).
			Message("Failed to retrieve on-chain configuration").
			Func("loadFromChain")
	}

	log := dlog.FromCtx(ctx)
	for _, setting := range retrievedSettings {
		key, found := configKeyIDToKey[setting.Key]
		if !found {
			log.Error("OnChainConfiguration: retrieved unsupported configuration key from on-chain config",
				"key", fmt.Sprintf("0x%x", setting.Key))
			continue
		}
		value, err := key.decode(setting.Value)
		if err != nil {
			return err
		}
		occ.settings.Set(key, setting.BlockNumber, value)
	}

	return nil
}

// loadMissing sets default values for configuration items that have no value at the given activeBlock.
func (occ *onChainConfiguration) loadMissing(ctx context.Context, activeBlock uint64) {
	log := dlog.FromCtx(ctx)

	for _, key := range configKeyIDToKey {
		setting, found := occ.settings.s[key.ID()]
		if found && setting.OnBlock(activeBlock) != nil {
			continue
		}

		log.Debug(
			"OnChainConfiguration: missing config setting on chain, use default",
			"key", key.Name(),
			"default", key.defaultValue,
			"activeBlock", activeBlock,
		)

		occ.settings.Set(key, activeBlock, key.defaultValue)
	}
}

func (occ *onChainConfiguration) onBlock(_ context.Context, blockNumber BlockNumber) {
	occ.activeBlock.Store(blockNumber.AsUint64())
}

func (occ *onChainConfiguration) ActiveBlock() uint64 {
	return occ.activeBlock.Load()
}

func (occ *onChainConfiguration) onConfigChanged(ctx context.Context, event types.Log) {
	var (
		log = dlog.FromCtx(ctx)
		e   contracts.RiverConfigV1ConfigurationChanged
	)
	if err := occ.contract.BoundContract().UnpackLog(&e, "ConfigurationChanged", event); err != nil {
		log.Error("OnChainConfiguration: unable to decode ConfigurationChanged event")
		return
	}

	configKey, ok := configKeyIDToKey[e.Key]
	if !ok {
		log.Error("OnChainConfiguration: received update for unknown config key",
			"key", fmt.Sprintf("0x%x", e.Key))
		return
	}

	if e.Deleted {
		occ.settings.Remove(configKey, e.Block)
	} else {
		value, err := configKey.decode(e.Value)
		if err != nil {
			log.Error("OnChainConfiguration: received config update with invalid value",
				"tx", event.TxHash, "key", configKey.name, "err", err)
			return
		}
		occ.settings.Set(configKey, e.Block, value)
	}
}

func (occ *onChainConfiguration) GetUint64(key ChainKey) (uint64, error) {
	blockNum := occ.activeBlock.Load()
	return occ.GetUint64OnBlock(blockNum, key)
}

func (occ *onChainConfiguration) GetInt64(key ChainKey) (int64, error) {
	blockNum := occ.activeBlock.Load()
	return occ.GetInt64OnBlock(blockNum, key)
}

func (occ *onChainConfiguration) GetInt(key ChainKey) (int, error) {
	blockNum := occ.activeBlock.Load()
	return occ.GetIntOnBlock(blockNum, key)
}

func (occ *onChainConfiguration) GetMinEventsPerSnapshot(streamType byte) (int, error) {
	if key, ok := streamTypeToMinEventsPerSnapshotKey[streamType]; ok {
		if val, err := occ.GetInt(key); err == nil {
			return val, nil
		}
	}
	return occ.GetInt(StreamDefaultMinEventsPerSnapshotConfigKey)
}

func (occ *onChainConfiguration) GetStreamMembershipLimit(streamType byte) (int, error) {
	if key, ok := streamTypeToUserLimitKey[streamType]; ok {
		if val, err := occ.GetInt(key); err == nil {
			return val, err
		}
	}
	return 0, nil
}

func (occ *onChainConfiguration) GetUint64OnBlock(blockNumber uint64, key ChainKey) (uint64, error) {
	setting := occ.settings.getOnBlock(key, blockNumber)
	if setting == nil {
		return uint64(key.DefaultAsInt64()), nil
	}
	return setting.Uint64()
}

func (occ *onChainConfiguration) GetIntOnBlock(blockNumber uint64, key ChainKey) (int, error) {
	setting := occ.settings.getOnBlock(key, blockNumber)
	if setting == nil {
		return int(key.DefaultAsInt64()), nil
	}
	return setting.Int()
}

func (occ *onChainConfiguration) GetInt64OnBlock(blockNumber uint64, key ChainKey) (int64, error) {
	setting := occ.settings.getOnBlock(key, blockNumber)
	if setting == nil {
		return key.DefaultAsInt64(), nil
	}
	return setting.Int64()
}

func (occ *onChainConfiguration) All() (*AllSettings, error) {
	all := AllSettings{
		CurrentBlockNumber: occ.activeBlock.Load(),
		Settings:           make(map[string][]allSettingValue),
	}

	occ.settings.mu.RLock()
	defer occ.settings.mu.RUnlock()

	for keyID, key := range configKeyIDToKey {
		parsed := make([]allSettingValue, len(occ.settings.s[keyID]))
		for i, setting := range occ.settings.s[keyID] {
			parsed[i] = allSettingValue{
				ActiveBlockNumber: setting.ActiveFromBlockNumber,
				Value:             setting.Value,
			}
		}
		all.Settings[key.name] = parsed
	}

	return &all, nil
}

func (ocs *onChainSettings) Remove(key chainKeyImpl, activeOnBlockNumber uint64) {
	var (
		log   = dlog.FromCtx(context.Background()) // lint:ignore context.Background() is fine here
		keyID = key.ID()
	)

	ocs.mu.Lock()
	defer ocs.mu.Unlock()

	for i, v := range ocs.s[keyID] {
		if v.ActiveFromBlockNumber == activeOnBlockNumber {
			ocs.s[keyID][len(ocs.s[keyID])-1], ocs.s[keyID][i] = ocs.s[keyID][i], ocs.s[keyID][len(ocs.s[keyID])-1]
			ocs.s[keyID] = ocs.s[keyID][:len(ocs.s[keyID])-1]
			log.Info("dropped chain config", "key", key.Name(), "activationBlock", activeOnBlockNumber)
			return
		}
	}
}

// Set the given value to the settings identified by the given key for the
// given block number.
func (ocs *onChainSettings) Set(key chainKeyImpl, activeOnBlockNumber uint64, value any) {
	var (
		log   = dlog.FromCtx(context.Background()) // lint:ignore context.Background() is fine here
		keyID = key.ID()
	)

	ocs.mu.Lock()
	defer ocs.mu.Unlock()

	for i, v := range ocs.s[keyID] {
		if v.ActiveFromBlockNumber == activeOnBlockNumber { // update
			// create new instance because original settingsValue might be shared at this moment
			// and therefore can't be updated.
			ocs.s[keyID][i] = &settingValue{
				ActiveFromBlockNumber: activeOnBlockNumber,
				Value:                 value,
			}
			log.Info("set chain config",
				"key", key.Name(), "activationBlock", activeOnBlockNumber, "value", value)
			return
		}
	}

	ocs.s[keyID] = append(ocs.s[keyID], &settingValue{
		ActiveFromBlockNumber: activeOnBlockNumber,
		Value:                 value,
	})
	log.Info("set chain config", "key", key.Name(), "activationBlock", activeOnBlockNumber, "value", value)

	sort.Sort(byBlockNumber(ocs.s[keyID]))
}

// Get returns the set of settings for the given key.
func (ocs *onChainSettings) getOnBlock(key ChainKey, blockNumber uint64) *settingValue {
	ocs.mu.RLock()
	defer ocs.mu.RUnlock()

	return ocs.s[key.ID()].OnBlock(blockNumber)
}

func (s byBlockNumber) Len() int      { return len(s) }
func (s byBlockNumber) Swap(i, j int) { s[i], s[j] = s[j], s[i] }
func (s byBlockNumber) Less(i, j int) bool {
	return s[i].ActiveFromBlockNumber < s[j].ActiveFromBlockNumber
}

// OnBlock return the setting that is active at the given block number.
func (s settings) OnBlock(blockNumber uint64) *settingValue {
	for i := len(s) - 1; i >= 0; i-- {
		if s[i].ActiveFromBlockNumber <= blockNumber {
			return s[i]
		}
	}
	return nil
}

// Uint64 returns the setting value as uint64.
// If the value could not be decoded to an uint64 an error is returned.
func (s *settingValue) Uint64() (uint64, error) {
	if s == nil {
		return 0, RiverError(Err_NOT_FOUND, "Missing on-chain configuration setting")
	}
	if v, ok := s.Value.(int); ok && v >= 0 {
		return uint64(v), nil
	}
	if v, ok := s.Value.(uint64); ok {
		return v, nil
	}
	if v, ok := s.Value.(int64); ok && v >= 0 {
		return uint64(v), nil
	}
	return 0, RiverError(Err_BAD_CONFIG, "Invalid configuration setting").
		Tag("typ", fmt.Sprintf("%T", s.Value)).Func("Uint64")
}

// Int64 returns the setting value as int64.
// If the value could not be decoded to an int64 an error is returned.
func (s *settingValue) Int64() (int64, error) {
	if s == nil {
		return 0, RiverError(Err_NOT_FOUND, "Missing on-chain configuration setting")
	}
	if v, ok := s.Value.(int); ok {
		return int64(v), nil
	}
	if v, ok := s.Value.(int64); ok {
		return v, nil
	}
	if v, ok := s.Value.(uint64); ok && v < math.MaxInt64 {
		return int64(v), nil
	}
	return 0, RiverError(Err_BAD_CONFIG, "Invalid configuration setting").
		Tags("typ", fmt.Sprintf("%T", s.Value)).Func("Int64")
}

// Int returns the setting value as the systems native integer type.
// If the value could not be decoded an error is returned.
func (s *settingValue) Int() (int, error) {
	if s == nil {
		return 0, RiverError(Err_NOT_FOUND, "Missing on-chain configuration setting")
	}
	if v, ok := s.Value.(int); ok {
		return v, nil
	}
	if v, err := s.Uint64(); err == nil && v < math.MaxInt {
		return int(v), nil
	}
	if v, err := s.Int64(); err == nil && v < math.MaxInt {
		return int(v), nil
	}
	return 0, RiverError(Err_BAD_CONFIG, "Invalid configuration setting").
		Tag("typ", fmt.Sprintf("%T", s.Value)).Func("Int")
}

// ID returns the key under which the setting is stored on-chain in the
// RiverConfig smart contract.
func (ck chainKeyImpl) ID() common.Hash {
	return ck.key
}

func (ck chainKeyImpl) Name() string {
	return ck.name
}

func (ck chainKeyImpl) DefaultAsInt64() int64 {
	switch v := ck.defaultValue.(type) {
	case int:
		return int64(v)
	case int64:
		return v
	case uint64:
		if v < math.MaxInt64 {
			return int64(v)
		}
	}
	panic(fmt.Sprintf("Unable to retrieve default value for chain key %s as int64", ck.name))
}

func newChainKeyImpl(key string, typ abi.Type, defaultValue any) chainKeyImpl {
	return chainKeyImpl{
		crypto.Keccak256Hash([]byte(strings.ToLower(key))),
		key,
		typ,
		defaultValue,
	}
}

func (ck chainKeyImpl) decode(value []byte) (any, error) {
	args := abi.Arguments{{Type: ck.typ}}
	decoded, err := args.Unpack(value)
	if err != nil {
		return nil, err
	}
	if len(decoded) != 1 {
		return nil, RiverError(Err_BAD_CONFIG, "Invalid on-chain configuration setting").Tag("key", ck.name)
	}
	return decoded[0], nil
}

// ABIEncodeInt64 returns Solidity abi.encode(i)
func ABIEncodeInt64(i int64) []byte {
	value, _ := abi.Arguments{{Type: int64Type}}.Pack(i)
	return value
}

// ABIEncodeUint64 returns Solidity abi.encode(i)
func ABIEncodeUint64(i uint64) []byte {
	value, _ := abi.Arguments{{Type: uint64Type}}.Pack(i)
	return value
}
