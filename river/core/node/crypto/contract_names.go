package crypto

import (
	"encoding/binary"
	"fmt"

	"github.com/ethereum/go-ethereum/accounts/abi"

	"github.com/river-build/river/core/contracts/base"
	"github.com/river-build/river/core/contracts/river"
	"github.com/river-build/river/core/xchain/bindings/erc1155"
	"github.com/river-build/river/core/xchain/bindings/erc20"
	"github.com/river-build/river/core/xchain/bindings/erc721"
	"github.com/river-build/river/core/xchain/bindings/ierc5313"
)

// ContractNameMap maps selectors found in contract ABI code to the contract's method name.
// This class can support multiple contracts but is best used for a single diamond since it
// can only store a maximum of 1 entry per selector.
type ContractNameMap interface {
	// This is not thread-safe and is intended to be called from an init() method.
	RegisterABI(contractName string, abi *abi.ABI)
	GetMethodName(selector uint32) (string, bool)
}

type contractNameMap struct {
	abis          []*abi.ABI
	selectorNames map[uint32]string
}

func (cnm *contractNameMap) RegisterABI(contractName string, abi *abi.ABI) {
	cnm.abis = append(cnm.abis, abi)
	for _, method := range abi.Methods {
		encoded := binary.BigEndian.Uint32(method.ID)
		if _, ok := cnm.selectorNames[encoded]; ok {
			// Some contracts share the same selectors, for example ERC20 and ERC721 have
			// a balanceOf with the same signature. In this case, lets just store the
			// method name.
			cnm.selectorNames[encoded] = method.Name
		} else {
			cnm.selectorNames[encoded] = fmt.Sprintf("%s.%s", contractName, method.Name)
		}
	}
}

func (cnm *contractNameMap) GetMethodName(selector uint32) (string, bool) {
	name, ok := cnm.selectorNames[selector]
	return name, ok
}

func NewContractNameMap() ContractNameMap {
	return &contractNameMap{
		selectorNames: map[uint32]string{},
	}
}

var _ ContractNameMap = (*contractNameMap)(nil)

var nameMap = NewContractNameMap()

func init() {
	// Selectors for base contracts.
	abi, _ := base.ArchitectMetaData.GetAbi()
	nameMap.RegisterABI("Architect", abi)
	abi, _ = base.BanningMetaData.GetAbi()
	nameMap.RegisterABI("Banning", abi)
	abi, _ = base.ChannelsMetaData.GetAbi()
	nameMap.RegisterABI("Channels", abi)
	abi, _ = base.EntitlementDataQueryableMetaData.GetAbi()
	nameMap.RegisterABI("EntitlementDataQueryable", abi)
	abi, _ = base.EntitlementsManagerMetaData.GetAbi()
	nameMap.RegisterABI("EntitlementsManager", abi)
	abi, _ = base.Erc721aQueryableMetaData.GetAbi()
	nameMap.RegisterABI("Erc721aQueryable", abi)
	abi, _ = base.IEntitlementCheckerMetaData.GetAbi()
	nameMap.RegisterABI("IEntitlementChecker", abi)
	abi, _ = base.IEntitlementGatedMetaData.GetAbi()
	nameMap.RegisterABI("IEntitlementGated", abi)
	abi, _ = base.IEntitlementMetaData.GetAbi()
	nameMap.RegisterABI("IEntitlement", abi)
	abi, _ = base.IRolesMetaData.GetAbi()
	nameMap.RegisterABI("IRoles", abi)
	abi, _ = base.PausableMetaData.GetAbi()
	nameMap.RegisterABI("Pausable", abi)
	abi, _ = base.RuleEntitlementMetaData.GetAbi()
	nameMap.RegisterABI("RuleEntitlement", abi)
	abi, _ = base.RuleEntitlementV2MetaData.GetAbi()
	nameMap.RegisterABI("RuleEntitlementV2", abi)
	abi, _ = base.WalletLinkMetaData.GetAbi()
	nameMap.RegisterABI("WalletLink", abi)
	abi, _ = ierc5313.Ierc5313MetaData.GetAbi()
	nameMap.RegisterABI("Ierc5313", abi)

	// Entitlement-related. These may also occur on other chains.
	abi, _ = erc721.Erc721MetaData.GetAbi()
	nameMap.RegisterABI("Erc721", abi)
	abi, _ = erc1155.Erc1155MetaData.GetAbi()
	nameMap.RegisterABI("Erc1155", abi)
	abi, _ = erc20.Erc20MetaData.GetAbi()
	nameMap.RegisterABI("Erc20", abi)
	abi, _ = base.ICrossChainEntitlementMetaData.GetAbi()
	nameMap.RegisterABI("ICrossChainEntitlement", abi)

	// Selectors for river contracts.
	abi, _ = river.NodeRegistryV1MetaData.GetAbi()
	nameMap.RegisterABI("NodeRegistry", abi)
	abi, _ = river.OperatorRegistryV1MetaData.GetAbi()
	nameMap.RegisterABI("OperatorRegistry", abi)
	abi, _ = river.RiverConfigV1MetaData.GetAbi()
	nameMap.RegisterABI("RiverConfig", abi)
	abi, _ = river.StreamRegistryV1MetaData.GetAbi()
	nameMap.RegisterABI("StreamRegistry", abi)
}

func GetSelectorMethodName(selector uint32) (string, bool) {
	return nameMap.GetMethodName(selector)
}
