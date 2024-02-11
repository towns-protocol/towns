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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__Ownable_init\",\"inputs\":[{\"name\":\"owner_\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"addNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allocateStream\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getAllNodeAddresses\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllNodes\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRiverRegistryBase.Node[]\",\"components\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreamIds\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string[]\",\"internalType\":\"string[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getAllStreams\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"tuple[]\",\"internalType\":\"structIRiverRegistryBase.Stream[]\",\"components\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNode\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRiverRegistryBase.Node\",\"components\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"internalType\":\"string\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStream\",\"inputs\":[{\"name\":\"streamIdHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIRiverRegistryBase.Stream\",\"components\":[{\"name\":\"streamId\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"genesisMiniblock\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getStreamCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"owner\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"setStreamLastMiniblock\",\"inputs\":[{\"name\":\"streamIdHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"internalType\":\"uint64\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"transferOwnership\",\"inputs\":[{\"name\":\"newOwner\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeAdded\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"url\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamAllocated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"},{\"name\":\"genesisMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"StreamLastMiniblockUpdated\",\"inputs\":[{\"name\":\"streamId\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"lastMiniblockHash\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"lastMiniblockNum\",\"type\":\"uint64\",\"indexed\":false,\"internalType\":\"uint64\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]}]",
	Bin: "0x60806040523480156200001157600080fd5b506200001c6200002d565b6200002733620000d5565b6200025c565b7f2d0d21306acfe8e9bb163a4573e95aff6cef95dc1102c6a16d5f19eac08cc4de8054640100000000900460ff16156200007a576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff9081161015620000d257805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b620000e081620000f2565b620000d26307f5828d60e41b6200019e565b6000620001156000805160206200202f833981519152546001600160a01b031690565b90506001600160a01b0382166200013f57604051634e3ef82560e01b815260040160405180910390fd5b816000805160206200202f83398151915280546001600160a01b0319166001600160a01b03928316179055604051838216918316907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160e01b0319811660009081526000805160206200204f833981519152602052604090205460ff1615156001146200020b576001600160e01b0319811660009081526000805160206200204f83398151915260205260409020805460ff1916600117905562000224565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b611dc3806200026c6000396000f3fe608060405234801561001057600080fd5b50600436106100ea5760003560e01c8063a1174e7d1161008c578063d78f002111610066578063d78f0021146101df578063e5d78f6a146101f2578063f2fde38b14610205578063fc7a92231461021857600080fd5b8063a1174e7d146101ad578063c0f22084146101c2578063c8fe3a01146101ca57600080fd5b80633bd84c0c116100c85780633bd84c0c1461014357806386789fc6146101585780638da5cb5b1461016d5780639d2090481461018d57600080fd5b806307c973b1146100ef5780631290abe81461010457806339bf397e1461012d575b600080fd5b6101026100fd366004611669565b61022b565b005b6101176101123660046116b6565b61038a565b60405161012491906117c9565b60405180910390f35b6101356105de565b604051908152602001610124565b61014b6105fc565b60405161012491906117dc565b6101606108ac565b6040516101249190611840565b6101756109f7565b6040516001600160a01b039091168152602001610124565b6101a061019b366004611897565b610a01565b60405161012491906118e1565b6101b5610b4b565b60405161012491906118f4565b610135610ce9565b6101d2610d02565b6040516101249190611990565b6101026101ed366004611897565b610dc4565b6101026102003660046119a3565b610e1a565b610102610213366004611897565b6110a5565b610102610226366004611a9e565b6110e9565b610233611267565b6001600160a01b0316336001600160a01b03161461026b576040516365f4906560e01b81523360048201526024015b60405180910390fd5b600080516020611da3833981519152610292600080516020611d8383398151915284611295565b156102d357604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526102629190600401611ae3565b604080518082019091526001600160a01b0384168152602081018390526102fd60038301856112bc565b506001600160a01b0384811660009081526005840160209081526040909120835181546001600160a01b031916931692909217825582015182919060018201906103479082611b81565b509050507f44fbdbcb1bc68a08f60b9d96b19ced4664733ae1a243dd27223dc840b04dbbb3848460405161037c929190611c40565b60405180910390a150505050565b6040805160c0810182526060808252602082018190526000928201839052808201526080810182905260a0810191909152600080516020611da38339815191526103d481846112d1565b61040f5760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526102629190600401611ae3565b600083815260028201602052604090819020815160c0810190925280548290829061043990611af6565b80601f016020809104026020016040519081016040528092919081815260200182805461046590611af6565b80156104b25780601f10610487576101008083540402835291602001916104b2565b820191906000526020600020905b81548152906001019060200180831161049557829003601f168201915b505050505081526020016001820180548060200260200160405190810160405280929190818152602001828054801561051457602002820191906000526020600020905b81546001600160a01b031681526001909101906020018083116104f6575b505050505081526020016002820154815260200160038201805461053790611af6565b80601f016020809104026020016040519081016040528092919081815260200182805461056390611af6565b80156105b05780601f10610585576101008083540402835291602001916105b0565b820191906000526020600020905b81548152906001019060200180831161059357829003601f168201915b5050509183525050600482015460208201526005909101546001600160401b03166040909101529392505050565b60006105f7600080516020611d838339815191526112e9565b905090565b6060600080516020611da38339815191526000610618826112e9565b6001600160401b0381111561062f5761062f6115b4565b60405190808252806020026020018201604052801561069157816020015b6040805160c0810182526060808252602082018190526000928201839052808201526080810182905260a081019190915281526020019060019003908161064d5790505b50905060005b6106a0836112e9565b8110156108a5576002830160006106b785846112f3565b81526020019081526020016000206040518060c00160405290816000820180546106e090611af6565b80601f016020809104026020016040519081016040528092919081815260200182805461070c90611af6565b80156107595780601f1061072e57610100808354040283529160200191610759565b820191906000526020600020905b81548152906001019060200180831161073c57829003601f168201915b50505050508152602001600182018054806020026020016040519081016040528092919081815260200182805480156107bb57602002820191906000526020600020905b81546001600160a01b0316815260019091019060200180831161079d575b50505050508152602001600282015481526020016003820180546107de90611af6565b80601f016020809104026020016040519081016040528092919081815260200182805461080a90611af6565b80156108575780601f1061082c57610100808354040283529160200191610857565b820191906000526020600020905b81548152906001019060200180831161083a57829003601f168201915b5050509183525050600482015460208201526005909101546001600160401b0316604090910152825183908390811061089257610892611c64565b6020908102919091010152600101610697565b5092915050565b6060600080516020611da383398151915260006108c8826112e9565b6001600160401b038111156108df576108df6115b4565b60405190808252806020026020018201604052801561091257816020015b60608152602001906001900390816108fd5790505b50905060005b610921836112e9565b8110156108a55760028301600061093885846112f3565b8152602001908152602001600020600001805461095490611af6565b80601f016020809104026020016040519081016040528092919081815260200182805461098090611af6565b80156109cd5780601f106109a2576101008083540402835291602001916109cd565b820191906000526020600020905b8154815290600101906020018083116109b057829003601f168201915b50505050508282815181106109e4576109e4611c64565b6020908102919091010152600101610918565b60006105f7611267565b604080518082019091526000815260606020820152600080516020611da3833981519152610a3d600080516020611d8383398151915284611295565b610a7d57604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526102629190600401611ae3565b6001600160a01b03808416600090815260058301602090815260409182902082518084019093528054909316825260018301805492939291840191610ac190611af6565b80601f0160208091040260200160405190810160405280929190818152602001828054610aed90611af6565b8015610b3a5780601f10610b0f57610100808354040283529160200191610b3a565b820191906000526020600020905b815481529060010190602001808311610b1d57829003601f168201915b505050505081525050915050919050565b6060600080516020611da38339815191526000610b75600080516020611d838339815191526112e9565b6001600160401b03811115610b8c57610b8c6115b4565b604051908082528060200260200182016040528015610bd257816020015b604080518082019091526000815260606020820152815260200190600190039081610baa5790505b50905060005b610be4836003016112e9565b8110156108a557600583016000610bfe60038601846112f3565b6001600160a01b03908116825260208083019390935260409182016000208251808401909352805490911682526001810180549293919291840191610c4290611af6565b80601f0160208091040260200160405190810160405280929190818152602001828054610c6e90611af6565b8015610cbb5780601f10610c9057610100808354040283529160200191610cbb565b820191906000526020600020905b815481529060010190602001808311610c9e57829003601f168201915b505050505081525050828281518110610cd657610cd6611c64565b6020908102919091010152600101610bd8565b60006105f7600080516020611da38339815191526112e9565b6060600080516020611da38339815191526000610d2c600080516020611d838339815191526112e9565b6001600160401b03811115610d4357610d436115b4565b604051908082528060200260200182016040528015610d6c578160200160208202803683370190505b50905060005b610d7e836003016112e9565b8110156108a557610d9260038401826112f3565b828281518110610da457610da4611c64565b6001600160a01b0390921660209283029190910190910152600101610d72565b7f2d0d21306acfe8e9bb163a4573e95aff6cef95dc1102c6a16d5f19eac08cc4de54640100000000900460ff16610e0e57604051630ef4733760e31b815260040160405180910390fd5b610e17816112ff565b50565b8351600003610e625760408051808201825260118152701253959053125117d4d51491505357d251607a1b6020820152905162461bcd60e51b81526102629190600401611ae3565b600080516020611da3833981519152610e89600080516020611d8383398151915233611295565b610ec35760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526102629190600401611ae3565b84516020860120610ed482826112d1565b15610f1557604080518082018252600e81526d414c52454144595f45584953545360901b6020820152905162461bcd60e51b81526102629190600401611ae3565b60005b8551811015610f9857610f50868281518110610f3657610f36611c64565b60200260200101518460030161129590919063ffffffff16565b610f9057604080518082018252600e81526d1393d11157d393d517d193d5539160921b6020820152905162461bcd60e51b81526102629190600401611ae3565b600101610f18565b506040805160c081018252878152602081018790529081018590526060810184905260808101859052600060a0820152610fd28383611318565b506000828152600284016020526040902081518291908190610ff49082611b81565b50602082810151805161100d926001850192019061151e565b50604082015160028201556060820151600382019061102c9082611b81565b506080820151600482015560a0909101516005909101805467ffffffffffffffff19166001600160401b039092169190911790556040517fa79c4b435a69ed59ac1dddf9315512561153a9b7b20c43c354bdf5a0c9e2f26e9061109490899089908990611c7a565b60405180910390a150505050505050565b6110ad611267565b6001600160a01b0316336001600160a01b0316146110e0576040516365f4906560e01b8152336004820152602401610262565b610e1781611324565b600080516020611da3833981519152611110600080516020611d8383398151915233611295565b61114a5760408051808201825260088152670848288be82aaa8960c31b6020820152905162461bcd60e51b81526102629190600401611ae3565b61115481856112d1565b61118f5760408051808201825260098152681393d517d193d5539160ba1b6020820152905162461bcd60e51b81526102629190600401611ae3565b6000848152600282016020526040902060058101546001600160401b03808516916111bc91166001611cb0565b6001600160401b0316146111ff5760408051808201825260078152664241445f41524760c81b6020820152905162461bcd60e51b81526102629190600401611ae3565b6004810184905560058101805467ffffffffffffffff19166001600160401b0385161790556040517f751aae24847a063a2e4c98e9ec7575141ee0974ceb0d8f39a915c2da73a908659061125890839087908790611cde565b60405180910390a15050505050565b7fa7c3be20e3a76821507555109752fad8a6630ef0362a34dcfcdfef83c99a2537546001600160a01b031690565b6001600160a01b038116600090815260018301602052604081205415155b90505b92915050565b60006112b3836001600160a01b0384166113c7565b600081815260018301602052604081205415156112b3565b60006112b6825490565b60006112b38383611416565b61130881611324565b610e176307f5828d60e41b611440565b60006112b383836113c7565b600061132e611267565b90506001600160a01b03821661135757604051634e3ef82560e01b815260040160405180910390fd5b817fa7c3be20e3a76821507555109752fad8a6630ef0362a34dcfcdfef83c99a253780546001600160a01b0319166001600160a01b03928316179055604051838216918316907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b600081815260018301602052604081205461140e575081546001818101845560008481526020808220909301849055845484825282860190935260409020919091556112b6565b5060006112b6565b600082600001828154811061142d5761142d611c64565b9060005260206000200154905092915050565b6001600160e01b0319811660009081527fbc7de460bcfb6afd0c415c8c610d408bd914b18d7d0feec0da9e25348087a5c4602052604090205460ff1615156001146114cd576001600160e01b0319811660009081527fbc7de460bcfb6afd0c415c8c610d408bd914b18d7d0feec0da9e25348087a5c460205260409020805460ff191660011790556114e6565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b828054828255906000526020600020908101928215611573579160200282015b8281111561157357825182546001600160a01b0319166001600160a01b0390911617825560209092019160019091019061153e565b5061157f929150611583565b5090565b5b8082111561157f5760008155600101611584565b80356001600160a01b03811681146115af57600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b604051601f8201601f191681016001600160401b03811182821017156115f2576115f26115b4565b604052919050565b600082601f83011261160b57600080fd5b81356001600160401b03811115611624576116246115b4565b611637601f8201601f19166020016115ca565b81815284602083860101111561164c57600080fd5b816020850160208301376000918101602001919091529392505050565b6000806040838503121561167c57600080fd5b61168583611598565b915060208301356001600160401b038111156116a057600080fd5b6116ac858286016115fa565b9150509250929050565b6000602082840312156116c857600080fd5b5035919050565b6000815180845260005b818110156116f5576020818501810151868301820152016116d9565b506000602082860101526020601f19601f83011685010191505092915050565b6000815160c0845261172a60c08501826116cf565b60208481015186830387830152805180845290820193509091600091908301905b808310156117745784516001600160a01b0316825293830193600192909201919083019061174b565b506040860151604088015260608601519350868103606088015261179881856116cf565b93505050506080830151608085015260a08301516117c160a08601826001600160401b03169052565b509392505050565b6020815260006112b36020830184611715565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b8281101561183357603f19888603018452611821858351611715565b94509285019290850190600101611805565b5092979650505050505050565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b8281101561183357603f198886030184526118858583516116cf565b94509285019290850190600101611869565b6000602082840312156118a957600080fd5b6112b382611598565b60018060a01b03815116825260006020820151604060208501526118d960408501826116cf565b949350505050565b6020815260006112b360208301846118b2565b600060208083016020845280855180835260408601915060408160051b87010192506020870160005b8281101561183357603f198886030184526119398583516118b2565b9450928501929085019060010161191d565b60008151808452602080850194506020840160005b838110156119855781516001600160a01b031687529582019590820190600101611960565b509495945050505050565b6020815260006112b3602083018461194b565b600080600080608085870312156119b957600080fd5b84356001600160401b03808211156119d057600080fd5b6119dc888389016115fa565b95506020915081870135818111156119f357600080fd5b8701601f81018913611a0457600080fd5b803582811115611a1657611a166115b4565b8060051b611a258582016115ca565b918252828101850191858101908c841115611a3f57600080fd5b938601935b83851015611a6457611a5585611598565b82529386019390860190611a44565b985050505060408801359450506060870135915080821115611a8557600080fd5b50611a92878288016115fa565b91505092959194509250565b600080600060608486031215611ab357600080fd5b833592506020840135915060408401356001600160401b0381168114611ad857600080fd5b809150509250925092565b6020815260006112b360208301846116cf565b600181811c90821680611b0a57607f821691505b602082108103611b2a57634e487b7160e01b600052602260045260246000fd5b50919050565b601f821115611b7c576000816000526020600020601f850160051c81016020861015611b595750805b601f850160051c820191505b81811015611b7857828155600101611b65565b5050505b505050565b81516001600160401b03811115611b9a57611b9a6115b4565b611bae81611ba88454611af6565b84611b30565b602080601f831160018114611be35760008415611bcb5750858301515b600019600386901b1c1916600185901b178555611b78565b600085815260208120601f198616915b82811015611c1257888601518255948401946001909101908401611bf3565b5085821015611c305787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b6001600160a01b03831681526040602082018190526000906118d9908301846116cf565b634e487b7160e01b600052603260045260246000fd5b606081526000611c8d60608301866116cf565b8281036020840152611c9f818661194b565b915050826040830152949350505050565b6001600160401b038181168382160190808211156108a557634e487b7160e01b600052601160045260246000fd5b606081526000808554611cf081611af6565b8060608601526080600180841660008114611d125760018114611d2e57611d60565b60ff1985166080890152608084151560051b8901019550611d60565b8a60005260208060002060005b86811015611d565781548b8201870152908401908201611d3b565b8a01608001975050505b5050505050602083018590526001600160401b038416604084015290506118d956fe1320bfade83d725f4918cce6752986eeef865fd566a9348c57c798b58dfc7ea91320bfade83d725f4918cce6752986eeef865fd566a9348c57c798b58dfc7ea6a7c3be20e3a76821507555109752fad8a6630ef0362a34dcfcdfef83c99a2537bc7de460bcfb6afd0c415c8c610d408bd914b18d7d0feec0da9e25348087a5c4",
}

