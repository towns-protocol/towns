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
	Id       string
	Disabled bool
	Metadata string
	RoleIds  []*big.Int
}

// ChannelsMetaData contains all meta data concerning the Channels contract.
var ChannelsMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"addRoleToChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"createChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"channel\",\"type\":\"tuple\",\"internalType\":\"structIChannelBase.Channel\",\"components\":[{\"name\":\"id\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getChannels\",\"inputs\":[],\"outputs\":[{\"name\":\"channels\",\"type\":\"tuple[]\",\"internalType\":\"structIChannelBase.Channel[]\",\"components\":[{\"name\":\"id\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRolesByChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeRoleFromChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Banned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelCreated\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRemoved\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRoleAdded\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRoleRemoved\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelUpdated\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConsecutiveTransfer\",\"inputs\":[{\"name\":\"fromTokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"toTokenId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Paused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unbanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unpaused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ApprovalCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ApprovalQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"BalanceQueryForZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__AlreadyBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Banning__CannotBanSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__InvalidTokenId\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Banning__NotBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelDisabled\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__RoleAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__RoleDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__ValueAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintERC2309QuantityExceedsLimit\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintZeroQuantity\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnerQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnershipNotInitializedForExtraData\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__NotPaused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__Paused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferFromIncorrectOwner\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToNonERC721ReceiverImplementer\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"URIQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Validator__InvalidStringLength\",\"inputs\":[]}]",
	Bin: "0x608060405234801561001057600080fd5b5061001961001e565b6100c4565b7f2d0d21306acfe8e9bb163a4573e95aff6cef95dc1102c6a16d5f19eac08cc4de8054640100000000900460ff161561006a576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156100c157805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b61249980620000d46000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c806351f83cea1161005b57806351f83cea146100f15780637cd7ee3d146101045780639575f6ac146101245780639c02812e1461013957600080fd5b806305b2cfbc1461008d57806316b38751146100a257806342bb09b2146100cb578063499061b5146100de575b600080fd5b6100a061009b366004611c36565b61014c565b005b6100b56100b0366004611cb2565b61018a565b6040516100c29190611cf3565b60405180910390f35b6100a06100d9366004611d37565b6101d4565b6100a06100ec366004611d37565b61024c565b6100a06100ff366004611da5565b6102bf565b610117610112366004611c36565b6102fc565b6040516100c29190611f5f565b61012c610332565b6040516100c29190611f72565b6100a0610147366004611fe4565b610341565b61017e6040518060400160405280601181526020017041646452656d6f76654368616e6e656c7360781b81525061037e565b610187816103b4565b50565b60606101cb83838080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525061040192505050565b90505b92915050565b61023c83838080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920191909152505060408051808201909152601181527041646452656d6f76654368616e6e656c7360781b6020820152915061040c9050565b610247838383610437565b505050565b6102b483838080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920191909152505060408051808201909152601181527041646452656d6f76654368616e6e656c7360781b6020820152915061040c9050565b6102478383836104c2565b6102f16040518060400160405280601181526020017041646452656d6f76654368616e6e656c7360781b81525061037e565b610247838383610540565b61032960405180608001604052806060815260200160001515815260200160608152602001606081525090565b6101ce8261059a565b606061033c61060b565b905090565b6103736040518060400160405280601181526020017041646452656d6f76654368616e6e656c7360781b81525061037e565b61024783838361074c565b610397604051806020016040528060008152508261079b565b61018757604051630ce39a4b60e21b815260040160405180910390fd5b6103bd8161081f565b336001600160a01b03167ffa523db6e0f9e715af524617025380ecb07a5bdc7266e951baa64c82096b42bf826040516103f6919061205b565b60405180910390a250565b60606101ce8261098c565b610416828261079b565b61043357604051630ce39a4b60e21b815260040160405180910390fd5b5050565b61047883838080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920191909152508592506109e2915050565b336001600160a01b03167fca076ccbc3aeaf982d7e8bda25501bca43f3ff1910a31364669925306e9a6e148484846040516104b59392919061206e565b60405180910390a2505050565b61050383838080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250859250610a98915050565b336001600160a01b03167f83a637a8897e018bd05113befc092187d3c58ae68539c6eb183e2a479dcca40d8484846040516104b59392919061206e565b61054b826000610b23565b610556836002610b23565b610561838383610b47565b336001600160a01b03167ff3a24943f70b2569320a93558b58442d48b340ed5cebe07ca9f94507fb78ce41846040516104b5919061205b565b6105c760405180608001604052806060815260200160001515815260200160608152602001606081525090565b6000806105d384610c7c565b925092505060006105e38561098c565b6040805160808101825296875292151560208701529185019290925260608401525090919050565b60606000610617610e3a565b9050600081516001600160401b0381111561063457610634611b81565b60405190808252806020026020018201604052801561069257816020015b61067f60405180608001604052806060815260200160001515815260200160608152602001606081525090565b8152602001906001900390816106525790505b50905060005b82518110156107455760008060006106c88685815181106106bb576106bb6120a7565b6020026020010151610c7c565b92509250925060006106f28786815181106106e5576106e56120a7565b602002602001015161098c565b90506040518060800160405280858152602001831515815260200184815260200182815250868681518110610729576107296120a7565b6020026020010181905250505050508080600101915050610698565b5092915050565b610757836002610b23565b610762838383610e5a565b336001600160a01b03167fceff7b159f9dbcf9e7e9d20f79690303c0fc5495a2e3c2525aa7e23c6742449c846040516104b5919061205b565b600033806107a7610f25565b6001600160a01b0316148061081757507ff421ea548af7158b1d71ba0aeccf57104c067038bd8fd214edd05c09eb4f735b5460ff1615801561081757506108178482856040516020016107fa91906120bd565b604051602081830303815290604052610812906120d9565b610fe9565b949350505050565b610828816112e6565b600080516020612479833981519152610841818361131d565b5060405180602001604052806000815250816002018360405161086491906120bd565b908152602001604051809103902060020190816108819190612184565b506000816002018360405161089691906120bd565b908152604051908190036020018120600101805492151560ff199093169290921790915560028201906108ca9084906120bd565b90815260405190819003602001902060006108e58282611b33565b60018201805460ff191690556108ff600283016000611b33565b5050600061092b826003018460405161091891906120bd565b9081526020016040518091039020611329565b905060005b81518110156109865761097d82828151811061094e5761094e6120a7565b6020026020010151846003018660405161096891906120bd565b90815260405190819003602001902090611336565b50600101610930565b50505050565b6060610997826112e6565b604051600080516020612479833981519152906109db907fb688ec8e4241d4a907fd7254e1a20e7a6d28a9043ed3eac37de6f05135b33b3d906109189086906120bd565b9392505050565b6109eb826112e6565b6109f482611342565b60405160008051602061247983398151915290610a4f9083907fb688ec8e4241d4a907fd7254e1a20e7a6d28a9043ed3eac37de6f05135b33b3d90610a3a9087906120bd565b908152604051908190036020019020906113b6565b15610a6d576040516302369ff360e41b815260040160405180910390fd5b610986828260030185604051610a8391906120bd565b908152604051908190036020019020906113ce565b610aa1826112e6565b610aaa82611342565b60405160008051602061247983398151915290610af09083907fb688ec8e4241d4a907fd7254e1a20e7a6d28a9043ed3eac37de6f05135b33b3d90610a3a9087906120bd565b610b0d576040516333cb039f60e11b815260040160405180910390fd5b61098682826003018560405161096891906120bd565b81518290821115610247576040516374eb20a760e01b815260040160405180910390fd5b610b50836113da565b600080516020612479833981519152610b698185611410565b50604080516060810182528581526000602082015280820185905290516002830190610b969087906120bd565b90815260405190819003602001902081518190610bb39082612184565b50602082015160018201805460ff191691151591909117905560408201516002820190610be09082612184565b5090505060005b8251811015610c7557610c1f838281518110610c0557610c056120a7565b60200260200101518360030187604051610a3a91906120bd565b15610c3d576040516302369ff360e41b815260040160405180910390fd5b610c6c838281518110610c5257610c526120a7565b60200260200101518360030187604051610a8391906120bd565b50600101610be7565b5050505050565b6060806000610c8a846112e6565b604051600080516020612479833981519152906000907fb688ec8e4241d4a907fd7254e1a20e7a6d28a9043ed3eac37de6f05135b33b3c90610ccd9088906120bd565b9081526020016040518091039020604051806060016040529081600082018054610cf690612100565b80601f0160208091040260200160405190810160405280929190818152602001828054610d2290612100565b8015610d6f5780601f10610d4457610100808354040283529160200191610d6f565b820191906000526020600020905b815481529060010190602001808311610d5257829003601f168201915b5050509183525050600182015460ff1615156020820152600282018054604090920191610d9b90612100565b80601f0160208091040260200160405190810160405280929190818152602001828054610dc790612100565b8015610e145780601f10610de957610100808354040283529160200191610e14565b820191906000526020600020905b815481529060010190602001808311610df757829003601f168201915b505050919092525050815160408301516020909301519099929850965090945050505050565b6060600080516020612479833981519152610e548161141c565b91505090565b610e63836112e6565b604051600080516020612479833981519152906000907fb688ec8e4241d4a907fd7254e1a20e7a6d28a9043ed3eac37de6f05135b33b3c90610ea69087906120bd565b9081526020016040518091039020905060008451118015610ee6575080600201604051610ed39190612243565b6040518091039020848051906020012014155b15610efb5760028101610ef98582612184565b505b600181015460ff16151583151514610c7557600101805460ff191692151592909217909155505050565b6040805180820182527f9bd0e1a7aef81c47cff971a2fee48406b20f55522326b2e2616c49c24aa506d0546001600160a01b03168082527f9bd0e1a7aef81c47cff971a2fee48406b20f55522326b2e2616c49c24aa506d154602080840182905284516331a9108f60e11b815260048101929092529351600094636352211e92602480820193918290030181865afa158015610fc5573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610e5491906122d5565b600080610ff584611427565b8051909150600080805b838110801561100c575082155b1561108f576000858281518110611025576110256120a7565b60200260200101519050611038816115b0565b1561107c576001600160a01b03811660009081527f9b35df16c33a6c0e085c9ebd55fb367f81c58c2ed7e9bed98cc622f3308a600e60205260409020546001945092505b508061108781612306565b915050610fff565b508180156110e55750604051806040016040528060098152602001684a6f696e537061636560b81b8152506040516020016110ca91906120bd565b6040516020818303038152906040526110e2906120d9565b86145b156110f75760009450505050506109db565b6000611101610f25565b905060005b855181101561115857816001600160a01b031686828151811061112b5761112b6120a7565b60200260200101516001600160a01b03160361115057600196505050505050506109db565b600101611106565b5060008281527fc1018daddaf9f72ecd65a20aead115c1ff0284c02c63c382b67da9d3bd884c2c602052604090205460ff161561119d576000955050505050506109db565b7f2df4f8e2489b335ef09ede56990b0838afbcdea6c639a41af44b533474fb855860005b6111cd826001016115c3565b8110156112d557600082816111e560018301856115cd565b6001600160a01b039081168252602080830193909352604091820160002082516060810184529054918216815260ff600160a01b83048116151594820194909452600160a81b9091049092161580159183018290529192506112b65750805160405163a7b7287160e01b81526001600160a01b039091169063a7b7287190611275908f908c908f9060040161231f565b602060405180830381865afa158015611292573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906112b69190612388565b156112cc576001985050505050505050506109db565b506001016111c1565b5060009a9950505050505050505050565b611300816000805160206124798339815191525b906115d9565b6101875760405163560b4b4160e11b815260040160405180910390fd5b60006101cb83836115e5565b606060006109db836117a4565b60006101cb8383611800565b604051600080516020612479833981519152907fb688ec8e4241d4a907fd7254e1a20e7a6d28a9043ed3eac37de6f05135b33b3c906113829084906120bd565b9081526040519081900360200190206001015460ff161561043357604051636ce0028960e11b815260040160405180910390fd5b600081815260018301602052604081205415156101cb565b60006101cb83836118e9565b6113f2816000805160206124798339815191526112fa565b1561018757604051632324f7d960e21b815260040160405180910390fd5b60006101cb8383611938565b60606101ce82611992565b6060600061145c7f438e2013c1d3a5bb9642eb30342f1d83ec0d3add620b71cdaf5043d9570b0a95546001600160a01b031690565b60405162468b7360e31b81526001600160a01b0385811660048301529192506000918316906302345b9890602401600060405180830381865afa1580156114a7573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f191682016040526114cf91908101906123a5565b805190915060006114e182600161243c565b6001600160401b038111156114f8576114f8611b81565b604051908082528060200260200182016040528015611521578160200160208202803683370190505b50905060005b8281101561157b57838181518110611541576115416120a7565b602002602001015182828151811061155b5761155b6120a7565b6001600160a01b0390921660209283029190910190910152600101611527565b508581838151811061158f5761158f6120a7565b6001600160a01b039092166020928302919091019091015295945050505050565b6000806115bc83611a6f565b1192915050565b60006101ce825490565b60006101cb8383611adc565b60006101cb8383611b06565b60008083600101836040516115fa91906120bd565b90815260200160405180910390205490508060001461179a57600061162060018361244f565b85549091506000906116349060019061244f565b905081811461173b576000866000018281548110611654576116546120a7565b90600052602060002001805461166990612100565b80601f016020809104026020016040519081016040528092919081815260200182805461169590612100565b80156116e25780601f106116b7576101008083540402835291602001916116e2565b820191906000526020600020905b8154815290600101906020018083116116c557829003601f168201915b50505050509050808760000184815481106116ff576116ff6120a7565b9060005260206000200190816117159190612184565b5083876001018260405161172991906120bd565b90815260405190819003602001902055505b855486908061174c5761174c612462565b6001900381819060005260206000200160006117689190611b33565b9055856001018560405161177c91906120bd565b908152602001604051809103902060009055600193505050506101ce565b60009150506101ce565b6060816000018054806020026020016040519081016040528092919081815260200182805480156117f457602002820191906000526020600020905b8154815260200190600101908083116117e0575b50505050509050919050565b6000818152600183016020526040812054801561179a57600061182460018361244f565b85549091506000906118389060019061244f565b905080821461189d576000866000018281548110611858576118586120a7565b906000526020600020015490508087600001848154811061187b5761187b6120a7565b6000918252602080832090910192909255918252600188019052604090208390555b85548690806118ae576118ae612462565b6001900381819060005260206000200160009055905585600101600086815260200190815260200160002060009055600193505050506101ce565b6000818152600183016020526040812054611930575081546001818101845560008481526020808220909301849055845484825282860190935260409020919091556101ce565b5060006101ce565b60006119448383611b06565b611930578254600181018455600084815260209020016119648382612184565b508254604051600185019061197a9085906120bd565b908152604051908190036020019020555060016101ce565b606081600001805480602002602001604051908101604052809291908181526020016000905b82821015611a645783829060005260206000200180546119d790612100565b80601f0160208091040260200160405190810160405280929190818152602001828054611a0390612100565b8015611a505780601f10611a2557610100808354040283529160200191611a50565b820191906000526020600020905b815481529060010190602001808311611a3357829003601f168201915b5050505050815260200190600101906119b8565b505050509050919050565b60006001600160a01b038216611a98576040516323d3ad8160e21b815260040160405180910390fd5b506001600160a01b031660009081527f234d8962d7c9a6a6604d7f98797e6ad6d7a886804f7409feb26422e27bf8125960205260409020546001600160401b031690565b6000826000018281548110611af357611af36120a7565b9060005260206000200154905092915050565b60008260010182604051611b1a91906120bd565b9081526040519081900360200190205415159392505050565b508054611b3f90612100565b6000825580601f10611b4f575050565b601f01602090049060005260206000209081019061018791905b80821115611b7d5760008155600101611b69565b5090565b634e487b7160e01b600052604160045260246000fd5b604051601f8201601f191681016001600160401b0381118282101715611bbf57611bbf611b81565b604052919050565b600082601f830112611bd857600080fd5b81356001600160401b03811115611bf157611bf1611b81565b611c04601f8201601f1916602001611b97565b818152846020838601011115611c1957600080fd5b816020850160208301376000918101602001919091529392505050565b600060208284031215611c4857600080fd5b81356001600160401b03811115611c5e57600080fd5b61081784828501611bc7565b60008083601f840112611c7c57600080fd5b5081356001600160401b03811115611c9357600080fd5b602083019150836020828501011115611cab57600080fd5b9250929050565b60008060208385031215611cc557600080fd5b82356001600160401b03811115611cdb57600080fd5b611ce785828601611c6a565b90969095509350505050565b6020808252825182820181905260009190848201906040850190845b81811015611d2b57835183529284019291840191600101611d0f565b50909695505050505050565b600080600060408486031215611d4c57600080fd5b83356001600160401b03811115611d6257600080fd5b611d6e86828701611c6a565b909790965060209590950135949350505050565b60006001600160401b03821115611d9b57611d9b611b81565b5060051b60200190565b600080600060608486031215611dba57600080fd5b83356001600160401b0380821115611dd157600080fd5b611ddd87838801611bc7565b9450602091508186013581811115611df457600080fd5b611e0088828901611bc7565b945050604086013581811115611e1557600080fd5b86019050601f81018713611e2857600080fd5b8035611e3b611e3682611d82565b611b97565b81815260059190911b82018301908381019089831115611e5a57600080fd5b928401925b82841015611e7857833582529284019290840190611e5f565b80955050505050509250925092565b60005b83811015611ea2578181015183820152602001611e8a565b50506000910152565b60008151808452611ec3816020860160208601611e87565b601f01601f19169290920160200192915050565b6000815160808452611eec6080850182611eab565b905060208084015115158186015260408401518583036040870152611f118382611eab565b606086810151888303918901919091528051808352908401945060009250908301905b80831015611f545784518252938301936001929092019190830190611f34565b509695505050505050565b6020815260006101cb6020830184611ed7565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b82811015611fc957603f19888603018452611fb7858351611ed7565b94509285019290850190600101611f9b565b5092979650505050505050565b801515811461018757600080fd5b600080600060608486031215611ff957600080fd5b83356001600160401b038082111561201057600080fd5b61201c87838801611bc7565b9450602086013591508082111561203257600080fd5b5061203f86828701611bc7565b925050604084013561205081611fd6565b809150509250925092565b6020815260006101cb6020830184611eab565b604081528260408201528284606083013760006060848301015260006060601f19601f8601168301019050826020830152949350505050565b634e487b7160e01b600052603260045260246000fd5b600082516120cf818460208701611e87565b9190910192915050565b805160208083015191908110156120fa576000198160200360031b1b821691505b50919050565b600181811c9082168061211457607f821691505b6020821081036120fa57634e487b7160e01b600052602260045260246000fd5b601f821115610247576000816000526020600020601f850160051c8101602086101561215d5750805b601f850160051c820191505b8181101561217c57828155600101612169565b505050505050565b81516001600160401b0381111561219d5761219d611b81565b6121b1816121ab8454612100565b84612134565b602080601f8311600181146121e657600084156121ce5750858301515b600019600386901b1c1916600185901b17855561217c565b600085815260208120601f198616915b82811015612215578886015182559484019460019091019084016121f6565b50858210156122335787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b600080835461225181612100565b60018281168015612269576001811461227e576122ad565b60ff19841687528215158302870194506122ad565b8760005260208060002060005b858110156122a45781548a82015290840190820161228b565b50505082870194505b50929695505050505050565b80516001600160a01b03811681146122d057600080fd5b919050565b6000602082840312156122e757600080fd5b6101cb826122b9565b634e487b7160e01b600052601160045260246000fd5b600060018201612318576123186122f0565b5060010190565b6060815260006123326060830186611eab565b82810360208481019190915285518083528682019282019060005b818110156123725784516001600160a01b03168352938301939183019160010161234d565b5050809350505050826040830152949350505050565b60006020828403121561239a57600080fd5b81516109db81611fd6565b600060208083850312156123b857600080fd5b82516001600160401b038111156123ce57600080fd5b8301601f810185136123df57600080fd5b80516123ed611e3682611d82565b81815260059190911b8201830190838101908783111561240c57600080fd5b928401925b8284101561243157612422846122b9565b82529284019290840190612411565b979650505050505050565b808201808211156101ce576101ce6122f0565b818103818111156101ce576101ce6122f0565b634e487b7160e01b600052603160045260246000fdfeb688ec8e4241d4a907fd7254e1a20e7a6d28a9043ed3eac37de6f05135b33b3a",
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

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_Channels *ChannelsCaller) GetChannel(opts *bind.CallOpts, channelId string) (IChannelBaseChannel, error) {
	var out []interface{}
	err := _Channels.contract.Call(opts, &out, "getChannel", channelId)

	if err != nil {
		return *new(IChannelBaseChannel), err
	}

	out0 := *abi.ConvertType(out[0], new(IChannelBaseChannel)).(*IChannelBaseChannel)

	return out0, err

}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_Channels *ChannelsSession) GetChannel(channelId string) (IChannelBaseChannel, error) {
	return _Channels.Contract.GetChannel(&_Channels.CallOpts, channelId)
}

