// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package deploy

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

// IRiverRegistryBaseNode is an auto generated low-level Go binding around an user-defined struct.
type IRiverRegistryBaseNode struct {
	NodeAddress common.Address
	Url         string
	Status      uint8
}

// IRiverRegistryBaseStream is an auto generated low-level Go binding around an user-defined struct.
type IRiverRegistryBaseStream struct {
	StreamId             string
	Nodes                []common.Address
	GenesisMiniblockHash [32]byte
	GenesisMiniblock     []byte
	LastMiniblockHash    [32]byte
	LastMiniblockNum     uint64
}

// RiverRegistryDeployMetaData contains all meta data concerning the RiverRegistryDeploy contract.
var RiverRegistryDeployMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"approvedOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__RiverRegistry_init\",\"inputs\":[{\"name\":\"approvedOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAllNodeAddresses\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodes\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRiverRegistryBase.Node[]\",\"components\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreamIds\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string[]\",\"internalType\":\"string[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreams\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRiverRegistryBase.Stream[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRiverRegistryBase.Node\",\"components\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamIdHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRiverRegistryBase.Stream\",\"components\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"registerNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblock\",\"inputs\":[{\"name\":\"streamIdHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeStatus\",\"inputs\":[{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeUrl\",\"inputs\":[{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeAdded\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeStatusUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUrlUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorAdded\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorRemoved\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamAllocated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]}]",
	Bin: "0x60806040523480156200001157600080fd5b50604051620026f4380380620026f483398101604081905262000034916200020e565b6200003e62000050565b6200004981620000f8565b50620002f6565b7f2d0d21306acfe8e9bb163a4573e95aff6cef95dc1102c6a16d5f19eac08cc4de8054640100000000900460ff16156200009d576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff9081161015620000f557805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b7f1320bfade83d725f4918cce6752986eeef865fd566a9348c57c798b58dfc7ea660005b825181101562000164576200015a8382815181106200013f576200013f620002e0565b6020026020010151836006016200016960201b90919060201c565b506001016200011c565b505050565b600062000180836001600160a01b03841662000189565b90505b92915050565b6000818152600183016020526040812054620001d25750815460018181018455600084815260208082209093018490558454848252828601909352604090209190915562000183565b50600062000183565b634e487b7160e01b600052604160045260246000fd5b80516001600160a01b03811681146200020957600080fd5b919050565b600060208083850312156200022257600080fd5b82516001600160401b03808211156200023a57600080fd5b818501915085601f8301126200024f57600080fd5b815181811115620002645762000264620001db565b8060051b604051601f19603f830116810181811085821117156200028c576200028c620001db565b604052918252848201925083810185019188831115620002ab57600080fd5b938501935b82851015620002d457620002c485620001f1565b84529385019392850192620002b0565b98975050505050505050565b634e487b7160e01b600052603260045260246000fd5b6123ee80620003066000396000f3fe608060405234801561001057600080fd5b506004361061010b5760003560e01c80639d209048116100a2578063be6522d611610071578063be6522d614610232578063c0f2208414610245578063c8fe3a011461024d578063e5d78f6a14610262578063fc7a92231461027557600080fd5b80639d209048146101d7578063a1174e7d146101f7578063ac8a584a1461020c578063bb9b342d1461021f57600080fd5b80633bd84c0c116100de5780633bd84c0c146101775780636d70f7ae1461018c5780637691f5ed146101af57806386789fc6146101c257600080fd5b80631290abe814610110578063242cae9f14610139578063286af2531461014e57806339bf397e14610161575b600080fd5b61012361011e366004611abb565b610288565b6040516101309190611bce565b60405180910390f35b61014c610147366004611bfd565b6104e0565b005b61014c61015c366004611ce4565b61060f565b610169610675565b604051908152602001610130565b61017f61068f565b6040516101309190611d20565b61019f61019a366004611bfd565b61093c565b6040519015158152602001610130565b61014c6101bd366004611d84565b610959565b6101ca610a2f565b6040516101309190611da5565b6101ea6101e5366004611bfd565b610b77565b6040516101309190611e6f565b6101ff610cd8565b6040516101309190611e82565b61014c61021a366004611bfd565b610e8f565b61014c61022d366004611f50565b610fe2565b61014c610240366004611f9d565b61118e565b610169611239565b61025561124b565b6040516101309190612016565b61014c610270366004612029565b61126b565b61014c6102833660046120ce565b6114e7565b6040805160c0810182526060808252602082018190526000928201839052808201526080810182905260a08101829052906102c1611656565b90506102cd818461167a565b6103115760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526103089190600401612113565b60405180910390fd5b600083815260028201602052604090819020815160c0810190925280548290829061033b90612126565b80601f016020809104026020016040519081016040528092919081815260200182805461036790612126565b80156103b45780601f10610389576101008083540402835291602001916103b4565b820191906000526020600020905b81548152906001019060200180831161039757829003601f168201915b505050505081526020016001820180548060200260200160405190810160405280929190818152602001828054801561041657602002820191906000526020600020905b81546001600160a01b031681526001909101906020018083116103f8575b505050505081526020016002820154815260200160038201805461043990612126565b80601f016020809104026020016040519081016040528092919081815260200182805461046590612126565b80156104b25780601f10610487576101008083540402835291602001916104b2565b820191906000526020600020905b81548152906001019060200180831161049557829003601f168201915b5050509183525050600482015460208201526005909101546001600160401b03166040909101529392505050565b7fa7c3be20e3a76821507555109752fad8a6630ef0362a34dcfcdfef83c99a2537546001600160a01b0316331461052c576040516365f4906560e01b8152336004820152602401610308565b6001600160a01b03811661056f5760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526103089190600401612113565b6000610579611656565b90506105886006820183611695565b156105c957604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526103089190600401612113565b6105d660068201836116b7565b506040516001600160a01b038316907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d90600090a25050565b7f2d0d21306acfe8e9bb163a4573e95aff6cef95dc1102c6a16d5f19eac08cc4de54640100000000900460ff1661065957604051630ef4733760e31b815260040160405180910390fd5b61066963e554adf360e01b6116cc565b610672816117aa565b50565b600061068a610682611656565b6003016117ff565b905090565b6060600061069b611656565b905060006106a8826117ff565b6001600160401b038111156106bf576106bf611c18565b60405190808252806020026020018201604052801561072157816020015b6040805160c0810182526060808252602082018190526000928201839052808201526080810182905260a08101919091528152602001906001900390816106dd5790505b50905060005b610730836117ff565b811015610935576002830160006107478584611809565b81526020019081526020016000206040518060c001604052908160008201805461077090612126565b80601f016020809104026020016040519081016040528092919081815260200182805461079c90612126565b80156107e95780601f106107be576101008083540402835291602001916107e9565b820191906000526020600020905b8154815290600101906020018083116107cc57829003601f168201915b505050505081526020016001820180548060200260200160405190810160405280929190818152602001828054801561084b57602002820191906000526020600020905b81546001600160a01b0316815260019091019060200180831161082d575b505050505081526020016002820154815260200160038201805461086e90612126565b80601f016020809104026020016040519081016040528092919081815260200182805461089a90612126565b80156108e75780601f106108bc576101008083540402835291602001916108e7565b820191906000526020600020905b8154815290600101906020018083116108ca57829003601f168201915b5050509183525050600482015460208201526005909101546001600160401b0316604090910152825183908390811061092257610922612160565b6020908102919091010152600101610727565b5092915050565b60006109538261094a611656565b60060190611695565b92915050565b61096e33610965611656565b60030190611695565b6109a85760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526103089190600401612113565b60006109b2611656565b33600090815260058201602052604090206002018054919250839160ff191660018360048111156109e5576109e5611dfc565b0217905550336001600160a01b03167f20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa083604051610a239190612176565b60405180910390a25050565b60606000610a3b611656565b90506000610a48826117ff565b6001600160401b03811115610a5f57610a5f611c18565b604051908082528060200260200182016040528015610a9257816020015b6060815260200190600190039081610a7d5790505b50905060005b610aa1836117ff565b81101561093557600283016000610ab88584611809565b81526020019081526020016000206000018054610ad490612126565b80601f0160208091040260200160405190810160405280929190818152602001828054610b0090612126565b8015610b4d5780601f10610b2257610100808354040283529160200191610b4d565b820191906000526020600020905b815481529060010190602001808311610b3057829003601f168201915b5050505050828281518110610b6457610b64612160565b6020908102919091010152600101610a98565b610b7f611a07565b6000610b89611656565b9050610b986003820184611695565b610bd857604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526103089190600401612113565b6001600160a01b0380841660009081526005830160209081526040918290208251606081019093528054909316825260018301805492939291840191610c1d90612126565b80601f0160208091040260200160405190810160405280929190818152602001828054610c4990612126565b8015610c965780601f10610c6b57610100808354040283529160200191610c96565b820191906000526020600020905b815481529060010190602001808311610c7957829003601f168201915b5050509183525050600282015460209091019060ff166004811115610cbd57610cbd611dfc565b6004811115610cce57610cce611dfc565b9052509392505050565b60606000610ce4611656565b90506000610cf4826003016117ff565b6001600160401b03811115610d0b57610d0b611c18565b604051908082528060200260200182016040528015610d4457816020015b610d31611a07565b815260200190600190039081610d295790505b50905060005b610d56836003016117ff565b81101561093557600583016000610d706003860184611809565b6001600160a01b0390811682526020808301939093526040918201600020825160608101909352805490911682526001810180549293919291840191610db590612126565b80601f0160208091040260200160405190810160405280929190818152602001828054610de190612126565b8015610e2e5780601f10610e0357610100808354040283529160200191610e2e565b820191906000526020600020905b815481529060010190602001808311610e1157829003601f168201915b5050509183525050600282015460209091019060ff166004811115610e5557610e55611dfc565b6004811115610e6657610e66611dfc565b81525050828281518110610e7c57610e7c612160565b6020908102919091010152600101610d4a565b7fa7c3be20e3a76821507555109752fad8a6630ef0362a34dcfcdfef83c99a2537546001600160a01b03163314610edb576040516365f4906560e01b8152336004820152602401610308565b6000610ee5611656565b9050610ef46006820183611695565b610f3857604080518082018252601281527113d41154905513d497d393d517d193d5539160721b6020820152905162461bcd60e51b81526103089190600401612113565b6001600160a01b03821660009081526008820160205260408120610f5b906117ff565b1115610f9c57604080518082018252600d81526c4f55545f4f465f424f554e445360981b6020820152905162461bcd60e51b81526103089190600401612113565b610fa96006820183611815565b506040516001600160a01b038316907f80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d90600090a25050565b610fee3361094a611656565b6110285760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526103089190600401612113565b6000611032611656565b90506110416003820184611695565b1561108257604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526103089190600401612113565b604080516060810182526001600160a01b03851681526020808201859052600082840181905233815260088501909152919091206110c090856116b7565b506110ce60038301856116b7565b506001600160a01b0384811660009081526005840160209081526040909120835181546001600160a01b0319169316929092178255820151829190600182019061111890826121d4565b50604082015160028201805460ff1916600183600481111561113c5761113c611dfc565b0217905550905050836001600160a01b03167fd6f3629b08191adb8308c3a65d5f8803b7f8f3e359c433fa7ae623276635e561846000604051611180929190612293565b60405180910390a250505050565b61119a33610965611656565b6111d45760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526103089190600401612113565b60006111de611656565b33600090815260058201602052604090209091506001016111ff83826121d4565b50336001600160a01b03167f4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac83604051610a239190612113565b600061068a611246611656565b6117ff565b60606000611257611656565b90506112658160030161182a565b91505090565b61127733610965611656565b6112b15760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526103089190600401612113565b83516000036112f95760408051808201825260118152701253959053125117d4d51491505357d251607a1b6020820152905162461bcd60e51b81526103089190600401612113565b83516020850120600061130a611656565b9050611316818361167a565b1561135757604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526103089190600401612113565b60005b85518110156113da5761139286828151811061137857611378612160565b60200260200101518360030161169590919063ffffffff16565b6113d257604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526103089190600401612113565b60010161135a565b506040805160c081018252878152602081018790529081018590526060810184905260808101859052600060a08201526114148284611837565b50600083815260028301602052604090208151829190819061143690826121d4565b50602082810151805161144f9260018501920190611a41565b50604082015160028201556060820151600382019061146e90826121d4565b506080820151600482015560a0909101516005909101805467ffffffffffffffff19166001600160401b039092169190911790556040517fa79c4b435a69ed59ac1dddf9315512561153a9b7b20c43c354bdf5a0c9e2f26e906114d6908990899089906122b5565b60405180910390a150505050505050565b6114f333610965611656565b61152d5760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526103089190600401612113565b6000611537611656565b9050611543818561167a565b61157e5760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526103089190600401612113565b6000848152600282016020526040902060058101546001600160401b03808516916115ab91166001612301565b6001600160401b0316146115ee5760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526103089190600401612113565b6004810184905560058101805467ffffffffffffffff19166001600160401b0385161790556040517f751aae24847a063a2e4c98e9ec7575141ee0974ceb0d8f39a915c2da73a908659061164790839087908790612321565b60405180910390a15050505050565b7f1320bfade83d725f4918cce6752986eeef865fd566a9348c57c798b58dfc7ea690565b600081815260018301602052604081205415155b9392505050565b6001600160a01b0381166000908152600183016020526040812054151561168e565b600061168e836001600160a01b03841661183f565b6001600160e01b0319811660009081527fbc7de460bcfb6afd0c415c8c610d408bd914b18d7d0feec0da9e25348087a5c4602052604090205460ff161515600114611759576001600160e01b0319811660009081527fbc7de460bcfb6afd0c415c8c610d408bd914b18d7d0feec0da9e25348087a5c460205260409020805460ff19166001179055611772565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b60006117b4611656565b905060005b82518110156117fa576117f18382815181106117d7576117d7612160565b6020026020010151836006016116b790919063ffffffff16565b506001016117b9565b505050565b6000610953825490565b600061168e838361188e565b600061168e836001600160a01b0384166118b8565b6060600061168e836119ab565b600061168e83835b600081815260018301602052604081205461188657508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610953565b506000610953565b60008260000182815481106118a5576118a5612160565b9060005260206000200154905092915050565b600081815260018301602052604081205480156119a15760006118dc6001836123c5565b85549091506000906118f0906001906123c5565b905081811461195557600086600001828154811061191057611910612160565b906000526020600020015490508087600001848154811061193357611933612160565b6000918252602080832090910192909255918252600188019052604090208390555b8554869080611966576119666123d8565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050610953565b6000915050610953565b6060816000018054806020026020016040519081016040528092919081815260200182805480156119fb57602002820191906000526020600020905b8154815260200190600101908083116119e7575b50505050509050919050565b604051806060016040528060006001600160a01b031681526020016060815260200160006004811115611a3c57611a3c611dfc565b905290565b828054828255906000526020600020908101928215611a96579160200282015b82811115611a9657825182546001600160a01b0319166001600160a01b03909116178255602090920191600190910190611a61565b50611aa2929150611aa6565b5090565b5b80821115611aa25760008155600101611aa7565b600060208284031215611acd57600080fd5b5035919050565b6000815180845260005b81811015611afa57602081850181015186830182015201611ade565b506000602082860101526020601f19601f83011685010191505092915050565b6000815160c08452611b2f60c0850182611ad4565b60208481015186830387830152805180845290820193509091600091908301905b80831015611b795784516001600160a01b03168252938301936001929092019190830190611b50565b5060408601516040880152606086015193508681036060880152611b9d8185611ad4565b93505050506080830151608085015260a0830151611bc660a08601826001600160401b03169052565b509392505050565b60208152600061168e6020830184611b1a565b80356001600160a01b0381168114611bf857600080fd5b919050565b600060208284031215611c0f57600080fd5b61168e82611be1565b634e487b7160e01b600052604160045260246000fd5b604051601f8201601f191681016001600160401b0381118282101715611c5657611c56611c18565b604052919050565b600082601f830112611c6f57600080fd5b813560206001600160401b03821115611c8a57611c8a611c18565b8160051b611c99828201611c2e565b9283528481018201928281019087851115611cb357600080fd5b83870192505b84831015611cd957611cca83611be1565b82529183019190830190611cb9565b979650505050505050565b600060208284031215611cf657600080fd5b81356001600160401b03811115611d0c57600080fd5b611d1884828501611c5e565b949350505050565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b82811015611d7757603f19888603018452611d65858351611b1a565b94509285019290850190600101611d49565b5092979650505050505050565b600060208284031215611d9657600080fd5b81356005811061168e57600080fd5b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b82811015611d7757603f19888603018452611dea858351611ad4565b94509285019290850190600101611dce565b634e487b7160e01b600052602160045260246000fd5b60058110611e3057634e487b7160e01b600052602160045260246000fd5b9052565b60018060a01b0381511682526000602082015160606020850152611e5b6060850182611ad4565b90506040830151611bc66040860182611e12565b60208152600061168e6020830184611e34565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b82811015611d7757603f19888603018452611ec7858351611e34565b94509285019290850190600101611eab565b60006001600160401b03831115611ef257611ef2611c18565b611f05601f8401601f1916602001611c2e565b9050828152838383011115611f1957600080fd5b828260208301376000602084830101529392505050565b600082601f830112611f4157600080fd5b61168e83833560208501611ed9565b60008060408385031215611f6357600080fd5b611f6c83611be1565b915060208301356001600160401b03811115611f8757600080fd5b611f9385828601611f30565b9150509250929050565b600060208284031215611faf57600080fd5b81356001600160401b03811115611fc557600080fd5b611d1884828501611f30565b60008151808452602080850194506020840160005b8381101561200b5781516001600160a01b031687529582019590820190600101611fe6565b509495945050505050565b60208152600061168e6020830184611fd1565b6000806000806080858703121561203f57600080fd5b84356001600160401b038082111561205657600080fd5b61206288838901611f30565b9550602087013591508082111561207857600080fd5b61208488838901611c5e565b94506040870135935060608701359150808211156120a157600080fd5b508501601f810187136120b357600080fd5b6120c287823560208401611ed9565b91505092959194509250565b6000806000606084860312156120e357600080fd5b833592506020840135915060408401356001600160401b038116811461210857600080fd5b809150509250925092565b60208152600061168e6020830184611ad4565b600181811c9082168061213a57607f821691505b60208210810361215a57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052603260045260246000fd5b602081016109538284611e12565b601f8211156117fa576000816000526020600020601f850160051c810160208610156121ad5750805b601f850160051c820191505b818110156121cc578281556001016121b9565b505050505050565b81516001600160401b038111156121ed576121ed611c18565b612201816121fb8454612126565b84612184565b602080601f831160018114612236576000841561221e5750858301515b600019600386901b1c1916600185901b1785556121cc565b600085815260208120601f198616915b8281101561226557888601518255948401946001909101908401612246565b50858210156122835787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b6040815260006122a66040830185611ad4565b905061168e6020830184611e12565b6060815260006122c86060830186611ad4565b82810360208401526122da8186611fd1565b915050826040830152949350505050565b634e487b7160e01b600052601160045260246000fd5b6001600160401b03818116838216019080821115610935576109356122eb565b60608152600080855461233381612126565b80606086015260806001808416600081146123555760018114612371576123a3565b60ff1985166080890152608084151560051b89010195506123a3565b8a60005260208060002060005b868110156123995781548b820187015290840190820161237e565b8a01608001975050505b5050505050602083018590526001600160401b03841660408401529050611d18565b81810381811115610953576109536122eb565b634e487b7160e01b600052603160045260246000fd",
}

