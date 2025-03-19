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

// MockErc721MetaData contains all meta data concerning the MockErc721 contract.
var MockErc721MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approve\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"balanceOf\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"burn\",\"inputs\":[{\"name\":\"token\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getApproved\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isApprovedForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"mint\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"mintTo\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"ownerOf\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"safeTransferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"safeTransferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setApprovalForAll\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"supportsInterface\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"symbol\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"tokenId\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"tokenURI\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"transferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ERC721IncorrectOwner\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InsufficientApproval\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidApprover\",\"inputs\":[{\"name\":\"approver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidOwner\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidReceiver\",\"inputs\":[{\"name\":\"receiver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidSender\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721NonexistentToken\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}]",
	Bin: "0x608060405234801561000f575f5ffd5b5060405180604001604052806005815260200164135e53919560da1b815250604051806040016040528060048152602001631353919560e21b815250815f90816100599190610106565b5060016100668282610106565b5050506101c0565b634e487b7160e01b5f52604160045260245ffd5b600181811c9082168061009657607f821691505b6020821081036100b457634e487b7160e01b5f52602260045260245ffd5b50919050565b601f82111561010157805f5260205f20601f840160051c810160208510156100df5750805b601f840160051c820191505b818110156100fe575f81556001016100eb565b50505b505050565b81516001600160401b0381111561011f5761011f61006e565b6101338161012d8454610082565b846100ba565b6020601f821160018114610165575f831561014e5750848201515b5f19600385901b1c1916600184901b1784556100fe565b5f84815260208120601f198516915b828110156101945787850151825560209485019460019092019101610174565b50848210156101b157868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b611633806101cd5f395ff3fe608060405234801561000f575f5ffd5b5060043610610115575f3560e01c806342966c68116100ad57806395d89b411161007d578063b88d4fde11610063578063b88d4fde1461025a578063c87b56dd1461026d578063e985e9c514610280575f5ffd5b806395d89b411461023f578063a22cb46514610247575f5ffd5b806342966c68146101f35780636352211e1461020657806370a0823114610219578063755edd171461022c575f5ffd5b806317d70f7c116100e857806317d70f7c146101a357806323b872dd146101ba57806340c10f19146101cd57806342842e0e146101e0575f5ffd5b806301ffc9a71461011957806306fdde0314610141578063081812fc14610156578063095ea7b31461018e575b5f5ffd5b61012c610127366004611202565b6102c8565b60405190151581526020015b60405180910390f35b6101496103ac565b6040516101389190611269565b61016961016436600461127b565b61043b565b60405173ffffffffffffffffffffffffffffffffffffffff9091168152602001610138565b6101a161019c3660046112ba565b61046f565b005b6101ac60065481565b604051908152602001610138565b6101a16101c83660046112e2565b61047e565b6101a16101db3660046112ba565b610572565b6101a16101ee3660046112e2565b6105a9565b6101a161020136600461127b565b6105c3565b61016961021436600461127b565b6105cf565b6101ac61022736600461131c565b6105d9565b6101ac61023a36600461131c565b610651565b61014961067a565b6101a1610255366004611335565b610689565b6101a161026836600461139b565b610694565b61014961027b36600461127b565b6106ac565b61012c61028e3660046114b5565b73ffffffffffffffffffffffffffffffffffffffff9182165f90815260056020908152604080832093909416825291909152205460ff1690565b5f7fffffffff0000000000000000000000000000000000000000000000000000000082167f80ac58cd00000000000000000000000000000000000000000000000000000000148061035a57507fffffffff0000000000000000000000000000000000000000000000000000000082167f5b5e139f00000000000000000000000000000000000000000000000000000000145b806103a657507f01ffc9a7000000000000000000000000000000000000000000000000000000007fffffffff000000000000000000000000000000000000000000000000000000008316145b92915050565b60605f80546103ba906114e6565b80601f01602080910402602001604051908101604052809291908181526020018280546103e6906114e6565b80156104315780601f1061040857610100808354040283529160200191610431565b820191905f5260205f20905b81548152906001019060200180831161041457829003601f168201915b5050505050905090565b5f6104458261071d565b505f8281526004602052604090205473ffffffffffffffffffffffffffffffffffffffff166103a6565b61047a82823361077b565b5050565b73ffffffffffffffffffffffffffffffffffffffff82166104d2576040517f64a0ae920000000000000000000000000000000000000000000000000000000081525f60048201526024015b60405180910390fd5b5f6104de838333610788565b90508373ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff161461056c576040517f64283d7b00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff808616600483015260248201849052821660448201526064016104c9565b50505050565b5f5b818110156105a457610588836006546108ff565b60068054905f61059783611537565b9091555050600101610574565b505050565b6105a483838360405180602001604052805f815250610694565b6105cc816109ac565b50565b5f6103a68261071d565b5f73ffffffffffffffffffffffffffffffffffffffff8216610629576040517f89c62b640000000000000000000000000000000000000000000000000000000081525f60048201526024016104c9565b5073ffffffffffffffffffffffffffffffffffffffff165f9081526003602052604090205490565b600680545f918261066183611537565b9190505550610672826006546108ff565b505060065490565b6060600180546103ba906114e6565b61047a338383610a0a565b61069f84848461047e565b61056c3385858585610b06565b60606106b78261071d565b505f6106cd60408051602081019091525f815290565b90505f8151116106eb5760405180602001604052805f815250610716565b806106f584610cfc565b6040516020016107069291906115aa565b6040516020818303038152906040525b9392505050565b5f8181526002602052604081205473ffffffffffffffffffffffffffffffffffffffff16806103a6576040517f7e273289000000000000000000000000000000000000000000000000000000008152600481018490526024016104c9565b6105a48383836001610db8565b5f8281526002602052604081205473ffffffffffffffffffffffffffffffffffffffff908116908316156107c1576107c1818486610f80565b73ffffffffffffffffffffffffffffffffffffffff811615610834576107e95f855f5f610db8565b73ffffffffffffffffffffffffffffffffffffffff81165f90815260036020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0190555b73ffffffffffffffffffffffffffffffffffffffff85161561087c5773ffffffffffffffffffffffffffffffffffffffff85165f908152600360205260409020805460010190555b5f8481526002602052604080822080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff89811691821790925591518793918516917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef91a4949350505050565b73ffffffffffffffffffffffffffffffffffffffff821661094e576040517f64a0ae920000000000000000000000000000000000000000000000000000000081525f60048201526024016104c9565b5f61095a83835f610788565b905073ffffffffffffffffffffffffffffffffffffffff8116156105a4576040517f73c6ac6e0000000000000000000000000000000000000000000000000000000081525f60048201526024016104c9565b5f6109b85f835f610788565b905073ffffffffffffffffffffffffffffffffffffffff811661047a576040517f7e273289000000000000000000000000000000000000000000000000000000008152600481018390526024016104c9565b73ffffffffffffffffffffffffffffffffffffffff8216610a6f576040517f5b08ba1800000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff831660048201526024016104c9565b73ffffffffffffffffffffffffffffffffffffffff8381165f8181526005602090815260408083209487168084529482529182902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b73ffffffffffffffffffffffffffffffffffffffff83163b15610cf5576040517f150b7a0200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff84169063150b7a0290610b7b9088908890879087906004016115be565b6020604051808303815f875af1925050508015610bd3575060408051601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201909252610bd091810190611618565b60015b610c60573d808015610c00576040519150601f19603f3d011682016040523d82523d5f602084013e610c05565b606091505b5080515f03610c58576040517f64a0ae9200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff851660048201526024016104c9565b805181602001fd5b7fffffffff0000000000000000000000000000000000000000000000000000000081167f150b7a020000000000000000000000000000000000000000000000000000000014610cf3576040517f64a0ae9200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff851660048201526024016104c9565b505b5050505050565b60605f610d0883611030565b60010190505f8167ffffffffffffffff811115610d2757610d2761136e565b6040519080825280601f01601f191660200182016040528015610d51576020820181803683370190505b5090508181016020015b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff017f3031323334353637383961626364656600000000000000000000000000000000600a86061a8153600a8504945084610d5b57509392505050565b8080610dd9575073ffffffffffffffffffffffffffffffffffffffff821615155b15610f2c575f610de88461071d565b905073ffffffffffffffffffffffffffffffffffffffff831615801590610e3b57508273ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614155b8015610e79575073ffffffffffffffffffffffffffffffffffffffff8082165f9081526005602090815260408083209387168352929052205460ff16155b15610ec8576040517fa9fbf51f00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff841660048201526024016104c9565b8115610f2a57838573ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560405160405180910390a45b505b50505f90815260046020526040902080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b610f8b838383611111565b6105a45773ffffffffffffffffffffffffffffffffffffffff8316610fdf576040517f7e273289000000000000000000000000000000000000000000000000000000008152600481018290526024016104c9565b6040517f177e802f00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff83166004820152602481018290526044016104c9565b5f807a184f03e93ff9f4daa797ed6e38ed64bf6a1f0100000000000000008310611078577a184f03e93ff9f4daa797ed6e38ed64bf6a1f010000000000000000830492506040015b6d04ee2d6d415b85acef810000000083106110a4576d04ee2d6d415b85acef8100000000830492506020015b662386f26fc1000083106110c257662386f26fc10000830492506010015b6305f5e10083106110da576305f5e100830492506008015b61271083106110ee57612710830492506004015b60648310611100576064830492506002015b600a83106103a65760010192915050565b5f73ffffffffffffffffffffffffffffffffffffffff8316158015906111cd57508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff16148061119d575073ffffffffffffffffffffffffffffffffffffffff8085165f9081526005602090815260408083209387168352929052205460ff165b806111cd57505f8281526004602052604090205473ffffffffffffffffffffffffffffffffffffffff8481169116145b949350505050565b7fffffffff00000000000000000000000000000000000000000000000000000000811681146105cc575f5ffd5b5f60208284031215611212575f5ffd5b8135610716816111d5565b5f81518084528060208401602086015e5f6020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b602081525f610716602083018461121d565b5f6020828403121561128b575f5ffd5b5035919050565b803573ffffffffffffffffffffffffffffffffffffffff811681146112b5575f5ffd5b919050565b5f5f604083850312156112cb575f5ffd5b6112d483611292565b946020939093013593505050565b5f5f5f606084860312156112f4575f5ffd5b6112fd84611292565b925061130b60208501611292565b929592945050506040919091013590565b5f6020828403121561132c575f5ffd5b61071682611292565b5f5f60408385031215611346575f5ffd5b61134f83611292565b915060208301358015158114611363575f5ffd5b809150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b5f5f5f5f608085870312156113ae575f5ffd5b6113b785611292565b93506113c560208601611292565b925060408501359150606085013567ffffffffffffffff8111156113e7575f5ffd5b8501601f810187136113f7575f5ffd5b803567ffffffffffffffff8111156114115761141161136e565b6040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0603f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f8501160116810181811067ffffffffffffffff8211171561147d5761147d61136e565b604052818152828201602001891015611494575f5ffd5b816020840160208301375f6020838301015280935050505092959194509250565b5f5f604083850312156114c6575f5ffd5b6114cf83611292565b91506114dd60208401611292565b90509250929050565b600181811c908216806114fa57607f821691505b602082108103611531577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b50919050565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361158c577f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5060010190565b5f81518060208401855e5f93019283525090919050565b5f6111cd6115b88386611593565b84611593565b73ffffffffffffffffffffffffffffffffffffffff8516815273ffffffffffffffffffffffffffffffffffffffff84166020820152826040820152608060608201525f61160e608083018461121d565b9695505050505050565b5f60208284031215611628575f5ffd5b8151610716816111d556",
}

