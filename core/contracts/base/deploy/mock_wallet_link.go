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
	_	= errors.New
	_	= big.NewInt
	_	= strings.NewReader
	_	= ethereum.NotFound
	_	= bind.Bind
	_	= common.Big1
	_	= types.BloomLookup
	_	= event.NewSubscription
	_	= abi.ConvertType
)

// MockWalletLinkMetaData contains all meta data concerning the MockWalletLink contract.
var MockWalletLinkMetaData = &bind.MetaData{
	ABI:	"[{\"type\":\"function\",\"name\":\"checkIfLinked\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"checkIfNonEVMWalletLinked\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"walletHash\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"explicitWalletsByRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[{\"name\":\"walletData\",\"type\":\"tuple[]\",\"internalType\":\"structIWalletLinkBase.WalletData[]\",\"components\":[{\"name\":\"addr\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"vmType\",\"type\":\"uint8\",\"internalType\":\"enumIWalletLinkBase.VirtualMachineType\"},{\"name\":\"walletType\",\"type\":\"uint8\",\"internalType\":\"uint8\"}]}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getDefaultWallet\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getDependency\",\"inputs\":[{\"name\":\"dependency\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLatestNonceForRootKey\",\"inputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"pure\"},{\"type\":\"function\",\"name\":\"getRootKeyForWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKeyWithDelegations\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"linkCallerToRootKey\",\"inputs\":[{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWalletData\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"linkNonEVMWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.NonEVMLinkedWalletData\",\"components\":[{\"name\":\"addr\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"vmType\",\"type\":\"uint8\",\"internalType\":\"enumIWalletLinkBase.VirtualMachineType\"},{\"name\":\"extraData\",\"type\":\"tuple[]\",\"internalType\":\"structIWalletLinkBase.VMSpecificData[]\",\"components\":[{\"name\":\"key\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]}]},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"linkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWalletData\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWalletData\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeCallerLink\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWalletData\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeNonEVMWalletLink\",\"inputs\":[{\"name\":\"addr\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"vmType\",\"type\":\"uint8\",\"internalType\":\"enumIWalletLinkBase.VirtualMachineType\"},{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setDefaultWallet\",\"inputs\":[{\"name\":\"defaultWallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setDependency\",\"inputs\":[{\"name\":\"dependency\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"dependencyAddress\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"LinkNonEVMWalletToRootWallet\",\"inputs\":[{\"name\":\"walletHash\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"LinkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RemoveLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"secondWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RemoveNonEVMWalletLink\",\"inputs\":[{\"name\":\"walletHash\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"SetDefaultWallet\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"defaultWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"WalletLink__AddressMismatch\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToRootWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveDefaultWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveRootWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__DefaultWalletAlreadySet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidMessage\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidNonEVMAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidVMSpecificData\",\"inputs\":[{\"name\":\"key\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"value\",\"type\":\"bytes\",\"internalType\":\"bytes\"}]},{\"type\":\"error\",\"name\":\"WalletLink__LinkAlreadyExists\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__LinkedToAnotherRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__MaxLinkedWalletsReached\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__NonEVMWalletAlreadyLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__NonEVMWalletNotLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__NotLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__RootKeyMismatch\",\"inputs\":[{\"name\":\"callerRootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__UnsupportedVMType\",\"inputs\":[]}]",
	Bin:	"0x608060405234801561001057600080fd5b506111a3806100206000396000f3fe608060405234801561001057600080fd5b506004361061010b5760003560e01c80633d005eab116100a2578063912b975811610071578063912b9758146102d757806397d9a84914610324578063baafda6b1461037c578063c93ffd2a146103d8578063f8210398146103eb57600080fd5b80633d005eab146101105780634d2bead61461026157806364899d98146102745780637238695e1461027c57600080fd5b8063243a7134116100de578063243a7134146102065780632f4614531461021b57806334912e881461022e57806335d2fb641461024e57600080fd5b806302345b9814610110578063039dd19314610139578063101659b11461019957806320a00ac8146101e4575b600080fd5b61012361011e366004610b1e565b610424565b6040516101309190610b39565b60405180910390f35b610181610147366004610b86565b60009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb0460205260409020546001600160a01b031690565b6040516001600160a01b039091168152602001610130565b6101816101a7366004610b1e565b6001600160a01b0390811660009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb0260205260409020541690565b6101f86101f2366004610b1e565b50600090565b604051908152602001610130565b610219610214366004610cfd565b61045b565b005b610219610229366004610d6a565b6104ce565b61024161023c366004610daf565b61053e565b6040516101309190610e53565b61021961025c366004610ee2565b610657565b61021961026f366004610f37565b6106d5565b610219610769565b61021961028a366004610f8e565b60009182527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb04602052604090912080546001600160a01b0319166001600160a01b03909216919091179055565b6103146102e5366004610fba565b6001600160a01b0390811660009081526000805160206111638339815191526020526040902054811691161490565b6040519015158152602001610130565b610314610332366004610fe4565b6001600160a01b039190911660009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb0360209081526040808320938352929052205460ff1690565b61021961038a366004610b1e565b3360009081527f53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb026020526040902080546001600160a01b0319166001600160a01b0392909216919091179055565b6102196103e636600461100e565b6107e4565b6101816103f9366004610b1e565b6001600160a01b03908116600090815260008051602061116383398151915260205260409020541690565b6001600160a01b03811660009081526000805160206111838339815191526020526040902060609061045590610893565b92915050565b825182516001600160a01b0316600090815260008051602061118383398151915260208190526040909120909161049291906108a7565b50915192516001600160a01b0390811660009081526001909301602052604090922080546001600160a01b031916929093169190911790915550565b81516001600160a01b0316600090815260008051602061118383398151915260208190526040909120339061050390826108a7565b5092516001600160a01b039384166000908152600192909201602052604090912080546001600160a01b031916939091169290921790915550565b6001600160a01b03821660009081526000805160206111838339815191526020819052604082206060929061057290610893565b9050805167ffffffffffffffff81111561058e5761058e610b9f565b6040519080825280602002602001820160405280156105d957816020015b60408051606080820183528152600060208083018290529282015282526000199092019101816105ac5790505b50925060005b815181101561064e5760405180606001604052806106158484815181106106085761060861104a565b60200260200101516108bc565b815260200160018152602001600160ff1681525084828151811061063b5761063b61104a565b60209081029190910101526001016105df565b50505092915050565b33600090815260008051602061116383398151915260209081526040808320546001600160a01b03168084526000805160206111838339815191529283905292209091906106a590866108e0565b50506001600160a01b039093166000908152600190930160205250506040902080546001600160a01b0319169055565b33600090815260008051602061116383398151915260209081526040808320549051600080516020611183833981519152936001600160a01b0390921692610721918891889101611060565b60408051601f1981840301815291815281516020928301206001600160a01b03909416600090815260039095018252808520938552929052509020805460ff19169055505050565b33600081815260008051602061116383398151915260209081526040808320546001600160a01b0316808452600080516020611183833981519152928390529220909291906107b890836108e0565b50506001600160a01b0316600090815260019091016020526040902080546001600160a01b0319169055565b3360009081526000805160206111638339815191526020526040812054600080516020611183833981519152916001600160a01b03909116906108278580611082565b61083760808801606089016110d0565b604051602001610849939291906110eb565b60408051601f1981840301815291815281516020928301206001600160a01b03909416600090815260039095018252808520938552929052509020805460ff191660011790555050565b606060006108a0836108f5565b9392505050565b60006108a0836001600160a01b038416610951565b60606108c7826109a0565b8051613078825260020160011990910190815292915050565b60006108a0836001600160a01b038416610a0f565b60608160000180548060200260200160405190810160405280929190818152602001828054801561094557602002820191906000526020600020905b815481526020019060010190808311610931575b50505050509050919050565b600081815260018301602052604081205461099857508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610455565b506000610455565b60606040519050608081016040526f30313233343536373839616263646566600f526002810190506028815260208101600060288201528260601b925060005b808101820184821a600f81165160018301538060041c51825350506001810190601219016109e0575050919050565b60008181526001830160205260408120548015610af8576000610a3360018361112b565b8554909150600090610a479060019061112b565b9050808214610aac576000866000018281548110610a6757610a6761104a565b9060005260206000200154905080876000018481548110610a8a57610a8a61104a565b6000918252602080832090910192909255918252600188019052604090208390555b8554869080610abd57610abd61114c565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050610455565b6000915050610455565b80356001600160a01b0381168114610b1957600080fd5b919050565b600060208284031215610b3057600080fd5b6108a082610b02565b6020808252825182820181905260009190848201906040850190845b81811015610b7a5783516001600160a01b031683529284019291840191600101610b55565b50909695505050505050565b600060208284031215610b9857600080fd5b5035919050565b634e487b7160e01b600052604160045260246000fd5b600067ffffffffffffffff80841115610bd057610bd0610b9f565b604051601f8501601f19908116603f01168101908282118183101715610bf857610bf8610b9f565b81604052809350858152868686011115610c1157600080fd5b858560208301376000602087830101525050509392505050565b600082601f830112610c3c57600080fd5b6108a083833560208501610bb5565b600060608284031215610c5d57600080fd5b6040516060810167ffffffffffffffff8282108183111715610c8157610c81610b9f565b81604052829350610c9185610b02565b83526020850135915080821115610ca757600080fd5b818501915085601f830112610cbb57600080fd5b610cca86833560208501610bb5565b60208401526040850135915080821115610ce357600080fd5b50610cf085828601610c2b565b6040830152505092915050565b600080600060608486031215610d1257600080fd5b833567ffffffffffffffff80821115610d2a57600080fd5b610d3687838801610c4b565b94506020860135915080821115610d4c57600080fd5b50610d5986828701610c4b565b925050604084013590509250925092565b60008060408385031215610d7d57600080fd5b823567ffffffffffffffff811115610d9457600080fd5b610da085828601610c4b565b95602094909401359450505050565b60008060408385031215610dc257600080fd5b610dcb83610b02565b915060208301358015158114610de057600080fd5b809150509250929050565b6000815180845260005b81811015610e1157602081850181015186830182015201610df5565b506000602082860101526020601f19601f83011685010191505092915050565b60078110610e4f57634e487b7160e01b600052602160045260246000fd5b9052565b600060208083018184528085518083526040925060408601915060408160051b87010184880160005b83811015610ed457603f19898403018552815160608151818652610ea282870182610deb565b91505088820151610eb58a870182610e31565b509087015160ff16938701939093529386019390860190600101610e7c565b509098975050505050505050565b600080600060608486031215610ef757600080fd5b610f0084610b02565b9250602084013567ffffffffffffffff811115610f1c57600080fd5b610d5986828701610c4b565b803560078110610b1957600080fd5b600080600060608486031215610f4c57600080fd5b833567ffffffffffffffff811115610f6357600080fd5b610f6f86828701610c2b565b935050610f7e60208501610f28565b9150604084013590509250925092565b60008060408385031215610fa157600080fd5b82359150610fb160208401610b02565b90509250929050565b60008060408385031215610fcd57600080fd5b610fd683610b02565b9150610fb160208401610b02565b60008060408385031215610ff757600080fd5b61100083610b02565b946020939093013593505050565b6000806040838503121561102157600080fd5b823567ffffffffffffffff81111561103857600080fd5b830160a0818603121561100057600080fd5b634e487b7160e01b600052603260045260246000fd5b6040815260006110736040830185610deb565b90506108a06020830184610e31565b6000808335601e1984360301811261109957600080fd5b83018035915067ffffffffffffffff8211156110b457600080fd5b6020019150368190038213156110c957600080fd5b9250929050565b6000602082840312156110e257600080fd5b6108a082610f28565b604081528260408201528284606083013760006060848301015260006060601f19601f86011683010190506111236020830184610e31565b949350505050565b8181038181111561045557634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052603160045260246000fdfe53bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb0153bdded980027e2c478b287c6d24ce77f39d36276f54116d9f518f7ecd94eb00",
}

// MockWalletLinkABI is the input ABI used to generate the binding from.
// Deprecated: Use MockWalletLinkMetaData.ABI instead.
var MockWalletLinkABI = MockWalletLinkMetaData.ABI

// MockWalletLinkBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockWalletLinkMetaData.Bin instead.
var MockWalletLinkBin = MockWalletLinkMetaData.Bin

// DeployMockWalletLink deploys a new Ethereum contract, binding an instance of MockWalletLink to it.
func DeployMockWalletLink(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *MockWalletLink, error) {
	parsed, err := MockWalletLinkMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockWalletLinkBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockWalletLink{MockWalletLinkCaller: MockWalletLinkCaller{contract: contract}, MockWalletLinkTransactor: MockWalletLinkTransactor{contract: contract}, MockWalletLinkFilterer: MockWalletLinkFilterer{contract: contract}}, nil
}

// MockWalletLink is an auto generated Go binding around an Ethereum contract.
type MockWalletLink struct {
	MockWalletLinkCaller		// Read-only binding to the contract
	MockWalletLinkTransactor	// Write-only binding to the contract
	MockWalletLinkFilterer		// Log filterer for contract events
}

// MockWalletLinkCaller is an auto generated read-only Go binding around an Ethereum contract.
type MockWalletLinkCaller struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// MockWalletLinkTransactor is an auto generated write-only Go binding around an Ethereum contract.
type MockWalletLinkTransactor struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// MockWalletLinkFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockWalletLinkFilterer struct {
	contract *bind.BoundContract	// Generic contract wrapper for the low level calls
}

// MockWalletLinkSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockWalletLinkSession struct {
	Contract	*MockWalletLink		// Generic contract binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
	TransactOpts	bind.TransactOpts	// Transaction auth options to use throughout this session
}

// MockWalletLinkCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockWalletLinkCallerSession struct {
	Contract	*MockWalletLinkCaller	// Generic contract caller binding to set the session for
	CallOpts	bind.CallOpts		// Call options to use throughout this session
}

// MockWalletLinkTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockWalletLinkTransactorSession struct {
	Contract	*MockWalletLinkTransactor	// Generic contract transactor binding to set the session for
	TransactOpts	bind.TransactOpts		// Transaction auth options to use throughout this session
}

// MockWalletLinkRaw is an auto generated low-level Go binding around an Ethereum contract.
type MockWalletLinkRaw struct {
	Contract *MockWalletLink	// Generic contract binding to access the raw methods on
}

// MockWalletLinkCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockWalletLinkCallerRaw struct {
	Contract *MockWalletLinkCaller	// Generic read-only contract binding to access the raw methods on
}

// MockWalletLinkTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockWalletLinkTransactorRaw struct {
	Contract *MockWalletLinkTransactor	// Generic write-only contract binding to access the raw methods on
}

// NewMockWalletLink creates a new instance of MockWalletLink, bound to a specific deployed contract.
func NewMockWalletLink(address common.Address, backend bind.ContractBackend) (*MockWalletLink, error) {
	contract, err := bindMockWalletLink(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockWalletLink{MockWalletLinkCaller: MockWalletLinkCaller{contract: contract}, MockWalletLinkTransactor: MockWalletLinkTransactor{contract: contract}, MockWalletLinkFilterer: MockWalletLinkFilterer{contract: contract}}, nil
}

// NewMockWalletLinkCaller creates a new read-only instance of MockWalletLink, bound to a specific deployed contract.
func NewMockWalletLinkCaller(address common.Address, caller bind.ContractCaller) (*MockWalletLinkCaller, error) {
	contract, err := bindMockWalletLink(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkCaller{contract: contract}, nil
}

// NewMockWalletLinkTransactor creates a new write-only instance of MockWalletLink, bound to a specific deployed contract.
func NewMockWalletLinkTransactor(address common.Address, transactor bind.ContractTransactor) (*MockWalletLinkTransactor, error) {
	contract, err := bindMockWalletLink(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkTransactor{contract: contract}, nil
}

// NewMockWalletLinkFilterer creates a new log filterer instance of MockWalletLink, bound to a specific deployed contract.
func NewMockWalletLinkFilterer(address common.Address, filterer bind.ContractFilterer) (*MockWalletLinkFilterer, error) {
	contract, err := bindMockWalletLink(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkFilterer{contract: contract}, nil
}

// bindMockWalletLink binds a generic wrapper to an already deployed contract.
func bindMockWalletLink(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockWalletLinkMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockWalletLink *MockWalletLinkRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockWalletLink.Contract.MockWalletLinkCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockWalletLink *MockWalletLinkRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockWalletLink.Contract.MockWalletLinkTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockWalletLink *MockWalletLinkRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockWalletLink.Contract.MockWalletLinkTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockWalletLink *MockWalletLinkCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockWalletLink.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockWalletLink *MockWalletLinkTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockWalletLink.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockWalletLink *MockWalletLinkTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockWalletLink.Contract.contract.Transact(opts, method, params...)
}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_MockWalletLink *MockWalletLinkCaller) CheckIfLinked(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "checkIfLinked", rootKey, wallet)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_MockWalletLink *MockWalletLinkSession) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return _MockWalletLink.Contract.CheckIfLinked(&_MockWalletLink.CallOpts, rootKey, wallet)
}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_MockWalletLink *MockWalletLinkCallerSession) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return _MockWalletLink.Contract.CheckIfLinked(&_MockWalletLink.CallOpts, rootKey, wallet)
}

