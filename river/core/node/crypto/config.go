package crypto

import (
	"context"
	"fmt"
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
)

var (
	// StreamReplicationFactorKey is the key for how often a stream is replicated over nodes
	StreamReplicationFactorKey = newChainKeyImpl("stream.replication.factor")

	uint64Type, _ = abi.NewType("uint64", "", nil)
	int64Type, _  = abi.NewType("int64", "", nil)
)

// ChainKey represents a key under which settings are storedin the RiverConfig
// smart contract.
type (
	ChainKey interface {
		// ID is the key under which the setting is stored in the RiverConfig smart contract.
		ID() common.Hash
		// Name is the human-readable name of the setting.
		Name() string
	}

	// OnChainConfiguration retrieves configuration settings from the RiverConfig facet smart contract.
	OnChainConfiguration interface {
		// GetUint64 returns the setting value for the given key that is active on the current block.
		GetUint64(key ChainKey) (uint64, error)
		// GetInt64 returns the setting value for the given key that is active on the current block.
		GetInt64(key ChainKey) (int64, error)
		// GetUint64OnBlock returns the setting value for the given key that is active on the given block number.
		GetUint64OnBlock(blockNumber uint64, key ChainKey) (uint64, error)
		// GetInt64OnBlock returns the setting value for the given key that is active on the given block number.
		GetInt64OnBlock(blockNumber uint64, key ChainKey) (int64, error)
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
		// Value holds the raw value as fetched from the RiverConfig smart contract
		Value []byte
	}

	// settings represents a list of setting values.
	settings []*settingValue

	// sort setting values by block number
	byBlockNumber []*settingValue

	// implements ChainKey
	chainKeyImpl struct {
		key  common.Hash
		name string
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

	// load configuration from the chain and store it in the in-memory cache.
	retrievedSettings, err := caller.GetAllConfiguration(&bind.CallOpts{
		Context:     ctx,
		BlockNumber: appliedBlockNum.AsBigInt(),
	})
	if err != nil {
		return nil, AsRiverError(err, Err_CANNOT_CONNECT).
			Message("Failed to retrieve on-chain configuration").
			Func("NewOnChainConfig")
	}

	cfgABI, err := contracts.RiverConfigV1MetaData.GetAbi()
	if err != nil {
		panic(fmt.Sprintf("RiverConfigV1 ABI invalid: %v", err))
	}

	cfg := &onChainConfiguration{settings: &onChainSettings{
		s: make(map[common.Hash]settings),
	}, contract: caller}

	for _, setting := range retrievedSettings {
		cfg.settings.Set(setting.Key, setting.BlockNumber, setting.Value)
	}

	// set the current block number as the current active block. This is used to determine which settings are currently
	// active. Settings can be queued and become active after a future block.
	cfg.activeBlock.Store(appliedBlockNum.AsUint64())

	// on block sets the current block number that is used to determine the active configuration setting.
	chainMonitor.OnBlock(cfg.onBlock)

	// each time configuration stored on chain changed the ConfigurationChanged event is raised.
	// Register a callback that updates the in-memory configuration when this happens.
	chainMonitor.OnContractWithTopicsEvent(
		riverRegistry, [][]common.Hash{{cfgABI.Events["ConfigurationChanged"].ID}}, cfg.onConfigChanged)

	return cfg, nil
}

func (occ *onChainConfiguration) onBlock(ctx context.Context, blockNumber BlockNumber) {
	occ.activeBlock.Store(blockNumber.AsUint64())
}

func (occ *onChainConfiguration) onConfigChanged(ctx context.Context, event types.Log) {
	var (
		log = dlog.Log()
		e   contracts.RiverConfigV1ConfigurationChanged
	)
	if err := occ.contract.BoundContract().UnpackLog(&e, "ConfigurationChanged", event); err != nil {
		log.Error("OnChainConfiguration: unable to decode ConfigurationChanged event")
		return
	}

	if e.Deleted {
		occ.settings.Remove(e.Key, e.Block)
	} else {
		occ.settings.Set(e.Key, e.Block, e.Value)
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

func (occ *onChainConfiguration) GetUint64OnBlock(blockNumber uint64, key ChainKey) (uint64, error) {
	setting := occ.settings.getOnBlock(key, blockNumber)
	if setting == nil {
		return 0, RiverError(Err_NOT_FOUND, "Missing on-chain configuration setting").
			Tag("key", key.Name()).
			Func("GetUint64")
	}
	return setting.Uint64()
}

func (occ *onChainConfiguration) GetInt64OnBlock(blockNumber uint64, key ChainKey) (int64, error) {
	setting := occ.settings.getOnBlock(key, blockNumber)
	if setting == nil {
		return 0, RiverError(Err_NOT_FOUND, "Missing on-chain configuration setting").
			Tag("key", key.Name()).
			Func("GetInt64")
	}
	return setting.Int64()
}

func (ocs *onChainSettings) Remove(key common.Hash, activeOnBlockNumber uint64) {
	ocs.mu.Lock()
	defer ocs.mu.Unlock()

	for i, v := range ocs.s[key] {
		if v.ActiveFromBlockNumber == activeOnBlockNumber {
			ocs.s[key][len(ocs.s[key])-1], ocs.s[key][i] = ocs.s[key][i], ocs.s[key][len(ocs.s[key])-1]
			ocs.s[key] = ocs.s[key][:len(ocs.s[key])-1]
			return
		}
	}
}

// Set the given value to the settings identified by the given key for the
// given block number.
func (ocs *onChainSettings) Set(key common.Hash, activeOnBlockNumber uint64, value []byte) {
	ocs.mu.Lock()
	defer ocs.mu.Unlock()

	for i, v := range ocs.s[key] {
		if v.ActiveFromBlockNumber == activeOnBlockNumber { // update
			// create new instance because original settingsValue might be shared at this moment
			// and therefore can't be updated.
			ocs.s[key][i] = &settingValue{
				ActiveFromBlockNumber: activeOnBlockNumber,
				Value:                 value,
			}
			return
		}
	}

	ocs.s[key] = append(ocs.s[key], &settingValue{
		ActiveFromBlockNumber: activeOnBlockNumber,
		Value:                 value,
	})

	sort.Sort(byBlockNumber(ocs.s[key]))
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

	args := abi.Arguments{{Type: uint64Type}}
	decoded, err := args.Unpack(s.Value)
	if err != nil {
		return 0, AsRiverError(err, Err_BAD_CONFIG).Func("Uint64")
	}
	if len(decoded) == 1 {
		if i, ok := decoded[0].(uint64); ok {
			return i, nil
		}
	}
	return 0, RiverError(Err_BAD_CONFIG, "Invalid configuration setting").Func("Uint64")
}

// Uint64 returns the setting value as int64.
// If the value could not be decoded to an uint64 an error is returned.
func (s *settingValue) Int64() (int64, error) {
	if s == nil {
		return 0, RiverError(Err_NOT_FOUND, "Missing on-chain configuration setting")
	}

	args := abi.Arguments{{Type: int64Type}}
	decoded, err := args.Unpack(s.Value)
	if err != nil {
		return 0, AsRiverError(err, Err_BAD_CONFIG).Func("GetInt64")
	}
	if len(decoded) == 1 {
		if i, ok := decoded[0].(int64); ok {
			return i, nil
		}
	}
	return 0, RiverError(Err_BAD_CONFIG, "Invalid configuration setting").Func("Uint64")
}

// ID returns the key under which the setting is stored on-chain in the
// RiverConfig smart contract.
func (ck chainKeyImpl) ID() common.Hash {
	return ck.key
}

func (ck chainKeyImpl) Name() string {
	return ck.name
}

func newChainKeyImpl(key string) chainKeyImpl {
	return chainKeyImpl{
		crypto.Keccak256Hash([]byte(strings.ToLower(key))),
		strings.ToLower(key),
	}
}

// ABIEncodeInt64 returns Solidity abi.encode(i)
func ABIEncodeInt64(i int64) []byte {
	value, _ := abi.Arguments{{Type: int64Type}}.Pack(i)
	return value
}