// GetChannel is a free data retrieval call binding the contract method 0x7cd7ee3d.
//
// Solidity: function getChannel(string channelId) view returns((string,bool,string,uint256[]) channel)
func (_Channels *ChannelsCallerSession) GetChannel(channelId string) (IChannelBaseChannel, error) {
	return _Channels.Contract.GetChannel(&_Channels.CallOpts, channelId)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
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
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_Channels *ChannelsSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _Channels.Contract.GetChannels(&_Channels.CallOpts)
}

// GetChannels is a free data retrieval call binding the contract method 0x9575f6ac.
//
// Solidity: function getChannels() view returns((string,bool,string,uint256[])[] channels)
func (_Channels *ChannelsCallerSession) GetChannels() ([]IChannelBaseChannel, error) {
	return _Channels.Contract.GetChannels(&_Channels.CallOpts)
}

// GetRolesByChannel is a free data retrieval call binding the contract method 0x16b38751.
//
// Solidity: function getRolesByChannel(string channelId) view returns(uint256[] roleIds)
func (_Channels *ChannelsCaller) GetRolesByChannel(opts *bind.CallOpts, channelId string) ([]*big.Int, error) {
	var out []interface{}
	err := _Channels.contract.Call(opts, &out, "getRolesByChannel", channelId)

	if err != nil {
		return *new([]*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new([]*big.Int)).(*[]*big.Int)

	return out0, err

}

// GetRolesByChannel is a free data retrieval call binding the contract method 0x16b38751.
//
// Solidity: function getRolesByChannel(string channelId) view returns(uint256[] roleIds)
func (_Channels *ChannelsSession) GetRolesByChannel(channelId string) ([]*big.Int, error) {
	return _Channels.Contract.GetRolesByChannel(&_Channels.CallOpts, channelId)
}

// GetRolesByChannel is a free data retrieval call binding the contract method 0x16b38751.
//
// Solidity: function getRolesByChannel(string channelId) view returns(uint256[] roleIds)
func (_Channels *ChannelsCallerSession) GetRolesByChannel(channelId string) ([]*big.Int, error) {
	return _Channels.Contract.GetRolesByChannel(&_Channels.CallOpts, channelId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_Channels *ChannelsTransactor) AddRoleToChannel(opts *bind.TransactOpts, channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "addRoleToChannel", channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_Channels *ChannelsSession) AddRoleToChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.Contract.AddRoleToChannel(&_Channels.TransactOpts, channelId, roleId)
}

// AddRoleToChannel is a paid mutator transaction binding the contract method 0x42bb09b2.
//
// Solidity: function addRoleToChannel(string channelId, uint256 roleId) returns()
func (_Channels *ChannelsTransactorSession) AddRoleToChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.Contract.AddRoleToChannel(&_Channels.TransactOpts, channelId, roleId)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_Channels *ChannelsTransactor) CreateChannel(opts *bind.TransactOpts, channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "createChannel", channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_Channels *ChannelsSession) CreateChannel(channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _Channels.Contract.CreateChannel(&_Channels.TransactOpts, channelId, metadata, roleIds)
}