// CheckIfNonEVMWalletLinked is a free data retrieval call binding the contract method 0x97d9a849.
//
// Solidity: function checkIfNonEVMWalletLinked(address rootKey, bytes32 walletHash) view returns(bool)
func (_MockWalletLink *MockWalletLinkCaller) CheckIfNonEVMWalletLinked(opts *bind.CallOpts, rootKey common.Address, walletHash [32]byte) (bool, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "checkIfNonEVMWalletLinked", rootKey, walletHash)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckIfNonEVMWalletLinked is a free data retrieval call binding the contract method 0x97d9a849.
//
// Solidity: function checkIfNonEVMWalletLinked(address rootKey, bytes32 walletHash) view returns(bool)
func (_MockWalletLink *MockWalletLinkSession) CheckIfNonEVMWalletLinked(rootKey common.Address, walletHash [32]byte) (bool, error) {
	return _MockWalletLink.Contract.CheckIfNonEVMWalletLinked(&_MockWalletLink.CallOpts, rootKey, walletHash)
}

// CheckIfNonEVMWalletLinked is a free data retrieval call binding the contract method 0x97d9a849.
//
// Solidity: function checkIfNonEVMWalletLinked(address rootKey, bytes32 walletHash) view returns(bool)
func (_MockWalletLink *MockWalletLinkCallerSession) CheckIfNonEVMWalletLinked(rootKey common.Address, walletHash [32]byte) (bool, error) {
	return _MockWalletLink.Contract.CheckIfNonEVMWalletLinked(&_MockWalletLink.CallOpts, rootKey, walletHash)
}