// RiverRegistryDeployABI is the input ABI used to generate the binding from.
// Deprecated: Use RiverRegistryDeployMetaData.ABI instead.
var RiverRegistryDeployABI = RiverRegistryDeployMetaData.ABI

// RiverRegistryDeployBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use RiverRegistryDeployMetaData.Bin instead.
var RiverRegistryDeployBin = RiverRegistryDeployMetaData.Bin

// DeployRiverRegistryDeploy deploys a new Ethereum contract, binding an instance of RiverRegistryDeploy to it.
func DeployRiverRegistryDeploy(auth *bind.TransactOpts, backend bind.ContractBackend, approvedOperators []common.Address) (common.Address, *types.Transaction, *RiverRegistryDeploy, error) {
	parsed, err := RiverRegistryDeployMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(RiverRegistryDeployBin), backend, approvedOperators)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &RiverRegistryDeploy{RiverRegistryDeployCaller: RiverRegistryDeployCaller{contract: contract}, RiverRegistryDeployTransactor: RiverRegistryDeployTransactor{contract: contract}, RiverRegistryDeployFilterer: RiverRegistryDeployFilterer{contract: contract}}, nil
}

// RiverRegistryDeploy is an auto generated Go binding around an Ethereum contract.
type RiverRegistryDeploy struct {
	RiverRegistryDeployCaller     // Read-only binding to the contract
	RiverRegistryDeployTransactor // Write-only binding to the contract
	RiverRegistryDeployFilterer   // Log filterer for contract events
}