// CreateChannel is a paid mutator transaction binding the contract method 0x51f83cea.
//
// Solidity: function createChannel(string channelId, string metadata, uint256[] roleIds) returns()
func (_Channels *ChannelsTransactorSession) CreateChannel(channelId string, metadata string, roleIds []*big.Int) (*types.Transaction, error) {
	return _Channels.Contract.CreateChannel(&_Channels.TransactOpts, channelId, metadata, roleIds)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_Channels *ChannelsTransactor) RemoveChannel(opts *bind.TransactOpts, channelId string) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "removeChannel", channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_Channels *ChannelsSession) RemoveChannel(channelId string) (*types.Transaction, error) {
	return _Channels.Contract.RemoveChannel(&_Channels.TransactOpts, channelId)
}

// RemoveChannel is a paid mutator transaction binding the contract method 0x05b2cfbc.
//
// Solidity: function removeChannel(string channelId) returns()
func (_Channels *ChannelsTransactorSession) RemoveChannel(channelId string) (*types.Transaction, error) {
	return _Channels.Contract.RemoveChannel(&_Channels.TransactOpts, channelId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_Channels *ChannelsTransactor) RemoveRoleFromChannel(opts *bind.TransactOpts, channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "removeRoleFromChannel", channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_Channels *ChannelsSession) RemoveRoleFromChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.Contract.RemoveRoleFromChannel(&_Channels.TransactOpts, channelId, roleId)
}