// ExplicitWalletsByRootKey is a free data retrieval call binding the contract method 0x34912e88.
//
// Solidity: function explicitWalletsByRootKey(address rootKey, bool ) view returns((string,uint8,uint8)[] walletData)
func (_MockWalletLink *MockWalletLinkCaller) ExplicitWalletsByRootKey(opts *bind.CallOpts, rootKey common.Address, arg1 bool) ([]IWalletLinkBaseWalletData, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "explicitWalletsByRootKey", rootKey, arg1)

	if err != nil {
		return *new([]IWalletLinkBaseWalletData), err
	}

	out0 := *abi.ConvertType(out[0], new([]IWalletLinkBaseWalletData)).(*[]IWalletLinkBaseWalletData)

	return out0, err

}

// ExplicitWalletsByRootKey is a free data retrieval call binding the contract method 0x34912e88.
//
// Solidity: function explicitWalletsByRootKey(address rootKey, bool ) view returns((string,uint8,uint8)[] walletData)
func (_MockWalletLink *MockWalletLinkSession) ExplicitWalletsByRootKey(rootKey common.Address, arg1 bool) ([]IWalletLinkBaseWalletData, error) {
	return _MockWalletLink.Contract.ExplicitWalletsByRootKey(&_MockWalletLink.CallOpts, rootKey, arg1)
}

// ExplicitWalletsByRootKey is a free data retrieval call binding the contract method 0x34912e88.
//
// Solidity: function explicitWalletsByRootKey(address rootKey, bool ) view returns((string,uint8,uint8)[] walletData)
func (_MockWalletLink *MockWalletLinkCallerSession) ExplicitWalletsByRootKey(rootKey common.Address, arg1 bool) ([]IWalletLinkBaseWalletData, error) {
	return _MockWalletLink.Contract.ExplicitWalletsByRootKey(&_MockWalletLink.CallOpts, rootKey, arg1)
}

// GetDefaultWallet is a free data retrieval call binding the contract method 0x101659b1.
//
// Solidity: function getDefaultWallet(address rootKey) view returns(address)
func (_MockWalletLink *MockWalletLinkCaller) GetDefaultWallet(opts *bind.CallOpts, rootKey common.Address) (common.Address, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "getDefaultWallet", rootKey)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetDefaultWallet is a free data retrieval call binding the contract method 0x101659b1.
//
// Solidity: function getDefaultWallet(address rootKey) view returns(address)
func (_MockWalletLink *MockWalletLinkSession) GetDefaultWallet(rootKey common.Address) (common.Address, error) {
	return _MockWalletLink.Contract.GetDefaultWallet(&_MockWalletLink.CallOpts, rootKey)
}

// GetDefaultWallet is a free data retrieval call binding the contract method 0x101659b1.
//
// Solidity: function getDefaultWallet(address rootKey) view returns(address)
func (_MockWalletLink *MockWalletLinkCallerSession) GetDefaultWallet(rootKey common.Address) (common.Address, error) {
	return _MockWalletLink.Contract.GetDefaultWallet(&_MockWalletLink.CallOpts, rootKey)
}

// GetDependency is a free data retrieval call binding the contract method 0x039dd193.
//
// Solidity: function getDependency(bytes32 dependency) view returns(address)
func (_MockWalletLink *MockWalletLinkCaller) GetDependency(opts *bind.CallOpts, dependency [32]byte) (common.Address, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "getDependency", dependency)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetDependency is a free data retrieval call binding the contract method 0x039dd193.
//
// Solidity: function getDependency(bytes32 dependency) view returns(address)
func (_MockWalletLink *MockWalletLinkSession) GetDependency(dependency [32]byte) (common.Address, error) {
	return _MockWalletLink.Contract.GetDependency(&_MockWalletLink.CallOpts, dependency)
}

// GetDependency is a free data retrieval call binding the contract method 0x039dd193.
//
// Solidity: function getDependency(bytes32 dependency) view returns(address)
func (_MockWalletLink *MockWalletLinkCallerSession) GetDependency(dependency [32]byte) (common.Address, error) {
	return _MockWalletLink.Contract.GetDependency(&_MockWalletLink.CallOpts, dependency)
}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address ) pure returns(uint256)
func (_MockWalletLink *MockWalletLinkCaller) GetLatestNonceForRootKey(opts *bind.CallOpts, arg0 common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "getLatestNonceForRootKey", arg0)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address ) pure returns(uint256)
func (_MockWalletLink *MockWalletLinkSession) GetLatestNonceForRootKey(arg0 common.Address) (*big.Int, error) {
	return _MockWalletLink.Contract.GetLatestNonceForRootKey(&_MockWalletLink.CallOpts, arg0)
}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address ) pure returns(uint256)
func (_MockWalletLink *MockWalletLinkCallerSession) GetLatestNonceForRootKey(arg0 common.Address) (*big.Int, error) {
	return _MockWalletLink.Contract.GetLatestNonceForRootKey(&_MockWalletLink.CallOpts, arg0)
}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_MockWalletLink *MockWalletLinkCaller) GetRootKeyForWallet(opts *bind.CallOpts, wallet common.Address) (common.Address, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "getRootKeyForWallet", wallet)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_MockWalletLink *MockWalletLinkSession) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return _MockWalletLink.Contract.GetRootKeyForWallet(&_MockWalletLink.CallOpts, wallet)
}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_MockWalletLink *MockWalletLinkCallerSession) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return _MockWalletLink.Contract.GetRootKeyForWallet(&_MockWalletLink.CallOpts, wallet)
}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkCaller) GetWalletsByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "getWalletsByRootKey", rootKey)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkSession) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return _MockWalletLink.Contract.GetWalletsByRootKey(&_MockWalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkCallerSession) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return _MockWalletLink.Contract.GetWalletsByRootKey(&_MockWalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkCaller) GetWalletsByRootKeyWithDelegations(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _MockWalletLink.contract.Call(opts, &out, "getWalletsByRootKeyWithDelegations", rootKey)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkSession) GetWalletsByRootKeyWithDelegations(rootKey common.Address) ([]common.Address, error) {
	return _MockWalletLink.Contract.GetWalletsByRootKeyWithDelegations(&_MockWalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_MockWalletLink *MockWalletLinkCallerSession) GetWalletsByRootKeyWithDelegations(rootKey common.Address) ([]common.Address, error) {
	return _MockWalletLink.Contract.GetWalletsByRootKeyWithDelegations(&_MockWalletLink.CallOpts, rootKey)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactor) LinkCallerToRootKey(opts *bind.TransactOpts, rootWallet IWalletLinkBaseLinkedWalletData, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "linkCallerToRootKey", rootWallet, arg1)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkSession) LinkCallerToRootKey(rootWallet IWalletLinkBaseLinkedWalletData, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkCallerToRootKey(&_MockWalletLink.TransactOpts, rootWallet, arg1)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) LinkCallerToRootKey(rootWallet IWalletLinkBaseLinkedWalletData, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkCallerToRootKey(&_MockWalletLink.TransactOpts, rootWallet, arg1)
}