// MockErc721ABI is the input ABI used to generate the binding from.
// Deprecated: Use MockErc721MetaData.ABI instead.
var MockErc721ABI = MockErc721MetaData.ABI

// MockErc721Bin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockErc721MetaData.Bin instead.
var MockErc721Bin = MockErc721MetaData.Bin

// DeployMockErc721 deploys a new Ethereum contract, binding an instance of MockErc721 to it.
func DeployMockErc721(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *MockErc721, error) {
	parsed, err := MockErc721MetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockErc721Bin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockErc721{MockErc721Caller: MockErc721Caller{contract: contract}, MockErc721Transactor: MockErc721Transactor{contract: contract}, MockErc721Filterer: MockErc721Filterer{contract: contract}}, nil
}

// MockErc721 is an auto generated Go binding around an Ethereum contract.
type MockErc721 struct {
	MockErc721Caller     // Read-only binding to the contract
	MockErc721Transactor // Write-only binding to the contract
	MockErc721Filterer   // Log filterer for contract events
}

// MockErc721Caller is an auto generated read-only Go binding around an Ethereum contract.
type MockErc721Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc721Transactor is an auto generated write-only Go binding around an Ethereum contract.
type MockErc721Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc721Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockErc721Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc721Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockErc721Session struct {
	Contract     *MockErc721       // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// MockErc721CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockErc721CallerSession struct {
	Contract *MockErc721Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts     // Call options to use throughout this session
}