// RemoveRoleFromChannel is a paid mutator transaction binding the contract method 0x499061b5.
//
// Solidity: function removeRoleFromChannel(string channelId, uint256 roleId) returns()
func (_Channels *ChannelsTransactorSession) RemoveRoleFromChannel(channelId string, roleId *big.Int) (*types.Transaction, error) {
	return _Channels.Contract.RemoveRoleFromChannel(&_Channels.TransactOpts, channelId, roleId)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_Channels *ChannelsTransactor) UpdateChannel(opts *bind.TransactOpts, channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _Channels.contract.Transact(opts, "updateChannel", channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_Channels *ChannelsSession) UpdateChannel(channelId string, metadata string, disabled bool) (*types.Transaction, error) {
	return _Channels.Contract.UpdateChannel(&_Channels.TransactOpts, channelId, metadata, disabled)
}

// UpdateChannel is a paid mutator transaction binding the contract method 0x9c02812e.
//
// Solidity: function updateChannel(string channelId, string metadata, bool disabled) returns()
func (_Channels *ChannelsTransactorSession) UpdateChannel(channelId string, metadata string, disabled bool) (*types.Transaction, error) {
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
	TokenId *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterBanned is a free log retrieval operation binding the contract event 0x61f40a690e129b5fa5c66868dee2c1c405f78a2e239481d33df2e6d7782bc45a.
//
// Solidity: event Banned(uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) FilterBanned(opts *bind.FilterOpts, tokenId []*big.Int) (*ChannelsBannedIterator, error) {

	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "Banned", tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsBannedIterator{contract: _Channels.contract, event: "Banned", logs: logs, sub: sub}, nil
}

// WatchBanned is a free log subscription operation binding the contract event 0x61f40a690e129b5fa5c66868dee2c1c405f78a2e239481d33df2e6d7782bc45a.
//
// Solidity: event Banned(uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) WatchBanned(opts *bind.WatchOpts, sink chan<- *ChannelsBanned, tokenId []*big.Int) (event.Subscription, error) {

	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "Banned", tokenIdRule)
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

