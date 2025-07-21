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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"approve\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"balanceOf\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"burn\",\"inputs\":[{\"name\":\"token\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getApproved\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isApprovedForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"mint\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"mintTo\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"mintWithPayment\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"ownerOf\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"safeMint\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"safeTransferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"safeTransferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setApprovalForAll\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"supportsInterface\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"symbol\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"tokenId\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"tokenURI\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"transferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ERC721IncorrectOwner\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InsufficientApproval\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidApprover\",\"inputs\":[{\"name\":\"approver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidOwner\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidReceiver\",\"inputs\":[{\"name\":\"receiver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721InvalidSender\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC721NonexistentToken\",\"inputs\":[{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}]",
	Bin: "0x608060405234801561000f575f5ffd5b5060405180604001604052806005815260200164135e53919560da1b815250604051806040016040528060048152602001631353919560e21b815250815f90816100599190610106565b5060016100668282610106565b5050506101c0565b634e487b7160e01b5f52604160045260245ffd5b600181811c9082168061009657607f821691505b6020821081036100b457634e487b7160e01b5f52602260045260245ffd5b50919050565b601f82111561010157805f5260205f20601f840160051c810160208510156100df5750805b601f840160051c820191505b818110156100fe575f81556001016100eb565b50505b505050565b81516001600160401b0381111561011f5761011f61006e565b6101338161012d8454610082565b846100ba565b6020601f821160018114610165575f831561014e5750848201515b5f19600385901b1c1916600184901b1784556100fe565b5f84815260208120601f198516915b828110156101945787850151825560209485019460019092019101610174565b50848210156101b157868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b61183c806101cd5f395ff3fe60806040526004361061013d575f3560e01c806342966c68116100bb578063a22cb46511610071578063bc34e24111610057578063bc34e24114610368578063c87b56dd1461037b578063e985e9c51461039a575f5ffd5b8063a22cb4651461032a578063b88d4fde14610349575f5ffd5b806370a08231116100a157806370a08231146102d8578063755edd17146102f757806395d89b4114610316575f5ffd5b806342966c681461029a5780636352211e146102b9575f5ffd5b806317d70f7c1161011057806340c10f19116100f657806340c10f191461023d57806340d097c31461025c57806342842e0e1461027b575f5ffd5b806317d70f7c146101fb57806323b872dd1461021e575f5ffd5b806301ffc9a71461014157806306fdde0314610175578063081812fc14610196578063095ea7b3146101da575b5f5ffd5b34801561014c575f5ffd5b5061016061015b36600461140b565b6103ee565b60405190151581526020015b60405180910390f35b348015610180575f5ffd5b506101896104d2565b60405161016c9190611472565b3480156101a1575f5ffd5b506101b56101b0366004611484565b610561565b60405173ffffffffffffffffffffffffffffffffffffffff909116815260200161016c565b3480156101e5575f5ffd5b506101f96101f43660046114c3565b610595565b005b348015610206575f5ffd5b5061021060065481565b60405190815260200161016c565b348015610229575f5ffd5b506101f96102383660046114eb565b6105a4565b348015610248575f5ffd5b506101f96102573660046114c3565b610698565b348015610267575f5ffd5b50610210610276366004611525565b6106cf565b348015610286575f5ffd5b506101f96102953660046114eb565b6106f8565b3480156102a5575f5ffd5b506101f96102b4366004611484565b610712565b3480156102c4575f5ffd5b506101b56102d3366004611484565b61071e565b3480156102e3575f5ffd5b506102106102f2366004611525565b610728565b348015610302575f5ffd5b50610210610311366004611525565b6107a0565b348015610321575f5ffd5b506101896107c1565b348015610335575f5ffd5b506101f961034436600461153e565b6107d0565b348015610354575f5ffd5b506101f96103633660046115a4565b6107db565b6101f9610376366004611525565b6107f3565b348015610386575f5ffd5b50610189610395366004611484565b610885565b3480156103a5575f5ffd5b506101606103b43660046116be565b73ffffffffffffffffffffffffffffffffffffffff9182165f90815260056020908152604080832093909416825291909152205460ff1690565b5f7fffffffff0000000000000000000000000000000000000000000000000000000082167f80ac58cd00000000000000000000000000000000000000000000000000000000148061048057507fffffffff0000000000000000000000000000000000000000000000000000000082167f5b5e139f00000000000000000000000000000000000000000000000000000000145b806104cc57507f01ffc9a7000000000000000000000000000000000000000000000000000000007fffffffff000000000000000000000000000000000000000000000000000000008316145b92915050565b60605f80546104e0906116ef565b80601f016020809104026020016040519081016040528092919081815260200182805461050c906116ef565b80156105575780601f1061052e57610100808354040283529160200191610557565b820191905f5260205f20905b81548152906001019060200180831161053a57829003601f168201915b5050505050905090565b5f61056b826108f6565b505f8281526004602052604090205473ffffffffffffffffffffffffffffffffffffffff166104cc565b6105a0828233610954565b5050565b73ffffffffffffffffffffffffffffffffffffffff82166105f8576040517f64a0ae920000000000000000000000000000000000000000000000000000000081525f60048201526024015b60405180910390fd5b5f610604838333610961565b90508373ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614610692576040517f64283d7b00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff808616600483015260248201849052821660448201526064016105ef565b50505050565b5f5b818110156106ca576106ae83600654610ad8565b60068054905f6106bd83611740565b909155505060010161069a565b505050565b600680545f91826106df83611740565b91905055506106f082600654610b85565b505060065490565b6106ca83838360405180602001604052805f8152506107db565b61071b81610b9e565b50565b5f6104cc826108f6565b5f73ffffffffffffffffffffffffffffffffffffffff8216610778576040517f89c62b640000000000000000000000000000000000000000000000000000000081525f60048201526024016105ef565b5073ffffffffffffffffffffffffffffffffffffffff165f9081526003602052604090205490565b600680545f91826107b083611740565b91905055506106f082600654610ad8565b6060600180546104e0906116ef565b6105a0338383610bfc565b6107e68484846105a4565b6106923385858585610cf8565b670de0b6b3a7640000341015610865576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601260248201527f496e73756666696369656e742066756e6473000000000000000000000000000060448201526064016105ef565b60068054905f61087483611740565b919050555061071b81600654610ad8565b6060610890826108f6565b505f6108a660408051602081019091525f815290565b90505f8151116108c45760405180602001604052805f8152506108ef565b806108ce84610eee565b6040516020016108df9291906117b3565b6040516020818303038152906040525b9392505050565b5f8181526002602052604081205473ffffffffffffffffffffffffffffffffffffffff16806104cc576040517f7e273289000000000000000000000000000000000000000000000000000000008152600481018490526024016105ef565b6106ca8383836001610faa565b5f8281526002602052604081205473ffffffffffffffffffffffffffffffffffffffff9081169083161561099a5761099a818486611172565b73ffffffffffffffffffffffffffffffffffffffff811615610a0d576109c25f855f5f610faa565b73ffffffffffffffffffffffffffffffffffffffff81165f90815260036020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0190555b73ffffffffffffffffffffffffffffffffffffffff851615610a555773ffffffffffffffffffffffffffffffffffffffff85165f908152600360205260409020805460010190555b5f8481526002602052604080822080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff89811691821790925591518793918516917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef91a4949350505050565b73ffffffffffffffffffffffffffffffffffffffff8216610b27576040517f64a0ae920000000000000000000000000000000000000000000000000000000081525f60048201526024016105ef565b5f610b3383835f610961565b905073ffffffffffffffffffffffffffffffffffffffff8116156106ca576040517f73c6ac6e0000000000000000000000000000000000000000000000000000000081525f60048201526024016105ef565b6105a0828260405180602001604052805f815250611222565b5f610baa5f835f610961565b905073ffffffffffffffffffffffffffffffffffffffff81166105a0576040517f7e273289000000000000000000000000000000000000000000000000000000008152600481018390526024016105ef565b73ffffffffffffffffffffffffffffffffffffffff8216610c61576040517f5b08ba1800000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff831660048201526024016105ef565b73ffffffffffffffffffffffffffffffffffffffff8381165f8181526005602090815260408083209487168084529482529182902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b73ffffffffffffffffffffffffffffffffffffffff83163b15610ee7576040517f150b7a0200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff84169063150b7a0290610d6d9088908890879087906004016117c7565b6020604051808303815f875af1925050508015610dc5575060408051601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201909252610dc291810190611821565b60015b610e52573d808015610df2576040519150601f19603f3d011682016040523d82523d5f602084013e610df7565b606091505b5080515f03610e4a576040517f64a0ae9200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff851660048201526024016105ef565b805181602001fd5b7fffffffff0000000000000000000000000000000000000000000000000000000081167f150b7a020000000000000000000000000000000000000000000000000000000014610ee5576040517f64a0ae9200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff851660048201526024016105ef565b505b5050505050565b60605f610efa83611239565b60010190505f8167ffffffffffffffff811115610f1957610f19611577565b6040519080825280601f01601f191660200182016040528015610f43576020820181803683370190505b5090508181016020015b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff017f3031323334353637383961626364656600000000000000000000000000000000600a86061a8153600a8504945084610f4d57509392505050565b8080610fcb575073ffffffffffffffffffffffffffffffffffffffff821615155b1561111e575f610fda846108f6565b905073ffffffffffffffffffffffffffffffffffffffff83161580159061102d57508273ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614155b801561106b575073ffffffffffffffffffffffffffffffffffffffff8082165f9081526005602090815260408083209387168352929052205460ff16155b156110ba576040517fa9fbf51f00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff841660048201526024016105ef565b811561111c57838573ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560405160405180910390a45b505b50505f90815260046020526040902080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff92909216919091179055565b61117d83838361131a565b6106ca5773ffffffffffffffffffffffffffffffffffffffff83166111d1576040517f7e273289000000000000000000000000000000000000000000000000000000008152600481018290526024016105ef565b6040517f177e802f00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff83166004820152602481018290526044016105ef565b61122c8383610ad8565b6106ca335f858585610cf8565b5f807a184f03e93ff9f4daa797ed6e38ed64bf6a1f0100000000000000008310611281577a184f03e93ff9f4daa797ed6e38ed64bf6a1f010000000000000000830492506040015b6d04ee2d6d415b85acef810000000083106112ad576d04ee2d6d415b85acef8100000000830492506020015b662386f26fc1000083106112cb57662386f26fc10000830492506010015b6305f5e10083106112e3576305f5e100830492506008015b61271083106112f757612710830492506004015b60648310611309576064830492506002015b600a83106104cc5760010192915050565b5f73ffffffffffffffffffffffffffffffffffffffff8316158015906113d657508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1614806113a6575073ffffffffffffffffffffffffffffffffffffffff8085165f9081526005602090815260408083209387168352929052205460ff165b806113d657505f8281526004602052604090205473ffffffffffffffffffffffffffffffffffffffff8481169116145b949350505050565b7fffffffff000000000000000000000000000000000000000000000000000000008116811461071b575f5ffd5b5f6020828403121561141b575f5ffd5b81356108ef816113de565b5f81518084528060208401602086015e5f6020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b602081525f6108ef6020830184611426565b5f60208284031215611494575f5ffd5b5035919050565b803573ffffffffffffffffffffffffffffffffffffffff811681146114be575f5ffd5b919050565b5f5f604083850312156114d4575f5ffd5b6114dd8361149b565b946020939093013593505050565b5f5f5f606084860312156114fd575f5ffd5b6115068461149b565b92506115146020850161149b565b929592945050506040919091013590565b5f60208284031215611535575f5ffd5b6108ef8261149b565b5f5f6040838503121561154f575f5ffd5b6115588361149b565b91506020830135801515811461156c575f5ffd5b809150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b5f5f5f5f608085870312156115b7575f5ffd5b6115c08561149b565b93506115ce6020860161149b565b925060408501359150606085013567ffffffffffffffff8111156115f0575f5ffd5b8501601f81018713611600575f5ffd5b803567ffffffffffffffff81111561161a5761161a611577565b6040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0603f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f8501160116810181811067ffffffffffffffff8211171561168657611686611577565b60405281815282820160200189101561169d575f5ffd5b816020840160208301375f6020838301015280935050505092959194509250565b5f5f604083850312156116cf575f5ffd5b6116d88361149b565b91506116e66020840161149b565b90509250929050565b600181811c9082168061170357607f821691505b60208210810361173a577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b50919050565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203611795577f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5060010190565b5f81518060208401855e5f93019283525090919050565b5f6113d66117c1838661179c565b8461179c565b73ffffffffffffffffffffffffffffffffffffffff8516815273ffffffffffffffffffffffffffffffffffffffff84166020820152826040820152608060608201525f6118176080830184611426565b9695505050505050565b5f60208284031215611831575f5ffd5b81516108ef816113de56",
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