// MockErc721TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockErc721TransactorSession struct {
	Contract     *MockErc721Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// MockErc721Raw is an auto generated low-level Go binding around an Ethereum contract.
type MockErc721Raw struct {
	Contract *MockErc721 // Generic contract binding to access the raw methods on
}

// MockErc721CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockErc721CallerRaw struct {
	Contract *MockErc721Caller // Generic read-only contract binding to access the raw methods on
}

// MockErc721TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockErc721TransactorRaw struct {
	Contract *MockErc721Transactor // Generic write-only contract binding to access the raw methods on
}

// NewMockErc721 creates a new instance of MockErc721, bound to a specific deployed contract.
func NewMockErc721(address common.Address, backend bind.ContractBackend) (*MockErc721, error) {
	contract, err := bindMockErc721(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockErc721{MockErc721Caller: MockErc721Caller{contract: contract}, MockErc721Transactor: MockErc721Transactor{contract: contract}, MockErc721Filterer: MockErc721Filterer{contract: contract}}, nil
}

// NewMockErc721Caller creates a new read-only instance of MockErc721, bound to a specific deployed contract.
func NewMockErc721Caller(address common.Address, caller bind.ContractCaller) (*MockErc721Caller, error) {
	contract, err := bindMockErc721(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockErc721Caller{contract: contract}, nil
}

// NewMockErc721Transactor creates a new write-only instance of MockErc721, bound to a specific deployed contract.
func NewMockErc721Transactor(address common.Address, transactor bind.ContractTransactor) (*MockErc721Transactor, error) {
	contract, err := bindMockErc721(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockErc721Transactor{contract: contract}, nil
}

// NewMockErc721Filterer creates a new log filterer instance of MockErc721, bound to a specific deployed contract.
func NewMockErc721Filterer(address common.Address, filterer bind.ContractFilterer) (*MockErc721Filterer, error) {
	contract, err := bindMockErc721(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockErc721Filterer{contract: contract}, nil
}

// bindMockErc721 binds a generic wrapper to an already deployed contract.
func bindMockErc721(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockErc721MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockErc721 *MockErc721Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockErc721.Contract.MockErc721Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockErc721 *MockErc721Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc721.Contract.MockErc721Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockErc721 *MockErc721Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockErc721.Contract.MockErc721Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockErc721 *MockErc721CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockErc721.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockErc721 *MockErc721TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc721.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockErc721 *MockErc721TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockErc721.Contract.contract.Transact(opts, method, params...)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address owner) view returns(uint256)
func (_MockErc721 *MockErc721Caller) BalanceOf(opts *bind.CallOpts, owner common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "balanceOf", owner)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address owner) view returns(uint256)
func (_MockErc721 *MockErc721Session) BalanceOf(owner common.Address) (*big.Int, error) {
	return _MockErc721.Contract.BalanceOf(&_MockErc721.CallOpts, owner)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address owner) view returns(uint256)
func (_MockErc721 *MockErc721CallerSession) BalanceOf(owner common.Address) (*big.Int, error) {
	return _MockErc721.Contract.BalanceOf(&_MockErc721.CallOpts, owner)
}

// GetApproved is a free data retrieval call binding the contract method 0x081812fc.
//
// Solidity: function getApproved(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721Caller) GetApproved(opts *bind.CallOpts, tokenId *big.Int) (common.Address, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "getApproved", tokenId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetApproved is a free data retrieval call binding the contract method 0x081812fc.
//
// Solidity: function getApproved(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721Session) GetApproved(tokenId *big.Int) (common.Address, error) {
	return _MockErc721.Contract.GetApproved(&_MockErc721.CallOpts, tokenId)
}

// GetApproved is a free data retrieval call binding the contract method 0x081812fc.
//
// Solidity: function getApproved(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721CallerSession) GetApproved(tokenId *big.Int) (common.Address, error) {
	return _MockErc721.Contract.GetApproved(&_MockErc721.CallOpts, tokenId)
}

// IsApprovedForAll is a free data retrieval call binding the contract method 0xe985e9c5.
//
// Solidity: function isApprovedForAll(address owner, address operator) view returns(bool)
func (_MockErc721 *MockErc721Caller) IsApprovedForAll(opts *bind.CallOpts, owner common.Address, operator common.Address) (bool, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "isApprovedForAll", owner, operator)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsApprovedForAll is a free data retrieval call binding the contract method 0xe985e9c5.
//
// Solidity: function isApprovedForAll(address owner, address operator) view returns(bool)
func (_MockErc721 *MockErc721Session) IsApprovedForAll(owner common.Address, operator common.Address) (bool, error) {
	return _MockErc721.Contract.IsApprovedForAll(&_MockErc721.CallOpts, owner, operator)
}

// IsApprovedForAll is a free data retrieval call binding the contract method 0xe985e9c5.
//
// Solidity: function isApprovedForAll(address owner, address operator) view returns(bool)
func (_MockErc721 *MockErc721CallerSession) IsApprovedForAll(owner common.Address, operator common.Address) (bool, error) {
	return _MockErc721.Contract.IsApprovedForAll(&_MockErc721.CallOpts, owner, operator)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc721 *MockErc721Caller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc721 *MockErc721Session) Name() (string, error) {
	return _MockErc721.Contract.Name(&_MockErc721.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc721 *MockErc721CallerSession) Name() (string, error) {
	return _MockErc721.Contract.Name(&_MockErc721.CallOpts)
}

// OwnerOf is a free data retrieval call binding the contract method 0x6352211e.
//
// Solidity: function ownerOf(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721Caller) OwnerOf(opts *bind.CallOpts, tokenId *big.Int) (common.Address, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "ownerOf", tokenId)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// OwnerOf is a free data retrieval call binding the contract method 0x6352211e.
//
// Solidity: function ownerOf(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721Session) OwnerOf(tokenId *big.Int) (common.Address, error) {
	return _MockErc721.Contract.OwnerOf(&_MockErc721.CallOpts, tokenId)
}

// OwnerOf is a free data retrieval call binding the contract method 0x6352211e.
//
// Solidity: function ownerOf(uint256 tokenId) view returns(address)
func (_MockErc721 *MockErc721CallerSession) OwnerOf(tokenId *big.Int) (common.Address, error) {
	return _MockErc721.Contract.OwnerOf(&_MockErc721.CallOpts, tokenId)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc721 *MockErc721Caller) SupportsInterface(opts *bind.CallOpts, interfaceId [4]byte) (bool, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "supportsInterface", interfaceId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc721 *MockErc721Session) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockErc721.Contract.SupportsInterface(&_MockErc721.CallOpts, interfaceId)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc721 *MockErc721CallerSession) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockErc721.Contract.SupportsInterface(&_MockErc721.CallOpts, interfaceId)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc721 *MockErc721Caller) Symbol(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "symbol")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc721 *MockErc721Session) Symbol() (string, error) {
	return _MockErc721.Contract.Symbol(&_MockErc721.CallOpts)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc721 *MockErc721CallerSession) Symbol() (string, error) {
	return _MockErc721.Contract.Symbol(&_MockErc721.CallOpts)
}