// ParseBanned is a log parse operation binding the contract event 0x61f40a690e129b5fa5c66868dee2c1c405f78a2e239481d33df2e6d7782bc45a.
//
// Solidity: event Banned(uint256 indexed tokenId)
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
	ChannelId string
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelCreated is a free log retrieval operation binding the contract event 0xf3a24943f70b2569320a93558b58442d48b340ed5cebe07ca9f94507fb78ce41.
//
// Solidity: event ChannelCreated(address indexed caller, string channelId)
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

// WatchChannelCreated is a free log subscription operation binding the contract event 0xf3a24943f70b2569320a93558b58442d48b340ed5cebe07ca9f94507fb78ce41.
//
// Solidity: event ChannelCreated(address indexed caller, string channelId)
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

// ParseChannelCreated is a log parse operation binding the contract event 0xf3a24943f70b2569320a93558b58442d48b340ed5cebe07ca9f94507fb78ce41.
//
// Solidity: event ChannelCreated(address indexed caller, string channelId)
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
	ChannelId string
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelRemoved is a free log retrieval operation binding the contract event 0xfa523db6e0f9e715af524617025380ecb07a5bdc7266e951baa64c82096b42bf.
//
// Solidity: event ChannelRemoved(address indexed caller, string channelId)
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

// WatchChannelRemoved is a free log subscription operation binding the contract event 0xfa523db6e0f9e715af524617025380ecb07a5bdc7266e951baa64c82096b42bf.
//
// Solidity: event ChannelRemoved(address indexed caller, string channelId)
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