// LinkNonEVMWalletToRootKey is a paid mutator transaction binding the contract method 0xc93ffd2a.
//
// Solidity: function linkNonEVMWalletToRootKey((string,bytes,string,uint8,(string,bytes)[]) wallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactor) LinkNonEVMWalletToRootKey(opts *bind.TransactOpts, wallet IWalletLinkBaseNonEVMLinkedWalletData, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "linkNonEVMWalletToRootKey", wallet, arg1)
}

// LinkNonEVMWalletToRootKey is a paid mutator transaction binding the contract method 0xc93ffd2a.
//
// Solidity: function linkNonEVMWalletToRootKey((string,bytes,string,uint8,(string,bytes)[]) wallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkSession) LinkNonEVMWalletToRootKey(wallet IWalletLinkBaseNonEVMLinkedWalletData, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkNonEVMWalletToRootKey(&_MockWalletLink.TransactOpts, wallet, arg1)
}

// LinkNonEVMWalletToRootKey is a paid mutator transaction binding the contract method 0xc93ffd2a.
//
// Solidity: function linkNonEVMWalletToRootKey((string,bytes,string,uint8,(string,bytes)[]) wallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) LinkNonEVMWalletToRootKey(wallet IWalletLinkBaseNonEVMLinkedWalletData, arg1 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkNonEVMWalletToRootKey(&_MockWalletLink.TransactOpts, wallet, arg1)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactor) LinkWalletToRootKey(opts *bind.TransactOpts, wallet IWalletLinkBaseLinkedWalletData, rootWallet IWalletLinkBaseLinkedWalletData, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "linkWalletToRootKey", wallet, rootWallet, arg2)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkSession) LinkWalletToRootKey(wallet IWalletLinkBaseLinkedWalletData, rootWallet IWalletLinkBaseLinkedWalletData, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkWalletToRootKey(&_MockWalletLink.TransactOpts, wallet, rootWallet, arg2)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) LinkWalletToRootKey(wallet IWalletLinkBaseLinkedWalletData, rootWallet IWalletLinkBaseLinkedWalletData, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.LinkWalletToRootKey(&_MockWalletLink.TransactOpts, wallet, rootWallet, arg2)
}

// RemoveCallerLink is a paid mutator transaction binding the contract method 0x64899d98.
//
// Solidity: function removeCallerLink() returns()
func (_MockWalletLink *MockWalletLinkTransactor) RemoveCallerLink(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "removeCallerLink")
}

// RemoveCallerLink is a paid mutator transaction binding the contract method 0x64899d98.
//
// Solidity: function removeCallerLink() returns()
func (_MockWalletLink *MockWalletLinkSession) RemoveCallerLink() (*types.Transaction, error) {
	return _MockWalletLink.Contract.RemoveCallerLink(&_MockWalletLink.TransactOpts)
}

// RemoveCallerLink is a paid mutator transaction binding the contract method 0x64899d98.
//
// Solidity: function removeCallerLink() returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) RemoveCallerLink() (*types.Transaction, error) {
	return _MockWalletLink.Contract.RemoveCallerLink(&_MockWalletLink.TransactOpts)
}

// RemoveLink is a paid mutator transaction binding the contract method 0x35d2fb64.
//
// Solidity: function removeLink(address wallet, (address,bytes,string) , uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactor) RemoveLink(opts *bind.TransactOpts, wallet common.Address, arg1 IWalletLinkBaseLinkedWalletData, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "removeLink", wallet, arg1, arg2)
}

// RemoveLink is a paid mutator transaction binding the contract method 0x35d2fb64.
//
// Solidity: function removeLink(address wallet, (address,bytes,string) , uint256 ) returns()
func (_MockWalletLink *MockWalletLinkSession) RemoveLink(wallet common.Address, arg1 IWalletLinkBaseLinkedWalletData, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.RemoveLink(&_MockWalletLink.TransactOpts, wallet, arg1, arg2)
}

// RemoveLink is a paid mutator transaction binding the contract method 0x35d2fb64.
//
// Solidity: function removeLink(address wallet, (address,bytes,string) , uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) RemoveLink(wallet common.Address, arg1 IWalletLinkBaseLinkedWalletData, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.RemoveLink(&_MockWalletLink.TransactOpts, wallet, arg1, arg2)
}

// RemoveNonEVMWalletLink is a paid mutator transaction binding the contract method 0x4d2bead6.
//
// Solidity: function removeNonEVMWalletLink(string addr, uint8 vmType, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactor) RemoveNonEVMWalletLink(opts *bind.TransactOpts, addr string, vmType uint8, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "removeNonEVMWalletLink", addr, vmType, arg2)
}

