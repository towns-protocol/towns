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
	StreamId             [32]byte
	GenesisMiniblockHash [32]byte
	LastMiniblockHash    [32]byte
	LastMiniblockNum     uint64
	Flags                uint64
	Reserved0            uint64
	Reserved1            uint64
	Nodes                []common.Address
	GenesisMiniblock     []byte
}

// RiverRegistryDeployMetaData contains all meta data concerning the RiverRegistryDeploy contract.
var RiverRegistryDeployMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"approvedOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__RiverRegistry_init\",\"inputs\":[{\"name\":\"approvedOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approveOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAllNodeAddresses\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodes\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRiverRegistryBase.Node[]\",\"components\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreamIds\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32[]\",\"internalType\":\"bytes32[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreams\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRiverRegistryBase.Stream[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved1\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRiverRegistryBase.Node\",\"components\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRiverRegistryBase.Stream\",\"components\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"flags\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved0\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"reserved1\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"registerNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblock\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeStatus\",\"inputs\":[{\"name\":\"status\",\"type\":\"uint8\",\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"updateNodeUrl\",\"inputs\":[{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeAdded\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeStatusUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"status\",\"type\":\"uint8\",\"indexed\":false,\"internalType\":\"enumIRiverRegistryBase.NodeStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUrlUpdated\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorAdded\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorRemoved\",\"inputs\":[{\"name\":\"operatorAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamAllocated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"},{\"name\":\"isSealed\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]}]",
	Bin: "0x60806040523480156200001157600080fd5b50604051620025e4380380620025e48339810160408190526200003491620002c5565b6200003e6200005b565b620000498162000103565b620000543362000174565b50620003ad565b7f2d0d21306acfe8e9bb163a4573e95aff6cef95dc1102c6a16d5f19eac08cc4de8054640100000000900460ff1615620000a8576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156200010057805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b7f1320bfade83d725f4918cce6752986eeef865fd566a9348c57c798b58dfc7ea660005b82518110156200016f57620001658382815181106200014a576200014a62000397565b6020026020010151836006016200022060201b90919060201c565b5060010162000127565b505050565b600062000197600080516020620025c4833981519152546001600160a01b031690565b90506001600160a01b038216620001c157604051634e3ef82560e01b815260040160405180910390fd5b81600080516020620025c483398151915280546001600160a01b0319166001600160a01b03928316179055604051838216918316907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b600062000237836001600160a01b03841662000240565b90505b92915050565b600081815260018301602052604081205462000289575081546001818101845560008481526020808220909301849055845484825282860190935260409020919091556200023a565b5060006200023a565b634e487b7160e01b600052604160045260246000fd5b80516001600160a01b0381168114620002c057600080fd5b919050565b60006020808385031215620002d957600080fd5b82516001600160401b0380821115620002f157600080fd5b818501915085601f8301126200030657600080fd5b8151818111156200031b576200031b62000292565b8060051b604051601f19603f8301168101818110858211171562000343576200034362000292565b6040529182528482019250838101850191888311156200036257600080fd5b938501935b828510156200038b576200037b85620002a8565b8452938501939285019262000367565b98975050505050505050565b634e487b7160e01b600052603260045260246000fd5b61220780620003bd6000396000f3fe608060405234801561001057600080fd5b506004361061010b5760003560e01c80637691f5ed116100a2578063ac8a584a11610071578063ac8a584a14610232578063bb9b342d14610245578063be6522d614610258578063c0f220841461026b578063c8fe3a011461027357600080fd5b80637691f5ed146101d557806386789fc6146101e85780639d209048146101fd578063a1174e7d1461021d57600080fd5b80633bd84c0c116100de5780633bd84c0c14610177578063681a8d671461018c5780636b883c391461019f5780636d70f7ae146101b257600080fd5b80631290abe814610110578063242cae9f14610139578063286af2531461014e57806339bf397e14610161575b600080fd5b61012361011e366004611984565b610288565b6040516101309190611aed565b60405180910390f35b61014c610147366004611b1c565b610456565b005b61014c61015c366004611c03565b610585565b6101696105db565b604051908152602001610130565b61017f6105f5565b6040516101309190611c3f565b61014c61019a366004611ca3565b610816565b61014c6101ad366004611d55565b610a32565b6101c56101c0366004611b1c565b610cbc565b6040519015158152602001610130565b61014c6101e3366004611ddf565b610cd9565b6101f0610da6565b6040516101309190611e00565b61021061020b366004611b1c565b610dc3565b6040516101309190611ebf565b610225610f24565b6040516101309190611ed2565b61014c610240366004611b1c565b6110db565b61014c610253366004611f49565b61122e565b61014c610266366004611f96565b6113da565b610169611485565b61027b611497565b6040516101309190611fca565b610290611882565b600061029a6114b1565b90506102a681846114d5565b6102ea5760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526102e19190600401611fdd565b60405180910390fd5b60008381526002808301602090815260409283902083516101208101855281548152600182015481840152928101548385015260038101546001600160401b038082166060860152600160401b820481166080860152600160801b8204811660a0860152600160c01b9091041660c08401526004810180548551818502810185019096528086529394919360e08601938301828280156103b357602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610395575b505050505081526020016005820180546103cc90611ff0565b80601f01602080910402602001604051908101604052809291908181526020018280546103f890611ff0565b80156104455780601f1061041a57610100808354040283529160200191610445565b820191906000526020600020905b81548152906001019060200180831161042857829003601f168201915b505050505081525050915050919050565b7fa7c3be20e3a76821507555109752fad8a6630ef0362a34dcfcdfef83c99a2537546001600160a01b031633146104a2576040516365f4906560e01b81523360048201526024016102e1565b6001600160a01b0381166104e55760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526102e19190600401611fdd565b60006104ef6114b1565b90506104fe60068201836114f0565b1561053f57604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526102e19190600401611fdd565b61054c6006820183611512565b506040516001600160a01b038316907fac6fa858e9350a46cec16539926e0fde25b7629f84b5a72bffaae4df888ae86d90600090a25050565b7f2d0d21306acfe8e9bb163a4573e95aff6cef95dc1102c6a16d5f19eac08cc4de54640100000000900460ff166105cf57604051630ef4733760e31b815260040160405180910390fd5b6105d881611527565b50565b60006105f06105e86114b1565b600301611543565b905090565b606060006106016114b1565b9050600061060e82611543565b6001600160401b0381111561062557610625611b37565b60405190808252806020026020018201604052801561065e57816020015b61064b611882565b8152602001906001900390816106435790505b50905060005b61066d83611543565b81101561080f57600283016000610684858461154d565b815260208082019290925260409081016000208151610120810183528154815260018201548185015260028201548184015260038201546001600160401b038082166060840152600160401b820481166080840152600160801b8204811660a0840152600160c01b9091041660c08201526004820180548451818702810187019095528085529194929360e086019390929083018282801561074f57602002820191906000526020600020905b81546001600160a01b03168152600190910190602001808311610731575b5050505050815260200160058201805461076890611ff0565b80601f016020809104026020016040519081016040528092919081815260200182805461079490611ff0565b80156107e15780601f106107b6576101008083540402835291602001916107e1565b820191906000526020600020905b8154815290600101906020018083116107c457829003601f168201915b5050505050815250508282815181106107fc576107fc61202a565b6020908102919091010152600101610664565b5092915050565b61082b336108226114b1565b600301906114f0565b6108655760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526102e19190600401611fdd565b600061086f6114b1565b905061087b81866114d5565b6108b65760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526102e19190600401611fdd565b600085815260028201602052604090206003810154600160401b90046001161561091557604080518082018252600d81526c14d51491505357d4d150531151609a1b6020820152905162461bcd60e51b81526102e19190600401611fdd565b60038101546001600160401b038086169161093291166001612056565b6001600160401b0316146109755760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526102e19190600401611fdd565b6002810185905560038101805467ffffffffffffffff19166001600160401b03861617905582156109d6576003810180546fffffffffffffffff00000000000000001981166001600160401b928390046001600160401b0316179091021790555b805460408051918252602082018790526001600160401b0386169082015283151560608201527fccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b906080015b60405180910390a1505050505050565b610a3e336108226114b1565b610a785760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526102e19190600401611fdd565b6000610a826114b1565b9050610a8e81866114d5565b15610acf57604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526102e19190600401611fdd565b60005b8451811015610b5257610b0a858281518110610af057610af061202a565b6020026020010151836003016114f090919063ffffffff16565b610b4a57604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526102e19190600401611fdd565b600101610ad2565b506040805161012081018252868152602081018590529081018490526000606082018190526080820181905260a0820181905260c082015260e081018590526101008101839052610ba38287611559565b506000868152600280840160209081526040928390208451815581850151600182015592840151918301919091556060830151600383018054608086015160a087015160c08801516001600160401b03908116600160c01b026001600160c01b03928216600160801b02929092166fffffffffffffffffffffffffffffffff938216600160401b026fffffffffffffffffffffffffffffffff19909516919096161792909217169290921791909117905560e08301518051849392610c6f9260048501929101906118d0565b506101008201516005820190610c8590826120c6565b509050507fd79158fa478ef0af48ae6b32b29d29b2a37ee7b0dfcce6005880fd071623b5fb868686604051610a2293929190612185565b6000610cd382610cca6114b1565b600601906114f0565b92915050565b610ce5336108226114b1565b610d1f5760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526102e19190600401611fdd565b6000610d296114b1565b33600090815260058201602052604090206002018054919250839160ff19166001836004811115610d5c57610d5c611e44565b0217905550336001600160a01b03167f20891cc7622c7951cbd8c70c61a5201eb45625b8c00e8f6c986cfca78f3dbfa083604051610d9a91906121ae565b60405180910390a25050565b60606000610db26114b1565b9050610dbd81611565565b91505090565b610dcb611935565b6000610dd56114b1565b9050610de460038201846114f0565b610e2457604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526102e19190600401611fdd565b6001600160a01b0380841660009081526005830160209081526040918290208251606081019093528054909316825260018301805492939291840191610e6990611ff0565b80601f0160208091040260200160405190810160405280929190818152602001828054610e9590611ff0565b8015610ee25780601f10610eb757610100808354040283529160200191610ee2565b820191906000526020600020905b815481529060010190602001808311610ec557829003601f168201915b5050509183525050600282015460209091019060ff166004811115610f0957610f09611e44565b6004811115610f1a57610f1a611e44565b9052509392505050565b60606000610f306114b1565b90506000610f4082600301611543565b6001600160401b03811115610f5757610f57611b37565b604051908082528060200260200182016040528015610f9057816020015b610f7d611935565b815260200190600190039081610f755790505b50905060005b610fa283600301611543565b81101561080f57600583016000610fbc600386018461154d565b6001600160a01b039081168252602080830193909352604091820160002082516060810190935280549091168252600181018054929391929184019161100190611ff0565b80601f016020809104026020016040519081016040528092919081815260200182805461102d90611ff0565b801561107a5780601f1061104f5761010080835404028352916020019161107a565b820191906000526020600020905b81548152906001019060200180831161105d57829003601f168201915b5050509183525050600282015460209091019060ff1660048111156110a1576110a1611e44565b60048111156110b2576110b2611e44565b815250508282815181106110c8576110c861202a565b6020908102919091010152600101610f96565b7fa7c3be20e3a76821507555109752fad8a6630ef0362a34dcfcdfef83c99a2537546001600160a01b03163314611127576040516365f4906560e01b81523360048201526024016102e1565b60006111316114b1565b905061114060068201836114f0565b61118457604080518082018252601281527113d41154905513d497d393d517d193d5539160721b6020820152905162461bcd60e51b81526102e19190600401611fdd565b6001600160a01b038216600090815260088201602052604081206111a790611543565b11156111e857604080518082018252600d81526c4f55545f4f465f424f554e445360981b6020820152905162461bcd60e51b81526102e19190600401611fdd565b6111f56006820183611572565b506040516001600160a01b038316907f80c0b871b97b595b16a7741c1b06fed0c6f6f558639f18ccbce50724325dc40d90600090a25050565b61123a33610cca6114b1565b6112745760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526102e19190600401611fdd565b600061127e6114b1565b905061128d60038201846114f0565b156112ce57604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526102e19190600401611fdd565b604080516060810182526001600160a01b038516815260208082018590526000828401819052338152600885019091529190912061130c9085611512565b5061131a6003830185611512565b506001600160a01b0384811660009081526005840160209081526040909120835181546001600160a01b0319169316929092178255820151829190600182019061136490826120c6565b50604082015160028201805460ff1916600183600481111561138857611388611e44565b0217905550905050836001600160a01b03167fd6f3629b08191adb8308c3a65d5f8803b7f8f3e359c433fa7ae623276635e5618460006040516113cc9291906121bc565b60405180910390a250505050565b6113e6336108226114b1565b6114205760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526102e19190600401611fdd565b600061142a6114b1565b336000908152600582016020526040902090915060010161144b83826120c6565b50336001600160a01b03167f4505168a8705a16fd4d0575197fd0f510db69df93a065e158ad2c0957ba12bac83604051610d9a9190611fdd565b60006105f06114926114b1565b611543565b606060006114a36114b1565b9050610dbd81600301611565565b7f1320bfade83d725f4918cce6752986eeef865fd566a9348c57c798b58dfc7ea690565b600081815260018301602052604081205415155b9392505050565b6001600160a01b038116600090815260018301602052604081205415156114e9565b60006114e9836001600160a01b038416611587565b61153a600162253f8760e21b03196115d6565b6105d8816116b4565b6000610cd3825490565b60006114e98383611709565b60006114e98383611587565b606060006114e983611733565b60006114e9836001600160a01b03841661178f565b60008181526001830160205260408120546115ce57508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610cd3565b506000610cd3565b6001600160e01b0319811660009081527fbc7de460bcfb6afd0c415c8c610d408bd914b18d7d0feec0da9e25348087a5c4602052604090205460ff161515600114611663576001600160e01b0319811660009081527fbc7de460bcfb6afd0c415c8c610d408bd914b18d7d0feec0da9e25348087a5c460205260409020805460ff1916600117905561167c565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b60006116be6114b1565b905060005b8251811015611704576116fb8382815181106116e1576116e161202a565b60200260200101518360060161151290919063ffffffff16565b506001016116c3565b505050565b60008260000182815481106117205761172061202a565b9060005260206000200154905092915050565b60608160000180548060200260200160405190810160405280929190818152602001828054801561178357602002820191906000526020600020905b81548152602001906001019080831161176f575b50505050509050919050565b600081815260018301602052604081205480156118785760006117b36001836121de565b85549091506000906117c7906001906121de565b905081811461182c5760008660000182815481106117e7576117e761202a565b906000526020600020015490508087600001848154811061180a5761180a61202a565b6000918252602080832090910192909255918252600188019052604090208390555b855486908061183d5761183d6121f1565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050610cd3565b6000915050610cd3565b604080516101208101825260008082526020820181905291810182905260608082018390526080820183905260a0820183905260c082019290925260e0810182905261010081019190915290565b828054828255906000526020600020908101928215611925579160200282015b8281111561192557825182546001600160a01b0319166001600160a01b039091161782556020909201916001909101906118f0565b5061193192915061196f565b5090565b604051806060016040528060006001600160a01b03168152602001606081526020016000600481111561196a5761196a611e44565b905290565b5b808211156119315760008155600101611970565b60006020828403121561199657600080fd5b5035919050565b60008151808452602080850194506020840160005b838110156119d75781516001600160a01b0316875295820195908201906001016119b2565b509495945050505050565b6000815180845260005b81811015611a08576020818501810151868301820152016119ec565b506000602082860101526020601f19601f83011685010191505092915050565b60006101208251845260208301516020850152604083015160408501526060830151611a5f60608601826001600160401b03169052565b506080830151611a7a60808601826001600160401b03169052565b5060a0830151611a9560a08601826001600160401b03169052565b5060c0830151611ab060c08601826001600160401b03169052565b5060e08301518160e0860152611ac88286018261199d565b9150506101008084015185830382870152611ae383826119e2565b9695505050505050565b6020815260006114e96020830184611a28565b80356001600160a01b0381168114611b1757600080fd5b919050565b600060208284031215611b2e57600080fd5b6114e982611b00565b634e487b7160e01b600052604160045260246000fd5b604051601f8201601f191681016001600160401b0381118282101715611b7557611b75611b37565b604052919050565b600082601f830112611b8e57600080fd5b813560206001600160401b03821115611ba957611ba9611b37565b8160051b611bb8828201611b4d565b9283528481018201928281019087851115611bd257600080fd5b83870192505b84831015611bf857611be983611b00565b82529183019190830190611bd8565b979650505050505050565b600060208284031215611c1557600080fd5b81356001600160401b03811115611c2b57600080fd5b611c3784828501611b7d565b949350505050565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b82811015611c9657603f19888603018452611c84858351611a28565b94509285019290850190600101611c68565b5092979650505050505050565b60008060008060808587031215611cb957600080fd5b843593506020850135925060408501356001600160401b0381168114611cde57600080fd5b915060608501358015158114611cf357600080fd5b939692955090935050565b60006001600160401b03831115611d1757611d17611b37565b611d2a601f8401601f1916602001611b4d565b9050828152838383011115611d3e57600080fd5b828260208301376000602084830101529392505050565b60008060008060808587031215611d6b57600080fd5b8435935060208501356001600160401b0380821115611d8957600080fd5b611d9588838901611b7d565b9450604087013593506060870135915080821115611db257600080fd5b508501601f81018713611dc457600080fd5b611dd387823560208401611cfe565b91505092959194509250565b600060208284031215611df157600080fd5b8135600581106114e957600080fd5b6020808252825182820181905260009190848201906040850190845b81811015611e3857835183529284019291840191600101611e1c565b50909695505050505050565b634e487b7160e01b600052602160045260246000fd5b60058110611e7857634e487b7160e01b600052602160045260246000fd5b9052565b60018060a01b0381511682526000602082015160606020850152611ea360608501826119e2565b90506040830151611eb76040860182611e5a565b509392505050565b6020815260006114e96020830184611e7c565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b82811015611c9657603f19888603018452611f17858351611e7c565b94509285019290850190600101611efb565b600082601f830112611f3a57600080fd5b6114e983833560208501611cfe565b60008060408385031215611f5c57600080fd5b611f6583611b00565b915060208301356001600160401b03811115611f8057600080fd5b611f8c85828601611f29565b9150509250929050565b600060208284031215611fa857600080fd5b81356001600160401b03811115611fbe57600080fd5b611c3784828501611f29565b6020815260006114e9602083018461199d565b6020815260006114e960208301846119e2565b600181811c9082168061200457607f821691505b60208210810361202457634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b6001600160401b0381811683821601908082111561080f5761080f612040565b601f821115611704576000816000526020600020601f850160051c8101602086101561209f5750805b601f850160051c820191505b818110156120be578281556001016120ab565b505050505050565b81516001600160401b038111156120df576120df611b37565b6120f3816120ed8454611ff0565b84612076565b602080601f83116001811461212857600084156121105750858301515b600019600386901b1c1916600185901b1785556120be565b600085815260208120601f198616915b8281101561215757888601518255948401946001909101908401612138565b50858210156121755787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b83815260606020820152600061219e606083018561199d565b9050826040830152949350505050565b60208101610cd38284611e5a565b6040815260006121cf60408301856119e2565b90506114e96020830184611e5a565b81810381811115610cd357610cd3612040565b634e487b7160e01b600052603160045260246000fda7c3be20e3a76821507555109752fad8a6630ef0362a34dcfcdfef83c99a2537",
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
// Solidity: function getAllStreamIds() view returns(bytes32[])
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) GetAllStreamIds(opts *bind.CallOpts) ([][32]byte, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "getAllStreamIds")

	if err != nil {
		return *new([][32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([][32]byte)).(*[][32]byte)

	return out0, err

}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(bytes32[])
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetAllStreamIds() ([][32]byte, error) {
	return _RiverRegistryDeploy.Contract.GetAllStreamIds(&_RiverRegistryDeploy.CallOpts)
}

// GetAllStreamIds is a free data retrieval call binding the contract method 0x86789fc6.
//
// Solidity: function getAllStreamIds() view returns(bytes32[])
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) GetAllStreamIds() ([][32]byte, error) {
	return _RiverRegistryDeploy.Contract.GetAllStreamIds(&_RiverRegistryDeploy.CallOpts)
}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((bytes32,bytes32,bytes32,uint64,uint64,uint64,uint64,address[],bytes)[])
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
// Solidity: function getAllStreams() view returns((bytes32,bytes32,bytes32,uint64,uint64,uint64,uint64,address[],bytes)[])
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetAllStreams() ([]IRiverRegistryBaseStream, error) {
	return _RiverRegistryDeploy.Contract.GetAllStreams(&_RiverRegistryDeploy.CallOpts)
}