// TokenId is a free data retrieval call binding the contract method 0x17d70f7c.
//
// Solidity: function tokenId() view returns(uint256)
func (_MockErc721 *MockErc721Caller) TokenId(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "tokenId")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TokenId is a free data retrieval call binding the contract method 0x17d70f7c.
//
// Solidity: function tokenId() view returns(uint256)
func (_MockErc721 *MockErc721Session) TokenId() (*big.Int, error) {
	return _MockErc721.Contract.TokenId(&_MockErc721.CallOpts)
}

// TokenId is a free data retrieval call binding the contract method 0x17d70f7c.
//
// Solidity: function tokenId() view returns(uint256)
func (_MockErc721 *MockErc721CallerSession) TokenId() (*big.Int, error) {
	return _MockErc721.Contract.TokenId(&_MockErc721.CallOpts)
}

// TokenURI is a free data retrieval call binding the contract method 0xc87b56dd.
//
// Solidity: function tokenURI(uint256 tokenId) view returns(string)
func (_MockErc721 *MockErc721Caller) TokenURI(opts *bind.CallOpts, tokenId *big.Int) (string, error) {
	var out []interface{}
	err := _MockErc721.contract.Call(opts, &out, "tokenURI", tokenId)

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// TokenURI is a free data retrieval call binding the contract method 0xc87b56dd.
//
// Solidity: function tokenURI(uint256 tokenId) view returns(string)
func (_MockErc721 *MockErc721Session) TokenURI(tokenId *big.Int) (string, error) {
	return _MockErc721.Contract.TokenURI(&_MockErc721.CallOpts, tokenId)
}

// TokenURI is a free data retrieval call binding the contract method 0xc87b56dd.
//
// Solidity: function tokenURI(uint256 tokenId) view returns(string)
func (_MockErc721 *MockErc721CallerSession) TokenURI(tokenId *big.Int) (string, error) {
	return _MockErc721.Contract.TokenURI(&_MockErc721.CallOpts, tokenId)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Transactor) Approve(opts *bind.TransactOpts, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "approve", to, tokenId)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Session) Approve(to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Approve(&_MockErc721.TransactOpts, to, tokenId)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721TransactorSession) Approve(to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Approve(&_MockErc721.TransactOpts, to, tokenId)
}