// ParseChannelRemoved is a log parse operation binding the contract event 0xfa523db6e0f9e715af524617025380ecb07a5bdc7266e951baa64c82096b42bf.
//
// Solidity: event ChannelRemoved(address indexed caller, string channelId)
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
	ChannelId string
	RoleId    *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelRoleAdded is a free log retrieval operation binding the contract event 0xca076ccbc3aeaf982d7e8bda25501bca43f3ff1910a31364669925306e9a6e14.
//
// Solidity: event ChannelRoleAdded(address indexed caller, string channelId, uint256 roleId)
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

// WatchChannelRoleAdded is a free log subscription operation binding the contract event 0xca076ccbc3aeaf982d7e8bda25501bca43f3ff1910a31364669925306e9a6e14.
//
// Solidity: event ChannelRoleAdded(address indexed caller, string channelId, uint256 roleId)
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

// ParseChannelRoleAdded is a log parse operation binding the contract event 0xca076ccbc3aeaf982d7e8bda25501bca43f3ff1910a31364669925306e9a6e14.
//
// Solidity: event ChannelRoleAdded(address indexed caller, string channelId, uint256 roleId)
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
	ChannelId string
	RoleId    *big.Int
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelRoleRemoved is a free log retrieval operation binding the contract event 0x83a637a8897e018bd05113befc092187d3c58ae68539c6eb183e2a479dcca40d.
//
// Solidity: event ChannelRoleRemoved(address indexed caller, string channelId, uint256 roleId)
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