// MintWithPayment is a paid mutator transaction binding the contract method 0xbc34e241.
//
// Solidity: function mintWithPayment(address to) payable returns()
func (_MockErc721 *MockErc721Transactor) MintWithPayment(opts *bind.TransactOpts, to common.Address) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "mintWithPayment", to)
}

// MintWithPayment is a paid mutator transaction binding the contract method 0xbc34e241.
//
// Solidity: function mintWithPayment(address to) payable returns()
func (_MockErc721 *MockErc721Session) MintWithPayment(to common.Address) (*types.Transaction, error) {
	return _MockErc721.Contract.MintWithPayment(&_MockErc721.TransactOpts, to)
}

// MintWithPayment is a paid mutator transaction binding the contract method 0xbc34e241.
//
// Solidity: function mintWithPayment(address to) payable returns()
func (_MockErc721 *MockErc721TransactorSession) MintWithPayment(to common.Address) (*types.Transaction, error) {
	return _MockErc721.Contract.MintWithPayment(&_MockErc721.TransactOpts, to)
}

// SafeMint is a paid mutator transaction binding the contract method 0x40d097c3.
//
// Solidity: function safeMint(address to) returns(uint256)
func (_MockErc721 *MockErc721Transactor) SafeMint(opts *bind.TransactOpts, to common.Address) (*types.Transaction, error) {
	return _MockErc721.contract.Transact(opts, "safeMint", to)
}

// SafeMint is a paid mutator transaction binding the contract method 0x40d097c3.
//
// Solidity: function safeMint(address to) returns(uint256)
func (_MockErc721 *MockErc721Session) SafeMint(to common.Address) (*types.Transaction, error) {
	return _MockErc721.Contract.SafeMint(&_MockErc721.TransactOpts, to)
}

// SafeMint is a paid mutator transaction binding the contract method 0x40d097c3.
//
// Solidity: function safeMint(address to) returns(uint256)
func (_MockErc721 *MockErc721TransactorSession) SafeMint(to common.Address) (*types.Transaction, error) {
	return _MockErc721.Contract.SafeMint(&_MockErc721.TransactOpts, to)
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