// Burn is a paid mutator transaction binding the contract method 0x42966c68.
//
// Solidity: function burn(uint256 token) returns()
func (_MockErc721 *MockErc721Transactor) Burn(opts *bind.TransactOpts, token *big.Int) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "burn", token)
}

// Burn is a paid mutator transaction binding the contract method 0x42966c68.
//
// Solidity: function burn(uint256 token) returns()
func (_MockErc721 *MockErc721Session) Burn(token *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Burn(&_MockErc721.TransactOpts, token)
}

// Burn is a paid mutator transaction binding the contract method 0x42966c68.
//
// Solidity: function burn(uint256 token) returns()
func (_MockErc721 *MockErc721TransactorSession) Burn(token *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Burn(&_MockErc721.TransactOpts, token)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address to, uint256 amount) returns()
func (_MockErc721 *MockErc721Transactor) Mint(opts *bind.TransactOpts, to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "mint", to, amount)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address to, uint256 amount) returns()
func (_MockErc721 *MockErc721Session) Mint(to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Mint(&_MockErc721.TransactOpts, to, amount)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address to, uint256 amount) returns()
func (_MockErc721 *MockErc721TransactorSession) Mint(to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.Mint(&_MockErc721.TransactOpts, to, amount)
}

// MintTo is a paid mutator transaction binding the contract method 0x755edd17.
//
// Solidity: function mintTo(address to) returns(uint256)
func (_MockErc721 *MockErc721Transactor) MintTo(opts *bind.TransactOpts, to common.Address) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "mintTo", to)
}