// GetAllStreams is a free data retrieval call binding the contract method 0x3bd84c0c.
//
// Solidity: function getAllStreams() view returns((bytes32,bytes32,bytes32,uint64,uint64,uint64,uint64,address[],bytes)[])
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
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,bytes32,bytes32,uint64,uint64,uint64,uint64,address[],bytes))
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) GetStream(opts *bind.CallOpts, streamId [32]byte) (IRiverRegistryBaseStream, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "getStream", streamId)

	if err != nil {
		return *new(IRiverRegistryBaseStream), err
	}

	out0 := *abi.ConvertType(out[0], new(IRiverRegistryBaseStream)).(*IRiverRegistryBaseStream)

	return out0, err

}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,bytes32,bytes32,uint64,uint64,uint64,uint64,address[],bytes))
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetStream(streamId [32]byte) (IRiverRegistryBaseStream, error) {
	return _RiverRegistryDeploy.Contract.GetStream(&_RiverRegistryDeploy.CallOpts, streamId)
}

// GetStream is a free data retrieval call binding the contract method 0x1290abe8.
//
// Solidity: function getStream(bytes32 streamId) view returns((bytes32,bytes32,bytes32,uint64,uint64,uint64,uint64,address[],bytes))
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) GetStream(streamId [32]byte) (IRiverRegistryBaseStream, error) {
	return _RiverRegistryDeploy.Contract.GetStream(&_RiverRegistryDeploy.CallOpts, streamId)
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

// AllocateStream is a paid mutator transaction binding the contract method 0x6b883c39.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) AllocateStream(opts *bind.TransactOpts, streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "allocateStream", streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// AllocateStream is a paid mutator transaction binding the contract method 0x6b883c39.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) AllocateStream(streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.AllocateStream(&_RiverRegistryDeploy.TransactOpts, streamId, nodes, genesisMiniblockHash, genesisMiniblock)
}