// RiverRegistryDeployABI is the input ABI used to generate the binding from.
// Deprecated: Use RiverRegistryDeployMetaData.ABI instead.
var RiverRegistryDeployABI = RiverRegistryDeployMetaData.ABI

// RiverRegistryDeployBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use RiverRegistryDeployMetaData.Bin instead.
var RiverRegistryDeployBin = RiverRegistryDeployMetaData.Bin

// DeployRiverRegistryDeploy deploys a new Ethereum contract, binding an instance of RiverRegistryDeploy to it.
func DeployRiverRegistryDeploy(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *RiverRegistryDeploy, error) {
	parsed, err := RiverRegistryDeployMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(RiverRegistryDeployBin), backend)
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
// Solidity: function getAllNodes() view returns((address,string)[])
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
// Solidity: function getAllNodes() view returns((address,string)[])
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetAllNodes() ([]IRiverRegistryBaseNode, error) {
	return _RiverRegistryDeploy.Contract.GetAllNodes(&_RiverRegistryDeploy.CallOpts)
}

// GetAllNodes is a free data retrieval call binding the contract method 0xa1174e7d.
//
// Solidity: function getAllNodes() view returns((address,string)[])
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
// Solidity: function getNode(address nodeAddress) view returns((address,string))
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
// Solidity: function getNode(address nodeAddress) view returns((address,string))
func (_RiverRegistryDeploy *RiverRegistryDeploySession) GetNode(nodeAddress common.Address) (IRiverRegistryBaseNode, error) {
	return _RiverRegistryDeploy.Contract.GetNode(&_RiverRegistryDeploy.CallOpts, nodeAddress)
}