// MintTo is a paid mutator transaction binding the contract method 0x755edd17.
//
// Solidity: function mintTo(address to) returns(uint256)
func (_MockErc721 *MockErc721Session) MintTo(to common.Address) (*types.Transaction, error) {
	return _MockErc721.Contract.MintTo(&_MockErc721.TransactOpts, to)
}

// MintTo is a paid mutator transaction binding the contract method 0x755edd17.
//
// Solidity: function mintTo(address to) returns(uint256)
func (_MockErc721 *MockErc721TransactorSession) MintTo(to common.Address) (*types.Transaction, error) {
	return _MockErc721.Contract.MintTo(&_MockErc721.TransactOpts, to)
}

// SafeTransferFrom is a paid mutator transaction binding the contract method 0x42842e0e.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Transactor) SafeTransferFrom(opts *bind.TransactOpts, from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "safeTransferFrom", from, to, tokenId)
}

// SafeTransferFrom is a paid mutator transaction binding the contract method 0x42842e0e.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Session) SafeTransferFrom(from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.SafeTransferFrom(&_MockErc721.TransactOpts, from, to, tokenId)
}

// SafeTransferFrom is a paid mutator transaction binding the contract method 0x42842e0e.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721TransactorSession) SafeTransferFrom(from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.SafeTransferFrom(&_MockErc721.TransactOpts, from, to, tokenId)
}

