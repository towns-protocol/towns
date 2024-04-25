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

// ChannelsMetaData contains all meta data concerning the Channels contract.
var ChannelsMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"addRoleToChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"createChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"channel\",\"type\":\"tuple\",\"internalType\":\"structIChannelBase.Channel\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getChannels\",\"inputs\":[],\"outputs\":[{\"name\":\"channels\",\"type\":\"tuple[]\",\"internalType\":\"structIChannelBase.Channel[]\",\"components\":[{\"name\":\"id\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRolesByChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"roleIds\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"removeChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeRoleFromChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateChannel\",\"inputs\":[{\"name\":\"channelId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"metadata\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"disabled\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Banned\",\"inputs\":[{\"name\":\"moderator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelCreated\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRemoved\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRoleAdded\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelRoleRemoved\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ChannelUpdated\",\"inputs\":[{\"name\":\"caller\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"channelId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConsecutiveTransfer\",\"inputs\":[{\"name\":\"fromTokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"toTokenId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Paused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unbanned\",\"inputs\":[{\"name\":\"moderator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Unpaused\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ApprovalCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ApprovalQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"BalanceQueryForZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__AlreadyBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Banning__CannotBanSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Banning__InvalidTokenId\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Banning__NotBanned\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelDisabled\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__ChannelDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__RoleAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ChannelService__RoleDoesNotExist\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__InvalidValue\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotAllowed\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__NotMember\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Entitlement__ValueAlreadyExists\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintERC2309QuantityExceedsLimit\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintZeroQuantity\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnerQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnershipNotInitializedForExtraData\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__NotPaused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Pausable__Paused\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferFromIncorrectOwner\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToNonERC721ReceiverImplementer\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"URIQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Validator__InvalidStringLength\",\"inputs\":[]}]",
	Bin: "0x608060405234801561001057600080fd5b5061001961001e565b6100c4565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff161561006a576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156100c157805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b611ce8806100d36000396000f3fe608060405234801561001057600080fd5b50600436106100885760003560e01c80639575f6ac1161005b5780639575f6ac146100f15780639935218314610106578063b9de615914610126578063ef86d6961461013957600080fd5b806302da0e511461008d57806337644cf7146100a2578063831c2b82146100b5578063921f7175146100de575b600080fd5b6100a061009b366004611555565b61014c565b005b6100a06100b036600461156e565b61018a565b6100c86100c3366004611555565b6101cb565b6040516100d5919061164d565b60405180910390f35b6100a06100ec36600461173b565b6101fd565b6100f961023f565b6040516100d59190611803565b610119610114366004611555565b61024e565b6040516100d59190611867565b6100a061013436600461156e565b610259565b6100a06101473660046118b9565b610296565b61017e6040518060400160405280601181526020017041646452656d6f76654368616e6e656c7360781b8152506102d3565b610187816102fb565b50565b6101bd826040518060400160405280601181526020017041646452656d6f76654368616e6e656c7360781b81525061033c565b6101c78282610363565b5050565b60408051608081018252600080825260208201526060918101829052818101919091526101f7826103ad565b92915050565b61022f6040518060400160405280601181526020017041646452656d6f76654368616e6e656c7360781b8152506102d3565b61023a838383610414565b505050565b6060610249610465565b905090565b60606101f78261059d565b61028c826040518060400160405280601181526020017041646452656d6f76654368616e6e656c7360781b81525061033c565b6101c782826105a8565b6102c86040518060400160405280601181526020017041646452656d6f76654368616e6e656c7360781b8152506102d3565b61023a8383836105ea565b6102de600082610627565b61018757604051630ce39a4b60e21b815260040160405180910390fd5b610304816106ab565b60405181815233907f3a3f387aa42656bc1732adfc7aea5cde9ccc05a59f9af9c29ebfa68e66383e939060200160405180910390a250565b6103468282610627565b6101c757604051630ce39a4b60e21b815260040160405180910390fd5b61036d82826107a2565b604080518381526020810183905233917f2b10481523b59a7978f8ab73b237349b0f38c801f6094bdc8994d379c067d71391015b60405180910390a25050565b60408051608081018252600080825260208201526060918101829052818101919091526000806103dc84610833565b925092505060006103ec85610953565b6040805160808101825296875292151560208701529185019290925260608401525090919050565b61041f8260006109ab565b61042a8383836109cf565b60405183815233907fdd6c5b83be3557f8b2674712946f9f05dcd882b82bfd58b9539b9706efd35d8c906020015b60405180910390a2505050565b60606000610471610b09565b90506000815167ffffffffffffffff81111561048f5761048f611660565b6040519080825280602002602001820160405280156104e357816020015b60408051608081018252600080825260208201526060918101829052818101919091528152602001906001900390816104ad5790505b50905060005b825181101561059657600080600061051986858151811061050c5761050c611914565b6020026020010151610833565b925092509250600061054387868151811061053657610536611914565b6020026020010151610953565b9050604051806080016040528085815260200183151581526020018481526020018281525086868151811061057a5761057a611914565b60200260200101819052505050505080806001019150506104e9565b5092915050565b60606101f782610953565b6105b28282610b29565b604080518381526020810183905233917faee688d80dbf97230e5d2b4b06aa7074bfe38ddd8abf856551177db30395612991016103a1565b6105f5838383610bb9565b60405183815233907f94af4a611b3fb1eaa653a6b29f82b71bcea25ca378171c5f059010fa18e0716e90602001610458565b60003380610633610c6e565b6001600160a01b031614806106a357507fe17a067c7963a59b6dfd65d33b053fdbea1c56500e2aae4f976d9eda4da9eb005460ff161580156106a357506106a3848285604051602001610686919061192a565b60405160208183030381529060405261069e90611946565b610d32565b949350505050565b6106b48161101d565b600080516020611cc88339815191526106cd8183611054565b5060408051602080820183526000808352858152600280860190925292909220909101906106fb90826119f1565b50600082815260028083016020526040822060018101805460ff19169055828155919061072a90830182611507565b50506000828152600382016020526040812061074590611060565b905060005b815181101561079c5761079382828151811061076857610768611914565b602002602001015184600301600087815260200190815260200160002061105490919063ffffffff16565b5060010161074a565b50505050565b6107ab8261101d565b6107b48261106d565b60008281527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af51850430360205260409020600080516020611cc8833981519152906107fb90836110cf565b15610819576040516302369ff360e41b815260040160405180910390fd5b6000838152600382016020526040902061079c90836110e7565b6000606060006108428461101d565b60008481527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af51850430260209081526040808320815160608101835281548152600182015460ff16151593810193909352600281018054600080516020611cc8833981519152959493840191906108b49061196d565b80601f01602080910402602001604051908101604052809291908181526020018280546108e09061196d565b801561092d5780601f106109025761010080835404028352916020019161092d565b820191906000526020600020905b81548152906001019060200180831161091057829003601f168201915b505050919092525050815160408301516020909301519099929850965090945050505050565b606061095e8261101d565b60008281527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af51850430360205260409020600080516020611cc8833981519152906109a490611060565b9392505050565b8151829082111561023a576040516374eb20a760e01b815260040160405180910390fd5b6109d8836110f3565b600080516020611cc88339815191526109f181856110e7565b50604080516060810182528581526000602080830182815283850188815289845260028781019093529490922083518155915160018301805460ff191691151591909117905592519192909190820190610a4b90826119f1565b5090505060005b8251811015610b0257610a9b838281518110610a7057610a70611914565b60200260200101518360030160008881526020019081526020016000206110cf90919063ffffffff16565b15610ab9576040516302369ff360e41b815260040160405180910390fd5b610af9838281518110610ace57610ace611914565b60200260200101518360030160008881526020019081526020016000206110e790919063ffffffff16565b50600101610a52565b5050505050565b6060600080516020611cc8833981519152610b2381611060565b91505090565b610b328261101d565b610b3b8261106d565b60008281527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af51850430360205260409020600080516020611cc883398151915290610b8290836110cf565b610b9f576040516333cb039f60e11b815260040160405180910390fd5b6000838152600382016020526040902061079c9083611054565b610bc28361101d565b60008381527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504302602052604090208251600080516020611cc8833981519152919015801590610c2f575080600201604051610c1c9190611ab1565b6040518091039020848051906020012014155b15610c445760028101610c4285826119f1565b505b600181015460ff16151583151514610b0257600101805460ff191692151592909217909155505050565b6040805180820182527fd2f24d4f172e4e84e48e7c4125b6e904c29e5eba33ad4938fee51dd5dbd4b600546001600160a01b03168082527fd2f24d4f172e4e84e48e7c4125b6e904c29e5eba33ad4938fee51dd5dbd4b60154602080840182905284516331a9108f60e11b815260048101929092529351600094636352211e92602480820193918290030181865afa158015610d0e573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610b239190611b43565b600080610d3e84611129565b8051909150600080610d4e610c6e565b90506000805b84811015610e12576000868281518110610d7057610d70611914565b60200260200101519050836001600160a01b0316878381518110610d9657610d96611914565b60200260200101516001600160a01b031603610dbc5760019750505050505050506109a4565b610dc5816112a8565b15610e09576001600160a01b03811660009081527fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb60160205260409020546001955092505b50600101610d54565b5060008181527f49daf035076c43671ca9f9fb568d931e51ab7f9098a5a694781b45341112cf02602052604090205460ff1615610e57576000955050505050506109a4565b7fa558e822bd359dacbe30f0da89cbfde5f95895b441e13a4864caec1423c931006000610ea37fa558e822bd359dacbe30f0da89cbfde5f95895b441e13a4864caec1423c931016112bb565b905060005b8181101561100b5760008381610ec160018301856112c5565b6001600160a01b03908116825260208083019390935260409182016000208251606081018452905491821680825260ff600160a01b84048116151583870152600160a81b9093049092161515818401528251630b86d87960e21b815292519094509092632e1b61e492600480820193918290030181865afa158015610f4a573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610f6e9190611b5e565b158015610feb575080600001516001600160a01b0316630cf0b5338e8b8e6040518463ffffffff1660e01b8152600401610faa93929190611b7b565b602060405180830381865afa158015610fc7573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610feb9190611b5e565b1561100257600199505050505050505050506109a4565b50600101610ea8565b5060009b9a5050505050505050505050565b61103781600080516020611cc88339815191525b906110cf565b6101875760405163560b4b4160e11b815260040160405180910390fd5b60006109a483836112d1565b606060006109a4836113c4565b60008181527f804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af5185043026020526040902060010154600080516020611cc88339815191529060ff16156101c757604051636ce0028960e11b815260040160405180910390fd5b600081815260018301602052604081205415156109a4565b60006109a48383611420565b61110b81600080516020611cc8833981519152611031565b1561018757604051632324f7d960e21b815260040160405180910390fd5b606060007fc21004fcc619240a31f006438274d15cd813308303284436eef6055f0fdcb6006006015460405162468b7360e31b81526001600160a01b038581166004830152909116915060009082906302345b9890602401600060405180830381865afa15801561119e573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f191682016040526111c69190810190611bdd565b805190915060006111d8826001611c8b565b67ffffffffffffffff8111156111f0576111f0611660565b604051908082528060200260200182016040528015611219578160200160208202803683370190505b50905060005b828110156112735783818151811061123957611239611914565b602002602001015182828151811061125357611253611914565b6001600160a01b039092166020928302919091019091015260010161121f565b508581838151811061128757611287611914565b6001600160a01b039092166020928302919091019091015295945050505050565b6000806112b48361146f565b1192915050565b60006101f7825490565b60006109a483836114dd565b600081815260018301602052604081205480156113ba5760006112f5600183611c9e565b855490915060009061130990600190611c9e565b905080821461136e57600086600001828154811061132957611329611914565b906000526020600020015490508087600001848154811061134c5761134c611914565b6000918252602080832090910192909255918252600188019052604090208390555b855486908061137f5761137f611cb1565b6001900381819060005260206000200160009055905585600101600086815260200190815260200160002060009055600193505050506101f7565b60009150506101f7565b60608160000180548060200260200160405190810160405280929190818152602001828054801561141457602002820191906000526020600020905b815481526020019060010190808311611400575b50505050509050919050565b6000818152600183016020526040812054611467575081546001818101845560008481526020808220909301849055845484825282860190935260409020919091556101f7565b5060006101f7565b60006001600160a01b038216611498576040516323d3ad8160e21b815260040160405180910390fd5b506001600160a01b031660009081527f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df05602052604090205467ffffffffffffffff1690565b60008260000182815481106114f4576114f4611914565b9060005260206000200154905092915050565b5080546115139061196d565b6000825580601f10611523575050565b601f01602090049060005260206000209081019061018791905b80821115611551576000815560010161153d565b5090565b60006020828403121561156757600080fd5b5035919050565b6000806040838503121561158157600080fd5b50508035926020909101359150565b60005b838110156115ab578181015183820152602001611593565b50506000910152565b80518252600060208083015115158185015260408301516080604086015280518060808701526115ea8160a08801858501611590565b601f19601f820116860191505060a08101606085015160a087840301606088015281815180845260c0850191508583019450600093505b808410156116415784518252938501936001939093019290850190611621565b50979650505050505050565b6020815260006109a460208301846115b4565b634e487b7160e01b600052604160045260246000fd5b604051601f8201601f1916810167ffffffffffffffff8111828210171561169f5761169f611660565b604052919050565b600082601f8301126116b857600080fd5b813567ffffffffffffffff8111156116d2576116d2611660565b6116e5601f8201601f1916602001611676565b8181528460208386010111156116fa57600080fd5b816020850160208301376000918101602001919091529392505050565b600067ffffffffffffffff82111561173157611731611660565b5060051b60200190565b60008060006060848603121561175057600080fd5b8335925060208085013567ffffffffffffffff8082111561177057600080fd5b61177c888389016116a7565b9450604087013591508082111561179257600080fd5b508501601f810187136117a457600080fd5b80356117b76117b282611717565b611676565b81815260059190911b820183019083810190898311156117d657600080fd5b928401925b828410156117f4578335825292840192908401906117db565b80955050505050509250925092565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b8281101561185a57603f198886030184526118488583516115b4565b9450928501929085019060010161182c565b5092979650505050505050565b6020808252825182820181905260009190848201906040850190845b8181101561189f57835183529284019291840191600101611883565b50909695505050505050565b801515811461018757600080fd5b6000806000606084860312156118ce57600080fd5b83359250602084013567ffffffffffffffff8111156118ec57600080fd5b6118f8868287016116a7565b9250506040840135611909816118ab565b809150509250925092565b634e487b7160e01b600052603260045260246000fd5b6000825161193c818460208701611590565b9190910192915050565b80516020808301519190811015611967576000198160200360031b1b821691505b50919050565b600181811c9082168061198157607f821691505b60208210810361196757634e487b7160e01b600052602260045260246000fd5b601f82111561023a576000816000526020600020601f850160051c810160208610156119ca5750805b601f850160051c820191505b818110156119e9578281556001016119d6565b505050505050565b815167ffffffffffffffff811115611a0b57611a0b611660565b611a1f81611a19845461196d565b846119a1565b602080601f831160018114611a545760008415611a3c5750858301515b600019600386901b1c1916600185901b1785556119e9565b600085815260208120601f198616915b82811015611a8357888601518255948401946001909101908401611a64565b5085821015611aa15787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b6000808354611abf8161196d565b60018281168015611ad75760018114611aec57611b1b565b60ff1984168752821515830287019450611b1b565b8760005260208060002060005b85811015611b125781548a820152908401908201611af9565b50505082870194505b50929695505050505050565b80516001600160a01b0381168114611b3e57600080fd5b919050565b600060208284031215611b5557600080fd5b6109a482611b27565b600060208284031215611b7057600080fd5b81516109a4816118ab565b60006060820185835260206060602085015281865180845260808601915060208801935060005b81811015611bc75784516001600160a01b031683529383019391830191600101611ba2565b5050809350505050826040830152949350505050565b60006020808385031215611bf057600080fd5b825167ffffffffffffffff811115611c0757600080fd5b8301601f81018513611c1857600080fd5b8051611c266117b282611717565b81815260059190911b82018301908381019087831115611c4557600080fd5b928401925b82841015611c6a57611c5b84611b27565b82529284019290840190611c4a565b979650505050505050565b634e487b7160e01b600052601160045260246000fd5b808201808211156101f7576101f7611c75565b818103818111156101f7576101f7611c75565b634e487b7160e01b600052603160045260246000fdfe804ad633258ac9b908ae115a2763b3f6e04be3b1165402c872b25af518504300",
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