// GetNode is a free data retrieval call binding the contract method 0x9d209048.
//
// Solidity: function getNode(address nodeAddress) view returns((address,string))
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

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_RiverRegistryDeploy *RiverRegistryDeployCaller) Owner(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _RiverRegistryDeploy.contract.Call(opts, &out, "owner")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_RiverRegistryDeploy *RiverRegistryDeploySession) Owner() (common.Address, error) {
	return _RiverRegistryDeploy.Contract.Owner(&_RiverRegistryDeploy.CallOpts)
}

// Owner is a free data retrieval call binding the contract method 0x8da5cb5b.
//
// Solidity: function owner() view returns(address)
func (_RiverRegistryDeploy *RiverRegistryDeployCallerSession) Owner() (common.Address, error) {
	return _RiverRegistryDeploy.Contract.Owner(&_RiverRegistryDeploy.CallOpts)
}

// OwnableInit is a paid mutator transaction binding the contract method 0xd78f0021.
//
// Solidity: function __Ownable_init(address owner_) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) OwnableInit(opts *bind.TransactOpts, owner_ common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "__Ownable_init", owner_)
}

// OwnableInit is a paid mutator transaction binding the contract method 0xd78f0021.
//
// Solidity: function __Ownable_init(address owner_) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) OwnableInit(owner_ common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.OwnableInit(&_RiverRegistryDeploy.TransactOpts, owner_)
}