// SafeTransferFrom0 is a paid mutator transaction binding the contract method 0xb88d4fde.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) returns()
func (_MockErc721 *MockErc721Transactor) SafeTransferFrom0(opts *bind.TransactOpts, from common.Address, to common.Address, tokenId *big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "safeTransferFrom0", from, to, tokenId, data)
}

// SafeTransferFrom0 is a paid mutator transaction binding the contract method 0xb88d4fde.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) returns()
func (_MockErc721 *MockErc721Session) SafeTransferFrom0(from common.Address, to common.Address, tokenId *big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc721.Contract.SafeTransferFrom0(&_MockErc721.TransactOpts, from, to, tokenId, data)
}

// SafeTransferFrom0 is a paid mutator transaction binding the contract method 0xb88d4fde.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) returns()
func (_MockErc721 *MockErc721TransactorSession) SafeTransferFrom0(from common.Address, to common.Address, tokenId *big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc721.Contract.SafeTransferFrom0(&_MockErc721.TransactOpts, from, to, tokenId, data)
}

// SetApprovalForAll is a paid mutator transaction binding the contract method 0xa22cb465.
//
// Solidity: function setApprovalForAll(address operator, bool approved) returns()
func (_MockErc721 *MockErc721Transactor) SetApprovalForAll(opts *bind.TransactOpts, operator common.Address, approved bool) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "setApprovalForAll", operator, approved)
}

// SetApprovalForAll is a paid mutator transaction binding the contract method 0xa22cb465.
//
// Solidity: function setApprovalForAll(address operator, bool approved) returns()
func (_MockErc721 *MockErc721Session) SetApprovalForAll(operator common.Address, approved bool) (*types.Transaction, error) {
	return _MockErc721.Contract.SetApprovalForAll(&_MockErc721.TransactOpts, operator, approved)
}

// SetApprovalForAll is a paid mutator transaction binding the contract method 0xa22cb465.
//
// Solidity: function setApprovalForAll(address operator, bool approved) returns()
func (_MockErc721 *MockErc721TransactorSession) SetApprovalForAll(operator common.Address, approved bool) (*types.Transaction, error) {
	return _MockErc721.Contract.SetApprovalForAll(&_MockErc721.TransactOpts, operator, approved)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Transactor) TransferFrom(opts *bind.TransactOpts, from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "transferFrom", from, to, tokenId)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721Session) TransferFrom(from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.TransferFrom(&_MockErc721.TransactOpts, from, to, tokenId)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 tokenId) returns()
func (_MockErc721 *MockErc721TransactorSession) TransferFrom(from common.Address, to common.Address, tokenId *big.Int) (*types.Transaction, error) {
	return _MockErc721.Contract.TransferFrom(&_MockErc721.TransactOpts, from, to, tokenId)
}