// RiverRegistryDeployCaller is an auto generated read-only Go binding around an Ethereum contract.
type RiverRegistryDeployCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RiverRegistryDeployTransactor is an auto generated write-only Go binding around an Ethereum contract.
type RiverRegistryDeployTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RiverRegistryDeployFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type RiverRegistryDeployFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RiverRegistryDeploySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type RiverRegistryDeploySession struct {
	Contract     *RiverRegistryDeploy // Generic contract binding to set the session for
	CallOpts     bind.CallOpts        // Call options to use throughout this session
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// RiverRegistryDeployCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type RiverRegistryDeployCallerSession struct {
	Contract *RiverRegistryDeployCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts              // Call options to use throughout this session
}

// RiverRegistryDeployTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type RiverRegistryDeployTransactorSession struct {
	Contract     *RiverRegistryDeployTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts              // Transaction auth options to use throughout this session
}

// RiverRegistryDeployRaw is an auto generated low-level Go binding around an Ethereum contract.
type RiverRegistryDeployRaw struct {
	Contract *RiverRegistryDeploy // Generic contract binding to access the raw methods on
}

// RiverRegistryDeployCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type RiverRegistryDeployCallerRaw struct {
	Contract *RiverRegistryDeployCaller // Generic read-only contract binding to access the raw methods on
}

// RiverRegistryDeployTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type RiverRegistryDeployTransactorRaw struct {
	Contract *RiverRegistryDeployTransactor // Generic write-only contract binding to access the raw methods on
}

// NewRiverRegistryDeploy creates a new instance of RiverRegistryDeploy, bound to a specific deployed contract.
func NewRiverRegistryDeploy(address common.Address, backend bind.ContractBackend) (*RiverRegistryDeploy, error) {
	contract, err := bindRiverRegistryDeploy(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeploy{RiverRegistryDeployCaller: RiverRegistryDeployCaller{contract: contract}, RiverRegistryDeployTransactor: RiverRegistryDeployTransactor{contract: contract}, RiverRegistryDeployFilterer: RiverRegistryDeployFilterer{contract: contract}}, nil
}

// NewRiverRegistryDeployCaller creates a new read-only instance of RiverRegistryDeploy, bound to a specific deployed contract.
func NewRiverRegistryDeployCaller(address common.Address, caller bind.ContractCaller) (*RiverRegistryDeployCaller, error) {
	contract, err := bindRiverRegistryDeploy(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployCaller{contract: contract}, nil
}

// NewRiverRegistryDeployTransactor creates a new write-only instance of RiverRegistryDeploy, bound to a specific deployed contract.
func NewRiverRegistryDeployTransactor(address common.Address, transactor bind.ContractTransactor) (*RiverRegistryDeployTransactor, error) {
	contract, err := bindRiverRegistryDeploy(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployTransactor{contract: contract}, nil
}

// NewRiverRegistryDeployFilterer creates a new log filterer instance of RiverRegistryDeploy, bound to a specific deployed contract.
func NewRiverRegistryDeployFilterer(address common.Address, filterer bind.ContractFilterer) (*RiverRegistryDeployFilterer, error) {
	contract, err := bindRiverRegistryDeploy(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployFilterer{contract: contract}, nil
}

// bindRiverRegistryDeploy binds a generic wrapper to an already deployed contract.
func bindRiverRegistryDeploy(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := RiverRegistryDeployMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_RiverRegistryDeploy *RiverRegistryDeployRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _RiverRegistryDeploy.Contract.RiverRegistryDeployCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_RiverRegistryDeploy *RiverRegistryDeployRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.RiverRegistryDeployTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_RiverRegistryDeploy *RiverRegistryDeployRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.RiverRegistryDeployTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_RiverRegistryDeploy *RiverRegistryDeployCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _RiverRegistryDeploy.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.contract.Transact(opts, method, params...)
}

// GetAllNodeAddresses is a free data retrieval call binding the contract method 0xc8fe3a01.
//
// Solidity: function getAllNodeAddresses() view returns(address[])
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) GetAllNodeAddresses(opts *bind.CallOpts) ([]common.Address, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "getAllNodeAddresses")

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetAllNodeAddresses is a free data retrieval call binding the contract method 0xc8fe3a01.
//
// Solidity: function getAllNodeAddresses() view returns(address[])
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetAllNodeAddresses() ([]common.Address, error) {
	return _RiverRegistryDeploy.Contract.GetAllNodeAddresses(&_RiverRegistryDeploy.CallOpts)
}

// GetAllNodeAddresses is a free data retrieval call binding the contract method 0xc8fe3a01.
//
// Solidity: function getAllNodeAddresses() view returns(address[])
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) GetAllNodeAddresses() ([]common.Address, error) {
	return _RiverRegistryDeploy.Contract.GetAllNodeAddresses(&_RiverRegistryDeploy.CallOpts)
}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((address,string,uint8)[])
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) GetAllNodes(opts *bind.CallOpts) ([]IRiverRegistryBaseNode, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "getAllNodes")

	if err != nil {
		return *new([]IRiverRegistryBaseNode), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRiverRegistryBaseNode)).(*[]IRiverRegistryBaseNode)

	return out0, err

}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((address,string,uint8)[])
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetAllNodes() ([]IRiverRegistryBaseNode, error) {
	return _RiverRegistryDeploy.Contract.GetAllNodes(&_RiverRegistryDeploy.CallOpts)
}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((address,string,uint8)[])
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) GetAllNodes() ([]IRiverRegistryBaseNode, error) {
	return _RiverRegistryDeploy.Contract.GetAllNodes(&_RiverRegistryDeploy.CallOpts)
}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(string[])
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) GetAllStreamIds(opts *bind.CallOpts) ([]string, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "getAllStreamIds")

	if err != nil {
		return *new([]string), err
	}

	out0 := *abi.ConvertType(out[0], new([]string)).(*[]string)

	return out0, err

}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(string[])
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetAllStreamIds() ([]string, error) {
	return _RiverRegistryDeploy.Contract.GetAllStreamIds(&_RiverRegistryDeploy.CallOpts)
}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(string[])
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) GetAllStreamIds() ([]string, error) {
	return _RiverRegistryDeploy.Contract.GetAllStreamIds(&_RiverRegistryDeploy.CallOpts)
}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((string,address[],bytes32,bytes,bytes32,uint64)[])
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) GetAllStreams(opts *bind.CallOpts) ([]IRiverRegistryBaseStream, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "getAllStreams")

	if err != nil {
		return *new([]IRiverRegistryBaseStream), err
	}

	out0 := *abi.ConvertType(out[0], new([]IRiverRegistryBaseStream)).(*[]IRiverRegistryBaseStream)

	return out0, err

}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((string,address[],bytes32,bytes,bytes32,uint64)[])
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetAllStreams() ([]IRiverRegistryBaseStream, error) {
	return _RiverRegistryDeploy.Contract.GetAllStreams(&_RiverRegistryDeploy.CallOpts)
}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((string,address[],bytes32,bytes,bytes32,uint64)[])
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) GetAllStreams() ([]IRiverRegistryBaseStream, error) {
	return _RiverRegistryDeploy.Contract.GetAllStreams(&_RiverRegistryDeploy.CallOpts)
}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((address,string,uint8))
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) GetNode(opts *bind.CallOpts, nodeAddress common.Address) (IRiverRegistryBaseNode, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "getNode", nodeAddress)

	if err != nil {
		return *new(IRiverRegistryBaseNode), err
	}

	out0 := *abi.ConvertType(out[0], new(IRiverRegistryBaseNode)).(*IRiverRegistryBaseNode)

	return out0, err

}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((address,string,uint8))
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetNode(nodeAddress common.Address) (IRiverRegistryBaseNode, error) {
	return _RiverRegistryDeploy.Contract.GetNode(&_RiverRegistryDeploy.CallOpts, nodeAddress)
}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((address,string,uint8))
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) GetNode(nodeAddress common.Address) (IRiverRegistryBaseNode, error) {
	return _RiverRegistryDeploy.Contract.GetNode(&_RiverRegistryDeploy.CallOpts, nodeAddress)
}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) GetNodeCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "getNodeCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetNodeCount() (*big.Int, error) {
	return _RiverRegistryDeploy.Contract.GetNodeCount(&_RiverRegistryDeploy.CallOpts)
}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) GetNodeCount() (*big.Int, error) {
	return _RiverRegistryDeploy.Contract.GetNodeCount(&_RiverRegistryDeploy.CallOpts)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamIdHash) view returns((string,address[],bytes32,bytes,bytes32,uint64))
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) GetStream(opts *bind.CallOpts, streamIdHash [32]byte) (IRiverRegistryBaseStream, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "getStream", streamIdHash)

	if err != nil {
		return *new(IRiverRegistryBaseStream), err
	}

	out0 := *abi.ConvertType(out[0], new(IRiverRegistryBaseStream)).(*IRiverRegistryBaseStream)

	return out0, err

}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamIdHash) view returns((string,address[],bytes32,bytes,bytes32,uint64))
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetStream(streamIdHash [32]byte) (IRiverRegistryBaseStream, error) {
	return _RiverRegistryDeploy.Contract.GetStream(&_RiverRegistryDeploy.CallOpts, streamIdHash)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamIdHash) view returns((string,address[],bytes32,bytes,bytes32,uint64))
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) GetStream(streamIdHash [32]byte) (IRiverRegistryBaseStream, error) {
	return _RiverRegistryDeploy.Contract.GetStream(&_RiverRegistryDeploy.CallOpts, streamIdHash)
}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) GetStreamCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "getStreamCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetStreamCount() (*big.Int, error) {
	return _RiverRegistryDeploy.Contract.GetStreamCount(&_RiverRegistryDeploy.CallOpts)
}

