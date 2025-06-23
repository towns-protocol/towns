// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package base

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// IChannelBaseChannel is an auto generated low-level Go binding around an user-defined struct.
type IChannelBaseChannel struct {
	Id       [32]byte
	Disabled bool
	Metadata string
	RoleIds  []*big.Int
}

// IChannelBaseRolePermissions is an auto generated low-level Go binding around an user-defined struct.
type IChannelBaseRolePermissions struct {
	RoleId      *big.Int
	Permissions []string
}

// ChannelsMetaData contains all meta data concerning the Channels contract.
var ChannelsMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"addRoleToChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"createChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"createChannelWithOverridePermissions\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"rolePermissions\",\"type\":\"tuple[]\",\"internalType\":\"structIChannelBase.RolePermissions[]\",\"components\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"channel\",\"type\":\"tuple\",\"internalType\":\"structIChannelBase.Channel\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getChannels\",\"inputs\":[],\"outputs\":[{\"name\":\"channels\",\"type\":\"tuple[]\",\"internalType\":\"structIChannelBase.Channel[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRolesByChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeRoleFromChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Banned\",\"inputs\":[{\"name\":\"moderator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelCreated\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRemoved\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRoleAdded\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRoleRemoved\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelUpdated\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConsecutiveTransfer\",\"inputs\":[{\"name\":\"fromTokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"toTokenId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Paused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"PermissionsAddedToChannelRole\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"PermissionsRemovedFromChannelRole\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"PermissionsUpdatedForChannelRole\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RoleCreated\",\"inputs\":[{\"name\":\"creator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RoleRemoved\",\"inputs\":[{\"name\":\"remover\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RoleUpdated\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unbanned\",\"inputs\":[{\"name\":\"moderator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unpaused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ApprovalCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ApprovalQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"BalanceQueryForZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__AlreadyBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Banning__CannotBanOwner\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__CannotBanSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__InvalidTokenId\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Banning__NotBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelDisabled\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__RoleAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__RoleDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__ValueAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintERC2309QuantityExceedsLimit\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintZeroQuantity\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnerQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnershipNotInitializedForExtraData\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__NotPaused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__Paused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__EntitlementAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__EntitlementDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__InvalidEntitlementAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__InvalidPermission\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__PermissionAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__PermissionDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__RoleDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__RoleIsImmutable\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferFromIncorrectOwner\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToNonERC721ReceiverImplementer\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"URIQueryForNonexistentToken\",\"inputs\":[]}]",
	Bin: "0x6080604052348015600e575f5ffd5b5060156019565b60bd565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156064576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101560ba57805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b61287b806100ca5f395ff3fe608060405234801561000f575f5ffd5b506004361061009f575f3560e01c8063921f7175116100725780639935218311610058578063993521831461012f578063b9de61591461014f578063ef86d69614610162575f5ffd5b8063921f7175146101075780639575f6ac1461011a575f5ffd5b806302da0e51146100a357806337644cf7146100b85780635a2dce7a146100cb578063831c2b82146100de575b5f5ffd5b6100b66100b1366004611ed0565b610175565b005b6100b66100c6366004611ee7565b6101bf565b6100b66100d9366004611f8d565b61020b565b6100f16100ec366004611ed0565b61036d565b6040516100fe91906120c0565b60405180910390f35b6100b6610115366004611f8d565b6103a7565b61012261042a565b6040516100fe91906120d2565b61014261013d366004611ed0565b610439565b6040516100fe9190612153565b6100b661015d366004611ee7565b610444565b6100b66101703660046121a2565b61048c565b6101b36040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b6101bc8161056a565b50565b6101fd6040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b61020782826105ab565b5050565b6102496040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b5f8167ffffffffffffffff811115610263576102636121fd565b60405190808252806020026020018201604052801561028c578160200160208202803683370190505b5090505f5b828110156102e5578383828181106102ab576102ab61222a565b90506020028101906102bd9190612257565b5f01358282815181106102d2576102d261222a565b6020908102919091010152600101610291565b506102f2868686846105f5565b5f5b828110156103645761035c8484838181106103115761031161222a565b90506020028101906103239190612257565b35888686858181106103375761033761222a565b90506020028101906103499190612257565b610357906020810190612293565b610648565b6001016102f4565b50505050505050565b61039860405180608001604052805f81526020015f1515815260200160608152602001606081525090565b6103a1826107bf565b92915050565b6103e56040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b6104238585858585808060200260200160405190810160405280939291908181526020018383602002808284375f920191909152506105f592505050565b5050505050565b606061043461081f565b905090565b60606103a182610948565b6104826040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b6102078282610953565b6104ca6040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b6104d684848484610995565b50505050565b336104e56109d3565b73ffffffffffffffffffffffffffffffffffffffff16148061053957507fe17a067c7963a59b6dfd65d33b053fdbea1c56500e2aae4f976d9eda4da9eb005460ff1615801561053957506105393382610a93565b156105415750565b6101bc7f338e692c00000000000000000000000000000000000000000000000000000000610aae565b61057381610ab6565b60405181815233907f3a3f387aa42656bc1732adfc7aea5cde9ccc05a59f9af9c29ebfa68e66383e939060200160405180910390a250565b6105b58282610b50565b604080518381526020810183905233917f2b10481523b59a7978f8ab73b237349b0f38c801f6094bdc8994d379c067d71391015b60405180910390a25050565b61060083835f610bf2565b61060c84848484610c28565b60405184815233907fdd6c5b83be3557f8b2674712946f9f05dcd882b82bfd58b9539b9706efd35d8c906020015b60405180910390a250505050565b8080156107b55761065885610d3f565b61066184610d96565b5f8581527f672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd056020908152604080832087845290915290207f672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd00906106c381610def565b5f5b83811015610765576106f98686838181106106e2576106e261222a565b90506020028101906106f491906122f7565b610ed7565b61075c86868381811061070e5761070e61222a565b905060200281019061072091906122f7565b8080601f0160208091040260200160405190810160405280939291908181526020018383808284375f920191909152508693925050610f089050565b506001016106c5565b505f878152600483016020526040902061077f9087610f5e565b506040518690889033907f38ef31503bf60258feeceab5e2c3778cf74be2a8fbcc150d209ca96cd3c98553905f90a45050610423565b6104238585610f69565b6107ea60405180608001604052805f81526020015f1515815260200160608152602001606081525090565b5f5f6107f58461102b565b92509250505f6108048561112e565b60608501525060408301919091521515602082015290815290565b60605f61082a611190565b9050805167ffffffffffffffff811115610846576108466121fd565b6040519080825280602002602001820160405280156108a257816020015b61088f60405180608001604052805f81526020015f1515815260200160608152602001606081525090565b8152602001906001900390816108645790505b5091505f5b8151811015610943575f5f5f6108d58585815181106108c8576108c861222a565b602002602001015161102b565b9250925092505f6108fe8686815181106108f1576108f161222a565b602002602001015161112e565b90505f8786815181106109135761091361222a565b602090810291909101810151606081019390935260408301949094525090151591810191909152526001016108a7565b505090565b60606103a18261112e565b61095d82826111bc565b604080518381526020810183905233917faee688d80dbf97230e5d2b4b06aa7074bfe38ddd8abf856551177db30395612991016105e9565b6109a18484848461125d565b60405184815233907f94af4a611b3fb1eaa653a6b29f82b71bcea25ca378171c5f059010fa18e0716e9060200161063a565b5f807fd2f24d4f172e4e84e48e7c4125b6e904c29e5eba33ad4938fee51dd5dbd4b600805460018201546040517f6352211e000000000000000000000000000000000000000000000000000000008152600481019190915291925073ffffffffffffffffffffffffffffffffffffffff1690636352211e90602401602060405180830381865afa158015610a69573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610a8d9190612380565b91505090565b5f610aa78184610aa285612399565b6113eb565b9392505050565b805f5260045ffd5b610abf81610d96565b7f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300610aea81836116bb565b505f8281526002808301602052604082208281556001810180547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001690559190610b3690830182611e86565b50505f8281526003820160205260409020610207906116c6565b610b5982610d96565b610b62826116cf565b5f8281527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504303602052604090207f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af51850430090610bba8184611730565b15610be857610be87f2369ff3000000000000000000000000000000000000000000000000000000000610aae565b6104238184610f5e565b80821015610c2357610c237f947d5a8400000000000000000000000000000000000000000000000000000000610aae565b505050565b610c3184611747565b7f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300610c5c8186610f5e565b505f858152600280830160205260408220918791879187918591908201610c8484868361246a565b50509290925550505f8681526003830160205260408120905b8451811015610d3557610cd2858281518110610cbb57610cbb61222a565b60200260200101518361173090919063ffffffff16565b15610d0057610d007f2369ff3000000000000000000000000000000000000000000000000000000000610aae565b610d2c858281518110610d1557610d1561222a565b602002602001015183610f5e90919063ffffffff16565b50600101610c9d565b5050505050505050565b610d697f672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd0182611730565b6101bc576101bc7fa3f70f7b00000000000000000000000000000000000000000000000000000000610aae565b610dc2817f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af5185043005b90611730565b6101bc576101bc7fac16968200000000000000000000000000000000000000000000000000000000610aae565b805481905f5b81811015610ecf575f84815260208120820190505f610ebb86835f018054610e1c906123db565b80601f0160208091040260200160405190810160405280929190818152602001828054610e48906123db565b8015610e935780601f10610e6a57610100808354040283529160200191610e93565b820191905f5260205f20905b815481529060010190602001808311610e7657829003601f168201915b5050505050805180820160209081018051600195909501815291810192019190912091905290565b55610ec6815f611e86565b50600101610df5565b50505f905550565b5f819003610207576102077f0ce76c1000000000000000000000000000000000000000000000000000000000610aae565b805160208183018101805160018601825292820191840191909120919052805415908115610f57578354600181018086555f86815260209020869291908201610f518782612580565b50835550505b5092915050565b5f610aa7838361179f565b610f7282610d3f565b610f7b81610d96565b5f8281527f672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd056020908152604080832084845290915290207f672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd0090610fdd81610def565b5f8481526004830160205260409020610ff690846116bb565b506040518390859033907f07439707c74b686d8e4d3f3226348eac82205e6dffd780ac4c555a4c2dc9d86c905f90a450505050565b5f60605f61103884610d96565b5f8481527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af5185043026020526040902080546002820180549195507f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300929161109b906123db565b80601f01602080910402602001604051908101604052809291908181526020018280546110c7906123db565b80156111125780601f106110e957610100808354040283529160200191611112565b820191905f5260205f20905b8154815290600101906020018083116110f557829003601f168201915b50505060019093015496989197505060ff909516949350505050565b606061113982610d96565b5f8281527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504303602052604090207f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af51850430090610aa7906117eb565b60607f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300610a8d816117eb565b6111c582610d96565b6111ce826116cf565b5f8281527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504303602052604090207f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300906112268184611730565b611253576112537f6796073e00000000000000000000000000000000000000000000000000000000610aae565b61042381846116bb565b61126684610d96565b5f8481527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504302602052604090207f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af51850430090831580159061138c575061138a8160020180546112d0906123db565b80601f01602080910402602001604051908101604052809291908181526020018280546112fc906123db565b80156113475780601f1061131e57610100808354040283529160200191611347565b820191905f5260205f20905b81548152906001019060200180831161132a57829003601f168201915b505050505086868080601f0160208091040260200160405190810160405280939291908181526020018383808284375f9201919091525092939250506117f79050565b155b156113a257600281016113a085878361246a565b505b600181015460ff161515831515146113e3576001810180547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00168415151790555b505050505050565b5f5f6113f56109d3565b90505f6114018561180d565b80519091505f61140f611b51565b80519091505f5b838110156114fe575f8582815181106114315761143161222a565b602002602001015190508673ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff160361147e576001975050505050505050610aa7565b5f5b838110156114f4578173ffffffffffffffffffffffffffffffffffffffff166114c18683815181106114b4576114b461222a565b6020026020010151611b7c565b73ffffffffffffffffffffffffffffffffffffffff16036114ec575f98505050505050505050610aa7565b600101611480565b5050600101611416565b507fa558e822bd359dacbe30f0da89cbfde5f95895b441e13a4864caec1423c931005f61154a7fa558e822bd359dacbe30f0da89cbfde5f95895b441e13a4864caec1423c93101611b86565b90505f5b818110156116aa575f83816115666001830185611b8f565b73ffffffffffffffffffffffffffffffffffffffff908116825260208083019390935260409182015f205482517f2e1b61e40000000000000000000000000000000000000000000000000000000081529251911693508392632e1b61e492600480820193918290030181865afa1580156115e2573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906116069190612697565b15801561168a57508073ffffffffffffffffffffffffffffffffffffffff16630cf0b5338e8a8e6040518463ffffffff1660e01b815260040161164b939291906126b2565b602060405180830381865afa158015611666573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061168a9190612697565b156116a15760019950505050505050505050610aa7565b5060010161154e565b505f9b9a5050505050505050505050565b5f610aa78383611b9a565b6101bc81611c7d565b5f8181527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504302602052604090206001015460ff16156101bc576101bc7fd9c0051200000000000000000000000000000000000000000000000000000000610aae565b5f8181526001830160205260408120541515610aa7565b611771817f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300610dbc565b156101bc576101bc7f8c93df6400000000000000000000000000000000000000000000000000000000610aae565b5f8181526001830160205260408120546117e457508154600181810184555f8481526020808220909301849055845484825282860190935260409020919091556103a1565b505f6103a1565b60605f610aa783611cd6565b8051602091820120825192909101919091201490565b60605f7fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb600600601546040517f02345b9800000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff858116600483015290911691505f9082906302345b98906024015f60405180830381865afa1580156118a4573d5f5f3e3d5ffd5b505050506040513d5f823e601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01682016040526118e9919081019061271d565b905080515f03611a5a576040517ff821039800000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff85811660048301525f919084169063f821039890602401602060405180830381865afa158015611960573d5f5f3e3d5ffd5b505050506040513d601f19601f820116820180604052508101906119849190612380565b905073ffffffffffffffffffffffffffffffffffffffff811615611a58576040517f02345b9800000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff808316600483015291955085918416906302345b98906024015f60405180830381865afa158015611a10573d5f5f3e3d5ffd5b505050506040513d5f823e601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201604052611a55919081019061271d565b91505b505b80515f611a68826001612828565b67ffffffffffffffff811115611a8057611a806121fd565b604051908082528060200260200182016040528015611aa9578160200160208202803683370190505b5090505f5b82811015611b0f57838181518110611ac857611ac861222a565b6020026020010151828281518110611ae257611ae261222a565b73ffffffffffffffffffffffffffffffffffffffff90921660209283029190910190910152600101611aae565b5085818381518110611b2357611b2361222a565b73ffffffffffffffffffffffffffffffffffffffff9092166020928302919091019091015295945050505050565b60606104347f49daf035076c43671ca9f9fb568d931e51ab7f9098a5a694781b45341112cf006117eb565b5f6103a182611d2f565b5f6103a1825490565b5f610aa78383611e60565b5f8181526001830160205260408120548015611c74575f611bbc60018361283b565b85549091505f90611bcf9060019061283b565b9050808214611c2e575f865f018281548110611bed57611bed61222a565b905f5260205f200154905080875f018481548110611c0d57611c0d61222a565b5f918252602080832090910192909255918252600188019052604090208390555b8554869080611c3f57611c3f61284e565b600190038181905f5260205f20015f90559055856001015f8681526020019081526020015f205f9055600193505050506103a1565b5f9150506103a1565b5f611c86825490565b90505f5b81811015611ccf57826001015f845f018381548110611cab57611cab61222a565b905f5260205f20015481526020019081526020015f205f9055806001019050611c8a565b50505f9055565b6060815f01805480602002602001604051908101604052809291908181526020018280548015611d2357602002820191905f5260205f20905b815481526020019060010190808311611d0f575b50505050509050919050565b5f8181527f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df046020526040812054907f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df00907c010000000000000000000000000000000000000000000000000000000083169003611e2d57815f03611e275780548310611de6576040517fdf2d9b4200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9092015f81815260048401602052604090205490929091508115611de7575b50919050565b506040517fdf2d9b4200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f825f018281548110611e7557611e7561222a565b905f5260205f200154905092915050565b508054611e92906123db565b5f825580601f10611ea1575050565b601f0160209004905f5260205f20908101906101bc91905b80821115611ecc575f8155600101611eb9565b5090565b5f60208284031215611ee0575f5ffd5b5035919050565b5f5f60408385031215611ef8575f5ffd5b50508035926020909101359150565b5f5f83601f840112611f17575f5ffd5b50813567ffffffffffffffff811115611f2e575f5ffd5b602083019150836020828501011115611f45575f5ffd5b9250929050565b5f5f83601f840112611f5c575f5ffd5b50813567ffffffffffffffff811115611f73575f5ffd5b6020830191508360208260051b8501011115611f45575f5ffd5b5f5f5f5f5f60608688031215611fa1575f5ffd5b85359450602086013567ffffffffffffffff811115611fbe575f5ffd5b611fca88828901611f07565b909550935050604086013567ffffffffffffffff811115611fe9575f5ffd5b611ff588828901611f4c565b969995985093965092949392505050565b805182526020810151151560208301525f6040820151608060408501528051806080860152806020830160a087015e5f60a082870101527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f820116850191505060a08101606084015160a086840301606087015281815180845260c0850191506020830194505f93505b808410156120b55784518252602082019150602085019450600184019350612092565b509695505050505050565b602081525f610aa76020830184612006565b5f602082016020835280845180835260408501915060408160051b8601019250602086015f5b82811015612147577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc0878603018452612132858351612006565b945060209384019391909101906001016120f8565b50929695505050505050565b602080825282518282018190525f918401906040840190835b8181101561218a57835183526020938401939092019160010161216c565b509095945050505050565b80151581146101bc575f5ffd5b5f5f5f5f606085870312156121b5575f5ffd5b84359350602085013567ffffffffffffffff8111156121d2575f5ffd5b6121de87828801611f07565b90945092505060408501356121f281612195565b939692955090935050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b5f82357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc1833603018112612289575f5ffd5b9190910192915050565b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe18436030181126122c6575f5ffd5b83018035915067ffffffffffffffff8211156122e0575f5ffd5b6020019150600581901b3603821315611f45575f5ffd5b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe184360301811261232a575f5ffd5b83018035915067ffffffffffffffff821115612344575f5ffd5b602001915036819003821315611f45575f5ffd5b805173ffffffffffffffffffffffffffffffffffffffff8116811461237b575f5ffd5b919050565b5f60208284031215612390575f5ffd5b610aa782612358565b80516020808301519190811015611e27577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60209190910360031b1b16919050565b600181811c908216806123ef57607f821691505b602082108103611e27577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b601f821115610c2357805f5260205f20601f840160051c8101602085101561244b5750805b601f840160051c820191505b81811015610423575f8155600101612457565b67ffffffffffffffff831115612482576124826121fd565b6124968361249083546123db565b83612426565b5f601f8411600181146124e6575f85156124b05750838201355b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600387901b1c1916600186901b178355610423565b5f838152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08716915b828110156125335786850135825560209485019460019092019101612513565b508682101561256e577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60f88860031b161c19848701351681555b505060018560011b0183555050505050565b815167ffffffffffffffff81111561259a5761259a6121fd565b6125ae816125a884546123db565b84612426565b6020601f8211600181146125ff575f83156125c95750848201515b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600385901b1c1916600184901b178455610423565b5f848152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08516915b8281101561264c578785015182556020948501946001909201910161262c565b508482101561268857868401517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600387901b60f8161c191681555b50505050600190811b01905550565b5f602082840312156126a7575f5ffd5b8151610aa781612195565b5f60608201858352606060208401528085518083526080850191506020870192505f5b8181101561270957835173ffffffffffffffffffffffffffffffffffffffff168352602093840193909201916001016126d5565b505060409390930193909352509392505050565b5f6020828403121561272d575f5ffd5b815167ffffffffffffffff811115612743575f5ffd5b8201601f81018413612753575f5ffd5b805167ffffffffffffffff81111561276d5761276d6121fd565b8060051b6040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0603f830116810181811067ffffffffffffffff821117156127b8576127b86121fd565b6040529182526020818401810192908101878411156127d5575f5ffd5b6020850194505b838510156120b5576127ed85612358565b8152602094850194016127dc565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b808201808211156103a1576103a16127fb565b818103818111156103a1576103a16127fb565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603160045260245ffd",
}