// MockErc721ApprovalIterator is returned from FilterApproval and is used to iterate over the raw logs and unpacked data for Approval events raised by the MockErc721 contract.
type MockErc721ApprovalIterator struct {
	Event *MockErc721Approval // Event containing the contract specifics and raw log

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
func (it *MockErc721ApprovalIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc721Approval)
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
		it.Event = new(MockErc721Approval)
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
func (it *MockErc721ApprovalIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc721ApprovalIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc721Approval represents a Approval event raised by the MockErc721 contract.
type MockErc721Approval struct {
	Owner    common.Address
	Approved common.Address
	TokenId  *big.Int
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApproval is a free log retrieval operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_MockErc721 *MockErc721Filterer) FilterApproval(opts *bind.FilterOpts, owner []common.Address, approved []common.Address, tokenId []*big.Int) (*MockErc721ApprovalIterator, error) {

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

	logs, sub, err := _MockErc721.contract.FilterLogs(opts, "Approval", ownerRule, approvedRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &MockErc721ApprovalIterator{contract: _MockErc721.contract, event: "Approval", logs: logs, sub: sub}, nil
}

// WatchApproval is a free log subscription operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_MockErc721 *MockErc721Filterer) WatchApproval(opts *bind.WatchOpts, sink chan<- *MockErc721Approval, owner []common.Address, approved []common.Address, tokenId []*big.Int) (event.Subscription, error) {

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

	logs, sub, err := _MockErc721.contract.WatchLogs(opts, "Approval", ownerRule, approvedRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc721Approval)
				if err := _MockErc721.contract.UnpackLog(event, "Approval", log); err != nil {
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
func (_MockErc721 *MockErc721Filterer) ParseApproval(log types.Log) (*MockErc721Approval, error) {
	event := new(MockErc721Approval)
	if err := _MockErc721.contract.UnpackLog(event, "Approval", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc721ApprovalForAllIterator is returned from FilterApprovalForAll and is used to iterate over the raw logs and unpacked data for ApprovalForAll events raised by the MockErc721 contract.
type MockErc721ApprovalForAllIterator struct {
	Event *MockErc721ApprovalForAll // Event containing the contract specifics and raw log

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
func (it *MockErc721ApprovalForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc721ApprovalForAll)
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
		it.Event = new(MockErc721ApprovalForAll)
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
func (it *MockErc721ApprovalForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc721ApprovalForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc721ApprovalForAll represents a ApprovalForAll event raised by the MockErc721 contract.
type MockErc721ApprovalForAll struct {
	Owner    common.Address
	Operator common.Address
	Approved bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApprovalForAll is a free log retrieval operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_MockErc721 *MockErc721Filterer) FilterApprovalForAll(opts *bind.FilterOpts, owner []common.Address, operator []common.Address) (*MockErc721ApprovalForAllIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockErc721.contract.FilterLogs(opts, "ApprovalForAll", ownerRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return &MockErc721ApprovalForAllIterator{contract: _MockErc721.contract, event: "ApprovalForAll", logs: logs, sub: sub}, nil
}

// WatchApprovalForAll is a free log subscription operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_MockErc721 *MockErc721Filterer) WatchApprovalForAll(opts *bind.WatchOpts, sink chan<- *MockErc721ApprovalForAll, owner []common.Address, operator []common.Address) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockErc721.contract.WatchLogs(opts, "ApprovalForAll", ownerRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc721ApprovalForAll)
				if err := _MockErc721.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
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
func (_MockErc721 *MockErc721Filterer) ParseApprovalForAll(log types.Log) (*MockErc721ApprovalForAll, error) {
	event := new(MockErc721ApprovalForAll)
	if err := _MockErc721.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc721TransferIterator is returned from FilterTransfer and is used to iterate over the raw logs and unpacked data for Transfer events raised by the MockErc721 contract.
type MockErc721TransferIterator struct {
	Event *MockErc721Transfer // Event containing the contract specifics and raw log

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
func (it *MockErc721TransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc721Transfer)
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
		it.Event = new(MockErc721Transfer)
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
func (it *MockErc721TransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc721TransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc721Transfer represents a Transfer event raised by the MockErc721 contract.
type MockErc721Transfer struct {
	From    common.Address
	To      common.Address
	TokenId *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterTransfer is a free log retrieval operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_MockErc721 *MockErc721Filterer) FilterTransfer(opts *bind.FilterOpts, from []common.Address, to []common.Address, tokenId []*big.Int) (*MockErc721TransferIterator, error) {

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

	logs, sub, err := _MockErc721.contract.FilterLogs(opts, "Transfer", fromRule, toRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &MockErc721TransferIterator{contract: _MockErc721.contract, event: "Transfer", logs: logs, sub: sub}, nil
}

// WatchTransfer is a free log subscription operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_MockErc721 *MockErc721Filterer) WatchTransfer(opts *bind.WatchOpts, sink chan<- *MockErc721Transfer, from []common.Address, to []common.Address, tokenId []*big.Int) (event.Subscription, error) {

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

	logs, sub, err := _MockErc721.contract.WatchLogs(opts, "Transfer", fromRule, toRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc721Transfer)
				if err := _MockErc721.contract.UnpackLog(event, "Transfer", log); err != nil {
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
func (_MockErc721 *MockErc721Filterer) ParseTransfer(log types.Log) (*MockErc721Transfer, error) {
	event := new(MockErc721Transfer)
	if err := _MockErc721.contract.UnpackLog(event, "Transfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