// AllocateStream is a paid mutator transaction binding the contract method 0x6b883c39.
//
// Solidity: function allocateStream(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash, bytes genesisMiniblock) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) AllocateStream(streamId [32]byte, nodes []common.Address, genesisMiniblockHash [32]byte, genesisMiniblock []byte) (*types.Transaction, error) {
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

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0x681a8d67.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) SetStreamLastMiniblock(opts *bind.TransactOpts, streamId [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64, isSealed bool) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "setStreamLastMiniblock", streamId, lastMiniblockHash, lastMiniblockNum, isSealed)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0x681a8d67.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) SetStreamLastMiniblock(streamId [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64, isSealed bool) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.SetStreamLastMiniblock(&_RiverRegistryDeploy.TransactOpts, streamId, lastMiniblockHash, lastMiniblockNum, isSealed)
}

// SetStreamLastMiniblock is a paid mutator transaction binding the contract method 0x681a8d67.
//
// Solidity: function setStreamLastMiniblock(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) SetStreamLastMiniblock(streamId [32]byte, lastMiniblockHash [32]byte, lastMiniblockNum uint64, isSealed bool) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.SetStreamLastMiniblock(&_RiverRegistryDeploy.TransactOpts, streamId, lastMiniblockHash, lastMiniblockNum, isSealed)
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
	StreamId             [32]byte
	Nodes                []common.Address
	GenesisMiniblockHash [32]byte
	Raw                  types.Log // Blockchain specific contextual infos
}