// ChannelsABI is the input ABI used to generate the binding from.
// Deprecated: Use ChannelsMetaData.ABI instead.
var ChannelsABI = ChannelsMetaData.ABI

// ChannelsBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use ChannelsMetaData.Bin instead.
var ChannelsBin = ChannelsMetaData.Bin

// DeployChannels deploys a new Ethereum contract, binding an instance of Channels to it.
func DeployChannels(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *Channels, error) {
	parsed, err := ChannelsMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(ChannelsBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &Channels{ChannelsCaller: ChannelsCaller{contract: contract}, ChannelsTransactor: ChannelsTransactor{contract: contract}, ChannelsFilterer: ChannelsFilterer{contract: contract}}, nil
}

// Channels is an auto generated Go binding around an Ethereum contract.
type Channels struct {
	ChannelsCaller     // Read-only binding to the contract
	ChannelsTransactor // Write-only binding to the contract
	ChannelsFilterer   // Log filterer for contract events
}

// ChannelsCaller is an auto generated read-only Go binding around an Ethereum contract.
type ChannelsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ChannelsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type ChannelsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ChannelsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type ChannelsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ChannelsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type ChannelsSession struct {
	Contract     *Channels         // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// ChannelsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type ChannelsCallerSession struct {
	Contract *ChannelsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts   // Call options to use throughout this session
}

// ChannelsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type ChannelsTransactorSession struct {
	Contract     *ChannelsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts   // Transaction auth options to use throughout this session
}