// WatchChannelRoleRemoved is a free log subscription operation binding the contract event 0x83a637a8897e018bd05113befc092187d3c58ae68539c6eb183e2a479dcca40d.
//
// Solidity: event ChannelRoleRemoved(address indexed caller, string channelId, uint256 roleId)
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

// ParseChannelRoleRemoved is a log parse operation binding the contract event 0x83a637a8897e018bd05113befc092187d3c58ae68539c6eb183e2a479dcca40d.
//
// Solidity: event ChannelRoleRemoved(address indexed caller, string channelId, uint256 roleId)
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
	ChannelId string
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterChannelUpdated is a free log retrieval operation binding the contract event 0xceff7b159f9dbcf9e7e9d20f79690303c0fc5495a2e3c2525aa7e23c6742449c.
//
// Solidity: event ChannelUpdated(address indexed caller, string channelId)
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

// WatchChannelUpdated is a free log subscription operation binding the contract event 0xceff7b159f9dbcf9e7e9d20f79690303c0fc5495a2e3c2525aa7e23c6742449c.
//
// Solidity: event ChannelUpdated(address indexed caller, string channelId)
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

// ParseChannelUpdated is a log parse operation binding the contract event 0xceff7b159f9dbcf9e7e9d20f79690303c0fc5495a2e3c2525aa7e23c6742449c.
//
// Solidity: event ChannelUpdated(address indexed caller, string channelId)
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
	TokenId *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterUnbanned is a free log retrieval operation binding the contract event 0x24e96eeef7bead041b01a4fe10be5074101556028ab194fc54412547e77c7416.