// FilterStreamAllocated is a free log retrieval operation binding the contract event 0xd79158fa478ef0af48ae6b32b29d29b2a37ee7b0dfcce6005880fd071623b5fb.
//
// Solidity: event StreamAllocated(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterStreamAllocated(opts *bind.FilterOpts) (*RiverRegistryDeployStreamAllocatedIterator, error) {

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "StreamAllocated")
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployStreamAllocatedIterator{contract: _RiverRegistryDeploy.contract, event: "StreamAllocated", logs: logs, sub: sub}, nil
}

// WatchStreamAllocated is a free log subscription operation binding the contract event 0xd79158fa478ef0af48ae6b32b29d29b2a37ee7b0dfcce6005880fd071623b5fb.
//
// Solidity: event StreamAllocated(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash)
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

// ParseStreamAllocated is a log parse operation binding the contract event 0xd79158fa478ef0af48ae6b32b29d29b2a37ee7b0dfcce6005880fd071623b5fb.
//
// Solidity: event StreamAllocated(bytes32 streamId, address[] nodes, bytes32 genesisMiniblockHash)
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
	StreamId          [32]byte
	LastMiniblockHash [32]byte
	LastMiniblockNum  uint64
	IsSealed          bool
	Raw               types.Log // Blockchain specific contextual infos
}