// ChannelsRaw is an auto generated low-level Go binding around an Ethereum contract.
type ChannelsRaw struct {
	Contract *Channels // Generic contract binding to access the raw methods on
}

// ChannelsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type ChannelsCallerRaw struct {
	Contract *ChannelsCaller // Generic read-only contract binding to access the raw methods on
}

// ChannelsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type ChannelsTransactorRaw struct {
	Contract *ChannelsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewChannels creates a new instance of Channels, bound to a specific deployed contract.
func NewChannels(address common.Address, backend bind.ContractBackend) (*Channels, error) {
	contract, err := bindChannels(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Channels{ChannelsCaller: ChannelsCaller{contract: contract}, ChannelsTransactor: ChannelsTransactor{contract: contract}, ChannelsFilterer: ChannelsFilterer{contract: contract}}, nil
}

// NewChannelsCaller creates a new read-only instance of Channels, bound to a specific deployed contract.
func NewChannelsCaller(address common.Address, caller bind.ContractCaller) (*ChannelsCaller, error) {
	contract, err := bindChannels(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &ChannelsCaller{contract: contract}, nil
}

// NewChannelsTransactor creates a new write-only instance of Channels, bound to a specific deployed contract.
func NewChannelsTransactor(address common.Address, transactor bind.ContractTransactor) (*ChannelsTransactor, error) {
	contract, err := bindChannels(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &ChannelsTransactor{contract: contract}, nil
}

// NewChannelsFilterer creates a new log filterer instance of Channels, bound to a specific deployed contract.
func NewChannelsFilterer(address common.Address, filterer bind.ContractFilterer) (*ChannelsFilterer, error) {
	contract, err := bindChannels(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &ChannelsFilterer{contract: contract}, nil
}

// bindChannels binds a generic wrapper to an already deployed contract.
func bindChannels(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := ChannelsMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Channels *ChannelsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Channels.Contract.ChannelsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Channels *ChannelsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Channels.Contract.ChannelsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Channels *ChannelsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Channels.Contract.ChannelsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Channels *ChannelsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Channels.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Channels *ChannelsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Channels.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Channels *ChannelsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Channels.Contract.contract.Transact(opts, method, params...)
}

// GetChannel is a free data retrieval call binding the contract method 0x831c2b82.
//
// Solidity: function getChannel(bytes32 channelId) view returns((bytes32,bool,string,uint256[]) channel)
func (_Channels *ChannelsCaller) GetChannel(opts *bind.CallOpts, channelId [32]byte) (IChannelBaseChannel, error) {
	var out []interface{}
	err := _Channels.contract.Call(opts, &out, "getChannel", channelId)

	if err != nil {
		return *new(IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new(IChannelBaseChannel)).(*IChannelBaseChannel)

	return out0, err

}

// GetChannel is a free data retrieval call binding the contract method 0x831c2b82.
//
// Solidity: function getChannel(bytes32 channelId) view returns((bytes32,bool,string,uint256[]) channel)
func (_Channels *ChannelsSession) GetChannel(channelId [32]byte) (IChannelBaseChannel, error) {
	return _Channels.Contract.GetChannel(&_Channels.CallOpts, channelId)
}

// GetChannel is a free data retrieval call binding the contract method 0x831c2b82.
//
// Solidity: function getChannel(bytes32 channelId) view returns((bytes32,bool,string,uint256[]) channel)
func (_Channels *ChannelsCallerSession) GetChannel(channelId [32]byte) (IChannelBaseChannel, error) {
	return _Channels.Contract.GetChannel(&_Channels.CallOpts, channelId)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((bytes32,bool,string,uint256[])[] channels)
func (_Channels *ChannelsCaller) GetChannels(opts *bind.CallOpts) ([]IChannelBaseChannel, error) {
	var out []interface{}
	err := _Channels.contract.Call(opts, &out, "getChannels")

	if err != nil {
		return *new([]IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new([]IChannelBaseChannel)).(*[]IChannelBaseChannel)

	return out0, err

}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((bytes32,bool,string,uint256[])[] channels)
func (_Channels *ChannelsSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _Channels.Contract.GetChannels(&_Channels.CallOpts)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((bytes32,bool,string,uint256[])[] channels)
func (_Channels *ChannelsCallerSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _Channels.Contract.GetChannels(&_Channels.CallOpts)
}

// GetRolesByChannel is a free data retrieval call binding the contract method 0x99352183.
//
// Solidity: function getRolesByChannel(bytes32 channelId) view returns(uint256[] roleIds)
func (_Channels *ChannelsCaller) GetRolesByChannel(opts *bind.CallOpts, channelId [32]byte) ([]*big.Int, error) {
	var out []interface{}
	err := _Channels.contract.Call(opts, &out, "getRolesByChannel", channelId)

	if err != nil {
		return *new([]*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new([]*big.Int)).(*[]*big.Int)

	return out0, err

}

// GetRolesByChannel is a free data retrieval call binding the contract method 0x99352183.
//
// Solidity: function getRolesByChannel(bytes32 channelId) view returns(uint256[] roleIds)
func (_Channels *ChannelsSession) GetRolesByChannel(channelId [32]byte) ([]*big.Int, error) {
	return _Channels.Contract.GetRolesByChannel(&_Channels.CallOpts, channelId)
}

// GetRolesByChannel is a free data retrieval call binding the contract method 0x99352183.
//
// Solidity: function getRolesByChannel(bytes32 channelId) view returns(uint256[] roleIds)
func (_Channels *ChannelsCallerSession) GetRolesByChannel(channelId [32]byte) ([]*big.Int, error) {
	return _Channels.Contract.GetRolesByChannel(&_Channels.CallOpts, channelId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x37644cf7.
//
// Solidity: function addRoleToChannel(bytes32 channelId, uint256 roleId) returns()
func (_Channels *ChannelsTransactor) AddRoleToChannel(opts *bind.TransactOpts, channelId [32]byte, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "addRoleToChannel", channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x37644cf7.
//
// Solidity: function addRoleToChannel(bytes32 channelId, uint256 roleId) returns()
func (_Channels *ChannelsSession) AddRoleToChannel(channelId [32]byte, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.Contract.AddRoleToChannel(&_Channels.TransactOpts, channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x37644cf7.
//
// Solidity: function addRoleToChannel(bytes32 channelId, uint256 roleId) returns()
func (_Channels *ChannelsTransactorSession) AddRoleToChannel(channelId [32]byte, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.Contract.AddRoleToChannel(&_Channels.TransactOpts, channelId, roleId)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x921f7175.
//
// Solidity: function createChannel(bytes32 channelId, string metadata, uint256[] roleIds) returns()
func (_Channels *ChannelsTransactor) CreateChannel(opts *bind.TransactOpts, channelId [32]byte, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "createChannel", channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x921f7175.
//
// Solidity: function createChannel(bytes32 channelId, string metadata, uint256[] roleIds) returns()
func (_Channels *ChannelsSession) CreateChannel(channelId [32]byte, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _Channels.Contract.CreateChannel(&_Channels.TransactOpts, channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x921f7175.
//
// Solidity: function createChannel(bytes32 channelId, string metadata, uint256[] roleIds) returns()
func (_Channels *ChannelsTransactorSession) CreateChannel(channelId [32]byte, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _Channels.Contract.CreateChannel(&_Channels.TransactOpts, channelId, metadata, roleIds)
}

// CreateChannelWithOverridePermissions is a paid mutator transaction binding the contract method 0x5a2dce7a.
//
// Solidity: function createChannelWithOverridePermissions(bytes32 channelId, string metadata, (uint256,string[])[] rolePermissions) returns()
func (_Channels *ChannelsTransactor) CreateChannelWithOverridePermissions(opts *bind.TransactOpts, channelId [32]byte, metadata string, rolePermissions []IChannelBaseRolePermissions) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "createChannelWithOverridePermissions", channelId, metadata, rolePermissions)
}

// CreateChannelWithOverridePermissions is a paid mutator transaction binding the contract method 0x5a2dce7a.
//
// Solidity: function createChannelWithOverridePermissions(bytes32 channelId, string metadata, (uint256,string[])[] rolePermissions) returns()
func (_Channels *ChannelsSession) CreateChannelWithOverridePermissions(channelId [32]byte, metadata string, rolePermissions []IChannelBaseRolePermissions) (*types.Transaction, error) {
	return _Channels.Contract.CreateChannelWithOverridePermissions(&_Channels.TransactOpts, channelId, metadata, rolePermissions)
}

// CreateChannelWithOverridePermissions is a paid mutator transaction binding the contract method 0x5a2dce7a.
//
// Solidity: function createChannelWithOverridePermissions(bytes32 channelId, string metadata, (uint256,string[])[] rolePermissions) returns()
func (_Channels *ChannelsTransactorSession) CreateChannelWithOverridePermissions(channelId [32]byte, metadata string, rolePermissions []IChannelBaseRolePermissions) (*types.Transaction, error) {
	return _Channels.Contract.CreateChannelWithOverridePermissions(&_Channels.TransactOpts, channelId, metadata, rolePermissions)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x02da0e51.
//
// Solidity: function removeChannel(bytes32 channelId) returns()
func (_Channels *ChannelsTransactor) RemoveChannel(opts *bind.TransactOpts, channelId [32]byte) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "removeChannel", channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x02da0e51.
//
// Solidity: function removeChannel(bytes32 channelId) returns()
func (_Channels *ChannelsSession) RemoveChannel(channelId [32]byte) (*types.Transaction, error) {
	return _Channels.Contract.RemoveChannel(&_Channels.TransactOpts, channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x02da0e51.
//
// Solidity: function removeChannel(bytes32 channelId) returns()
func (_Channels *ChannelsTransactorSession) RemoveChannel(channelId [32]byte) (*types.Transaction, error) {
	return _Channels.Contract.RemoveChannel(&_Channels.TransactOpts, channelId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0xb9de6159.
//
// Solidity: function removeRoleFromChannel(bytes32 channelId, uint256 roleId) returns()
func (_Channels *ChannelsTransactor) RemoveRoleFromChannel(opts *bind.TransactOpts, channelId [32]byte, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "removeRoleFromChannel", channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0xb9de6159.
//
// Solidity: function removeRoleFromChannel(bytes32 channelId, uint256 roleId) returns()
func (_Channels *ChannelsSession) RemoveRoleFromChannel(channelId [32]byte, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.Contract.RemoveRoleFromChannel(&_Channels.TransactOpts, channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0xb9de6159.
//
// Solidity: function removeRoleFromChannel(bytes32 channelId, uint256 roleId) returns()
func (_Channels *ChannelsTransactorSession) RemoveRoleFromChannel(channelId [32]byte, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.Contract.RemoveRoleFromChannel(&_Channels.TransactOpts, channelId, roleId)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0xef86d696.
//
// Solidity: function updateChannel(bytes32 channelId, string metadata, bool disabled) returns()
func (_Channels *ChannelsTransactor) UpdateChannel(opts *bind.TransactOpts, channelId [32]byte, metadata string, disabled bool) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "updateChannel", channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0xef86d696.
//
// Solidity: function updateChannel(bytes32 channelId, string metadata, bool disabled) returns()
func (_Channels *ChannelsSession) UpdateChannel(channelId [32]byte, metadata string, disabled bool) (*types.Transaction, error) {
	return _Channels.Contract.UpdateChannel(&_Channels.TransactOpts, channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0xef86d696.
//
// Solidity: function updateChannel(bytes32 channelId, string metadata, bool disabled) returns()
func (_Channels *ChannelsTransactorSession) UpdateChannel(channelId [32]byte, metadata string, disabled bool) (*types.Transaction, error) {
	return _Channels.Contract.UpdateChannel(&_Channels.TransactOpts, channelId, metadata, disabled)
}

// ChannelsApprovalIterator is returned from FilterApproval and is used to iterate over the raw logs and unpacked data for Approval events raised by the Channels contract.
type ChannelsApprovalIterator struct {
	Event *ChannelsApproval // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsApprovalIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsApproval)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsApproval)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsApprovalIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsApprovalIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsApproval represents a Approval event raised by the Channels contract.
type ChannelsApproval struct {
	Owner    common.Address
	Approved common.Address
	TokenId  *big.Int
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApproval is a free log retrieval operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) FilterApproval(opts *bind.FilterOpts, owner []common.Address, approved []common.Address, tokenId []*big.Int) (*ChannelsApprovalIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var approvedRule []interface{}
	for _, approvedItem := range approved {
		approvedRule = append(approvedRule, approvedItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "Approval", ownerRule, approvedRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsApprovalIterator{contract: _Channels.contract, event: "Approval", logs: logs, sub: sub}, nil
}

// WatchApproval is a free log subscription operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) WatchApproval(opts *bind.WatchOpts, sink chan<- *ChannelsApproval, owner []common.Address, approved []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var approvedRule []interface{}
	for _, approvedItem := range approved {
		approvedRule = append(approvedRule, approvedItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "Approval", ownerRule, approvedRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsApproval)
				if err := _Channels.contract.UnpackLog(event, "Approval", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseApproval is a log parse operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) ParseApproval(log types.Log) (*ChannelsApproval, error) {
	event := new(ChannelsApproval)
	if err := _Channels.contract.UnpackLog(event, "Approval", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsApprovalForAllIterator is returned from FilterApprovalForAll and is used to iterate over the raw logs and unpacked data for ApprovalForAll events raised by the Channels contract.
type ChannelsApprovalForAllIterator struct {
	Event *ChannelsApprovalForAll // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsApprovalForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsApprovalForAll)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsApprovalForAll)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsApprovalForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsApprovalForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsApprovalForAll represents a ApprovalForAll event raised by the Channels contract.
type ChannelsApprovalForAll struct {
	Owner    common.Address
	Operator common.Address
	Approved bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApprovalForAll is a free log retrieval operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_Channels *ChannelsFilterer) FilterApprovalForAll(opts *bind.FilterOpts, owner []common.Address, operator []common.Address) (*ChannelsApprovalForAllIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "ApprovalForAll", ownerRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsApprovalForAllIterator{contract: _Channels.contract, event: "ApprovalForAll", logs: logs, sub: sub}, nil
}

// WatchApprovalForAll is a free log subscription operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_Channels *ChannelsFilterer) WatchApprovalForAll(opts *bind.WatchOpts, sink chan<- *ChannelsApprovalForAll, owner []common.Address, operator []common.Address) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "ApprovalForAll", ownerRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsApprovalForAll)
				if err := _Channels.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseApprovalForAll is a log parse operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_Channels *ChannelsFilterer) ParseApprovalForAll(log types.Log) (*ChannelsApprovalForAll, error) {
	event := new(ChannelsApprovalForAll)
	if err := _Channels.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsBannedIterator is returned from FilterBanned and is used to iterate over the raw logs and unpacked data for Banned events raised by the Channels contract.
type ChannelsBannedIterator struct {
	Event *ChannelsBanned // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsBannedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsBanned)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsBanned)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsBannedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsBannedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsBanned represents a Banned event raised by the Channels contract.
type ChannelsBanned struct {
	Moderator common.Address
	TokenId   *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterBanned is a free log retrieval operation binding the contract event 0x8f9d2f181f599e221d5959b9acbebb1f42c8146251755fd61fc0de85f5d97162.
//
// Solidity: event Banned(address indexed moderator, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) FilterBanned(opts *bind.FilterOpts, moderator []common.Address, tokenId []*big.Int) (*ChannelsBannedIterator, error) {

	var moderatorRule []interface{}
	for _, moderatorItem := range moderator {
		moderatorRule = append(moderatorRule, moderatorItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "Banned", moderatorRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsBannedIterator{contract: _Channels.contract, event: "Banned", logs: logs, sub: sub}, nil
}

// WatchBanned is a free log subscription operation binding the contract event 0x8f9d2f181f599e221d5959b9acbebb1f42c8146251755fd61fc0de85f5d97162.
//
// Solidity: event Banned(address indexed moderator, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) WatchBanned(opts *bind.WatchOpts, sink chan<- *ChannelsBanned, moderator []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var moderatorRule []interface{}
	for _, moderatorItem := range moderator {
		moderatorRule = append(moderatorRule, moderatorItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "Banned", moderatorRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsBanned)
				if err := _Channels.contract.UnpackLog(event, "Banned", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseBanned is a log parse operation binding the contract event 0x8f9d2f181f599e221d5959b9acbebb1f42c8146251755fd61fc0de85f5d97162.
//
// Solidity: event Banned(address indexed moderator, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) ParseBanned(log types.Log) (*ChannelsBanned, error) {
	event := new(ChannelsBanned)
	if err := _Channels.contract.UnpackLog(event, "Banned", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsChannelCreatedIterator is returned from FilterChannelCreated and is used to iterate over the raw logs and unpacked data for ChannelCreated events raised by the Channels contract.
type ChannelsChannelCreatedIterator struct {
	Event *ChannelsChannelCreated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsChannelCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsChannelCreated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsChannelCreated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsChannelCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsChannelCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsChannelCreated represents a ChannelCreated event raised by the Channels contract.
type ChannelsChannelCreated struct {
	Caller    common.Address
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelCreated is a free log retrieval operation binding the contract event 0xdd6c5b83be3557f8b2674712946f9f05dcd882b82bfd58b9539b9706efd35d8c.
//
// Solidity: event ChannelCreated(address indexed caller, bytes32 channelId)
func (_Channels *ChannelsFilterer) FilterChannelCreated(opts *bind.FilterOpts, caller []common.Address) (*ChannelsChannelCreatedIterator, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "ChannelCreated", callerRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsChannelCreatedIterator{contract: _Channels.contract, event: "ChannelCreated", logs: logs, sub: sub}, nil
}

// WatchChannelCreated is a free log subscription operation binding the contract event 0xdd6c5b83be3557f8b2674712946f9f05dcd882b82bfd58b9539b9706efd35d8c.
//
// Solidity: event ChannelCreated(address indexed caller, bytes32 channelId)
func (_Channels *ChannelsFilterer) WatchChannelCreated(opts *bind.WatchOpts, sink chan<- *ChannelsChannelCreated, caller []common.Address) (event.Subscription, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "ChannelCreated", callerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsChannelCreated)
				if err := _Channels.contract.UnpackLog(event, "ChannelCreated", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseChannelCreated is a log parse operation binding the contract event 0xdd6c5b83be3557f8b2674712946f9f05dcd882b82bfd58b9539b9706efd35d8c.
//
// Solidity: event ChannelCreated(address indexed caller, bytes32 channelId)
func (_Channels *ChannelsFilterer) ParseChannelCreated(log types.Log) (*ChannelsChannelCreated, error) {
	event := new(ChannelsChannelCreated)
	if err := _Channels.contract.UnpackLog(event, "ChannelCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsChannelRemovedIterator is returned from FilterChannelRemoved and is used to iterate over the raw logs and unpacked data for ChannelRemoved events raised by the Channels contract.
type ChannelsChannelRemovedIterator struct {
	Event *ChannelsChannelRemoved // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsChannelRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsChannelRemoved)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsChannelRemoved)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsChannelRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsChannelRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsChannelRemoved represents a ChannelRemoved event raised by the Channels contract.
type ChannelsChannelRemoved struct {
	Caller    common.Address
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelRemoved is a free log retrieval operation binding the contract event 0x3a3f387aa42656bc1732adfc7aea5cde9ccc05a59f9af9c29ebfa68e66383e93.
//
// Solidity: event ChannelRemoved(address indexed caller, bytes32 channelId)
func (_Channels *ChannelsFilterer) FilterChannelRemoved(opts *bind.FilterOpts, caller []common.Address) (*ChannelsChannelRemovedIterator, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "ChannelRemoved", callerRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsChannelRemovedIterator{contract: _Channels.contract, event: "ChannelRemoved", logs: logs, sub: sub}, nil
}

// WatchChannelRemoved is a free log subscription operation binding the contract event 0x3a3f387aa42656bc1732adfc7aea5cde9ccc05a59f9af9c29ebfa68e66383e93.
//
// Solidity: event ChannelRemoved(address indexed caller, bytes32 channelId)
func (_Channels *ChannelsFilterer) WatchChannelRemoved(opts *bind.WatchOpts, sink chan<- *ChannelsChannelRemoved, caller []common.Address) (event.Subscription, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "ChannelRemoved", callerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsChannelRemoved)
				if err := _Channels.contract.UnpackLog(event, "ChannelRemoved", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseChannelRemoved is a log parse operation binding the contract event 0x3a3f387aa42656bc1732adfc7aea5cde9ccc05a59f9af9c29ebfa68e66383e93.
//
// Solidity: event ChannelRemoved(address indexed caller, bytes32 channelId)
func (_Channels *ChannelsFilterer) ParseChannelRemoved(log types.Log) (*ChannelsChannelRemoved, error) {
	event := new(ChannelsChannelRemoved)
	if err := _Channels.contract.UnpackLog(event, "ChannelRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsChannelRoleAddedIterator is returned from FilterChannelRoleAdded and is used to iterate over the raw logs and unpacked data for ChannelRoleAdded events raised by the Channels contract.
type ChannelsChannelRoleAddedIterator struct {
	Event *ChannelsChannelRoleAdded // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsChannelRoleAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsChannelRoleAdded)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsChannelRoleAdded)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsChannelRoleAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsChannelRoleAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsChannelRoleAdded represents a ChannelRoleAdded event raised by the Channels contract.
type ChannelsChannelRoleAdded struct {
	Caller    common.Address
	ChannelId [32]byte
	RoleId    *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelRoleAdded is a free log retrieval operation binding the contract event 0x2b10481523b59a7978f8ab73b237349b0f38c801f6094bdc8994d379c067d713.
//
// Solidity: event ChannelRoleAdded(address indexed caller, bytes32 channelId, uint256 roleId)
func (_Channels *ChannelsFilterer) FilterChannelRoleAdded(opts *bind.FilterOpts, caller []common.Address) (*ChannelsChannelRoleAddedIterator, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "ChannelRoleAdded", callerRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsChannelRoleAddedIterator{contract: _Channels.contract, event: "ChannelRoleAdded", logs: logs, sub: sub}, nil
}

// WatchChannelRoleAdded is a free log subscription operation binding the contract event 0x2b10481523b59a7978f8ab73b237349b0f38c801f6094bdc8994d379c067d713.
//
// Solidity: event ChannelRoleAdded(address indexed caller, bytes32 channelId, uint256 roleId)
func (_Channels *ChannelsFilterer) WatchChannelRoleAdded(opts *bind.WatchOpts, sink chan<- *ChannelsChannelRoleAdded, caller []common.Address) (event.Subscription, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "ChannelRoleAdded", callerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsChannelRoleAdded)
				if err := _Channels.contract.UnpackLog(event, "ChannelRoleAdded", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseChannelRoleAdded is a log parse operation binding the contract event 0x2b10481523b59a7978f8ab73b237349b0f38c801f6094bdc8994d379c067d713.
//
// Solidity: event ChannelRoleAdded(address indexed caller, bytes32 channelId, uint256 roleId)
func (_Channels *ChannelsFilterer) ParseChannelRoleAdded(log types.Log) (*ChannelsChannelRoleAdded, error) {
	event := new(ChannelsChannelRoleAdded)
	if err := _Channels.contract.UnpackLog(event, "ChannelRoleAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsChannelRoleRemovedIterator is returned from FilterChannelRoleRemoved and is used to iterate over the raw logs and unpacked data for ChannelRoleRemoved events raised by the Channels contract.
type ChannelsChannelRoleRemovedIterator struct {
	Event *ChannelsChannelRoleRemoved // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsChannelRoleRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsChannelRoleRemoved)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsChannelRoleRemoved)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsChannelRoleRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsChannelRoleRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsChannelRoleRemoved represents a ChannelRoleRemoved event raised by the Channels contract.
type ChannelsChannelRoleRemoved struct {
	Caller    common.Address
	ChannelId [32]byte
	RoleId    *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelRoleRemoved is a free log retrieval operation binding the contract event 0xaee688d80dbf97230e5d2b4b06aa7074bfe38ddd8abf856551177db303956129.
//
// Solidity: event ChannelRoleRemoved(address indexed caller, bytes32 channelId, uint256 roleId)
func (_Channels *ChannelsFilterer) FilterChannelRoleRemoved(opts *bind.FilterOpts, caller []common.Address) (*ChannelsChannelRoleRemovedIterator, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "ChannelRoleRemoved", callerRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsChannelRoleRemovedIterator{contract: _Channels.contract, event: "ChannelRoleRemoved", logs: logs, sub: sub}, nil
}

// WatchChannelRoleRemoved is a free log subscription operation binding the contract event 0xaee688d80dbf97230e5d2b4b06aa7074bfe38ddd8abf856551177db303956129.
//
// Solidity: event ChannelRoleRemoved(address indexed caller, bytes32 channelId, uint256 roleId)
func (_Channels *ChannelsFilterer) WatchChannelRoleRemoved(opts *bind.WatchOpts, sink chan<- *ChannelsChannelRoleRemoved, caller []common.Address) (event.Subscription, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "ChannelRoleRemoved", callerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsChannelRoleRemoved)
				if err := _Channels.contract.UnpackLog(event, "ChannelRoleRemoved", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseChannelRoleRemoved is a log parse operation binding the contract event 0xaee688d80dbf97230e5d2b4b06aa7074bfe38ddd8abf856551177db303956129.
//
// Solidity: event ChannelRoleRemoved(address indexed caller, bytes32 channelId, uint256 roleId)
func (_Channels *ChannelsFilterer) ParseChannelRoleRemoved(log types.Log) (*ChannelsChannelRoleRemoved, error) {
	event := new(ChannelsChannelRoleRemoved)
	if err := _Channels.contract.UnpackLog(event, "ChannelRoleRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsChannelUpdatedIterator is returned from FilterChannelUpdated and is used to iterate over the raw logs and unpacked data for ChannelUpdated events raised by the Channels contract.
type ChannelsChannelUpdatedIterator struct {
	Event *ChannelsChannelUpdated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsChannelUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsChannelUpdated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsChannelUpdated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsChannelUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsChannelUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsChannelUpdated represents a ChannelUpdated event raised by the Channels contract.
type ChannelsChannelUpdated struct {
	Caller    common.Address
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelUpdated is a free log retrieval operation binding the contract event 0x94af4a611b3fb1eaa653a6b29f82b71bcea25ca378171c5f059010fa18e0716e.
//
// Solidity: event ChannelUpdated(address indexed caller, bytes32 channelId)
func (_Channels *ChannelsFilterer) FilterChannelUpdated(opts *bind.FilterOpts, caller []common.Address) (*ChannelsChannelUpdatedIterator, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "ChannelUpdated", callerRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsChannelUpdatedIterator{contract: _Channels.contract, event: "ChannelUpdated", logs: logs, sub: sub}, nil
}

// WatchChannelUpdated is a free log subscription operation binding the contract event 0x94af4a611b3fb1eaa653a6b29f82b71bcea25ca378171c5f059010fa18e0716e.
//
// Solidity: event ChannelUpdated(address indexed caller, bytes32 channelId)
func (_Channels *ChannelsFilterer) WatchChannelUpdated(opts *bind.WatchOpts, sink chan<- *ChannelsChannelUpdated, caller []common.Address) (event.Subscription, error) {

	var callerRule []interface{}
	for _, callerItem := range caller {
		callerRule = append(callerRule, callerItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "ChannelUpdated", callerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsChannelUpdated)
				if err := _Channels.contract.UnpackLog(event, "ChannelUpdated", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseChannelUpdated is a log parse operation binding the contract event 0x94af4a611b3fb1eaa653a6b29f82b71bcea25ca378171c5f059010fa18e0716e.
//
// Solidity: event ChannelUpdated(address indexed caller, bytes32 channelId)
func (_Channels *ChannelsFilterer) ParseChannelUpdated(log types.Log) (*ChannelsChannelUpdated, error) {
	event := new(ChannelsChannelUpdated)
	if err := _Channels.contract.UnpackLog(event, "ChannelUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsConsecutiveTransferIterator is returned from FilterConsecutiveTransfer and is used to iterate over the raw logs and unpacked data for ConsecutiveTransfer events raised by the Channels contract.
type ChannelsConsecutiveTransferIterator struct {
	Event *ChannelsConsecutiveTransfer // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsConsecutiveTransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsConsecutiveTransfer)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsConsecutiveTransfer)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsConsecutiveTransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsConsecutiveTransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsConsecutiveTransfer represents a ConsecutiveTransfer event raised by the Channels contract.
type ChannelsConsecutiveTransfer struct {
	FromTokenId *big.Int
	ToTokenId   *big.Int
	From        common.Address
	To          common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterConsecutiveTransfer is a free log retrieval operation binding the contract event 0xdeaa91b6123d068f5821d0fb0678463d1a8a6079fe8af5de3ce5e896dcf9133d.
//
// Solidity: event ConsecutiveTransfer(uint256 indexed fromTokenId, uint256 toTokenId, address indexed from, address indexed to)
func (_Channels *ChannelsFilterer) FilterConsecutiveTransfer(opts *bind.FilterOpts, fromTokenId []*big.Int, from []common.Address, to []common.Address) (*ChannelsConsecutiveTransferIterator, error) {

	var fromTokenIdRule []interface{}
	for _, fromTokenIdItem := range fromTokenId {
		fromTokenIdRule = append(fromTokenIdRule, fromTokenIdItem)
	}

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "ConsecutiveTransfer", fromTokenIdRule, fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsConsecutiveTransferIterator{contract: _Channels.contract, event: "ConsecutiveTransfer", logs: logs, sub: sub}, nil
}

// WatchConsecutiveTransfer is a free log subscription operation binding the contract event 0xdeaa91b6123d068f5821d0fb0678463d1a8a6079fe8af5de3ce5e896dcf9133d.
//
// Solidity: event ConsecutiveTransfer(uint256 indexed fromTokenId, uint256 toTokenId, address indexed from, address indexed to)
func (_Channels *ChannelsFilterer) WatchConsecutiveTransfer(opts *bind.WatchOpts, sink chan<- *ChannelsConsecutiveTransfer, fromTokenId []*big.Int, from []common.Address, to []common.Address) (event.Subscription, error) {

	var fromTokenIdRule []interface{}
	for _, fromTokenIdItem := range fromTokenId {
		fromTokenIdRule = append(fromTokenIdRule, fromTokenIdItem)
	}

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "ConsecutiveTransfer", fromTokenIdRule, fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsConsecutiveTransfer)
				if err := _Channels.contract.UnpackLog(event, "ConsecutiveTransfer", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseConsecutiveTransfer is a log parse operation binding the contract event 0xdeaa91b6123d068f5821d0fb0678463d1a8a6079fe8af5de3ce5e896dcf9133d.
//
// Solidity: event ConsecutiveTransfer(uint256 indexed fromTokenId, uint256 toTokenId, address indexed from, address indexed to)
func (_Channels *ChannelsFilterer) ParseConsecutiveTransfer(log types.Log) (*ChannelsConsecutiveTransfer, error) {
	event := new(ChannelsConsecutiveTransfer)
	if err := _Channels.contract.UnpackLog(event, "ConsecutiveTransfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the Channels contract.
type ChannelsInitializedIterator struct {
	Event *ChannelsInitialized // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsInitialized)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsInitialized)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsInitialized represents a Initialized event raised by the Channels contract.
type ChannelsInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_Channels *ChannelsFilterer) FilterInitialized(opts *bind.FilterOpts) (*ChannelsInitializedIterator, error) {

	logs, sub, err := _Channels.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &ChannelsInitializedIterator{contract: _Channels.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_Channels *ChannelsFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *ChannelsInitialized) (event.Subscription, error) {

	logs, sub, err := _Channels.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsInitialized)
				if err := _Channels.contract.UnpackLog(event, "Initialized", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseInitialized is a log parse operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_Channels *ChannelsFilterer) ParseInitialized(log types.Log) (*ChannelsInitialized, error) {
	event := new(ChannelsInitialized)
	if err := _Channels.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the Channels contract.
type ChannelsInterfaceAddedIterator struct {
	Event *ChannelsInterfaceAdded // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsInterfaceAdded)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsInterfaceAdded)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsInterfaceAdded represents a InterfaceAdded event raised by the Channels contract.
type ChannelsInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_Channels *ChannelsFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*ChannelsInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsInterfaceAddedIterator{contract: _Channels.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_Channels *ChannelsFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *ChannelsInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsInterfaceAdded)
				if err := _Channels.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseInterfaceAdded is a log parse operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_Channels *ChannelsFilterer) ParseInterfaceAdded(log types.Log) (*ChannelsInterfaceAdded, error) {
	event := new(ChannelsInterfaceAdded)
	if err := _Channels.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the Channels contract.
type ChannelsInterfaceRemovedIterator struct {
	Event *ChannelsInterfaceRemoved // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsInterfaceRemoved)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsInterfaceRemoved)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsInterfaceRemoved represents a InterfaceRemoved event raised by the Channels contract.
type ChannelsInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_Channels *ChannelsFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*ChannelsInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsInterfaceRemovedIterator{contract: _Channels.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_Channels *ChannelsFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *ChannelsInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsInterfaceRemoved)
				if err := _Channels.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseInterfaceRemoved is a log parse operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_Channels *ChannelsFilterer) ParseInterfaceRemoved(log types.Log) (*ChannelsInterfaceRemoved, error) {
	event := new(ChannelsInterfaceRemoved)
	if err := _Channels.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the Channels contract.
type ChannelsOwnershipTransferredIterator struct {
	Event *ChannelsOwnershipTransferred // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsOwnershipTransferred)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsOwnershipTransferred)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsOwnershipTransferred represents a OwnershipTransferred event raised by the Channels contract.
type ChannelsOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_Channels *ChannelsFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*ChannelsOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsOwnershipTransferredIterator{contract: _Channels.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_Channels *ChannelsFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *ChannelsOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsOwnershipTransferred)
				if err := _Channels.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseOwnershipTransferred is a log parse operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_Channels *ChannelsFilterer) ParseOwnershipTransferred(log types.Log) (*ChannelsOwnershipTransferred, error) {
	event := new(ChannelsOwnershipTransferred)
	if err := _Channels.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsPausedIterator is returned from FilterPaused and is used to iterate over the raw logs and unpacked data for Paused events raised by the Channels contract.
type ChannelsPausedIterator struct {
	Event *ChannelsPaused // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsPausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsPaused)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsPaused)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsPausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsPausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsPaused represents a Paused event raised by the Channels contract.
type ChannelsPaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterPaused is a free log retrieval operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_Channels *ChannelsFilterer) FilterPaused(opts *bind.FilterOpts) (*ChannelsPausedIterator, error) {

	logs, sub, err := _Channels.contract.FilterLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return &ChannelsPausedIterator{contract: _Channels.contract, event: "Paused", logs: logs, sub: sub}, nil
}

// WatchPaused is a free log subscription operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_Channels *ChannelsFilterer) WatchPaused(opts *bind.WatchOpts, sink chan<- *ChannelsPaused) (event.Subscription, error) {

	logs, sub, err := _Channels.contract.WatchLogs(opts, "Paused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsPaused)
				if err := _Channels.contract.UnpackLog(event, "Paused", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParsePaused is a log parse operation binding the contract event 0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258.
//
// Solidity: event Paused(address account)
func (_Channels *ChannelsFilterer) ParsePaused(log types.Log) (*ChannelsPaused, error) {
	event := new(ChannelsPaused)
	if err := _Channels.contract.UnpackLog(event, "Paused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsPermissionsAddedToChannelRoleIterator is returned from FilterPermissionsAddedToChannelRole and is used to iterate over the raw logs and unpacked data for PermissionsAddedToChannelRole events raised by the Channels contract.
type ChannelsPermissionsAddedToChannelRoleIterator struct {
	Event *ChannelsPermissionsAddedToChannelRole // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsPermissionsAddedToChannelRoleIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsPermissionsAddedToChannelRole)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsPermissionsAddedToChannelRole)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsPermissionsAddedToChannelRoleIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsPermissionsAddedToChannelRoleIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsPermissionsAddedToChannelRole represents a PermissionsAddedToChannelRole event raised by the Channels contract.
type ChannelsPermissionsAddedToChannelRole struct {
	Updater   common.Address
	RoleId    *big.Int
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterPermissionsAddedToChannelRole is a free log retrieval operation binding the contract event 0x38ef31503bf60258feeceab5e2c3778cf74be2a8fbcc150d209ca96cd3c98553.
//
// Solidity: event PermissionsAddedToChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_Channels *ChannelsFilterer) FilterPermissionsAddedToChannelRole(opts *bind.FilterOpts, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (*ChannelsPermissionsAddedToChannelRoleIterator, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "PermissionsAddedToChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsPermissionsAddedToChannelRoleIterator{contract: _Channels.contract, event: "PermissionsAddedToChannelRole", logs: logs, sub: sub}, nil
}

// WatchPermissionsAddedToChannelRole is a free log subscription operation binding the contract event 0x38ef31503bf60258feeceab5e2c3778cf74be2a8fbcc150d209ca96cd3c98553.
//
// Solidity: event PermissionsAddedToChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_Channels *ChannelsFilterer) WatchPermissionsAddedToChannelRole(opts *bind.WatchOpts, sink chan<- *ChannelsPermissionsAddedToChannelRole, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (event.Subscription, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "PermissionsAddedToChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsPermissionsAddedToChannelRole)
				if err := _Channels.contract.UnpackLog(event, "PermissionsAddedToChannelRole", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParsePermissionsAddedToChannelRole is a log parse operation binding the contract event 0x38ef31503bf60258feeceab5e2c3778cf74be2a8fbcc150d209ca96cd3c98553.
//
// Solidity: event PermissionsAddedToChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_Channels *ChannelsFilterer) ParsePermissionsAddedToChannelRole(log types.Log) (*ChannelsPermissionsAddedToChannelRole, error) {
	event := new(ChannelsPermissionsAddedToChannelRole)
	if err := _Channels.contract.UnpackLog(event, "PermissionsAddedToChannelRole", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsPermissionsRemovedFromChannelRoleIterator is returned from FilterPermissionsRemovedFromChannelRole and is used to iterate over the raw logs and unpacked data for PermissionsRemovedFromChannelRole events raised by the Channels contract.
type ChannelsPermissionsRemovedFromChannelRoleIterator struct {
	Event *ChannelsPermissionsRemovedFromChannelRole // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsPermissionsRemovedFromChannelRoleIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsPermissionsRemovedFromChannelRole)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsPermissionsRemovedFromChannelRole)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsPermissionsRemovedFromChannelRoleIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsPermissionsRemovedFromChannelRoleIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsPermissionsRemovedFromChannelRole represents a PermissionsRemovedFromChannelRole event raised by the Channels contract.
type ChannelsPermissionsRemovedFromChannelRole struct {
	Updater   common.Address
	RoleId    *big.Int
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterPermissionsRemovedFromChannelRole is a free log retrieval operation binding the contract event 0x07439707c74b686d8e4d3f3226348eac82205e6dffd780ac4c555a4c2dc9d86c.
//
// Solidity: event PermissionsRemovedFromChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_Channels *ChannelsFilterer) FilterPermissionsRemovedFromChannelRole(opts *bind.FilterOpts, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (*ChannelsPermissionsRemovedFromChannelRoleIterator, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "PermissionsRemovedFromChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsPermissionsRemovedFromChannelRoleIterator{contract: _Channels.contract, event: "PermissionsRemovedFromChannelRole", logs: logs, sub: sub}, nil
}

// WatchPermissionsRemovedFromChannelRole is a free log subscription operation binding the contract event 0x07439707c74b686d8e4d3f3226348eac82205e6dffd780ac4c555a4c2dc9d86c.
//
// Solidity: event PermissionsRemovedFromChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_Channels *ChannelsFilterer) WatchPermissionsRemovedFromChannelRole(opts *bind.WatchOpts, sink chan<- *ChannelsPermissionsRemovedFromChannelRole, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (event.Subscription, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "PermissionsRemovedFromChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsPermissionsRemovedFromChannelRole)
				if err := _Channels.contract.UnpackLog(event, "PermissionsRemovedFromChannelRole", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParsePermissionsRemovedFromChannelRole is a log parse operation binding the contract event 0x07439707c74b686d8e4d3f3226348eac82205e6dffd780ac4c555a4c2dc9d86c.
//
// Solidity: event PermissionsRemovedFromChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_Channels *ChannelsFilterer) ParsePermissionsRemovedFromChannelRole(log types.Log) (*ChannelsPermissionsRemovedFromChannelRole, error) {
	event := new(ChannelsPermissionsRemovedFromChannelRole)
	if err := _Channels.contract.UnpackLog(event, "PermissionsRemovedFromChannelRole", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsPermissionsUpdatedForChannelRoleIterator is returned from FilterPermissionsUpdatedForChannelRole and is used to iterate over the raw logs and unpacked data for PermissionsUpdatedForChannelRole events raised by the Channels contract.
type ChannelsPermissionsUpdatedForChannelRoleIterator struct {
	Event *ChannelsPermissionsUpdatedForChannelRole // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsPermissionsUpdatedForChannelRoleIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsPermissionsUpdatedForChannelRole)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsPermissionsUpdatedForChannelRole)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsPermissionsUpdatedForChannelRoleIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsPermissionsUpdatedForChannelRoleIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsPermissionsUpdatedForChannelRole represents a PermissionsUpdatedForChannelRole event raised by the Channels contract.
type ChannelsPermissionsUpdatedForChannelRole struct {
	Updater   common.Address
	RoleId    *big.Int
	ChannelId [32]byte
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterPermissionsUpdatedForChannelRole is a free log retrieval operation binding the contract event 0x3af5ed504e4a660b9f6e42f60e665a22d0b50830f9c8f7d4344ab4313cc0ab4a.
//
// Solidity: event PermissionsUpdatedForChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_Channels *ChannelsFilterer) FilterPermissionsUpdatedForChannelRole(opts *bind.FilterOpts, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (*ChannelsPermissionsUpdatedForChannelRoleIterator, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "PermissionsUpdatedForChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsPermissionsUpdatedForChannelRoleIterator{contract: _Channels.contract, event: "PermissionsUpdatedForChannelRole", logs: logs, sub: sub}, nil
}

// WatchPermissionsUpdatedForChannelRole is a free log subscription operation binding the contract event 0x3af5ed504e4a660b9f6e42f60e665a22d0b50830f9c8f7d4344ab4313cc0ab4a.
//
// Solidity: event PermissionsUpdatedForChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_Channels *ChannelsFilterer) WatchPermissionsUpdatedForChannelRole(opts *bind.WatchOpts, sink chan<- *ChannelsPermissionsUpdatedForChannelRole, updater []common.Address, roleId []*big.Int, channelId [][32]byte) (event.Subscription, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}
	var channelIdRule []interface{}
	for _, channelIdItem := range channelId {
		channelIdRule = append(channelIdRule, channelIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "PermissionsUpdatedForChannelRole", updaterRule, roleIdRule, channelIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsPermissionsUpdatedForChannelRole)
				if err := _Channels.contract.UnpackLog(event, "PermissionsUpdatedForChannelRole", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParsePermissionsUpdatedForChannelRole is a log parse operation binding the contract event 0x3af5ed504e4a660b9f6e42f60e665a22d0b50830f9c8f7d4344ab4313cc0ab4a.
//
// Solidity: event PermissionsUpdatedForChannelRole(address indexed updater, uint256 indexed roleId, bytes32 indexed channelId)
func (_Channels *ChannelsFilterer) ParsePermissionsUpdatedForChannelRole(log types.Log) (*ChannelsPermissionsUpdatedForChannelRole, error) {
	event := new(ChannelsPermissionsUpdatedForChannelRole)
	if err := _Channels.contract.UnpackLog(event, "PermissionsUpdatedForChannelRole", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsRoleCreatedIterator is returned from FilterRoleCreated and is used to iterate over the raw logs and unpacked data for RoleCreated events raised by the Channels contract.
type ChannelsRoleCreatedIterator struct {
	Event *ChannelsRoleCreated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsRoleCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsRoleCreated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsRoleCreated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsRoleCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsRoleCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsRoleCreated represents a RoleCreated event raised by the Channels contract.
type ChannelsRoleCreated struct {
	Creator common.Address
	RoleId  *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRoleCreated is a free log retrieval operation binding the contract event 0x20a7a288530dd94b1eccaa691a582ecfd7550c9dfcee78ddf50a97f774a2b147.
//
// Solidity: event RoleCreated(address indexed creator, uint256 indexed roleId)
func (_Channels *ChannelsFilterer) FilterRoleCreated(opts *bind.FilterOpts, creator []common.Address, roleId []*big.Int) (*ChannelsRoleCreatedIterator, error) {

	var creatorRule []interface{}
	for _, creatorItem := range creator {
		creatorRule = append(creatorRule, creatorItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "RoleCreated", creatorRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsRoleCreatedIterator{contract: _Channels.contract, event: "RoleCreated", logs: logs, sub: sub}, nil
}

// WatchRoleCreated is a free log subscription operation binding the contract event 0x20a7a288530dd94b1eccaa691a582ecfd7550c9dfcee78ddf50a97f774a2b147.
//
// Solidity: event RoleCreated(address indexed creator, uint256 indexed roleId)
func (_Channels *ChannelsFilterer) WatchRoleCreated(opts *bind.WatchOpts, sink chan<- *ChannelsRoleCreated, creator []common.Address, roleId []*big.Int) (event.Subscription, error) {

	var creatorRule []interface{}
	for _, creatorItem := range creator {
		creatorRule = append(creatorRule, creatorItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "RoleCreated", creatorRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsRoleCreated)
				if err := _Channels.contract.UnpackLog(event, "RoleCreated", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseRoleCreated is a log parse operation binding the contract event 0x20a7a288530dd94b1eccaa691a582ecfd7550c9dfcee78ddf50a97f774a2b147.
//
// Solidity: event RoleCreated(address indexed creator, uint256 indexed roleId)
func (_Channels *ChannelsFilterer) ParseRoleCreated(log types.Log) (*ChannelsRoleCreated, error) {
	event := new(ChannelsRoleCreated)
	if err := _Channels.contract.UnpackLog(event, "RoleCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsRoleRemovedIterator is returned from FilterRoleRemoved and is used to iterate over the raw logs and unpacked data for RoleRemoved events raised by the Channels contract.
type ChannelsRoleRemovedIterator struct {
	Event *ChannelsRoleRemoved // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsRoleRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsRoleRemoved)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsRoleRemoved)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsRoleRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsRoleRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsRoleRemoved represents a RoleRemoved event raised by the Channels contract.
type ChannelsRoleRemoved struct {
	Remover common.Address
	RoleId  *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRoleRemoved is a free log retrieval operation binding the contract event 0x268a6f1b90f6f5ddf50cc736d36513e80cdc5fd56326bff71f335e8b4b61d055.
//
// Solidity: event RoleRemoved(address indexed remover, uint256 indexed roleId)
func (_Channels *ChannelsFilterer) FilterRoleRemoved(opts *bind.FilterOpts, remover []common.Address, roleId []*big.Int) (*ChannelsRoleRemovedIterator, error) {

	var removerRule []interface{}
	for _, removerItem := range remover {
		removerRule = append(removerRule, removerItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "RoleRemoved", removerRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsRoleRemovedIterator{contract: _Channels.contract, event: "RoleRemoved", logs: logs, sub: sub}, nil
}

// WatchRoleRemoved is a free log subscription operation binding the contract event 0x268a6f1b90f6f5ddf50cc736d36513e80cdc5fd56326bff71f335e8b4b61d055.
//
// Solidity: event RoleRemoved(address indexed remover, uint256 indexed roleId)
func (_Channels *ChannelsFilterer) WatchRoleRemoved(opts *bind.WatchOpts, sink chan<- *ChannelsRoleRemoved, remover []common.Address, roleId []*big.Int) (event.Subscription, error) {

	var removerRule []interface{}
	for _, removerItem := range remover {
		removerRule = append(removerRule, removerItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "RoleRemoved", removerRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsRoleRemoved)
				if err := _Channels.contract.UnpackLog(event, "RoleRemoved", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseRoleRemoved is a log parse operation binding the contract event 0x268a6f1b90f6f5ddf50cc736d36513e80cdc5fd56326bff71f335e8b4b61d055.
//
// Solidity: event RoleRemoved(address indexed remover, uint256 indexed roleId)
func (_Channels *ChannelsFilterer) ParseRoleRemoved(log types.Log) (*ChannelsRoleRemoved, error) {
	event := new(ChannelsRoleRemoved)
	if err := _Channels.contract.UnpackLog(event, "RoleRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsRoleUpdatedIterator is returned from FilterRoleUpdated and is used to iterate over the raw logs and unpacked data for RoleUpdated events raised by the Channels contract.
type ChannelsRoleUpdatedIterator struct {
	Event *ChannelsRoleUpdated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsRoleUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsRoleUpdated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsRoleUpdated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsRoleUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsRoleUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsRoleUpdated represents a RoleUpdated event raised by the Channels contract.
type ChannelsRoleUpdated struct {
	Updater common.Address
	RoleId  *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterRoleUpdated is a free log retrieval operation binding the contract event 0x1aff41ff8e9139aae6bb355cc69107cda7e1d1dcd25511da436f3171bdbf77e6.
//
// Solidity: event RoleUpdated(address indexed updater, uint256 indexed roleId)
func (_Channels *ChannelsFilterer) FilterRoleUpdated(opts *bind.FilterOpts, updater []common.Address, roleId []*big.Int) (*ChannelsRoleUpdatedIterator, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "RoleUpdated", updaterRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsRoleUpdatedIterator{contract: _Channels.contract, event: "RoleUpdated", logs: logs, sub: sub}, nil
}

// WatchRoleUpdated is a free log subscription operation binding the contract event 0x1aff41ff8e9139aae6bb355cc69107cda7e1d1dcd25511da436f3171bdbf77e6.
//
// Solidity: event RoleUpdated(address indexed updater, uint256 indexed roleId)
func (_Channels *ChannelsFilterer) WatchRoleUpdated(opts *bind.WatchOpts, sink chan<- *ChannelsRoleUpdated, updater []common.Address, roleId []*big.Int) (event.Subscription, error) {

	var updaterRule []interface{}
	for _, updaterItem := range updater {
		updaterRule = append(updaterRule, updaterItem)
	}
	var roleIdRule []interface{}
	for _, roleIdItem := range roleId {
		roleIdRule = append(roleIdRule, roleIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "RoleUpdated", updaterRule, roleIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsRoleUpdated)
				if err := _Channels.contract.UnpackLog(event, "RoleUpdated", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseRoleUpdated is a log parse operation binding the contract event 0x1aff41ff8e9139aae6bb355cc69107cda7e1d1dcd25511da436f3171bdbf77e6.
//
// Solidity: event RoleUpdated(address indexed updater, uint256 indexed roleId)
func (_Channels *ChannelsFilterer) ParseRoleUpdated(log types.Log) (*ChannelsRoleUpdated, error) {
	event := new(ChannelsRoleUpdated)
	if err := _Channels.contract.UnpackLog(event, "RoleUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsTransferIterator is returned from FilterTransfer and is used to iterate over the raw logs and unpacked data for Transfer events raised by the Channels contract.
type ChannelsTransferIterator struct {
	Event *ChannelsTransfer // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsTransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsTransfer)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsTransfer)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsTransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsTransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsTransfer represents a Transfer event raised by the Channels contract.
type ChannelsTransfer struct {
	From    common.Address
	To      common.Address
	TokenId *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterTransfer is a free log retrieval operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) FilterTransfer(opts *bind.FilterOpts, from []common.Address, to []common.Address, tokenId []*big.Int) (*ChannelsTransferIterator, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "Transfer", fromRule, toRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsTransferIterator{contract: _Channels.contract, event: "Transfer", logs: logs, sub: sub}, nil
}

// WatchTransfer is a free log subscription operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) WatchTransfer(opts *bind.WatchOpts, sink chan<- *ChannelsTransfer, from []common.Address, to []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "Transfer", fromRule, toRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsTransfer)
				if err := _Channels.contract.UnpackLog(event, "Transfer", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseTransfer is a log parse operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) ParseTransfer(log types.Log) (*ChannelsTransfer, error) {
	event := new(ChannelsTransfer)
	if err := _Channels.contract.UnpackLog(event, "Transfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsUnbannedIterator is returned from FilterUnbanned and is used to iterate over the raw logs and unpacked data for Unbanned events raised by the Channels contract.
type ChannelsUnbannedIterator struct {
	Event *ChannelsUnbanned // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsUnbannedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsUnbanned)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsUnbanned)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsUnbannedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsUnbannedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsUnbanned represents a Unbanned event raised by the Channels contract.
type ChannelsUnbanned struct {
	Moderator common.Address
	TokenId   *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterUnbanned is a free log retrieval operation binding the contract event 0xf46dc693169fba0f08556bb54c8abc995b37535f1c2322598f0e671982d8ff86.
//
// Solidity: event Unbanned(address indexed moderator, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) FilterUnbanned(opts *bind.FilterOpts, moderator []common.Address, tokenId []*big.Int) (*ChannelsUnbannedIterator, error) {

	var moderatorRule []interface{}
	for _, moderatorItem := range moderator {
		moderatorRule = append(moderatorRule, moderatorItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "Unbanned", moderatorRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsUnbannedIterator{contract: _Channels.contract, event: "Unbanned", logs: logs, sub: sub}, nil
}

// WatchUnbanned is a free log subscription operation binding the contract event 0xf46dc693169fba0f08556bb54c8abc995b37535f1c2322598f0e671982d8ff86.
//
// Solidity: event Unbanned(address indexed moderator, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) WatchUnbanned(opts *bind.WatchOpts, sink chan<- *ChannelsUnbanned, moderator []common.Address, tokenId []*big.Int) (event.Subscription, error) {

	var moderatorRule []interface{}
	for _, moderatorItem := range moderator {
		moderatorRule = append(moderatorRule, moderatorItem)
	}
	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "Unbanned", moderatorRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsUnbanned)
				if err := _Channels.contract.UnpackLog(event, "Unbanned", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseUnbanned is a log parse operation binding the contract event 0xf46dc693169fba0f08556bb54c8abc995b37535f1c2322598f0e671982d8ff86.
//
// Solidity: event Unbanned(address indexed moderator, uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) ParseUnbanned(log types.Log) (*ChannelsUnbanned, error) {
	event := new(ChannelsUnbanned)
	if err := _Channels.contract.UnpackLog(event, "Unbanned", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsUnpausedIterator is returned from FilterUnpaused and is used to iterate over the raw logs and unpacked data for Unpaused events raised by the Channels contract.
type ChannelsUnpausedIterator struct {
	Event *ChannelsUnpaused // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ChannelsUnpausedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsUnpaused)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ChannelsUnpaused)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ChannelsUnpausedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsUnpausedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsUnpaused represents a Unpaused event raised by the Channels contract.
type ChannelsUnpaused struct {
	Account common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnpaused is a free log retrieval operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_Channels *ChannelsFilterer) FilterUnpaused(opts *bind.FilterOpts) (*ChannelsUnpausedIterator, error) {

	logs, sub, err := _Channels.contract.FilterLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return &ChannelsUnpausedIterator{contract: _Channels.contract, event: "Unpaused", logs: logs, sub: sub}, nil
}

// WatchUnpaused is a free log subscription operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_Channels *ChannelsFilterer) WatchUnpaused(opts *bind.WatchOpts, sink chan<- *ChannelsUnpaused) (event.Subscription, error) {

	logs, sub, err := _Channels.contract.WatchLogs(opts, "Unpaused")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsUnpaused)
				if err := _Channels.contract.UnpackLog(event, "Unpaused", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseUnpaused is a log parse operation binding the contract event 0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa.
//
// Solidity: event Unpaused(address account)
func (_Channels *ChannelsFilterer) ParseUnpaused(log types.Log) (*ChannelsUnpaused, error) {
	event := new(ChannelsUnpaused)
	if err := _Channels.contract.UnpackLog(event, "Unpaused", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
