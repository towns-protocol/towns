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
	ABI: "[{\"type\":\"function\",\"name\":\"addRoleToChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"createChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"createChannelWithOverridePermissions\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"rolePermissions\",\"type\":\"tuple[]\",\"internalType\":\"structIChannelBase.RolePermissions[]\",\"components\":[{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"permissions\",\"type\":\"string[]\",\"internalType\":\"string[]\"}]}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"channel\",\"type\":\"tuple\",\"internalType\":\"structIChannelBase.Channel\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getChannels\",\"inputs\":[],\"outputs\":[{\"name\":\"channels\",\"type\":\"tuple[]\",\"internalType\":\"structIChannelBase.Channel[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRolesByChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeRoleFromChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"AppBanned\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppCreated\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppInstalled\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"account\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"appId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppRegistered\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppRenewed\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"account\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"appId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppSchemaSet\",\"inputs\":[{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppUninstalled\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"account\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"appId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppUnregistered\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"AppUpdated\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"uid\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Banned\",\"inputs\":[{\"name\":\"moderator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelCreated\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRemoved\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRoleAdded\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRoleRemoved\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelUpdated\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConsecutiveTransfer\",\"inputs\":[{\"name\":\"fromTokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"toTokenId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"GroupAccessGranted\",\"inputs\":[{\"name\":\"groupId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"account\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"delay\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"},{\"name\":\"since\",\"type\":\"uint48\",\"indexed\":false,\"internalType\":\"uint48\"},{\"name\":\"newMember\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"GroupAccessRevoked\",\"inputs\":[{\"name\":\"groupId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"account\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"revoked\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"GroupExpirationSet\",\"inputs\":[{\"name\":\"groupId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"expiration\",\"type\":\"uint48\",\"indexed\":false,\"internalType\":\"uint48\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"GroupGrantDelaySet\",\"inputs\":[{\"name\":\"groupId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"delay\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"GroupGuardianSet\",\"inputs\":[{\"name\":\"groupId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"guardian\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"GroupStatusSet\",\"inputs\":[{\"name\":\"groupId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"active\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperationCanceled\",\"inputs\":[{\"name\":\"operationId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"nonce\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperationExecuted\",\"inputs\":[{\"name\":\"operationId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"nonce\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperationScheduled\",\"inputs\":[{\"name\":\"operationId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"timepoint\",\"type\":\"uint48\",\"indexed\":false,\"internalType\":\"uint48\"},{\"name\":\"nonce\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Paused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"PermissionsAddedToChannelRole\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"PermissionsRemovedFromChannelRole\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"PermissionsUpdatedForChannelRole\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RoleCreated\",\"inputs\":[{\"name\":\"creator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RoleRemoved\",\"inputs\":[{\"name\":\"remover\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RoleUpdated\",\"inputs\":[{\"name\":\"updater\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"TargetDisabledSet\",\"inputs\":[{\"name\":\"target\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"disabled\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"TargetFunctionDelaySet\",\"inputs\":[{\"name\":\"target\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newDelay\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"},{\"name\":\"minSetback\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"TargetFunctionDisabledSet\",\"inputs\":[{\"name\":\"target\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"selector\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"},{\"name\":\"disabled\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"TargetFunctionGroupSet\",\"inputs\":[{\"name\":\"target\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"selector\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"},{\"name\":\"groupId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unbanned\",\"inputs\":[{\"name\":\"moderator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unpaused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"AlreadyScheduled\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AppAlreadyInstalled\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AppAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AppDoesNotImplementInterface\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AppNotInstalled\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AppNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"AppRevoked\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ApprovalCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ApprovalQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"BalanceQueryForZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"BannedApp\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__AlreadyBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Banning__CannotBanOwner\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__CannotBanSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__InvalidTokenId\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Banning__NotBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"CallerAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"CallerNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelDisabled\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__RoleAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__RoleDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ClientAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__ValueAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ExecutionAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ExecutionFunctionAlreadySet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ExecutionHookAlreadySet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ExecutionNotFound\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ExecutionNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ExecutorCallFailed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Expired\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InsufficientPayment\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAddressInput\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAppAddress\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"InvalidAppId\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAppName\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidArrayInput\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidCaller\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidDataLength\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidDuration\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidExpiration\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidManifest\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidPrice\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintERC2309QuantityExceedsLimit\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintZeroQuantity\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ModuleInstallCallbackFailed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NotAppOwner\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NotEnoughEth\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NotReady\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NotScheduled\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NullModule\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnerQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnershipNotInitializedForExtraData\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__NotPaused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__Paused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__EntitlementAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__EntitlementDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__InvalidEntitlementAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__InvalidPermission\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__PermissionAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__PermissionDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__RoleDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Roles__RoleIsImmutable\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"SafeCastOverflowedUintDowncast\",\"inputs\":[{\"name\":\"bits\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"value\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"TransferCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferFromIncorrectOwner\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToNonERC721ReceiverImplementer\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"URIQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"UnauthorizedApp\",\"inputs\":[{\"name\":\"app\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"UnauthorizedCall\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"UnauthorizedCancel\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"UnauthorizedRenounce\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"UnauthorizedSelector\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"UnauthorizedTarget\",\"inputs\":[]}]",
	Bin: "0x6080604052348015600e575f5ffd5b5060156019565b60bd565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff16156064576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff908116101560ba57805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b613356806100ca5f395ff3fe608060405234801561000f575f5ffd5b506004361061009f575f3560e01c8063921f7175116100725780639935218311610058578063993521831461012f578063b9de61591461014f578063ef86d69614610162575f5ffd5b8063921f7175146101075780639575f6ac1461011a575f5ffd5b806302da0e51146100a357806337644cf7146100b85780635a2dce7a146100cb578063831c2b82146100de575b5f5ffd5b6100b66100b1366004612522565b610175565b005b6100b66100c6366004612539565b6101bf565b6100b66100d93660046125df565b61020b565b6100f16100ec366004612522565b61036d565b6040516100fe9190612712565b60405180910390f35b6100b66101153660046125df565b6103a7565b61012261042a565b6040516100fe9190612724565b61014261013d366004612522565b610439565b6040516100fe91906127a5565b6100b661015d366004612539565b610444565b6100b66101703660046127f4565b61048c565b6101b36040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b6101bc81610589565b50565b6101fd6040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b61020782826105ca565b5050565b6102496040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b5f8167ffffffffffffffff8111156102635761026361284f565b60405190808252806020026020018201604052801561028c578160200160208202803683370190505b5090505f5b828110156102e5578383828181106102ab576102ab61287c565b90506020028101906102bd91906128a9565b5f01358282815181106102d2576102d261287c565b6020908102919091010152600101610291565b506102f286868684610614565b5f5b828110156103645761035c8484838181106103115761031161287c565b905060200281019061032391906128a9565b35888686858181106103375761033761287c565b905060200281019061034991906128a9565b6103579060208101906128e5565b610667565b6001016102f4565b50505050505050565b61039860405180608001604052805f81526020015f1515815260200160608152602001606081525090565b6103a1826107de565b92915050565b6103e56040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b6104238585858585808060200260200160405190810160405280939291908181526020018383602002808284375f9201919091525061061492505050565b5050505050565b606061043461083e565b905090565b60606103a182610967565b6104826040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b6102078282610972565b6104ca6040518060400160405280601181526020017f41646452656d6f76654368616e6e656c730000000000000000000000000000008152506104dc565b6104d6848484846109b4565b50505050565b336104e56109f2565b73ffffffffffffffffffffffffffffffffffffffff16036105035750565b7fe17a067c7963a59b6dfd65d33b053fdbea1c56500e2aae4f976d9eda4da9eb005460ff16610560575f61053682612949565b90506105423383610ab2565b1561054b575050565b6105553382610acd565b1561055e575050565b505b6101bc7f338e692c00000000000000000000000000000000000000000000000000000000610bc2565b61059281610bca565b60405181815233907f3a3f387aa42656bc1732adfc7aea5cde9ccc05a59f9af9c29ebfa68e66383e939060200160405180910390a250565b6105d48282610c64565b604080518381526020810183905233917f2b10481523b59a7978f8ab73b237349b0f38c801f6094bdc8994d379c067d71391015b60405180910390a25050565b61061f83835f610d06565b61062b84848484610d3c565b60405184815233907fdd6c5b83be3557f8b2674712946f9f05dcd882b82bfd58b9539b9706efd35d8c906020015b60405180910390a250505050565b8080156107d45761067785610e53565b61068084610eaa565b5f8581527f672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd056020908152604080832087845290915290207f672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd00906106e281610f03565b5f5b83811015610784576107188686838181106107015761070161287c565b9050602002810190610713919061298b565b610feb565b61077b86868381811061072d5761072d61287c565b905060200281019061073f919061298b565b8080601f0160208091040260200160405190810160405280939291908181526020018383808284375f92019190915250869392505061101c9050565b506001016106e4565b505f878152600483016020526040902061079e9087611072565b506040518690889033907f38ef31503bf60258feeceab5e2c3778cf74be2a8fbcc150d209ca96cd3c98553905f90a45050610423565b610423858561107d565b61080960405180608001604052805f81526020015f1515815260200160608152602001606081525090565b5f5f6108148461113f565b92509250505f61082385611242565b60608501525060408301919091521515602082015290815290565b60605f6108496112a4565b9050805167ffffffffffffffff8111156108655761086561284f565b6040519080825280602002602001820160405280156108c157816020015b6108ae60405180608001604052805f81526020015f1515815260200160608152602001606081525090565b8152602001906001900390816108835790505b5091505f5b8151811015610962575f5f5f6108f48585815181106108e7576108e761287c565b602002602001015161113f565b9250925092505f61091d8686815181106109105761091061287c565b6020026020010151611242565b90505f8786815181106109325761093261287c565b602090810291909101810151606081019390935260408301949094525090151591810191909152526001016108c6565b505090565b60606103a182611242565b61097c82826112d0565b604080518381526020810183905233917faee688d80dbf97230e5d2b4b06aa7074bfe38ddd8abf856551177db3039561299101610608565b6109c084848484611371565b60405184815233907f94af4a611b3fb1eaa653a6b29f82b71bcea25ca378171c5f059010fa18e0716e90602001610659565b5f807fd2f24d4f172e4e84e48e7c4125b6e904c29e5eba33ad4938fee51dd5dbd4b600805460018201546040517f6352211e000000000000000000000000000000000000000000000000000000008152600481019190915291925073ffffffffffffffffffffffffffffffffffffffff1690636352211e90602401602060405180830381865afa158015610a88573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610aac9190612a14565b91505090565b5f610ac68184610ac185612949565b6114ff565b9392505050565b5f73ffffffffffffffffffffffffffffffffffffffff8316610af057505f6103a1565b5f610af96117cf565b6040517f75dfa34200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff868116600483015291909116906375dfa34290602401602060405180830381865afa158015610b65573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610b899190612a14565b905073ffffffffffffffffffffffffffffffffffffffff8116610baf575f9150506103a1565b610bba81858561181a565b949350505050565b805f5260045ffd5b610bd381610eaa565b7f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300610bfe81836118be565b505f8281526002808301602052604082208281556001810180547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001690559190610c4a9083018261243b565b50505f8281526003820160205260409020610207906118c9565b610c6d82610eaa565b610c76826118d2565b5f8281527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504303602052604090207f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af51850430090610cce8184611933565b15610cfc57610cfc7f2369ff3000000000000000000000000000000000000000000000000000000000610bc2565b6104238184611072565b80821015610d3757610d377f947d5a8400000000000000000000000000000000000000000000000000000000610bc2565b505050565b610d458461194a565b7f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300610d708186611072565b505f858152600280830160205260408220918791879187918591908201610d98848683612abc565b50509290925550505f8681526003830160205260408120905b8451811015610e4957610de6858281518110610dcf57610dcf61287c565b60200260200101518361193390919063ffffffff16565b15610e1457610e147f2369ff3000000000000000000000000000000000000000000000000000000000610bc2565b610e40858281518110610e2957610e2961287c565b60200260200101518361107290919063ffffffff16565b50600101610db1565b5050505050505050565b610e7d7f672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd0182611933565b6101bc576101bc7fa3f70f7b00000000000000000000000000000000000000000000000000000000610bc2565b610ed6817f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af5185043005b90611933565b6101bc576101bc7fac16968200000000000000000000000000000000000000000000000000000000610bc2565b805481905f5b81811015610fe3575f84815260208120820190505f610fcf86835f018054610f3090612a2d565b80601f0160208091040260200160405190810160405280929190818152602001828054610f5c90612a2d565b8015610fa75780601f10610f7e57610100808354040283529160200191610fa7565b820191905f5260205f20905b815481529060010190602001808311610f8a57829003601f168201915b5050505050805180820160209081018051600195909501815291810192019190912091905290565b55610fda815f61243b565b50600101610f09565b50505f905550565b5f819003610207576102077f0ce76c1000000000000000000000000000000000000000000000000000000000610bc2565b80516020818301810180516001860182529282019184019190912091905280541590811561106b578354600181018086555f868152602090208692919082016110658782612bd2565b50835550505b5092915050565b5f610ac683836119a2565b61108682610e53565b61108f81610eaa565b5f8281527f672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd056020908152604080832084845290915290207f672ef851d5f92307da037116e23aa9e31af7e1f7e3ca62c4e6d540631df3fd00906110f181610f03565b5f848152600483016020526040902061110a90846118be565b506040518390859033907f07439707c74b686d8e4d3f3226348eac82205e6dffd780ac4c555a4c2dc9d86c905f90a450505050565b5f60605f61114c84610eaa565b5f8481527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af5185043026020526040902080546002820180549195507f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af51850430092916111af90612a2d565b80601f01602080910402602001604051908101604052809291908181526020018280546111db90612a2d565b80156112265780601f106111fd57610100808354040283529160200191611226565b820191905f5260205f20905b81548152906001019060200180831161120957829003601f168201915b50505060019093015496989197505060ff909516949350505050565b606061124d82610eaa565b5f8281527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504303602052604090207f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af51850430090610ac6906119ee565b60607f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300610aac816119ee565b6112d982610eaa565b6112e2826118d2565b5f8281527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504303602052604090207f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af5185043009061133a8184611933565b611367576113677f6796073e00000000000000000000000000000000000000000000000000000000610bc2565b61042381846118be565b61137a84610eaa565b5f8481527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504302602052604090207f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af5185043009083158015906114a0575061149e8160020180546113e490612a2d565b80601f016020809104026020016040519081016040528092919081815260200182805461141090612a2d565b801561145b5780601f106114325761010080835404028352916020019161145b565b820191905f5260205f20905b81548152906001019060200180831161143e57829003601f168201915b505050505086868080601f0160208091040260200160405190810160405280939291908181526020018383808284375f9201919091525092939250506119fa9050565b155b156114b657600281016114b4858783612abc565b505b600181015460ff161515831515146114f7576001810180547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00168415151790555b505050505050565b5f5f6115096109f2565b90505f61151585611a10565b80519091505f611523611d54565b80519091505f5b83811015611612575f8582815181106115455761154561287c565b602002602001015190508673ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603611592576001975050505050505050610ac6565b5f5b83811015611608578173ffffffffffffffffffffffffffffffffffffffff166115d58683815181106115c8576115c861287c565b6020026020010151611d7f565b73ffffffffffffffffffffffffffffffffffffffff1603611600575f98505050505050505050610ac6565b600101611594565b505060010161152a565b507fa558e822bd359dacbe30f0da89cbfde5f95895b441e13a4864caec1423c931005f61165e7fa558e822bd359dacbe30f0da89cbfde5f95895b441e13a4864caec1423c93101611d89565b90505f5b818110156117be575f838161167a6001830185611d92565b73ffffffffffffffffffffffffffffffffffffffff908116825260208083019390935260409182015f205482517f2e1b61e40000000000000000000000000000000000000000000000000000000081529251911693508392632e1b61e492600480820193918290030181865afa1580156116f6573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061171a9190612ce9565b15801561179e57508073ffffffffffffffffffffffffffffffffffffffff16630cf0b5338e8a8e6040518463ffffffff1660e01b815260040161175f93929190612d04565b602060405180830381865afa15801561177a573d5f5f3e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061179e9190612ce9565b156117b55760019950505050505050505050610ac6565b50600101611662565b505f9b9a5050505050505050505050565b5f6104347fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb6007f4170705265676973747279000000000000000000000000000000000000000000611d9d565b5f5f61182585611e32565b8051909150611837575f915050610ac6565b5f5f611846835f015187611f2a565b9250509150811580611856575080155b15611866575f9350505050610ac6565b6080830151515f5b818110156118b057868560800151828151811061188d5761188d61287c565b6020026020010151036118a857600195505050505050610ac6565b60010161186e565b505f98975050505050505050565b5f610ac68383611fe8565b6101bc816120cb565b5f8181527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504302602052604090206001015460ff16156101bc576101bc7fd9c0051200000000000000000000000000000000000000000000000000000000610bc2565b5f8181526001830160205260408120541515610ac6565b611974817f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300610ed0565b156101bc576101bc7f8c93df6400000000000000000000000000000000000000000000000000000000610bc2565b5f8181526001830160205260408120546119e757508154600181810184555f8481526020808220909301849055845484825282860190935260409020919091556103a1565b505f6103a1565b60605f610ac683612124565b8051602091820120825192909101919091201490565b60605f7fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb600600601546040517f02345b9800000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff858116600483015290911691505f9082906302345b98906024015f60405180830381865afa158015611aa7573d5f5f3e3d5ffd5b505050506040513d5f823e601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201604052611aec9190810190612e50565b905080515f03611c5d576040517ff821039800000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff85811660048301525f919084169063f821039890602401602060405180830381865afa158015611b63573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190611b879190612a14565b905073ffffffffffffffffffffffffffffffffffffffff811615611c5b576040517f02345b9800000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff808316600483015291955085918416906302345b98906024015f60405180830381865afa158015611c13573d5f5f3e3d5ffd5b505050506040513d5f823e601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201604052611c589190810190612e50565b91505b505b80515f611c6b826001612f1a565b67ffffffffffffffff811115611c8357611c8361284f565b604051908082528060200260200182016040528015611cac578160200160208202803683370190505b5090505f5b82811015611d1257838181518110611ccb57611ccb61287c565b6020026020010151828281518110611ce557611ce561287c565b73ffffffffffffffffffffffffffffffffffffffff90921660209283029190910190910152600101611cb1565b5085818381518110611d2657611d2661287c565b73ffffffffffffffffffffffffffffffffffffffff9092166020928302919091019091015295945050505050565b60606104347f49daf035076c43671ca9f9fb568d931e51ab7f9098a5a694781b45341112cf006119ee565b5f6103a18261217d565b5f6103a1825490565b5f610ac683836122ae565b60068201546040517f44ab6680000000000000000000000000000000000000000000000000000000008152600481018390525f9173ffffffffffffffffffffffffffffffffffffffff169081906344ab668090602401602060405180830381865afa158015611e0e573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610bba9190612a14565b611e3a612472565b73ffffffffffffffffffffffffffffffffffffffff82165f9081527f5203018779d8301358307033923a3bd0a3a759f1f58591c01f878744c0f8c201602052604090205480611e895750919050565b611e916117cf565b73ffffffffffffffffffffffffffffffffffffffff1663fb609045826040518263ffffffff1660e01b8152600401611ecb91815260200190565b5f60405180830381865afa158015611ee5573d5f5f3e3d5ffd5b505050506040513d5f823e601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201604052610ac69190810190613231565b5f5f5f5f611f61865f9081527fb7e2813a9de15ce5ee4c1718778708cd70fd7ee3d196d203c0f40369a8d4a6026020526040902090565b9050611f6d81866122d4565b600383015491955093506e010000000000000000000000000000900460ff168015611fde575060038101546f01000000000000000000000000000000900465ffffffffffff161580611fde57506003810154426f0100000000000000000000000000000090910465ffffffffffff16115b9150509250925092565b5f81815260018301602052604081205480156120c2575f61200a600183613316565b85549091505f9061201d90600190613316565b905080821461207c575f865f01828154811061203b5761203b61287c565b905f5260205f200154905080875f01848154811061205b5761205b61287c565b5f918252602080832090910192909255918252600188019052604090208390555b855486908061208d5761208d613329565b600190038181905f5260205f20015f90559055856001015f8681526020019081526020015f205f9055600193505050506103a1565b5f9150506103a1565b5f6120d4825490565b90505f5b8181101561211d57826001015f845f0183815481106120f9576120f961287c565b905f5260205f20015481526020019081526020015f205f90558060010190506120d8565b50505f9055565b6060815f0180548060200260200160405190810160405280929190818152602001828054801561217157602002820191905f5260205f20905b81548152602001906001019080831161215d575b50505050509050919050565b5f8181527f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df046020526040812054907f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df00907c01000000000000000000000000000000000000000000000000000000008316900361227b57815f036122755780548310612234576040517fdf2d9b4200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9092015f81815260048401602052604090205490929091508115612235575b50919050565b506040517fdf2d9b4200000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f825f0182815481106122c3576122c361287c565b905f5260205f200154905092915050565b73ffffffffffffffffffffffffffffffffffffffff81165f9081526001830160205260408120805482919065ffffffffffff81169061232c90660100000000000090046dffffffffffffffffffffffffffff1661236a565b509093505065ffffffffffff81161580159061235f575061234b61238b565b65ffffffffffff168165ffffffffffff1611155b935050509250929050565b5f5f5f61237e8461237961238b565b612395565b9250925092509193909250565b5f610434426123e8565b69ffffffffffffffffffff602083901c166dffffffffffffffffffffffffffff831665ffffffffffff604085901c81169084168111156123d7578282826123db565b815f5f5b9250925092509250925092565b5f65ffffffffffff821115612437576040517f6dfcc650000000000000000000000000000000000000000000000000000000008152603060048201526024810183905260440160405180910390fd5b5090565b50805461244790612a2d565b5f825580601f10612456575050565b601f0160209004905f5260205f20908101906101bc919061250e565b6040518060e001604052805f81526020015f73ffffffffffffffffffffffffffffffffffffffff1681526020015f73ffffffffffffffffffffffffffffffffffffffff1681526020015f73ffffffffffffffffffffffffffffffffffffffff1681526020016060815260200161250260405180606001604052806060815260200160608152602001606081525090565b81525f60209091015290565b5b80821115612437575f815560010161250f565b5f60208284031215612532575f5ffd5b5035919050565b5f5f6040838503121561254a575f5ffd5b50508035926020909101359150565b5f5f83601f840112612569575f5ffd5b50813567ffffffffffffffff811115612580575f5ffd5b602083019150836020828501011115612597575f5ffd5b9250929050565b5f5f83601f8401126125ae575f5ffd5b50813567ffffffffffffffff8111156125c5575f5ffd5b6020830191508360208260051b8501011115612597575f5ffd5b5f5f5f5f5f606086880312156125f3575f5ffd5b85359450602086013567ffffffffffffffff811115612610575f5ffd5b61261c88828901612559565b909550935050604086013567ffffffffffffffff81111561263b575f5ffd5b6126478882890161259e565b969995985093965092949392505050565b805182526020810151151560208301525f6040820151608060408501528051806080860152806020830160a087015e5f60a082870101527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f820116850191505060a08101606084015160a086840301606087015281815180845260c0850191506020830194505f93505b8084101561270757845182526020820191506020850194506001840193506126e4565b509695505050505050565b602081525f610ac66020830184612658565b5f602082016020835280845180835260408501915060408160051b8601019250602086015f5b82811015612799577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc0878603018452612784858351612658565b9450602093840193919091019060010161274a565b50929695505050505050565b602080825282518282018190525f918401906040840190835b818110156127dc5783518352602093840193909201916001016127be565b509095945050505050565b80151581146101bc575f5ffd5b5f5f5f5f60608587031215612807575f5ffd5b84359350602085013567ffffffffffffffff811115612824575f5ffd5b61283087828801612559565b9094509250506040850135612844816127e7565b939692955090935050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b5f82357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc18336030181126128db575f5ffd5b9190910192915050565b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe1843603018112612918575f5ffd5b83018035915067ffffffffffffffff821115612932575f5ffd5b6020019150600581901b3603821315612597575f5ffd5b80516020808301519190811015612275577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60209190910360031b1b16919050565b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe18436030181126129be575f5ffd5b83018035915067ffffffffffffffff8211156129d8575f5ffd5b602001915036819003821315612597575f5ffd5b805173ffffffffffffffffffffffffffffffffffffffff81168114612a0f575f5ffd5b919050565b5f60208284031215612a24575f5ffd5b610ac6826129ec565b600181811c90821680612a4157607f821691505b602082108103612275577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b601f821115610d3757805f5260205f20601f840160051c81016020851015612a9d5750805b601f840160051c820191505b81811015610423575f8155600101612aa9565b67ffffffffffffffff831115612ad457612ad461284f565b612ae883612ae28354612a2d565b83612a78565b5f601f841160018114612b38575f8515612b025750838201355b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600387901b1c1916600186901b178355610423565b5f838152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08716915b82811015612b855786850135825560209485019460019092019101612b65565b5086821015612bc0577fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60f88860031b161c19848701351681555b505060018560011b0183555050505050565b815167ffffffffffffffff811115612bec57612bec61284f565b612c0081612bfa8454612a2d565b84612a78565b6020601f821160018114612c51575f8315612c1b5750848201515b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600385901b1c1916600184901b178455610423565b5f848152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08516915b82811015612c9e5787850151825560209485019460019092019101612c7e565b5084821015612cda57868401517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600387901b60f8161c191681555b50505050600190811b01905550565b5f60208284031215612cf9575f5ffd5b8151610ac6816127e7565b5f60608201858352606060208401528085518083526080850191506020870192505f5b81811015612d5b57835173ffffffffffffffffffffffffffffffffffffffff16835260209384019390920191600101612d27565b505060409390930193909352509392505050565b6040516080810167ffffffffffffffff81118282101715612d9257612d9261284f565b60405290565b6040516060810167ffffffffffffffff81118282101715612d9257612d9261284f565b60405160e0810167ffffffffffffffff81118282101715612d9257612d9261284f565b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016810167ffffffffffffffff81118282101715612e2557612e2561284f565b604052919050565b5f67ffffffffffffffff821115612e4657612e4661284f565b5060051b60200190565b5f60208284031215612e60575f5ffd5b815167ffffffffffffffff811115612e76575f5ffd5b8201601f81018413612e86575f5ffd5b8051612e99612e9482612e2d565b612dde565b8082825260208201915060208360051b850101925086831115612eba575f5ffd5b6020840193505b82841015612ee357612ed2846129ec565b825260209384019390910190612ec1565b9695505050505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b808201808211156103a1576103a1612eed565b5f82601f830112612f3c575f5ffd5b8151612f4a612e9482612e2d565b8082825260208201915060208360051b860101925085831115612f6b575f5ffd5b602085015b83811015612f88578051835260209283019201612f70565b5095945050505050565b80517fffffffff0000000000000000000000000000000000000000000000000000000081168114612a0f575f5ffd5b5f82601f830112612fd0575f5ffd5b8151612fde612e9482612e2d565b8082825260208201915060208360071b860101925085831115612fff575f5ffd5b602085015b83811015612f88576080818803121561301b575f5ffd5b613023612d6f565b61302c82612f92565b8152602082015163ffffffff81168114613044575f5ffd5b60208201526040820151613057816127e7565b6040820152606082015161306a816127e7565b60608201528352602090920191608001613004565b5f82601f83011261308e575f5ffd5b815161309c612e9482612e2d565b8082825260208201915060208360051b8601019250858311156130bd575f5ffd5b602085015b83811015612f88576130d381612f92565b8352602092830192016130c2565b5f606082840312156130f1575f5ffd5b6130f9612d98565b9050815167ffffffffffffffff811115613111575f5ffd5b8201601f81018413613121575f5ffd5b805161312f612e9482612e2d565b80828252602082019150602060608402850101925086831115613150575f5ffd5b6020840193505b828410156131bb576060848803121561316e575f5ffd5b613176612d98565b61317f85612f92565b8152602085015161318f816127e7565b602082015260408501516131a2816127e7565b6040820152825260609390930192602090910190613157565b8452505050602082015167ffffffffffffffff8111156131d9575f5ffd5b6131e584828501612fc1565b602083015250604082015167ffffffffffffffff811115613204575f5ffd5b6132108482850161307f565b60408301525092915050565b805165ffffffffffff81168114612a0f575f5ffd5b5f60208284031215613241575f5ffd5b815167ffffffffffffffff811115613257575f5ffd5b820160e08185031215613268575f5ffd5b613270612dbb565b81518152613280602083016129ec565b6020820152613291604083016129ec565b60408201526132a2606083016129ec565b6060820152608082015167ffffffffffffffff8111156132c0575f5ffd5b6132cc86828501612f2d565b60808301525060a082015167ffffffffffffffff8111156132eb575f5ffd5b6132f7868285016130e1565b60a08301525061330960c0830161321c565b60c0820152949350505050565b818103818111156103a1576103a1612eed565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603160045260245ffd",
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

// ChannelsAppBannedIterator is returned from FilterAppBanned and is used to iterate over the raw logs and unpacked data for AppBanned events raised by the Channels contract.
type ChannelsAppBannedIterator struct {
	Event *ChannelsAppBanned // Event containing the contract specifics and raw log

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
func (it *ChannelsAppBannedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsAppBanned)
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
		it.Event = new(ChannelsAppBanned)
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
func (it *ChannelsAppBannedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsAppBannedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsAppBanned represents a AppBanned event raised by the Channels contract.
type ChannelsAppBanned struct {
	App common.Address
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppBanned is a free log retrieval operation binding the contract event 0xdd3476c5c02a5b7abb7375531dc9b1bf8dcdf5ab9ee67b1baa2c0964183a9426.
//
// Solidity: event AppBanned(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) FilterAppBanned(opts *bind.FilterOpts, app []common.Address) (*ChannelsAppBannedIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "AppBanned", appRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsAppBannedIterator{contract: _Channels.contract, event: "AppBanned", logs: logs, sub: sub}, nil
}

// WatchAppBanned is a free log subscription operation binding the contract event 0xdd3476c5c02a5b7abb7375531dc9b1bf8dcdf5ab9ee67b1baa2c0964183a9426.
//
// Solidity: event AppBanned(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) WatchAppBanned(opts *bind.WatchOpts, sink chan<- *ChannelsAppBanned, app []common.Address) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "AppBanned", appRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsAppBanned)
				if err := _Channels.contract.UnpackLog(event, "AppBanned", log); err != nil {
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

// ParseAppBanned is a log parse operation binding the contract event 0xdd3476c5c02a5b7abb7375531dc9b1bf8dcdf5ab9ee67b1baa2c0964183a9426.
//
// Solidity: event AppBanned(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) ParseAppBanned(log types.Log) (*ChannelsAppBanned, error) {
	event := new(ChannelsAppBanned)
	if err := _Channels.contract.UnpackLog(event, "AppBanned", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsAppCreatedIterator is returned from FilterAppCreated and is used to iterate over the raw logs and unpacked data for AppCreated events raised by the Channels contract.
type ChannelsAppCreatedIterator struct {
	Event *ChannelsAppCreated // Event containing the contract specifics and raw log

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
func (it *ChannelsAppCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsAppCreated)
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
		it.Event = new(ChannelsAppCreated)
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
func (it *ChannelsAppCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsAppCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsAppCreated represents a AppCreated event raised by the Channels contract.
type ChannelsAppCreated struct {
	App common.Address
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppCreated is a free log retrieval operation binding the contract event 0x4ef1c746ec01bf724b6101c8e9a6852a9e175232ed3b66e06c221514213661dc.
//
// Solidity: event AppCreated(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) FilterAppCreated(opts *bind.FilterOpts, app []common.Address) (*ChannelsAppCreatedIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "AppCreated", appRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsAppCreatedIterator{contract: _Channels.contract, event: "AppCreated", logs: logs, sub: sub}, nil
}

// WatchAppCreated is a free log subscription operation binding the contract event 0x4ef1c746ec01bf724b6101c8e9a6852a9e175232ed3b66e06c221514213661dc.
//
// Solidity: event AppCreated(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) WatchAppCreated(opts *bind.WatchOpts, sink chan<- *ChannelsAppCreated, app []common.Address) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "AppCreated", appRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsAppCreated)
				if err := _Channels.contract.UnpackLog(event, "AppCreated", log); err != nil {
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

// ParseAppCreated is a log parse operation binding the contract event 0x4ef1c746ec01bf724b6101c8e9a6852a9e175232ed3b66e06c221514213661dc.
//
// Solidity: event AppCreated(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) ParseAppCreated(log types.Log) (*ChannelsAppCreated, error) {
	event := new(ChannelsAppCreated)
	if err := _Channels.contract.UnpackLog(event, "AppCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsAppInstalledIterator is returned from FilterAppInstalled and is used to iterate over the raw logs and unpacked data for AppInstalled events raised by the Channels contract.
type ChannelsAppInstalledIterator struct {
	Event *ChannelsAppInstalled // Event containing the contract specifics and raw log

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
func (it *ChannelsAppInstalledIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsAppInstalled)
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
		it.Event = new(ChannelsAppInstalled)
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
func (it *ChannelsAppInstalledIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsAppInstalledIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsAppInstalled represents a AppInstalled event raised by the Channels contract.
type ChannelsAppInstalled struct {
	App     common.Address
	Account common.Address
	AppId   [32]byte
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterAppInstalled is a free log retrieval operation binding the contract event 0x964f2b980b9892debcc394f32662d711d5b6417bf23117f145240a8a0ba4b8c3.
//
// Solidity: event AppInstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_Channels *ChannelsFilterer) FilterAppInstalled(opts *bind.FilterOpts, app []common.Address, account []common.Address, appId [][32]byte) (*ChannelsAppInstalledIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "AppInstalled", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsAppInstalledIterator{contract: _Channels.contract, event: "AppInstalled", logs: logs, sub: sub}, nil
}

// WatchAppInstalled is a free log subscription operation binding the contract event 0x964f2b980b9892debcc394f32662d711d5b6417bf23117f145240a8a0ba4b8c3.
//
// Solidity: event AppInstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_Channels *ChannelsFilterer) WatchAppInstalled(opts *bind.WatchOpts, sink chan<- *ChannelsAppInstalled, app []common.Address, account []common.Address, appId [][32]byte) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "AppInstalled", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsAppInstalled)
				if err := _Channels.contract.UnpackLog(event, "AppInstalled", log); err != nil {
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

// ParseAppInstalled is a log parse operation binding the contract event 0x964f2b980b9892debcc394f32662d711d5b6417bf23117f145240a8a0ba4b8c3.
//
// Solidity: event AppInstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_Channels *ChannelsFilterer) ParseAppInstalled(log types.Log) (*ChannelsAppInstalled, error) {
	event := new(ChannelsAppInstalled)
	if err := _Channels.contract.UnpackLog(event, "AppInstalled", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsAppRegisteredIterator is returned from FilterAppRegistered and is used to iterate over the raw logs and unpacked data for AppRegistered events raised by the Channels contract.
type ChannelsAppRegisteredIterator struct {
	Event *ChannelsAppRegistered // Event containing the contract specifics and raw log

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
func (it *ChannelsAppRegisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsAppRegistered)
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
		it.Event = new(ChannelsAppRegistered)
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
func (it *ChannelsAppRegisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsAppRegisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsAppRegistered represents a AppRegistered event raised by the Channels contract.
type ChannelsAppRegistered struct {
	App common.Address
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppRegistered is a free log retrieval operation binding the contract event 0xb29dff3e705ef0b6c125758b5859218021c5b462839d71e83b0b6be86ed0802a.
//
// Solidity: event AppRegistered(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) FilterAppRegistered(opts *bind.FilterOpts, app []common.Address) (*ChannelsAppRegisteredIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "AppRegistered", appRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsAppRegisteredIterator{contract: _Channels.contract, event: "AppRegistered", logs: logs, sub: sub}, nil
}

// WatchAppRegistered is a free log subscription operation binding the contract event 0xb29dff3e705ef0b6c125758b5859218021c5b462839d71e83b0b6be86ed0802a.
//
// Solidity: event AppRegistered(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) WatchAppRegistered(opts *bind.WatchOpts, sink chan<- *ChannelsAppRegistered, app []common.Address) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "AppRegistered", appRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsAppRegistered)
				if err := _Channels.contract.UnpackLog(event, "AppRegistered", log); err != nil {
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

// ParseAppRegistered is a log parse operation binding the contract event 0xb29dff3e705ef0b6c125758b5859218021c5b462839d71e83b0b6be86ed0802a.
//
// Solidity: event AppRegistered(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) ParseAppRegistered(log types.Log) (*ChannelsAppRegistered, error) {
	event := new(ChannelsAppRegistered)
	if err := _Channels.contract.UnpackLog(event, "AppRegistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsAppRenewedIterator is returned from FilterAppRenewed and is used to iterate over the raw logs and unpacked data for AppRenewed events raised by the Channels contract.
type ChannelsAppRenewedIterator struct {
	Event *ChannelsAppRenewed // Event containing the contract specifics and raw log

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
func (it *ChannelsAppRenewedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsAppRenewed)
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
		it.Event = new(ChannelsAppRenewed)
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
func (it *ChannelsAppRenewedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsAppRenewedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsAppRenewed represents a AppRenewed event raised by the Channels contract.
type ChannelsAppRenewed struct {
	App     common.Address
	Account common.Address
	AppId   [32]byte
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterAppRenewed is a free log retrieval operation binding the contract event 0xcd92821b6ef75242495e80ef40036955c209df02d7319bff0345ad60a5855a28.
//
// Solidity: event AppRenewed(address indexed app, address indexed account, bytes32 indexed appId)
func (_Channels *ChannelsFilterer) FilterAppRenewed(opts *bind.FilterOpts, app []common.Address, account []common.Address, appId [][32]byte) (*ChannelsAppRenewedIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "AppRenewed", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsAppRenewedIterator{contract: _Channels.contract, event: "AppRenewed", logs: logs, sub: sub}, nil
}

// WatchAppRenewed is a free log subscription operation binding the contract event 0xcd92821b6ef75242495e80ef40036955c209df02d7319bff0345ad60a5855a28.
//
// Solidity: event AppRenewed(address indexed app, address indexed account, bytes32 indexed appId)
func (_Channels *ChannelsFilterer) WatchAppRenewed(opts *bind.WatchOpts, sink chan<- *ChannelsAppRenewed, app []common.Address, account []common.Address, appId [][32]byte) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "AppRenewed", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsAppRenewed)
				if err := _Channels.contract.UnpackLog(event, "AppRenewed", log); err != nil {
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

// ParseAppRenewed is a log parse operation binding the contract event 0xcd92821b6ef75242495e80ef40036955c209df02d7319bff0345ad60a5855a28.
//
// Solidity: event AppRenewed(address indexed app, address indexed account, bytes32 indexed appId)
func (_Channels *ChannelsFilterer) ParseAppRenewed(log types.Log) (*ChannelsAppRenewed, error) {
	event := new(ChannelsAppRenewed)
	if err := _Channels.contract.UnpackLog(event, "AppRenewed", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsAppSchemaSetIterator is returned from FilterAppSchemaSet and is used to iterate over the raw logs and unpacked data for AppSchemaSet events raised by the Channels contract.
type ChannelsAppSchemaSetIterator struct {
	Event *ChannelsAppSchemaSet // Event containing the contract specifics and raw log

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
func (it *ChannelsAppSchemaSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsAppSchemaSet)
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
		it.Event = new(ChannelsAppSchemaSet)
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
func (it *ChannelsAppSchemaSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsAppSchemaSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsAppSchemaSet represents a AppSchemaSet event raised by the Channels contract.
type ChannelsAppSchemaSet struct {
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppSchemaSet is a free log retrieval operation binding the contract event 0x723aec47bbea8010c7ccf9c1bc9b775634332ea88ed1fc27b93f3469b24264ec.
//
// Solidity: event AppSchemaSet(bytes32 uid)
func (_Channels *ChannelsFilterer) FilterAppSchemaSet(opts *bind.FilterOpts) (*ChannelsAppSchemaSetIterator, error) {

	logs, sub, err := _Channels.contract.FilterLogs(opts, "AppSchemaSet")
	if err != nil {
		return nil, err
	}
	return &ChannelsAppSchemaSetIterator{contract: _Channels.contract, event: "AppSchemaSet", logs: logs, sub: sub}, nil
}

// WatchAppSchemaSet is a free log subscription operation binding the contract event 0x723aec47bbea8010c7ccf9c1bc9b775634332ea88ed1fc27b93f3469b24264ec.
//
// Solidity: event AppSchemaSet(bytes32 uid)
func (_Channels *ChannelsFilterer) WatchAppSchemaSet(opts *bind.WatchOpts, sink chan<- *ChannelsAppSchemaSet) (event.Subscription, error) {

	logs, sub, err := _Channels.contract.WatchLogs(opts, "AppSchemaSet")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsAppSchemaSet)
				if err := _Channels.contract.UnpackLog(event, "AppSchemaSet", log); err != nil {
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

// ParseAppSchemaSet is a log parse operation binding the contract event 0x723aec47bbea8010c7ccf9c1bc9b775634332ea88ed1fc27b93f3469b24264ec.
//
// Solidity: event AppSchemaSet(bytes32 uid)
func (_Channels *ChannelsFilterer) ParseAppSchemaSet(log types.Log) (*ChannelsAppSchemaSet, error) {
	event := new(ChannelsAppSchemaSet)
	if err := _Channels.contract.UnpackLog(event, "AppSchemaSet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsAppUninstalledIterator is returned from FilterAppUninstalled and is used to iterate over the raw logs and unpacked data for AppUninstalled events raised by the Channels contract.
type ChannelsAppUninstalledIterator struct {
	Event *ChannelsAppUninstalled // Event containing the contract specifics and raw log

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
func (it *ChannelsAppUninstalledIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsAppUninstalled)
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
		it.Event = new(ChannelsAppUninstalled)
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
func (it *ChannelsAppUninstalledIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsAppUninstalledIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsAppUninstalled represents a AppUninstalled event raised by the Channels contract.
type ChannelsAppUninstalled struct {
	App     common.Address
	Account common.Address
	AppId   [32]byte
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterAppUninstalled is a free log retrieval operation binding the contract event 0xe0b9e78734e068100cc19d3fdf3d1cb8adbe68b9321eb3e1490a6e5a1ab628f4.
//
// Solidity: event AppUninstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_Channels *ChannelsFilterer) FilterAppUninstalled(opts *bind.FilterOpts, app []common.Address, account []common.Address, appId [][32]byte) (*ChannelsAppUninstalledIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "AppUninstalled", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsAppUninstalledIterator{contract: _Channels.contract, event: "AppUninstalled", logs: logs, sub: sub}, nil
}

// WatchAppUninstalled is a free log subscription operation binding the contract event 0xe0b9e78734e068100cc19d3fdf3d1cb8adbe68b9321eb3e1490a6e5a1ab628f4.
//
// Solidity: event AppUninstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_Channels *ChannelsFilterer) WatchAppUninstalled(opts *bind.WatchOpts, sink chan<- *ChannelsAppUninstalled, app []common.Address, account []common.Address, appId [][32]byte) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var appIdRule []interface{}
	for _, appIdItem := range appId {
		appIdRule = append(appIdRule, appIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "AppUninstalled", appRule, accountRule, appIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsAppUninstalled)
				if err := _Channels.contract.UnpackLog(event, "AppUninstalled", log); err != nil {
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

// ParseAppUninstalled is a log parse operation binding the contract event 0xe0b9e78734e068100cc19d3fdf3d1cb8adbe68b9321eb3e1490a6e5a1ab628f4.
//
// Solidity: event AppUninstalled(address indexed app, address indexed account, bytes32 indexed appId)
func (_Channels *ChannelsFilterer) ParseAppUninstalled(log types.Log) (*ChannelsAppUninstalled, error) {
	event := new(ChannelsAppUninstalled)
	if err := _Channels.contract.UnpackLog(event, "AppUninstalled", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsAppUnregisteredIterator is returned from FilterAppUnregistered and is used to iterate over the raw logs and unpacked data for AppUnregistered events raised by the Channels contract.
type ChannelsAppUnregisteredIterator struct {
	Event *ChannelsAppUnregistered // Event containing the contract specifics and raw log

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
func (it *ChannelsAppUnregisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsAppUnregistered)
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
		it.Event = new(ChannelsAppUnregistered)
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
func (it *ChannelsAppUnregisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsAppUnregisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsAppUnregistered represents a AppUnregistered event raised by the Channels contract.
type ChannelsAppUnregistered struct {
	App common.Address
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppUnregistered is a free log retrieval operation binding the contract event 0x185eab63c3a863ff7848fe5c971d33894bc08bdc9982e6daac76a80298854a2e.
//
// Solidity: event AppUnregistered(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) FilterAppUnregistered(opts *bind.FilterOpts, app []common.Address) (*ChannelsAppUnregisteredIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "AppUnregistered", appRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsAppUnregisteredIterator{contract: _Channels.contract, event: "AppUnregistered", logs: logs, sub: sub}, nil
}

// WatchAppUnregistered is a free log subscription operation binding the contract event 0x185eab63c3a863ff7848fe5c971d33894bc08bdc9982e6daac76a80298854a2e.
//
// Solidity: event AppUnregistered(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) WatchAppUnregistered(opts *bind.WatchOpts, sink chan<- *ChannelsAppUnregistered, app []common.Address) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "AppUnregistered", appRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsAppUnregistered)
				if err := _Channels.contract.UnpackLog(event, "AppUnregistered", log); err != nil {
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

// ParseAppUnregistered is a log parse operation binding the contract event 0x185eab63c3a863ff7848fe5c971d33894bc08bdc9982e6daac76a80298854a2e.
//
// Solidity: event AppUnregistered(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) ParseAppUnregistered(log types.Log) (*ChannelsAppUnregistered, error) {
	event := new(ChannelsAppUnregistered)
	if err := _Channels.contract.UnpackLog(event, "AppUnregistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsAppUpdatedIterator is returned from FilterAppUpdated and is used to iterate over the raw logs and unpacked data for AppUpdated events raised by the Channels contract.
type ChannelsAppUpdatedIterator struct {
	Event *ChannelsAppUpdated // Event containing the contract specifics and raw log

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
func (it *ChannelsAppUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsAppUpdated)
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
		it.Event = new(ChannelsAppUpdated)
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
func (it *ChannelsAppUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsAppUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsAppUpdated represents a AppUpdated event raised by the Channels contract.
type ChannelsAppUpdated struct {
	App common.Address
	Uid [32]byte
	Raw types.Log // Blockchain specific contextual infos
}

// FilterAppUpdated is a free log retrieval operation binding the contract event 0x8e71058c6e054309a6daad6ddd1268b7eb2fb947aa5160443a5056837a0ba6cc.
//
// Solidity: event AppUpdated(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) FilterAppUpdated(opts *bind.FilterOpts, app []common.Address) (*ChannelsAppUpdatedIterator, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "AppUpdated", appRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsAppUpdatedIterator{contract: _Channels.contract, event: "AppUpdated", logs: logs, sub: sub}, nil
}

// WatchAppUpdated is a free log subscription operation binding the contract event 0x8e71058c6e054309a6daad6ddd1268b7eb2fb947aa5160443a5056837a0ba6cc.
//
// Solidity: event AppUpdated(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) WatchAppUpdated(opts *bind.WatchOpts, sink chan<- *ChannelsAppUpdated, app []common.Address) (event.Subscription, error) {

	var appRule []interface{}
	for _, appItem := range app {
		appRule = append(appRule, appItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "AppUpdated", appRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsAppUpdated)
				if err := _Channels.contract.UnpackLog(event, "AppUpdated", log); err != nil {
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

// ParseAppUpdated is a log parse operation binding the contract event 0x8e71058c6e054309a6daad6ddd1268b7eb2fb947aa5160443a5056837a0ba6cc.
//
// Solidity: event AppUpdated(address indexed app, bytes32 uid)
func (_Channels *ChannelsFilterer) ParseAppUpdated(log types.Log) (*ChannelsAppUpdated, error) {
	event := new(ChannelsAppUpdated)
	if err := _Channels.contract.UnpackLog(event, "AppUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
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

// ChannelsGroupAccessGrantedIterator is returned from FilterGroupAccessGranted and is used to iterate over the raw logs and unpacked data for GroupAccessGranted events raised by the Channels contract.
type ChannelsGroupAccessGrantedIterator struct {
	Event *ChannelsGroupAccessGranted // Event containing the contract specifics and raw log

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
func (it *ChannelsGroupAccessGrantedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsGroupAccessGranted)
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
		it.Event = new(ChannelsGroupAccessGranted)
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
func (it *ChannelsGroupAccessGrantedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsGroupAccessGrantedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsGroupAccessGranted represents a GroupAccessGranted event raised by the Channels contract.
type ChannelsGroupAccessGranted struct {
	GroupId   [32]byte
	Account   common.Address
	Delay     uint32
	Since     *big.Int
	NewMember bool
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterGroupAccessGranted is a free log retrieval operation binding the contract event 0xbc6be7ce767673eff1a260bf39d9c81620732bdc8abf54aa6da4fe822bdf843c.
//
// Solidity: event GroupAccessGranted(bytes32 indexed groupId, address indexed account, uint32 delay, uint48 since, bool newMember)
func (_Channels *ChannelsFilterer) FilterGroupAccessGranted(opts *bind.FilterOpts, groupId [][32]byte, account []common.Address) (*ChannelsGroupAccessGrantedIterator, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "GroupAccessGranted", groupIdRule, accountRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsGroupAccessGrantedIterator{contract: _Channels.contract, event: "GroupAccessGranted", logs: logs, sub: sub}, nil
}

// WatchGroupAccessGranted is a free log subscription operation binding the contract event 0xbc6be7ce767673eff1a260bf39d9c81620732bdc8abf54aa6da4fe822bdf843c.
//
// Solidity: event GroupAccessGranted(bytes32 indexed groupId, address indexed account, uint32 delay, uint48 since, bool newMember)
func (_Channels *ChannelsFilterer) WatchGroupAccessGranted(opts *bind.WatchOpts, sink chan<- *ChannelsGroupAccessGranted, groupId [][32]byte, account []common.Address) (event.Subscription, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "GroupAccessGranted", groupIdRule, accountRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsGroupAccessGranted)
				if err := _Channels.contract.UnpackLog(event, "GroupAccessGranted", log); err != nil {
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

// ParseGroupAccessGranted is a log parse operation binding the contract event 0xbc6be7ce767673eff1a260bf39d9c81620732bdc8abf54aa6da4fe822bdf843c.
//
// Solidity: event GroupAccessGranted(bytes32 indexed groupId, address indexed account, uint32 delay, uint48 since, bool newMember)
func (_Channels *ChannelsFilterer) ParseGroupAccessGranted(log types.Log) (*ChannelsGroupAccessGranted, error) {
	event := new(ChannelsGroupAccessGranted)
	if err := _Channels.contract.UnpackLog(event, "GroupAccessGranted", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsGroupAccessRevokedIterator is returned from FilterGroupAccessRevoked and is used to iterate over the raw logs and unpacked data for GroupAccessRevoked events raised by the Channels contract.
type ChannelsGroupAccessRevokedIterator struct {
	Event *ChannelsGroupAccessRevoked // Event containing the contract specifics and raw log

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
func (it *ChannelsGroupAccessRevokedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsGroupAccessRevoked)
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
		it.Event = new(ChannelsGroupAccessRevoked)
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
func (it *ChannelsGroupAccessRevokedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsGroupAccessRevokedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsGroupAccessRevoked represents a GroupAccessRevoked event raised by the Channels contract.
type ChannelsGroupAccessRevoked struct {
	GroupId [32]byte
	Account common.Address
	Revoked bool
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterGroupAccessRevoked is a free log retrieval operation binding the contract event 0xa8e269bf2bad0587ff1bcb2b08241a822fe42ebed3c034c1a7bf18b6999f25cd.
//
// Solidity: event GroupAccessRevoked(bytes32 indexed groupId, address indexed account, bool revoked)
func (_Channels *ChannelsFilterer) FilterGroupAccessRevoked(opts *bind.FilterOpts, groupId [][32]byte, account []common.Address) (*ChannelsGroupAccessRevokedIterator, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "GroupAccessRevoked", groupIdRule, accountRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsGroupAccessRevokedIterator{contract: _Channels.contract, event: "GroupAccessRevoked", logs: logs, sub: sub}, nil
}

// WatchGroupAccessRevoked is a free log subscription operation binding the contract event 0xa8e269bf2bad0587ff1bcb2b08241a822fe42ebed3c034c1a7bf18b6999f25cd.
//
// Solidity: event GroupAccessRevoked(bytes32 indexed groupId, address indexed account, bool revoked)
func (_Channels *ChannelsFilterer) WatchGroupAccessRevoked(opts *bind.WatchOpts, sink chan<- *ChannelsGroupAccessRevoked, groupId [][32]byte, account []common.Address) (event.Subscription, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}
	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "GroupAccessRevoked", groupIdRule, accountRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsGroupAccessRevoked)
				if err := _Channels.contract.UnpackLog(event, "GroupAccessRevoked", log); err != nil {
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

// ParseGroupAccessRevoked is a log parse operation binding the contract event 0xa8e269bf2bad0587ff1bcb2b08241a822fe42ebed3c034c1a7bf18b6999f25cd.
//
// Solidity: event GroupAccessRevoked(bytes32 indexed groupId, address indexed account, bool revoked)
func (_Channels *ChannelsFilterer) ParseGroupAccessRevoked(log types.Log) (*ChannelsGroupAccessRevoked, error) {
	event := new(ChannelsGroupAccessRevoked)
	if err := _Channels.contract.UnpackLog(event, "GroupAccessRevoked", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsGroupExpirationSetIterator is returned from FilterGroupExpirationSet and is used to iterate over the raw logs and unpacked data for GroupExpirationSet events raised by the Channels contract.
type ChannelsGroupExpirationSetIterator struct {
	Event *ChannelsGroupExpirationSet // Event containing the contract specifics and raw log

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
func (it *ChannelsGroupExpirationSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsGroupExpirationSet)
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
		it.Event = new(ChannelsGroupExpirationSet)
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
func (it *ChannelsGroupExpirationSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsGroupExpirationSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsGroupExpirationSet represents a GroupExpirationSet event raised by the Channels contract.
type ChannelsGroupExpirationSet struct {
	GroupId    [32]byte
	Expiration *big.Int
	Raw        types.Log // Blockchain specific contextual infos
}

// FilterGroupExpirationSet is a free log retrieval operation binding the contract event 0xc99ff823ce42456c545cc1631d9e1fb073344c8072d5ef45637a8594d72e7eb4.
//
// Solidity: event GroupExpirationSet(bytes32 indexed groupId, uint48 expiration)
func (_Channels *ChannelsFilterer) FilterGroupExpirationSet(opts *bind.FilterOpts, groupId [][32]byte) (*ChannelsGroupExpirationSetIterator, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "GroupExpirationSet", groupIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsGroupExpirationSetIterator{contract: _Channels.contract, event: "GroupExpirationSet", logs: logs, sub: sub}, nil
}

// WatchGroupExpirationSet is a free log subscription operation binding the contract event 0xc99ff823ce42456c545cc1631d9e1fb073344c8072d5ef45637a8594d72e7eb4.
//
// Solidity: event GroupExpirationSet(bytes32 indexed groupId, uint48 expiration)
func (_Channels *ChannelsFilterer) WatchGroupExpirationSet(opts *bind.WatchOpts, sink chan<- *ChannelsGroupExpirationSet, groupId [][32]byte) (event.Subscription, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "GroupExpirationSet", groupIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsGroupExpirationSet)
				if err := _Channels.contract.UnpackLog(event, "GroupExpirationSet", log); err != nil {
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

// ParseGroupExpirationSet is a log parse operation binding the contract event 0xc99ff823ce42456c545cc1631d9e1fb073344c8072d5ef45637a8594d72e7eb4.
//
// Solidity: event GroupExpirationSet(bytes32 indexed groupId, uint48 expiration)
func (_Channels *ChannelsFilterer) ParseGroupExpirationSet(log types.Log) (*ChannelsGroupExpirationSet, error) {
	event := new(ChannelsGroupExpirationSet)
	if err := _Channels.contract.UnpackLog(event, "GroupExpirationSet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsGroupGrantDelaySetIterator is returned from FilterGroupGrantDelaySet and is used to iterate over the raw logs and unpacked data for GroupGrantDelaySet events raised by the Channels contract.
type ChannelsGroupGrantDelaySetIterator struct {
	Event *ChannelsGroupGrantDelaySet // Event containing the contract specifics and raw log

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
func (it *ChannelsGroupGrantDelaySetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsGroupGrantDelaySet)
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
		it.Event = new(ChannelsGroupGrantDelaySet)
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
func (it *ChannelsGroupGrantDelaySetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsGroupGrantDelaySetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsGroupGrantDelaySet represents a GroupGrantDelaySet event raised by the Channels contract.
type ChannelsGroupGrantDelaySet struct {
	GroupId [32]byte
	Delay   uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterGroupGrantDelaySet is a free log retrieval operation binding the contract event 0xa06774395d21d621e04b517d52e7e895284a359fde66df45baaae8091fe00379.
//
// Solidity: event GroupGrantDelaySet(bytes32 indexed groupId, uint32 delay)
func (_Channels *ChannelsFilterer) FilterGroupGrantDelaySet(opts *bind.FilterOpts, groupId [][32]byte) (*ChannelsGroupGrantDelaySetIterator, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "GroupGrantDelaySet", groupIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsGroupGrantDelaySetIterator{contract: _Channels.contract, event: "GroupGrantDelaySet", logs: logs, sub: sub}, nil
}

// WatchGroupGrantDelaySet is a free log subscription operation binding the contract event 0xa06774395d21d621e04b517d52e7e895284a359fde66df45baaae8091fe00379.
//
// Solidity: event GroupGrantDelaySet(bytes32 indexed groupId, uint32 delay)
func (_Channels *ChannelsFilterer) WatchGroupGrantDelaySet(opts *bind.WatchOpts, sink chan<- *ChannelsGroupGrantDelaySet, groupId [][32]byte) (event.Subscription, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "GroupGrantDelaySet", groupIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsGroupGrantDelaySet)
				if err := _Channels.contract.UnpackLog(event, "GroupGrantDelaySet", log); err != nil {
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

// ParseGroupGrantDelaySet is a log parse operation binding the contract event 0xa06774395d21d621e04b517d52e7e895284a359fde66df45baaae8091fe00379.
//
// Solidity: event GroupGrantDelaySet(bytes32 indexed groupId, uint32 delay)
func (_Channels *ChannelsFilterer) ParseGroupGrantDelaySet(log types.Log) (*ChannelsGroupGrantDelaySet, error) {
	event := new(ChannelsGroupGrantDelaySet)
	if err := _Channels.contract.UnpackLog(event, "GroupGrantDelaySet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsGroupGuardianSetIterator is returned from FilterGroupGuardianSet and is used to iterate over the raw logs and unpacked data for GroupGuardianSet events raised by the Channels contract.
type ChannelsGroupGuardianSetIterator struct {
	Event *ChannelsGroupGuardianSet // Event containing the contract specifics and raw log

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
func (it *ChannelsGroupGuardianSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsGroupGuardianSet)
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
		it.Event = new(ChannelsGroupGuardianSet)
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
func (it *ChannelsGroupGuardianSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsGroupGuardianSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsGroupGuardianSet represents a GroupGuardianSet event raised by the Channels contract.
type ChannelsGroupGuardianSet struct {
	GroupId  [32]byte
	Guardian [32]byte
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterGroupGuardianSet is a free log retrieval operation binding the contract event 0xa5d5c9c7ed6419ec77f895b0174d37719793101694b7efefd7c9272e6739751d.
//
// Solidity: event GroupGuardianSet(bytes32 indexed groupId, bytes32 guardian)
func (_Channels *ChannelsFilterer) FilterGroupGuardianSet(opts *bind.FilterOpts, groupId [][32]byte) (*ChannelsGroupGuardianSetIterator, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "GroupGuardianSet", groupIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsGroupGuardianSetIterator{contract: _Channels.contract, event: "GroupGuardianSet", logs: logs, sub: sub}, nil
}

// WatchGroupGuardianSet is a free log subscription operation binding the contract event 0xa5d5c9c7ed6419ec77f895b0174d37719793101694b7efefd7c9272e6739751d.
//
// Solidity: event GroupGuardianSet(bytes32 indexed groupId, bytes32 guardian)
func (_Channels *ChannelsFilterer) WatchGroupGuardianSet(opts *bind.WatchOpts, sink chan<- *ChannelsGroupGuardianSet, groupId [][32]byte) (event.Subscription, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "GroupGuardianSet", groupIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsGroupGuardianSet)
				if err := _Channels.contract.UnpackLog(event, "GroupGuardianSet", log); err != nil {
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

// ParseGroupGuardianSet is a log parse operation binding the contract event 0xa5d5c9c7ed6419ec77f895b0174d37719793101694b7efefd7c9272e6739751d.
//
// Solidity: event GroupGuardianSet(bytes32 indexed groupId, bytes32 guardian)
func (_Channels *ChannelsFilterer) ParseGroupGuardianSet(log types.Log) (*ChannelsGroupGuardianSet, error) {
	event := new(ChannelsGroupGuardianSet)
	if err := _Channels.contract.UnpackLog(event, "GroupGuardianSet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsGroupStatusSetIterator is returned from FilterGroupStatusSet and is used to iterate over the raw logs and unpacked data for GroupStatusSet events raised by the Channels contract.
type ChannelsGroupStatusSetIterator struct {
	Event *ChannelsGroupStatusSet // Event containing the contract specifics and raw log

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
func (it *ChannelsGroupStatusSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsGroupStatusSet)
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
		it.Event = new(ChannelsGroupStatusSet)
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
func (it *ChannelsGroupStatusSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsGroupStatusSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsGroupStatusSet represents a GroupStatusSet event raised by the Channels contract.
type ChannelsGroupStatusSet struct {
	GroupId [32]byte
	Active  bool
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterGroupStatusSet is a free log retrieval operation binding the contract event 0x843f08f891f1f625fc8167a9a069a4a5b5249da7fecd5d99516660cf2a1a6f44.
//
// Solidity: event GroupStatusSet(bytes32 indexed groupId, bool active)
func (_Channels *ChannelsFilterer) FilterGroupStatusSet(opts *bind.FilterOpts, groupId [][32]byte) (*ChannelsGroupStatusSetIterator, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "GroupStatusSet", groupIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsGroupStatusSetIterator{contract: _Channels.contract, event: "GroupStatusSet", logs: logs, sub: sub}, nil
}

// WatchGroupStatusSet is a free log subscription operation binding the contract event 0x843f08f891f1f625fc8167a9a069a4a5b5249da7fecd5d99516660cf2a1a6f44.
//
// Solidity: event GroupStatusSet(bytes32 indexed groupId, bool active)
func (_Channels *ChannelsFilterer) WatchGroupStatusSet(opts *bind.WatchOpts, sink chan<- *ChannelsGroupStatusSet, groupId [][32]byte) (event.Subscription, error) {

	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "GroupStatusSet", groupIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsGroupStatusSet)
				if err := _Channels.contract.UnpackLog(event, "GroupStatusSet", log); err != nil {
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

// ParseGroupStatusSet is a log parse operation binding the contract event 0x843f08f891f1f625fc8167a9a069a4a5b5249da7fecd5d99516660cf2a1a6f44.
//
// Solidity: event GroupStatusSet(bytes32 indexed groupId, bool active)
func (_Channels *ChannelsFilterer) ParseGroupStatusSet(log types.Log) (*ChannelsGroupStatusSet, error) {
	event := new(ChannelsGroupStatusSet)
	if err := _Channels.contract.UnpackLog(event, "GroupStatusSet", log); err != nil {
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

// ChannelsOperationCanceledIterator is returned from FilterOperationCanceled and is used to iterate over the raw logs and unpacked data for OperationCanceled events raised by the Channels contract.
type ChannelsOperationCanceledIterator struct {
	Event *ChannelsOperationCanceled // Event containing the contract specifics and raw log

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
func (it *ChannelsOperationCanceledIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsOperationCanceled)
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
		it.Event = new(ChannelsOperationCanceled)
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
func (it *ChannelsOperationCanceledIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsOperationCanceledIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsOperationCanceled represents a OperationCanceled event raised by the Channels contract.
type ChannelsOperationCanceled struct {
	OperationId [32]byte
	Nonce       uint32
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterOperationCanceled is a free log retrieval operation binding the contract event 0xbd9ac67a6e2f6463b80927326310338bcbb4bdb7936ce1365ea3e01067e7b9f7.
//
// Solidity: event OperationCanceled(bytes32 indexed operationId, uint32 nonce)
func (_Channels *ChannelsFilterer) FilterOperationCanceled(opts *bind.FilterOpts, operationId [][32]byte) (*ChannelsOperationCanceledIterator, error) {

	var operationIdRule []interface{}
	for _, operationIdItem := range operationId {
		operationIdRule = append(operationIdRule, operationIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "OperationCanceled", operationIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsOperationCanceledIterator{contract: _Channels.contract, event: "OperationCanceled", logs: logs, sub: sub}, nil
}

// WatchOperationCanceled is a free log subscription operation binding the contract event 0xbd9ac67a6e2f6463b80927326310338bcbb4bdb7936ce1365ea3e01067e7b9f7.
//
// Solidity: event OperationCanceled(bytes32 indexed operationId, uint32 nonce)
func (_Channels *ChannelsFilterer) WatchOperationCanceled(opts *bind.WatchOpts, sink chan<- *ChannelsOperationCanceled, operationId [][32]byte) (event.Subscription, error) {

	var operationIdRule []interface{}
	for _, operationIdItem := range operationId {
		operationIdRule = append(operationIdRule, operationIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "OperationCanceled", operationIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsOperationCanceled)
				if err := _Channels.contract.UnpackLog(event, "OperationCanceled", log); err != nil {
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

// ParseOperationCanceled is a log parse operation binding the contract event 0xbd9ac67a6e2f6463b80927326310338bcbb4bdb7936ce1365ea3e01067e7b9f7.
//
// Solidity: event OperationCanceled(bytes32 indexed operationId, uint32 nonce)
func (_Channels *ChannelsFilterer) ParseOperationCanceled(log types.Log) (*ChannelsOperationCanceled, error) {
	event := new(ChannelsOperationCanceled)
	if err := _Channels.contract.UnpackLog(event, "OperationCanceled", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsOperationExecutedIterator is returned from FilterOperationExecuted and is used to iterate over the raw logs and unpacked data for OperationExecuted events raised by the Channels contract.
type ChannelsOperationExecutedIterator struct {
	Event *ChannelsOperationExecuted // Event containing the contract specifics and raw log

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
func (it *ChannelsOperationExecutedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsOperationExecuted)
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
		it.Event = new(ChannelsOperationExecuted)
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
func (it *ChannelsOperationExecutedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsOperationExecutedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsOperationExecuted represents a OperationExecuted event raised by the Channels contract.
type ChannelsOperationExecuted struct {
	OperationId [32]byte
	Nonce       uint32
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterOperationExecuted is a free log retrieval operation binding the contract event 0x76a2a46953689d4861a5d3f6ed883ad7e6af674a21f8e162707159fc9dde614d.
//
// Solidity: event OperationExecuted(bytes32 indexed operationId, uint32 nonce)
func (_Channels *ChannelsFilterer) FilterOperationExecuted(opts *bind.FilterOpts, operationId [][32]byte) (*ChannelsOperationExecutedIterator, error) {

	var operationIdRule []interface{}
	for _, operationIdItem := range operationId {
		operationIdRule = append(operationIdRule, operationIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "OperationExecuted", operationIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsOperationExecutedIterator{contract: _Channels.contract, event: "OperationExecuted", logs: logs, sub: sub}, nil
}

// WatchOperationExecuted is a free log subscription operation binding the contract event 0x76a2a46953689d4861a5d3f6ed883ad7e6af674a21f8e162707159fc9dde614d.
//
// Solidity: event OperationExecuted(bytes32 indexed operationId, uint32 nonce)
func (_Channels *ChannelsFilterer) WatchOperationExecuted(opts *bind.WatchOpts, sink chan<- *ChannelsOperationExecuted, operationId [][32]byte) (event.Subscription, error) {

	var operationIdRule []interface{}
	for _, operationIdItem := range operationId {
		operationIdRule = append(operationIdRule, operationIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "OperationExecuted", operationIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsOperationExecuted)
				if err := _Channels.contract.UnpackLog(event, "OperationExecuted", log); err != nil {
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

// ParseOperationExecuted is a log parse operation binding the contract event 0x76a2a46953689d4861a5d3f6ed883ad7e6af674a21f8e162707159fc9dde614d.
//
// Solidity: event OperationExecuted(bytes32 indexed operationId, uint32 nonce)
func (_Channels *ChannelsFilterer) ParseOperationExecuted(log types.Log) (*ChannelsOperationExecuted, error) {
	event := new(ChannelsOperationExecuted)
	if err := _Channels.contract.UnpackLog(event, "OperationExecuted", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsOperationScheduledIterator is returned from FilterOperationScheduled and is used to iterate over the raw logs and unpacked data for OperationScheduled events raised by the Channels contract.
type ChannelsOperationScheduledIterator struct {
	Event *ChannelsOperationScheduled // Event containing the contract specifics and raw log

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
func (it *ChannelsOperationScheduledIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsOperationScheduled)
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
		it.Event = new(ChannelsOperationScheduled)
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
func (it *ChannelsOperationScheduledIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsOperationScheduledIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsOperationScheduled represents a OperationScheduled event raised by the Channels contract.
type ChannelsOperationScheduled struct {
	OperationId [32]byte
	Timepoint   *big.Int
	Nonce       uint32
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterOperationScheduled is a free log retrieval operation binding the contract event 0x64f06f9ce9962e504db17b38c33c36cb2b52ea784a006c6039d55b321e9e00b2.
//
// Solidity: event OperationScheduled(bytes32 indexed operationId, uint48 timepoint, uint32 nonce)
func (_Channels *ChannelsFilterer) FilterOperationScheduled(opts *bind.FilterOpts, operationId [][32]byte) (*ChannelsOperationScheduledIterator, error) {

	var operationIdRule []interface{}
	for _, operationIdItem := range operationId {
		operationIdRule = append(operationIdRule, operationIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "OperationScheduled", operationIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsOperationScheduledIterator{contract: _Channels.contract, event: "OperationScheduled", logs: logs, sub: sub}, nil
}

// WatchOperationScheduled is a free log subscription operation binding the contract event 0x64f06f9ce9962e504db17b38c33c36cb2b52ea784a006c6039d55b321e9e00b2.
//
// Solidity: event OperationScheduled(bytes32 indexed operationId, uint48 timepoint, uint32 nonce)
func (_Channels *ChannelsFilterer) WatchOperationScheduled(opts *bind.WatchOpts, sink chan<- *ChannelsOperationScheduled, operationId [][32]byte) (event.Subscription, error) {

	var operationIdRule []interface{}
	for _, operationIdItem := range operationId {
		operationIdRule = append(operationIdRule, operationIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "OperationScheduled", operationIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsOperationScheduled)
				if err := _Channels.contract.UnpackLog(event, "OperationScheduled", log); err != nil {
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

// ParseOperationScheduled is a log parse operation binding the contract event 0x64f06f9ce9962e504db17b38c33c36cb2b52ea784a006c6039d55b321e9e00b2.
//
// Solidity: event OperationScheduled(bytes32 indexed operationId, uint48 timepoint, uint32 nonce)
func (_Channels *ChannelsFilterer) ParseOperationScheduled(log types.Log) (*ChannelsOperationScheduled, error) {
	event := new(ChannelsOperationScheduled)
	if err := _Channels.contract.UnpackLog(event, "OperationScheduled", log); err != nil {
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

// ChannelsTargetDisabledSetIterator is returned from FilterTargetDisabledSet and is used to iterate over the raw logs and unpacked data for TargetDisabledSet events raised by the Channels contract.
type ChannelsTargetDisabledSetIterator struct {
	Event *ChannelsTargetDisabledSet // Event containing the contract specifics and raw log

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
func (it *ChannelsTargetDisabledSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsTargetDisabledSet)
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
		it.Event = new(ChannelsTargetDisabledSet)
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
func (it *ChannelsTargetDisabledSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsTargetDisabledSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsTargetDisabledSet represents a TargetDisabledSet event raised by the Channels contract.
type ChannelsTargetDisabledSet struct {
	Target   common.Address
	Disabled bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterTargetDisabledSet is a free log retrieval operation binding the contract event 0x321aba3034166bce6aa03f6fbd403e7a9e7bec048d73a1d10a186e072ace5e51.
//
// Solidity: event TargetDisabledSet(address indexed target, bool disabled)
func (_Channels *ChannelsFilterer) FilterTargetDisabledSet(opts *bind.FilterOpts, target []common.Address) (*ChannelsTargetDisabledSetIterator, error) {

	var targetRule []interface{}
	for _, targetItem := range target {
		targetRule = append(targetRule, targetItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "TargetDisabledSet", targetRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsTargetDisabledSetIterator{contract: _Channels.contract, event: "TargetDisabledSet", logs: logs, sub: sub}, nil
}

// WatchTargetDisabledSet is a free log subscription operation binding the contract event 0x321aba3034166bce6aa03f6fbd403e7a9e7bec048d73a1d10a186e072ace5e51.
//
// Solidity: event TargetDisabledSet(address indexed target, bool disabled)
func (_Channels *ChannelsFilterer) WatchTargetDisabledSet(opts *bind.WatchOpts, sink chan<- *ChannelsTargetDisabledSet, target []common.Address) (event.Subscription, error) {

	var targetRule []interface{}
	for _, targetItem := range target {
		targetRule = append(targetRule, targetItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "TargetDisabledSet", targetRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsTargetDisabledSet)
				if err := _Channels.contract.UnpackLog(event, "TargetDisabledSet", log); err != nil {
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

// ParseTargetDisabledSet is a log parse operation binding the contract event 0x321aba3034166bce6aa03f6fbd403e7a9e7bec048d73a1d10a186e072ace5e51.
//
// Solidity: event TargetDisabledSet(address indexed target, bool disabled)
func (_Channels *ChannelsFilterer) ParseTargetDisabledSet(log types.Log) (*ChannelsTargetDisabledSet, error) {
	event := new(ChannelsTargetDisabledSet)
	if err := _Channels.contract.UnpackLog(event, "TargetDisabledSet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsTargetFunctionDelaySetIterator is returned from FilterTargetFunctionDelaySet and is used to iterate over the raw logs and unpacked data for TargetFunctionDelaySet events raised by the Channels contract.
type ChannelsTargetFunctionDelaySetIterator struct {
	Event *ChannelsTargetFunctionDelaySet // Event containing the contract specifics and raw log

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
func (it *ChannelsTargetFunctionDelaySetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsTargetFunctionDelaySet)
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
		it.Event = new(ChannelsTargetFunctionDelaySet)
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
func (it *ChannelsTargetFunctionDelaySetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsTargetFunctionDelaySetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsTargetFunctionDelaySet represents a TargetFunctionDelaySet event raised by the Channels contract.
type ChannelsTargetFunctionDelaySet struct {
	Target     common.Address
	NewDelay   uint32
	MinSetback uint32
	Raw        types.Log // Blockchain specific contextual infos
}

// FilterTargetFunctionDelaySet is a free log retrieval operation binding the contract event 0xa9d97778ce8b2f65bf42598deb3d210f51e51b33d782f1859af04724142f2154.
//
// Solidity: event TargetFunctionDelaySet(address indexed target, uint32 newDelay, uint32 minSetback)
func (_Channels *ChannelsFilterer) FilterTargetFunctionDelaySet(opts *bind.FilterOpts, target []common.Address) (*ChannelsTargetFunctionDelaySetIterator, error) {

	var targetRule []interface{}
	for _, targetItem := range target {
		targetRule = append(targetRule, targetItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "TargetFunctionDelaySet", targetRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsTargetFunctionDelaySetIterator{contract: _Channels.contract, event: "TargetFunctionDelaySet", logs: logs, sub: sub}, nil
}

// WatchTargetFunctionDelaySet is a free log subscription operation binding the contract event 0xa9d97778ce8b2f65bf42598deb3d210f51e51b33d782f1859af04724142f2154.
//
// Solidity: event TargetFunctionDelaySet(address indexed target, uint32 newDelay, uint32 minSetback)
func (_Channels *ChannelsFilterer) WatchTargetFunctionDelaySet(opts *bind.WatchOpts, sink chan<- *ChannelsTargetFunctionDelaySet, target []common.Address) (event.Subscription, error) {

	var targetRule []interface{}
	for _, targetItem := range target {
		targetRule = append(targetRule, targetItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "TargetFunctionDelaySet", targetRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsTargetFunctionDelaySet)
				if err := _Channels.contract.UnpackLog(event, "TargetFunctionDelaySet", log); err != nil {
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

// ParseTargetFunctionDelaySet is a log parse operation binding the contract event 0xa9d97778ce8b2f65bf42598deb3d210f51e51b33d782f1859af04724142f2154.
//
// Solidity: event TargetFunctionDelaySet(address indexed target, uint32 newDelay, uint32 minSetback)
func (_Channels *ChannelsFilterer) ParseTargetFunctionDelaySet(log types.Log) (*ChannelsTargetFunctionDelaySet, error) {
	event := new(ChannelsTargetFunctionDelaySet)
	if err := _Channels.contract.UnpackLog(event, "TargetFunctionDelaySet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsTargetFunctionDisabledSetIterator is returned from FilterTargetFunctionDisabledSet and is used to iterate over the raw logs and unpacked data for TargetFunctionDisabledSet events raised by the Channels contract.
type ChannelsTargetFunctionDisabledSetIterator struct {
	Event *ChannelsTargetFunctionDisabledSet // Event containing the contract specifics and raw log

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
func (it *ChannelsTargetFunctionDisabledSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsTargetFunctionDisabledSet)
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
		it.Event = new(ChannelsTargetFunctionDisabledSet)
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
func (it *ChannelsTargetFunctionDisabledSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsTargetFunctionDisabledSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsTargetFunctionDisabledSet represents a TargetFunctionDisabledSet event raised by the Channels contract.
type ChannelsTargetFunctionDisabledSet struct {
	Target   common.Address
	Selector [4]byte
	Disabled bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterTargetFunctionDisabledSet is a free log retrieval operation binding the contract event 0x61851da547ae554f6c56824529cf6c11c76bd22c978eb68a8c5f9adad3ed8778.
//
// Solidity: event TargetFunctionDisabledSet(address indexed target, bytes4 indexed selector, bool disabled)
func (_Channels *ChannelsFilterer) FilterTargetFunctionDisabledSet(opts *bind.FilterOpts, target []common.Address, selector [][4]byte) (*ChannelsTargetFunctionDisabledSetIterator, error) {

	var targetRule []interface{}
	for _, targetItem := range target {
		targetRule = append(targetRule, targetItem)
	}
	var selectorRule []interface{}
	for _, selectorItem := range selector {
		selectorRule = append(selectorRule, selectorItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "TargetFunctionDisabledSet", targetRule, selectorRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsTargetFunctionDisabledSetIterator{contract: _Channels.contract, event: "TargetFunctionDisabledSet", logs: logs, sub: sub}, nil
}

// WatchTargetFunctionDisabledSet is a free log subscription operation binding the contract event 0x61851da547ae554f6c56824529cf6c11c76bd22c978eb68a8c5f9adad3ed8778.
//
// Solidity: event TargetFunctionDisabledSet(address indexed target, bytes4 indexed selector, bool disabled)
func (_Channels *ChannelsFilterer) WatchTargetFunctionDisabledSet(opts *bind.WatchOpts, sink chan<- *ChannelsTargetFunctionDisabledSet, target []common.Address, selector [][4]byte) (event.Subscription, error) {

	var targetRule []interface{}
	for _, targetItem := range target {
		targetRule = append(targetRule, targetItem)
	}
	var selectorRule []interface{}
	for _, selectorItem := range selector {
		selectorRule = append(selectorRule, selectorItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "TargetFunctionDisabledSet", targetRule, selectorRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsTargetFunctionDisabledSet)
				if err := _Channels.contract.UnpackLog(event, "TargetFunctionDisabledSet", log); err != nil {
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

// ParseTargetFunctionDisabledSet is a log parse operation binding the contract event 0x61851da547ae554f6c56824529cf6c11c76bd22c978eb68a8c5f9adad3ed8778.
//
// Solidity: event TargetFunctionDisabledSet(address indexed target, bytes4 indexed selector, bool disabled)
func (_Channels *ChannelsFilterer) ParseTargetFunctionDisabledSet(log types.Log) (*ChannelsTargetFunctionDisabledSet, error) {
	event := new(ChannelsTargetFunctionDisabledSet)
	if err := _Channels.contract.UnpackLog(event, "TargetFunctionDisabledSet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ChannelsTargetFunctionGroupSetIterator is returned from FilterTargetFunctionGroupSet and is used to iterate over the raw logs and unpacked data for TargetFunctionGroupSet events raised by the Channels contract.
type ChannelsTargetFunctionGroupSetIterator struct {
	Event *ChannelsTargetFunctionGroupSet // Event containing the contract specifics and raw log

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
func (it *ChannelsTargetFunctionGroupSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ChannelsTargetFunctionGroupSet)
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
		it.Event = new(ChannelsTargetFunctionGroupSet)
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
func (it *ChannelsTargetFunctionGroupSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ChannelsTargetFunctionGroupSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ChannelsTargetFunctionGroupSet represents a TargetFunctionGroupSet event raised by the Channels contract.
type ChannelsTargetFunctionGroupSet struct {
	Target   common.Address
	Selector [4]byte
	GroupId  [32]byte
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterTargetFunctionGroupSet is a free log retrieval operation binding the contract event 0x69a44f8b57cf6e6d323dbec21a0baae72ede104b17ed845ce90d3fea16c932f8.
//
// Solidity: event TargetFunctionGroupSet(address indexed target, bytes4 indexed selector, bytes32 indexed groupId)
func (_Channels *ChannelsFilterer) FilterTargetFunctionGroupSet(opts *bind.FilterOpts, target []common.Address, selector [][4]byte, groupId [][32]byte) (*ChannelsTargetFunctionGroupSetIterator, error) {

	var targetRule []interface{}
	for _, targetItem := range target {
		targetRule = append(targetRule, targetItem)
	}
	var selectorRule []interface{}
	for _, selectorItem := range selector {
		selectorRule = append(selectorRule, selectorItem)
	}
	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "TargetFunctionGroupSet", targetRule, selectorRule, groupIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsTargetFunctionGroupSetIterator{contract: _Channels.contract, event: "TargetFunctionGroupSet", logs: logs, sub: sub}, nil
}

// WatchTargetFunctionGroupSet is a free log subscription operation binding the contract event 0x69a44f8b57cf6e6d323dbec21a0baae72ede104b17ed845ce90d3fea16c932f8.
//
// Solidity: event TargetFunctionGroupSet(address indexed target, bytes4 indexed selector, bytes32 indexed groupId)
func (_Channels *ChannelsFilterer) WatchTargetFunctionGroupSet(opts *bind.WatchOpts, sink chan<- *ChannelsTargetFunctionGroupSet, target []common.Address, selector [][4]byte, groupId [][32]byte) (event.Subscription, error) {

	var targetRule []interface{}
	for _, targetItem := range target {
		targetRule = append(targetRule, targetItem)
	}
	var selectorRule []interface{}
	for _, selectorItem := range selector {
		selectorRule = append(selectorRule, selectorItem)
	}
	var groupIdRule []interface{}
	for _, groupIdItem := range groupId {
		groupIdRule = append(groupIdRule, groupIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "TargetFunctionGroupSet", targetRule, selectorRule, groupIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ChannelsTargetFunctionGroupSet)
				if err := _Channels.contract.UnpackLog(event, "TargetFunctionGroupSet", log); err != nil {
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

// ParseTargetFunctionGroupSet is a log parse operation binding the contract event 0x69a44f8b57cf6e6d323dbec21a0baae72ede104b17ed845ce90d3fea16c932f8.
//
// Solidity: event TargetFunctionGroupSet(address indexed target, bytes4 indexed selector, bytes32 indexed groupId)
func (_Channels *ChannelsFilterer) ParseTargetFunctionGroupSet(log types.Log) (*ChannelsTargetFunctionGroupSet, error) {
	event := new(ChannelsTargetFunctionGroupSet)
	if err := _Channels.contract.UnpackLog(event, "TargetFunctionGroupSet", log); err != nil {
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