// GetStreamCount is a free data retrieval call binding the contract method 0xc0f22084.
//
// Solidity: function getStreamCount() view returns(uint256)
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) GetStreamCount() (*big.Int, error) {
	return _RiverRegistryDeploy.Contract.GetStreamCount(&_RiverRegistryDeploy.CallOpts)
}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) IsOperator(opts *bind.CallOpts, operator common.Address) (bool, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "isOperator", operator)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_RiverRegistryDeploy *RiverRegistryDeploySession) IsOperator(operator common.Address) (bool, error) {
	return _RiverRegistryDeploy.Contract.IsOperator(&_RiverRegistryDeploy.CallOpts, operator)
}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) IsOperator(operator common.Address) (bool, error) {
	return _RiverRegistryDeploy.Contract.IsOperator(&_RiverRegistryDeploy.CallOpts, operator)
}

// RiverRegistryInit is a paid mutator transaction binding the contract method 0x286af253.
//
// Solidity: function __RiverRegistry_init(address[] approvedOperators) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) RiverRegistryInit(opts *bind.TransactOpts, approvedOperators []common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "__RiverRegistry_init", approvedOperators)
}

// RiverRegistryInit is a paid mutator transaction binding the contract method 0x286af253.
//
// Solidity: function __RiverRegistry_init(address[] approvedOperators) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) RiverRegistryInit(approvedOperators []common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.RiverRegistryInit(&_RiverRegistryDeploy.TransactOpts, approvedOperators)
}

// RiverRegistryInit is a paid mutator transaction binding the contract method 0x286af253.
//
// Solidity: function __RiverRegistry_init(address[] approvedOperators) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) RiverRegistryInit(approvedOperators []common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.RiverRegistryInit(&_RiverRegistryDeploy.TransactOpts, approvedOperators)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xe5d78f6a.
//
// Solidity: function allocateStream(string streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) AllocateStream(opts *bind.TransactOpts, streamId string, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "allocateStream", streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xe5d78f6a.
//
// Solidity: function allocateStream(string streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) AllocateStream(streamId string, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.AllocateStream(&_RiverRegistryDeploy.TransactOpts, streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// AllocateStream is a paid mutator transaction binding the contract method 0xe5d78f6a.
//
// Solidity: function allocateStream(string streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) AllocateStream(streamId string, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.AllocateStream(&_RiverRegistryDeploy.TransactOpts, streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) ApproveOperator(opts *bind.TransactOpts, operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "approveOperator", operator)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) ApproveOperator(operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.ApproveOperator(&_RiverRegistryDeploy.TransactOpts, operator)
}

// ApproveOperator is a paid mutator transaction binding the contract method 0x242cae9f.
//
// Solidity: function approveOperator(address operator) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) ApproveOperator(operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.ApproveOperator(&_RiverRegistryDeploy.TransactOpts, operator)
}

// RegisterNode is a paid mutator transaction binding the contract method 0xbb9b342d.
//
// Solidity: function registerNode(address nodeAddress, string url) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) RegisterNode(opts *bind.TransactOpts, nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "registerNode", nodeAddress, url)
}