// RemoveNonEVMWalletLink is a paid mutator transaction binding the contract method 0x4d2bead6.
//
// Solidity: function removeNonEVMWalletLink(string addr, uint8 vmType, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkSession) RemoveNonEVMWalletLink(addr string, vmType uint8, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.RemoveNonEVMWalletLink(&_MockWalletLink.TransactOpts, addr, vmType, arg2)
}

// RemoveNonEVMWalletLink is a paid mutator transaction binding the contract method 0x4d2bead6.
//
// Solidity: function removeNonEVMWalletLink(string addr, uint8 vmType, uint256 ) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) RemoveNonEVMWalletLink(addr string, vmType uint8, arg2 *big.Int) (*types.Transaction, error) {
	return _MockWalletLink.Contract.RemoveNonEVMWalletLink(&_MockWalletLink.TransactOpts, addr, vmType, arg2)
}

// SetDefaultWallet is a paid mutator transaction binding the contract method 0xbaafda6b.
//
// Solidity: function setDefaultWallet(address defaultWallet) returns()
func (_MockWalletLink *MockWalletLinkTransactor) SetDefaultWallet(opts *bind.TransactOpts, defaultWallet common.Address) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "setDefaultWallet", defaultWallet)
}

// SetDefaultWallet is a paid mutator transaction binding the contract method 0xbaafda6b.
//
// Solidity: function setDefaultWallet(address defaultWallet) returns()
func (_MockWalletLink *MockWalletLinkSession) SetDefaultWallet(defaultWallet common.Address) (*types.Transaction, error) {
	return _MockWalletLink.Contract.SetDefaultWallet(&_MockWalletLink.TransactOpts, defaultWallet)
}

// SetDefaultWallet is a paid mutator transaction binding the contract method 0xbaafda6b.
//
// Solidity: function setDefaultWallet(address defaultWallet) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) SetDefaultWallet(defaultWallet common.Address) (*types.Transaction, error) {
	return _MockWalletLink.Contract.SetDefaultWallet(&_MockWalletLink.TransactOpts, defaultWallet)
}

// SetDependency is a paid mutator transaction binding the contract method 0x7238695e.
//
// Solidity: function setDependency(bytes32 dependency, address dependencyAddress) returns()
func (_MockWalletLink *MockWalletLinkTransactor) SetDependency(opts *bind.TransactOpts, dependency [32]byte, dependencyAddress common.Address) (*types.Transaction, error) {
	return _MockWalletLink.contract.Transact(opts, "setDependency", dependency, dependencyAddress)
}

// SetDependency is a paid mutator transaction binding the contract method 0x7238695e.
//
// Solidity: function setDependency(bytes32 dependency, address dependencyAddress) returns()
func (_MockWalletLink *MockWalletLinkSession) SetDependency(dependency [32]byte, dependencyAddress common.Address) (*types.Transaction, error) {
	return _MockWalletLink.Contract.SetDependency(&_MockWalletLink.TransactOpts, dependency, dependencyAddress)
}

// SetDependency is a paid mutator transaction binding the contract method 0x7238695e.
//
// Solidity: function setDependency(bytes32 dependency, address dependencyAddress) returns()
func (_MockWalletLink *MockWalletLinkTransactorSession) SetDependency(dependency [32]byte, dependencyAddress common.Address) (*types.Transaction, error) {
	return _MockWalletLink.Contract.SetDependency(&_MockWalletLink.TransactOpts, dependency, dependencyAddress)
}