//
// Solidity: event Unbanned(uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) FilterUnbanned(opts *bind.FilterOpts, tokenId []*big.Int) (*ChannelsUnbannedIterator, error) {

	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.FilterLogs(opts, "Unbanned", tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &ChannelsUnbannedIterator{contract: _Channels.contract, event: "Unbanned", logs: logs, sub: sub}, nil
}

// WatchUnbanned is a free log subscription operation binding the contract event 0x24e96eeef7bead041b01a4fe10be5074101556028ab194fc54412547e77c7416.
//
// Solidity: event Unbanned(uint256 indexed tokenId)
func (_Channels *ChannelsFilterer) WatchUnbanned(opts *bind.WatchOpts, sink chan<- *ChannelsUnbanned, tokenId []*big.Int) (event.Subscription, error) {

	var tokenIdRule []interface{}
	for _, tokenIdItem := range tokenId {
		tokenIdRule = append(tokenIdRule, tokenIdItem)
	}

	logs, sub, err := _Channels.contract.WatchLogs(opts, "Unbanned", tokenIdRule)
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

// ParseUnbanned is a log parse operation binding the contract event 0x24e96eeef7bead041b01a4fe10be5074101556028ab194fc54412547e77c7416.
//
// Solidity: event Unbanned(uint256 indexed tokenId)
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