// RegisterNode is a paid mutator transaction binding the contract method 0xbb9b342d.
//
// Solidity: function registerNode(address nodeAddress, string url) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) RegisterNode(nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.RegisterNode(&_RiverRegistryDeploy.TransactOpts, nodeAddress, url)
}

// RegisterNode is a paid mutator transaction binding the contract method 0xbb9b342d.
//
// Solidity: function registerNode(address nodeAddress, string url) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) RegisterNode(nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.RegisterNode(&_RiverRegistryDeploy.TransactOpts, nodeAddress, url)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) RemoveOperator(opts *bind.TransactOpts, operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "removeOperator", operator)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) RemoveOperator(operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.RemoveOperator(&_RiverRegistryDeploy.TransactOpts, operator)
}

// RemoveOperator is a paid mutator transaction binding the contract method 0xac8a584a.
//
// Solidity: function removeOperator(address operator) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) RemoveOperator(operator common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.RemoveOperator(&_RiverRegistryDeploy.TransactOpts, operator)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xfc7a9223.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamIdHash, bytes32 lastMiniblockHash, uint64 lastMiniblockNum) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) SetStreamLastMiniblock(opts *bind.TransactOpts, streamIdHash [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "setStreamLastMiniblock", streamIdHash, lastMiniblockHash, lastMiniblockNum)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xfc7a9223.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamIdHash, bytes32 lastMiniblockHash, uint64 lastMiniblockNum) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) SetStreamLastMiniblock(streamIdHash [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.SetStreamLastMiniblock(&_RiverRegistryDeploy.TransactOpts, streamIdHash, lastMiniblockHash, lastMiniblockNum)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0xfc7a9223.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamIdHash, bytes32 lastMiniblockHash, uint64 lastMiniblockNum) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) SetStreamLastMiniblock(streamIdHash [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.SetStreamLastMiniblock(&_RiverRegistryDeploy.TransactOpts, streamIdHash, lastMiniblockHash, lastMiniblockNum)
}

// UpdateNodeStatus is a paid mutator transaction binding the contract method 0x7691f5ed.
//
// Solidity: function updateNodeStatus(uint8 status) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) UpdateNodeStatus(opts *bind.TransactOpts, status uint8) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "updateNodeStatus", status)
}

// UpdateNodeStatus is a paid mutator transaction binding the contract method 0x7691f5ed.
//
// Solidity: function updateNodeStatus(uint8 status) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) UpdateNodeStatus(status uint8) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.UpdateNodeStatus(&_RiverRegistryDeploy.TransactOpts, status)
}

// UpdateNodeStatus is a paid mutator transaction binding the contract method 0x7691f5ed.
//
// Solidity: function updateNodeStatus(uint8 status) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) UpdateNodeStatus(status uint8) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.UpdateNodeStatus(&_RiverRegistryDeploy.TransactOpts, status)
}

// UpdateNodeUrl is a paid mutator transaction binding the contract method 0xbe6522d6.
//
// Solidity: function updateNodeUrl(string url) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) UpdateNodeUrl(opts *bind.TransactOpts, url string) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "updateNodeUrl", url)
}

// UpdateNodeUrl is a paid mutator transaction binding the contract method 0xbe6522d6.
//
// Solidity: function updateNodeUrl(string url) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) UpdateNodeUrl(url string) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.UpdateNodeUrl(&_RiverRegistryDeploy.TransactOpts, url)
}

// UpdateNodeUrl is a paid mutator transaction binding the contract method 0xbe6522d6.
//
// Solidity: function updateNodeUrl(string url) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) UpdateNodeUrl(url string) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.UpdateNodeUrl(&_RiverRegistryDeploy.TransactOpts, url)
}

// RiverRegistryDeployInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployInitializedIterator struct {
	Event *RiverRegistryDeployInitialized // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployInitialized)
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
		it.Event = new(RiverRegistryDeployInitialized)
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
func (it *RiverRegistryDeployInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployInitialized represents a Initialized event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterInitialized(opts *bind.FilterOpts) (*RiverRegistryDeployInitializedIterator, error) {

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployInitializedIterator{contract: _RiverRegistryDeploy.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployInitialized) (event.Subscription, error) {

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployInitialized)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseInitialized(log types.Log) (*RiverRegistryDeployInitialized, error) {
	event := new(RiverRegistryDeployInitialized)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryDeployInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployInterfaceAddedIterator struct {
	Event *RiverRegistryDeployInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployInterfaceAdded)
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
		it.Event = new(RiverRegistryDeployInterfaceAdded)
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
func (it *RiverRegistryDeployInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployInterfaceAdded represents a InterfaceAdded event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*RiverRegistryDeployInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployInterfaceAddedIterator{contract: _RiverRegistryDeploy.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployInterfaceAdded)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseInterfaceAdded(log types.Log) (*RiverRegistryDeployInterfaceAdded, error) {
	event := new(RiverRegistryDeployInterfaceAdded)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryDeployInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployInterfaceRemovedIterator struct {
	Event *RiverRegistryDeployInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployInterfaceRemoved)
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
		it.Event = new(RiverRegistryDeployInterfaceRemoved)
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
func (it *RiverRegistryDeployInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployInterfaceRemoved represents a InterfaceRemoved event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*RiverRegistryDeployInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployInterfaceRemovedIterator{contract: _RiverRegistryDeploy.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployInterfaceRemoved)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseInterfaceRemoved(log types.Log) (*RiverRegistryDeployInterfaceRemoved, error) {
	event := new(RiverRegistryDeployInterfaceRemoved)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryDeployNodeAddedIterator is returned from FilterNodeAdded and is used to iterate over the raw logs and unpacked data for NodeAdded events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployNodeAddedIterator struct {
	Event *RiverRegistryDeployNodeAdded // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployNodeAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployNodeAdded)
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
		it.Event = new(RiverRegistryDeployNodeAdded)
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
func (it *RiverRegistryDeployNodeAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployNodeAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployNodeAdded represents a NodeAdded event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployNodeAdded struct {
	NodeAddress common.Address
	Url         string
	Status      uint8
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeAdded is a free log retrieval operation binding the contract event 0xd6f3629b08191adb8308c3a65d5f8803b7f8f3e359c433fa7ae623276635e561.
//
// Solidity: event NodeAdded(address indexed nodeAddress, string url, uint8 status)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterNodeAdded(opts *bind.FilterOpts, nodeAddress []common.Address) (*RiverRegistryDeployNodeAddedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "NodeAdded", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployNodeAddedIterator{contract: _RiverRegistryDeploy.contract, event: "NodeAdded", logs: logs, sub: sub}, nil
}

// WatchNodeAdded is a free log subscription operation binding the contract event 0xd6f3629b08191adb8308c3a65d5f8803b7f8f3e359c433fa7ae623276635e561.
//
// Solidity: event NodeAdded(address indexed nodeAddress, string url, uint8 status)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchNodeAdded(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployNodeAdded, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "NodeAdded", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployNodeAdded)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "NodeAdded", log); err != nil {
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

// ParseNodeAdded is a log parse operation binding the contract event 0xd6f3629b08191adb8308c3a65d5f8803b7f8f3e359c433fa7ae623276635e561.
//
// Solidity: event NodeAdded(address indexed nodeAddress, string url, uint8 status)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseNodeAdded(log types.Log) (*RiverRegistryDeployNodeAdded, error) {
	event := new(RiverRegistryDeployNodeAdded)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "NodeAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryDeployNodeStatusUpdatedIterator is returned from FilterNodeStatusUpdated and is used to iterate over the raw logs and unpacked data for NodeStatusUpdated events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployNodeStatusUpdatedIterator struct {
	Event *RiverRegistryDeployNodeStatusUpdated // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployNodeStatusUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployNodeStatusUpdated)
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
		it.Event = new(RiverRegistryDeployNodeStatusUpdated)
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
func (it *RiverRegistryDeployNodeStatusUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployNodeStatusUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployNodeStatusUpdated represents a NodeStatusUpdated event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployNodeStatusUpdated struct {
	NodeAddress common.Address
	Status      uint8
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeStatusUpdated is a free log retrieval operation binding the contract event 0x20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0.
//
// Solidity: event NodeStatusUpdated(address indexed nodeAddress, uint8 status)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterNodeStatusUpdated(opts *bind.FilterOpts, nodeAddress []common.Address) (*RiverRegistryDeployNodeStatusUpdatedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "NodeStatusUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployNodeStatusUpdatedIterator{contract: _RiverRegistryDeploy.contract, event: "NodeStatusUpdated", logs: logs, sub: sub}, nil
}

// WatchNodeStatusUpdated is a free log subscription operation binding the contract event 0x20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0.
//
// Solidity: event NodeStatusUpdated(address indexed nodeAddress, uint8 status)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchNodeStatusUpdated(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployNodeStatusUpdated, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "NodeStatusUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployNodeStatusUpdated)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "NodeStatusUpdated", log); err != nil {
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

// ParseNodeStatusUpdated is a log parse operation binding the contract event 0x20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa0.
//
// Solidity: event NodeStatusUpdated(address indexed nodeAddress, uint8 status)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseNodeStatusUpdated(log types.Log) (*RiverRegistryDeployNodeStatusUpdated, error) {
	event := new(RiverRegistryDeployNodeStatusUpdated)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "NodeStatusUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryDeployNodeUrlUpdatedIterator is returned from FilterNodeUrlUpdated and is used to iterate over the raw logs and unpacked data for NodeUrlUpdated events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployNodeUrlUpdatedIterator struct {
	Event *RiverRegistryDeployNodeUrlUpdated // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployNodeUrlUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployNodeUrlUpdated)
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
		it.Event = new(RiverRegistryDeployNodeUrlUpdated)
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
func (it *RiverRegistryDeployNodeUrlUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployNodeUrlUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployNodeUrlUpdated represents a NodeUrlUpdated event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployNodeUrlUpdated struct {
	NodeAddress common.Address
	Url         string
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeUrlUpdated is a free log retrieval operation binding the contract event 0x4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac.
//
// Solidity: event NodeUrlUpdated(address indexed nodeAddress, string url)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterNodeUrlUpdated(opts *bind.FilterOpts, nodeAddress []common.Address) (*RiverRegistryDeployNodeUrlUpdatedIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "NodeUrlUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployNodeUrlUpdatedIterator{contract: _RiverRegistryDeploy.contract, event: "NodeUrlUpdated", logs: logs, sub: sub}, nil
}

// WatchNodeUrlUpdated is a free log subscription operation binding the contract event 0x4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac.
//
// Solidity: event NodeUrlUpdated(address indexed nodeAddress, string url)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchNodeUrlUpdated(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployNodeUrlUpdated, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "NodeUrlUpdated", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployNodeUrlUpdated)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "NodeUrlUpdated", log); err != nil {
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

// ParseNodeUrlUpdated is a log parse operation binding the contract event 0x4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac.
//
// Solidity: event NodeUrlUpdated(address indexed nodeAddress, string url)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseNodeUrlUpdated(log types.Log) (*RiverRegistryDeployNodeUrlUpdated, error) {
	event := new(RiverRegistryDeployNodeUrlUpdated)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "NodeUrlUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryDeployOperatorAddedIterator is returned from FilterOperatorAdded and is used to iterate over the raw logs and unpacked data for OperatorAdded events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployOperatorAddedIterator struct {
	Event *RiverRegistryDeployOperatorAdded // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployOperatorAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployOperatorAdded)
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
		it.Event = new(RiverRegistryDeployOperatorAdded)
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
func (it *RiverRegistryDeployOperatorAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployOperatorAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployOperatorAdded represents a OperatorAdded event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployOperatorAdded struct {
	OperatorAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterOperatorAdded is a free log retrieval operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterOperatorAdded(opts *bind.FilterOpts, operatorAddress []common.Address) (*RiverRegistryDeployOperatorAddedIterator, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "OperatorAdded", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployOperatorAddedIterator{contract: _RiverRegistryDeploy.contract, event: "OperatorAdded", logs: logs, sub: sub}, nil
}

// WatchOperatorAdded is a free log subscription operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchOperatorAdded(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployOperatorAdded, operatorAddress []common.Address) (event.Subscription, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "OperatorAdded", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployOperatorAdded)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "OperatorAdded", log); err != nil {
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

// ParseOperatorAdded is a log parse operation binding the contract event 0xac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d.
//
// Solidity: event OperatorAdded(address indexed operatorAddress)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseOperatorAdded(log types.Log) (*RiverRegistryDeployOperatorAdded, error) {
	event := new(RiverRegistryDeployOperatorAdded)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "OperatorAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryDeployOperatorRemovedIterator is returned from FilterOperatorRemoved and is used to iterate over the raw logs and unpacked data for OperatorRemoved events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployOperatorRemovedIterator struct {
	Event *RiverRegistryDeployOperatorRemoved // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployOperatorRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployOperatorRemoved)
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
		it.Event = new(RiverRegistryDeployOperatorRemoved)
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
func (it *RiverRegistryDeployOperatorRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployOperatorRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployOperatorRemoved represents a OperatorRemoved event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployOperatorRemoved struct {
	OperatorAddress common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterOperatorRemoved is a free log retrieval operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterOperatorRemoved(opts *bind.FilterOpts, operatorAddress []common.Address) (*RiverRegistryDeployOperatorRemovedIterator, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "OperatorRemoved", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployOperatorRemovedIterator{contract: _RiverRegistryDeploy.contract, event: "OperatorRemoved", logs: logs, sub: sub}, nil
}

// WatchOperatorRemoved is a free log subscription operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchOperatorRemoved(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployOperatorRemoved, operatorAddress []common.Address) (event.Subscription, error) {

	var operatorAddressRule []interface{}
	for _, operatorAddressItem := range operatorAddress {
		operatorAddressRule = append(operatorAddressRule, operatorAddressItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "OperatorRemoved", operatorAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployOperatorRemoved)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "OperatorRemoved", log); err != nil {
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

// ParseOperatorRemoved is a log parse operation binding the contract event 0x80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d.
//
// Solidity: event OperatorRemoved(address indexed operatorAddress)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseOperatorRemoved(log types.Log) (*RiverRegistryDeployOperatorRemoved, error) {
	event := new(RiverRegistryDeployOperatorRemoved)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "OperatorRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryDeployOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployOwnershipTransferredIterator struct {
	Event *RiverRegistryDeployOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployOwnershipTransferred)
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
		it.Event = new(RiverRegistryDeployOwnershipTransferred)
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
func (it *RiverRegistryDeployOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployOwnershipTransferred represents a OwnershipTransferred event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*RiverRegistryDeployOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployOwnershipTransferredIterator{contract: _RiverRegistryDeploy.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployOwnershipTransferred)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseOwnershipTransferred(log types.Log) (*RiverRegistryDeployOwnershipTransferred, error) {
	event := new(RiverRegistryDeployOwnershipTransferred)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryDeployStreamAllocatedIterator is returned from FilterStreamAllocated and is used to iterate over the raw logs and unpacked data for StreamAllocated events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployStreamAllocatedIterator struct {
	Event *RiverRegistryDeployStreamAllocated // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployStreamAllocatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployStreamAllocated)
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
		it.Event = new(RiverRegistryDeployStreamAllocated)
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
func (it *RiverRegistryDeployStreamAllocatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployStreamAllocatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployStreamAllocated represents a StreamAllocated event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployStreamAllocated struct {
	StreamId             string
	Nodes                []common.Address
	GenesisMiniblockHash [32]byte
	Raw                  types.Log // Blockchain specific contextual infos
}

// FilterStreamAllocated is a free log retrieval operation binding the contract event 0xa79c4b435a69ed59ac1dddf9315512561153a9b7b20c43c354bdf5a0c9e2f26e.
//
// Solidity: event StreamAllocated(string streamId, address[] nodes, bytes32 genesisMiniblockHash)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterStreamAllocated(opts *bind.FilterOpts) (*RiverRegistryDeployStreamAllocatedIterator, error) {

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "StreamAllocated")
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployStreamAllocatedIterator{contract: _RiverRegistryDeploy.contract, event: "StreamAllocated", logs: logs, sub: sub}, nil
}

// WatchStreamAllocated is a free log subscription operation binding the contract event 0xa79c4b435a69ed59ac1dddf9315512561153a9b7b20c43c354bdf5a0c9e2f26e.
//
// Solidity: event StreamAllocated(string streamId, address[] nodes, bytes32 genesisMiniblockHash)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchStreamAllocated(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployStreamAllocated) (event.Subscription, error) {

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "StreamAllocated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployStreamAllocated)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "StreamAllocated", log); err != nil {
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

// ParseStreamAllocated is a log parse operation binding the contract event 0xa79c4b435a69ed59ac1dddf9315512561153a9b7b20c43c354bdf5a0c9e2f26e.
//
// Solidity: event StreamAllocated(string streamId, address[] nodes, bytes32 genesisMiniblockHash)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseStreamAllocated(log types.Log) (*RiverRegistryDeployStreamAllocated, error) {
	event := new(RiverRegistryDeployStreamAllocated)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "StreamAllocated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RiverRegistryDeployStreamLastMiniblockUpdatedIterator is returned from FilterStreamLastMiniblockUpdated and is used to iterate over the raw logs and unpacked data for StreamLastMiniblockUpdated events raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployStreamLastMiniblockUpdatedIterator struct {
	Event *RiverRegistryDeployStreamLastMiniblockUpdated // Event containing the contract specifics and raw log

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
func (it *RiverRegistryDeployStreamLastMiniblockUpdatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RiverRegistryDeployStreamLastMiniblockUpdated)
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
		it.Event = new(RiverRegistryDeployStreamLastMiniblockUpdated)
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
func (it *RiverRegistryDeployStreamLastMiniblockUpdatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RiverRegistryDeployStreamLastMiniblockUpdatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RiverRegistryDeployStreamLastMiniblockUpdated represents a StreamLastMiniblockUpdated event raised by the RiverRegistryDeploy contract.
type RiverRegistryDeployStreamLastMiniblockUpdated struct {
	StreamId          string
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	Raw               types.Log // Blockchain specific contextual infos
}

// FilterStreamLastMiniblockUpdated is a free log retrieval operation binding the contract event 0x751aae24847a063a2e4c98e9ec7575141ee0974ceb0d8f39a915c2da73a90865.
//
// Solidity: event StreamLastMiniblockUpdated(string streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterStreamLastMiniblockUpdated(opts *bind.FilterOpts) (*RiverRegistryDeployStreamLastMiniblockUpdatedIterator, error) {

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "StreamLastMiniblockUpdated")
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployStreamLastMiniblockUpdatedIterator{contract: _RiverRegistryDeploy.contract, event: "StreamLastMiniblockUpdated", logs: logs, sub: sub}, nil
}

// WatchStreamLastMiniblockUpdated is a free log subscription operation binding the contract event 0x751aae24847a063a2e4c98e9ec7575141ee0974ceb0d8f39a915c2da73a90865.
//
// Solidity: event StreamLastMiniblockUpdated(string streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchStreamLastMiniblockUpdated(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployStreamLastMiniblockUpdated) (event.Subscription, error) {

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "StreamLastMiniblockUpdated")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RiverRegistryDeployStreamLastMiniblockUpdated)
				if err := _RiverRegistryDeploy.contract.UnpackLog(event, "StreamLastMiniblockUpdated", log); err != nil {
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

// ParseStreamLastMiniblockUpdated is a log parse operation binding the contract event 0x751aae24847a063a2e4c98e9ec7575141ee0974ceb0d8f39a915c2da73a90865.
//
// Solidity: event StreamLastMiniblockUpdated(string streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseStreamLastMiniblockUpdated(log types.Log) (*RiverRegistryDeployStreamLastMiniblockUpdated, error) {
	event := new(RiverRegistryDeployStreamLastMiniblockUpdated)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "StreamLastMiniblockUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