// OwnableInit is a paid mutator transaction binding the contract method 0xd78f0021.
//
// Solidity: function __Ownable_init(address owner_) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) OwnableInit(owner_ common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.OwnableInit(&_RiverRegistryDeploy.TransactOpts, owner_)
}

// AddNode is a paid mutator transaction binding the contract method 0x07c973b1.
//
// Solidity: function addNode(address nodeAddress, string url) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) AddNode(opts *bind.TransactOpts, nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "addNode", nodeAddress, url)
}

// AddNode is a paid mutator transaction binding the contract method 0x07c973b1.
//
// Solidity: function addNode(address nodeAddress, string url) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) AddNode(nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.AddNode(&_RiverRegistryDeploy.TransactOpts, nodeAddress, url)
}

// AddNode is a paid mutator transaction binding the contract method 0x07c973b1.
//
// Solidity: function addNode(address nodeAddress, string url) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) AddNode(nodeAddress common.Address, url string) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.AddNode(&_RiverRegistryDeploy.TransactOpts, nodeAddress, url)
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

// TransferOwnership is a paid mutator transaction binding the contract method 0xf2fde38b.
//
// Solidity: function transferOwnership(address newOwner) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactor) TransferOwnership(opts *bind.TransactOpts, newOwner common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.contract.Transact(opts, "transferOwnership", newOwner)
}