// FilterStreamLastMiniblockUpdated is a free log retrieval operation binding the contract event 0xccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b.
//
// Solidity: event StreamLastMiniblockUpdated(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterStreamLastMiniblockUpdated(opts *bind.FilterOpts) (*RiverRegistryDeployStreamLastMiniblockUpdatedIterator, error) {

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "StreamLastMiniblockUpdated")
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployStreamLastMiniblockUpdatedIterator{contract: _RiverRegistryDeploy.contract, event: "StreamLastMiniblockUpdated", logs: logs, sub: sub}, nil
}

// WatchStreamLastMiniblockUpdated is a free log subscription operation binding the contract event 0xccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b.
//
// Solidity: event StreamLastMiniblockUpdated(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed)
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

// ParseStreamLastMiniblockUpdated is a log parse operation binding the contract event 0xccc26bbb6dd655ea0bb8a40a3c30e35c6bdf42f8faf0d71bbea897af768cda8b.
//
// Solidity: event StreamLastMiniblockUpdated(bytes32 streamId, bytes32 lastMiniblockHash, uint64 lastMiniblockNum, bool isSealed)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseStreamLastMiniblockUpdated(log types.Log) (*RiverRegistryDeployStreamLastMiniblockUpdated, error) {
	event := new(RiverRegistryDeployStreamLastMiniblockUpdated)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "StreamLastMiniblockUpdated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