// MockWalletLinkLinkNonEVMWalletToRootWalletIterator is returned from FilterLinkNonEVMWalletToRootWallet and is used to iterate over the raw logs and unpacked data for LinkNonEVMWalletToRootWallet events raised by the MockWalletLink contract.
type MockWalletLinkLinkNonEVMWalletToRootWalletIterator struct {
	Event	*MockWalletLinkLinkNonEVMWalletToRootWallet	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockWalletLinkLinkNonEVMWalletToRootWalletIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockWalletLinkLinkNonEVMWalletToRootWallet)
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
		it.Event = new(MockWalletLinkLinkNonEVMWalletToRootWallet)
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
func (it *MockWalletLinkLinkNonEVMWalletToRootWalletIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockWalletLinkLinkNonEVMWalletToRootWalletIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockWalletLinkLinkNonEVMWalletToRootWallet represents a LinkNonEVMWalletToRootWallet event raised by the MockWalletLink contract.
type MockWalletLinkLinkNonEVMWalletToRootWallet struct {
	WalletHash	[32]byte
	RootKey		common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterLinkNonEVMWalletToRootWallet is a free log retrieval operation binding the contract event 0xeb317a93636ebc39c613bf403c3fb4147a957dbf439fb47b4c9cc5c2b372f6bc.
//
// Solidity: event LinkNonEVMWalletToRootWallet(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) FilterLinkNonEVMWalletToRootWallet(opts *bind.FilterOpts, walletHash [][32]byte, rootKey []common.Address) (*MockWalletLinkLinkNonEVMWalletToRootWalletIterator, error) {

	var walletHashRule []interface{}
	for _, walletHashItem := range walletHash {
		walletHashRule = append(walletHashRule, walletHashItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.FilterLogs(opts, "LinkNonEVMWalletToRootWallet", walletHashRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkLinkNonEVMWalletToRootWalletIterator{contract: _MockWalletLink.contract, event: "LinkNonEVMWalletToRootWallet", logs: logs, sub: sub}, nil
}

// WatchLinkNonEVMWalletToRootWallet is a free log subscription operation binding the contract event 0xeb317a93636ebc39c613bf403c3fb4147a957dbf439fb47b4c9cc5c2b372f6bc.
//
// Solidity: event LinkNonEVMWalletToRootWallet(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) WatchLinkNonEVMWalletToRootWallet(opts *bind.WatchOpts, sink chan<- *MockWalletLinkLinkNonEVMWalletToRootWallet, walletHash [][32]byte, rootKey []common.Address) (event.Subscription, error) {

	var walletHashRule []interface{}
	for _, walletHashItem := range walletHash {
		walletHashRule = append(walletHashRule, walletHashItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.WatchLogs(opts, "LinkNonEVMWalletToRootWallet", walletHashRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockWalletLinkLinkNonEVMWalletToRootWallet)
				if err := _MockWalletLink.contract.UnpackLog(event, "LinkNonEVMWalletToRootWallet", log); err != nil {
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

// ParseLinkNonEVMWalletToRootWallet is a log parse operation binding the contract event 0xeb317a93636ebc39c613bf403c3fb4147a957dbf439fb47b4c9cc5c2b372f6bc.
//
// Solidity: event LinkNonEVMWalletToRootWallet(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) ParseLinkNonEVMWalletToRootWallet(log types.Log) (*MockWalletLinkLinkNonEVMWalletToRootWallet, error) {
	event := new(MockWalletLinkLinkNonEVMWalletToRootWallet)
	if err := _MockWalletLink.contract.UnpackLog(event, "LinkNonEVMWalletToRootWallet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockWalletLinkLinkWalletToRootKeyIterator is returned from FilterLinkWalletToRootKey and is used to iterate over the raw logs and unpacked data for LinkWalletToRootKey events raised by the MockWalletLink contract.
type MockWalletLinkLinkWalletToRootKeyIterator struct {
	Event	*MockWalletLinkLinkWalletToRootKey	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockWalletLinkLinkWalletToRootKeyIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockWalletLinkLinkWalletToRootKey)
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
		it.Event = new(MockWalletLinkLinkWalletToRootKey)
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
func (it *MockWalletLinkLinkWalletToRootKeyIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockWalletLinkLinkWalletToRootKeyIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockWalletLinkLinkWalletToRootKey represents a LinkWalletToRootKey event raised by the MockWalletLink contract.
type MockWalletLinkLinkWalletToRootKey struct {
	Wallet	common.Address
	RootKey	common.Address
	Raw	types.Log	// Blockchain specific contextual infos
}

// FilterLinkWalletToRootKey is a free log retrieval operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) FilterLinkWalletToRootKey(opts *bind.FilterOpts, wallet []common.Address, rootKey []common.Address) (*MockWalletLinkLinkWalletToRootKeyIterator, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.FilterLogs(opts, "LinkWalletToRootKey", walletRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkLinkWalletToRootKeyIterator{contract: _MockWalletLink.contract, event: "LinkWalletToRootKey", logs: logs, sub: sub}, nil
}

// WatchLinkWalletToRootKey is a free log subscription operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) WatchLinkWalletToRootKey(opts *bind.WatchOpts, sink chan<- *MockWalletLinkLinkWalletToRootKey, wallet []common.Address, rootKey []common.Address) (event.Subscription, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.WatchLogs(opts, "LinkWalletToRootKey", walletRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockWalletLinkLinkWalletToRootKey)
				if err := _MockWalletLink.contract.UnpackLog(event, "LinkWalletToRootKey", log); err != nil {
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

// ParseLinkWalletToRootKey is a log parse operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) ParseLinkWalletToRootKey(log types.Log) (*MockWalletLinkLinkWalletToRootKey, error) {
	event := new(MockWalletLinkLinkWalletToRootKey)
	if err := _MockWalletLink.contract.UnpackLog(event, "LinkWalletToRootKey", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockWalletLinkRemoveLinkIterator is returned from FilterRemoveLink and is used to iterate over the raw logs and unpacked data for RemoveLink events raised by the MockWalletLink contract.
type MockWalletLinkRemoveLinkIterator struct {
	Event	*MockWalletLinkRemoveLink	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockWalletLinkRemoveLinkIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockWalletLinkRemoveLink)
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
		it.Event = new(MockWalletLinkRemoveLink)
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
func (it *MockWalletLinkRemoveLinkIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockWalletLinkRemoveLinkIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockWalletLinkRemoveLink represents a RemoveLink event raised by the MockWalletLink contract.
type MockWalletLinkRemoveLink struct {
	Wallet		common.Address
	SecondWallet	common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterRemoveLink is a free log retrieval operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_MockWalletLink *MockWalletLinkFilterer) FilterRemoveLink(opts *bind.FilterOpts, wallet []common.Address, secondWallet []common.Address) (*MockWalletLinkRemoveLinkIterator, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var secondWalletRule []interface{}
	for _, secondWalletItem := range secondWallet {
		secondWalletRule = append(secondWalletRule, secondWalletItem)
	}

	logs, sub, err := _MockWalletLink.contract.FilterLogs(opts, "RemoveLink", walletRule, secondWalletRule)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkRemoveLinkIterator{contract: _MockWalletLink.contract, event: "RemoveLink", logs: logs, sub: sub}, nil
}

// WatchRemoveLink is a free log subscription operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_MockWalletLink *MockWalletLinkFilterer) WatchRemoveLink(opts *bind.WatchOpts, sink chan<- *MockWalletLinkRemoveLink, wallet []common.Address, secondWallet []common.Address) (event.Subscription, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var secondWalletRule []interface{}
	for _, secondWalletItem := range secondWallet {
		secondWalletRule = append(secondWalletRule, secondWalletItem)
	}

	logs, sub, err := _MockWalletLink.contract.WatchLogs(opts, "RemoveLink", walletRule, secondWalletRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockWalletLinkRemoveLink)
				if err := _MockWalletLink.contract.UnpackLog(event, "RemoveLink", log); err != nil {
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

// ParseRemoveLink is a log parse operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_MockWalletLink *MockWalletLinkFilterer) ParseRemoveLink(log types.Log) (*MockWalletLinkRemoveLink, error) {
	event := new(MockWalletLinkRemoveLink)
	if err := _MockWalletLink.contract.UnpackLog(event, "RemoveLink", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockWalletLinkRemoveNonEVMWalletLinkIterator is returned from FilterRemoveNonEVMWalletLink and is used to iterate over the raw logs and unpacked data for RemoveNonEVMWalletLink events raised by the MockWalletLink contract.
type MockWalletLinkRemoveNonEVMWalletLinkIterator struct {
	Event	*MockWalletLinkRemoveNonEVMWalletLink	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockWalletLinkRemoveNonEVMWalletLinkIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockWalletLinkRemoveNonEVMWalletLink)
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
		it.Event = new(MockWalletLinkRemoveNonEVMWalletLink)
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
func (it *MockWalletLinkRemoveNonEVMWalletLinkIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockWalletLinkRemoveNonEVMWalletLinkIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockWalletLinkRemoveNonEVMWalletLink represents a RemoveNonEVMWalletLink event raised by the MockWalletLink contract.
type MockWalletLinkRemoveNonEVMWalletLink struct {
	WalletHash	[32]byte
	RootKey		common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterRemoveNonEVMWalletLink is a free log retrieval operation binding the contract event 0xbd9633f1d49d3b0a615e7eba9e46218c1bfc459278b5764c2aeee591b1b1230a.
//
// Solidity: event RemoveNonEVMWalletLink(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) FilterRemoveNonEVMWalletLink(opts *bind.FilterOpts, walletHash [][32]byte, rootKey []common.Address) (*MockWalletLinkRemoveNonEVMWalletLinkIterator, error) {

	var walletHashRule []interface{}
	for _, walletHashItem := range walletHash {
		walletHashRule = append(walletHashRule, walletHashItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.FilterLogs(opts, "RemoveNonEVMWalletLink", walletHashRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkRemoveNonEVMWalletLinkIterator{contract: _MockWalletLink.contract, event: "RemoveNonEVMWalletLink", logs: logs, sub: sub}, nil
}

// WatchRemoveNonEVMWalletLink is a free log subscription operation binding the contract event 0xbd9633f1d49d3b0a615e7eba9e46218c1bfc459278b5764c2aeee591b1b1230a.
//
// Solidity: event RemoveNonEVMWalletLink(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) WatchRemoveNonEVMWalletLink(opts *bind.WatchOpts, sink chan<- *MockWalletLinkRemoveNonEVMWalletLink, walletHash [][32]byte, rootKey []common.Address) (event.Subscription, error) {

	var walletHashRule []interface{}
	for _, walletHashItem := range walletHash {
		walletHashRule = append(walletHashRule, walletHashItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _MockWalletLink.contract.WatchLogs(opts, "RemoveNonEVMWalletLink", walletHashRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockWalletLinkRemoveNonEVMWalletLink)
				if err := _MockWalletLink.contract.UnpackLog(event, "RemoveNonEVMWalletLink", log); err != nil {
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

// ParseRemoveNonEVMWalletLink is a log parse operation binding the contract event 0xbd9633f1d49d3b0a615e7eba9e46218c1bfc459278b5764c2aeee591b1b1230a.
//
// Solidity: event RemoveNonEVMWalletLink(bytes32 indexed walletHash, address indexed rootKey)
func (_MockWalletLink *MockWalletLinkFilterer) ParseRemoveNonEVMWalletLink(log types.Log) (*MockWalletLinkRemoveNonEVMWalletLink, error) {
	event := new(MockWalletLinkRemoveNonEVMWalletLink)
	if err := _MockWalletLink.contract.UnpackLog(event, "RemoveNonEVMWalletLink", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockWalletLinkSetDefaultWalletIterator is returned from FilterSetDefaultWallet and is used to iterate over the raw logs and unpacked data for SetDefaultWallet events raised by the MockWalletLink contract.
type MockWalletLinkSetDefaultWalletIterator struct {
	Event	*MockWalletLinkSetDefaultWallet	// Event containing the contract specifics and raw log

	contract	*bind.BoundContract	// Generic contract to use for unpacking event data
	event		string			// Event name to use for unpacking event data

	logs	chan types.Log		// Log channel receiving the found contract events
	sub	ethereum.Subscription	// Subscription for errors, completion and termination
	done	bool			// Whether the subscription completed delivering logs
	fail	error			// Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *MockWalletLinkSetDefaultWalletIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockWalletLinkSetDefaultWallet)
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
		it.Event = new(MockWalletLinkSetDefaultWallet)
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
func (it *MockWalletLinkSetDefaultWalletIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockWalletLinkSetDefaultWalletIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockWalletLinkSetDefaultWallet represents a SetDefaultWallet event raised by the MockWalletLink contract.
type MockWalletLinkSetDefaultWallet struct {
	RootKey		common.Address
	DefaultWallet	common.Address
	Raw		types.Log	// Blockchain specific contextual infos
}

// FilterSetDefaultWallet is a free log retrieval operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_MockWalletLink *MockWalletLinkFilterer) FilterSetDefaultWallet(opts *bind.FilterOpts, rootKey []common.Address, defaultWallet []common.Address) (*MockWalletLinkSetDefaultWalletIterator, error) {

	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}
	var defaultWalletRule []interface{}
	for _, defaultWalletItem := range defaultWallet {
		defaultWalletRule = append(defaultWalletRule, defaultWalletItem)
	}

	logs, sub, err := _MockWalletLink.contract.FilterLogs(opts, "SetDefaultWallet", rootKeyRule, defaultWalletRule)
	if err != nil {
		return nil, err
	}
	return &MockWalletLinkSetDefaultWalletIterator{contract: _MockWalletLink.contract, event: "SetDefaultWallet", logs: logs, sub: sub}, nil
}

// WatchSetDefaultWallet is a free log subscription operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_MockWalletLink *MockWalletLinkFilterer) WatchSetDefaultWallet(opts *bind.WatchOpts, sink chan<- *MockWalletLinkSetDefaultWallet, rootKey []common.Address, defaultWallet []common.Address) (event.Subscription, error) {

	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}
	var defaultWalletRule []interface{}
	for _, defaultWalletItem := range defaultWallet {
		defaultWalletRule = append(defaultWalletRule, defaultWalletItem)
	}

	logs, sub, err := _MockWalletLink.contract.WatchLogs(opts, "SetDefaultWallet", rootKeyRule, defaultWalletRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockWalletLinkSetDefaultWallet)
				if err := _MockWalletLink.contract.UnpackLog(event, "SetDefaultWallet", log); err != nil {
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

// ParseSetDefaultWallet is a log parse operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_MockWalletLink *MockWalletLinkFilterer) ParseSetDefaultWallet(log types.Log) (*MockWalletLinkSetDefaultWallet, error) {
	event := new(MockWalletLinkSetDefaultWallet)
	if err := _MockWalletLink.contract.UnpackLog(event, "SetDefaultWallet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