// TransferOwnership is a paid mutator transaction binding the contract method 0xf2fde38b.
//
// Solidity: function transferOwnership(address newOwner) returns()
func (_RiverRegistryDeploy *RiverRegistryDeploySession) TransferOwnership(newOwner common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.TransferOwnership(&_RiverRegistryDeploy.TransactOpts, newOwner)
}

// TransferOwnership is a paid mutator transaction binding the contract method 0xf2fde38b.
//
// Solidity: function transferOwnership(address newOwner) returns()
func (_RiverRegistryDeploy *RiverRegistryDeployTransactorSession) TransferOwnership(newOwner common.Address) (*types.Transaction, error) {
	return _RiverRegistryDeploy.Contract.TransferOwnership(&_RiverRegistryDeploy.TransactOpts, newOwner)
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
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeAdded is a free log retrieval operation binding the contract event 0x44fbdbcb1bc68a08f60b9d96b19ced4664733ae1a243dd27223dc840b04dbbb3.
//
// Solidity: event NodeAdded(address nodeAddress, string url)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) FilterNodeAdded(opts *bind.FilterOpts) (*RiverRegistryDeployNodeAddedIterator, error) {

	logs, sub, err := _RiverRegistryDeploy.contract.FilterLogs(opts, "NodeAdded")
	if err != nil {
		return nil, err
	}
	return &RiverRegistryDeployNodeAddedIterator{contract: _RiverRegistryDeploy.contract, event: "NodeAdded", logs: logs, sub: sub}, nil
}

// WatchNodeAdded is a free log subscription operation binding the contract event 0x44fbdbcb1bc68a08f60b9d96b19ced4664733ae1a243dd27223dc840b04dbbb3.
//
// Solidity: event NodeAdded(address nodeAddress, string url)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) WatchNodeAdded(opts *bind.WatchOpts, sink chan<- *RiverRegistryDeployNodeAdded) (event.Subscription, error) {

	logs, sub, err := _RiverRegistryDeploy.contract.WatchLogs(opts, "NodeAdded")
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

// ParseNodeAdded is a log parse operation binding the contract event 0x44fbdbcb1bc68a08f60b9d96b19ced4664733ae1a243dd27223dc840b04dbbb3.
//
// Solidity: event NodeAdded(address nodeAddress, string url)
func (_RiverRegistryDeploy *RiverRegistryDeployFilterer) ParseNodeAdded(log types.Log) (*RiverRegistryDeployNodeAdded, error) {
	event := new(RiverRegistryDeployNodeAdded)
	if err := _RiverRegistryDeploy.contract.UnpackLog(event, "NodeAdded", log); err != nil {
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
