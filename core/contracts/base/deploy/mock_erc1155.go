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

// MockErc1155MetaData contains all meta data concerning the MockErc1155 contract.
var MockErc1155MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"AMOUNT\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"BRONZE\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"GOLD\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"SILVER\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"balanceOf\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"id\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"balanceOfBatch\",\"inputs\":[{\"name\":\"accounts\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"ids\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"directCheckOfReceived\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"directCheckOfReceivedBatch\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"isApprovedForAll\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"mintBronze\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"mintGold\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"mintSilver\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"safeBatchTransferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"ids\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"values\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"safeMint\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"id\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"safeMintBatch\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"ids\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"amounts\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"safeTransferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"id\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"value\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setApprovalForAll\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"supportsInterface\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"uri\",\"inputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"TransferBatch\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"ids\",\"type\":\"uint256[]\",\"indexed\":false,\"internalType\":\"uint256[]\"},{\"name\":\"values\",\"type\":\"uint256[]\",\"indexed\":false,\"internalType\":\"uint256[]\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"TransferSingle\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"id\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"value\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"URI\",\"inputs\":[{\"name\":\"value\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"id\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ERC1155InsufficientBalance\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"balance\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"needed\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC1155InvalidApprover\",\"inputs\":[{\"name\":\"approver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC1155InvalidArrayLength\",\"inputs\":[{\"name\":\"idsLength\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"valuesLength\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC1155InvalidOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC1155InvalidReceiver\",\"inputs\":[{\"name\":\"receiver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC1155InvalidSender\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC1155MissingApprovalForAll\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}]}]",
	Bin: "0x608060405234801561000f575f5ffd5b5060408051808201909152600b81526a4d6f636b4552433131353560a81b602082015261003b81610041565b506101a3565b600261004d82826100e9565b5050565b634e487b7160e01b5f52604160045260245ffd5b600181811c9082168061007957607f821691505b60208210810361009757634e487b7160e01b5f52602260045260245ffd5b50919050565b601f8211156100e457805f5260205f20601f840160051c810160208510156100c25750805b601f840160051c820191505b818110156100e1575f81556001016100ce565b50505b505050565b81516001600160401b0381111561010257610102610051565b610116816101108454610065565b8461009d565b6020601f821160018114610148575f83156101315750848201515b5f19600385901b1c1916600184901b1784556100e1565b5f84815260208120601f198516915b828110156101775787850151825560209485019460019092019101610157565b508482101561019457868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b611a3e806101b05f395ff3fe608060405234801561000f575f5ffd5b5060043610610148575f3560e01c80635677d8b5116100c7578063d17891761161007d578063e3e55f0811610063578063e3e55f0814610292578063e985e9c51461029a578063f242432a146102e2575f5ffd5b8063d178917614610203578063e00fd5431461028a575f5ffd5b8063637f68cd116100ad578063637f68cd1461025157806390f9324414610264578063a22cb46514610277575f5ffd5b80635677d8b51461022b5780635fa3c6191461023e575f5ffd5b806324eeedf61161011c5780632ecda339116101025780632ecda339146101f05780633e4bee38146102035780634e1273f41461020b575f5ffd5b806324eeedf6146101ca5780632eb2c2d6146101dd575f5ffd5b8062fdd58e1461014c57806301ffc9a7146101725780630e89341c146101955780631fb33b06146101b5575b5f5ffd5b61015f61015a3660046112ab565b6102f5565b6040519081526020015b60405180910390f35b610185610180366004611300565b610329565b6040519015158152602001610169565b6101a86101a3366004611322565b61040b565b6040516101699190611385565b6101c86101c3366004611397565b61049d565b005b6101c86101d83660046113b0565b6104bb565b6101c86101eb366004611573565b6104da565b6101c86101fe366004611397565b6105a4565b61015f600181565b61021e610219366004611622565b6105c0565b604051610169919061171f565b610185610239366004611397565b6106a4565b6101c861024c366004611397565b610750565b6101c861025f366004611731565b61076c565b610185610272366004611397565b610786565b6101c86102853660046117a5565b6107ac565b61015f600381565b61015f600281565b6101856102a83660046117de565b73ffffffffffffffffffffffffffffffffffffffff9182165f90815260016020908152604080832093909416825291909152205460ff1690565b6101c86102f036600461180f565b6107bb565b5f8181526020818152604080832073ffffffffffffffffffffffffffffffffffffffff861684529091529020545b92915050565b5f7fffffffff0000000000000000000000000000000000000000000000000000000082167fd9b67a260000000000000000000000000000000000000000000000000000000014806103bb57507fffffffff0000000000000000000000000000000000000000000000000000000082167f0e89341c00000000000000000000000000000000000000000000000000000000145b8061032357507f01ffc9a7000000000000000000000000000000000000000000000000000000007fffffffff00000000000000000000000000000000000000000000000000000000831614610323565b60606002805461041a90611863565b80601f016020809104026020016040519081016040528092919081815260200182805461044690611863565b80156104915780601f1061046857610100808354040283529160200191610491565b820191905f5260205f20905b81548152906001019060200180831161047457829003601f168201915b50505050509050919050565b6104b88160018060405180602001604052805f815250610878565b50565b6104d583838360405180602001604052805f815250610878565b505050565b3373ffffffffffffffffffffffffffffffffffffffff86168114801590610533575073ffffffffffffffffffffffffffffffffffffffff8087165f9081526001602090815260408083209385168352929052205460ff16155b1561058f576040517fe237d92200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8083166004830152871660248201526044015b60405180910390fd5b61059c86868686866108f9565b505050505050565b6104b8816002600160405180602001604052805f815250610878565b6060815183511461060a57815183516040517f5b05999100000000000000000000000000000000000000000000000000000000815260048101929092526024820152604401610586565b5f835167ffffffffffffffff811115610625576106256113e0565b60405190808252806020026020018201604052801561064e578160200160208202803683370190505b5090505f5b845181101561069c57602080820286010151610677906020808402870101516102f5565b828281518110610689576106896118b4565b6020908102919091010152600101610653565b509392505050565b6040805160018082528183019092525f91829190602080830190803683370190505090506001815f815181106106dc576106dc6118b4565b60209081029190910101526040805160018082528183019092525f918160200160208202803683370190505090506001815f8151811061071e5761071e6118b4565b602002602001018181525050610746305f86858560405180602001604052805f8152506109ab565b5060019392505050565b6104b8816003600160405180602001604052805f815250610878565b6104d583838360405180602001604052805f815250610ba3565b5f6107a4305f8460018060405180602001604052805f815250610c05565b506001919050565b6107b7338383610d94565b5050565b3373ffffffffffffffffffffffffffffffffffffffff86168114801590610814575073ffffffffffffffffffffffffffffffffffffffff8087165f9081526001602090815260408083209385168352929052205460ff16155b1561086b576040517fe237d92200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff808316600483015287166024820152604401610586565b61059c8686868686610e7a565b73ffffffffffffffffffffffffffffffffffffffff84166108c7576040517f57f447ce0000000000000000000000000000000000000000000000000000000081525f6004820152602401610586565b6040805160018082526020820186905281830190815260608201859052608082019092529061059c5f87848487610f46565b73ffffffffffffffffffffffffffffffffffffffff8416610948576040517f57f447ce0000000000000000000000000000000000000000000000000000000081525f6004820152602401610586565b73ffffffffffffffffffffffffffffffffffffffff8516610997576040517f01a835140000000000000000000000000000000000000000000000000000000081525f6004820152602401610586565b6109a48585858585610f46565b5050505050565b73ffffffffffffffffffffffffffffffffffffffff84163b1561059c576040517fbc197c8100000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff85169063bc197c8190610a2290899089908890889088906004016118e1565b6020604051808303815f875af1925050508015610a7a575060408051601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201909252610a779181019061195d565b60015b610b07573d808015610aa7576040519150601f19603f3d011682016040523d82523d5f602084013e610aac565b606091505b5080515f03610aff576040517f57f447ce00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff86166004820152602401610586565b805160208201fd5b7fffffffff0000000000000000000000000000000000000000000000000000000081167fbc197c810000000000000000000000000000000000000000000000000000000014610b9a576040517f57f447ce00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff86166004820152602401610586565b50505050505050565b73ffffffffffffffffffffffffffffffffffffffff8416610bf2576040517f57f447ce0000000000000000000000000000000000000000000000000000000081525f6004820152602401610586565b610bff5f85858585610f46565b50505050565b73ffffffffffffffffffffffffffffffffffffffff84163b1561059c576040517ff23a6e6100000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff85169063f23a6e6190610c7c9089908990889088908890600401611978565b6020604051808303815f875af1925050508015610cd4575060408051601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201909252610cd19181019061195d565b60015b610d01573d808015610aa7576040519150601f19603f3d011682016040523d82523d5f602084013e610aac565b7fffffffff0000000000000000000000000000000000000000000000000000000081167ff23a6e610000000000000000000000000000000000000000000000000000000014610b9a576040517f57f447ce00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff86166004820152602401610586565b73ffffffffffffffffffffffffffffffffffffffff8216610de3576040517fced3e1000000000000000000000000000000000000000000000000000000000081525f6004820152602401610586565b73ffffffffffffffffffffffffffffffffffffffff8381165f8181526001602090815260408083209487168084529482529182902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b73ffffffffffffffffffffffffffffffffffffffff8416610ec9576040517f57f447ce0000000000000000000000000000000000000000000000000000000081525f6004820152602401610586565b73ffffffffffffffffffffffffffffffffffffffff8516610f18576040517f01a835140000000000000000000000000000000000000000000000000000000081525f6004820152602401610586565b60408051600180825260208201869052818301908152606082018590526080820190925290610b9a87878484875b610f5285858585610fa6565b73ffffffffffffffffffffffffffffffffffffffff8416156109a45782513390600103610f985760208481015190840151610f91838989858589610c05565b505061059c565b61059c8187878787876109ab565b8051825114610fee57815181516040517f5b05999100000000000000000000000000000000000000000000000000000000815260048101929092526024820152604401610586565b335f5b83518110156111575760208181028581018201519085019091015173ffffffffffffffffffffffffffffffffffffffff8816156110ef575f8281526020818152604080832073ffffffffffffffffffffffffffffffffffffffff8c168452909152902054818110156110bc576040517f03dee4c500000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8a166004820152602481018290526044810183905260648101849052608401610586565b5f8381526020818152604080832073ffffffffffffffffffffffffffffffffffffffff8d16845290915290209082900390555b73ffffffffffffffffffffffffffffffffffffffff87161561114d575f8281526020818152604080832073ffffffffffffffffffffffffffffffffffffffff8b168452909152812080548392906111479084906119d9565b90915550505b5050600101610ff1565b5082516001036111fe5760208301515f9060208401519091508573ffffffffffffffffffffffffffffffffffffffff168773ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f6285856040516111ef929190918252602082015260400190565b60405180910390a450506109a4565b8373ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff167f4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb8686604051611274929190611a11565b60405180910390a45050505050565b803573ffffffffffffffffffffffffffffffffffffffff811681146112a6575f5ffd5b919050565b5f5f604083850312156112bc575f5ffd5b6112c583611283565b946020939093013593505050565b7fffffffff00000000000000000000000000000000000000000000000000000000811681146104b8575f5ffd5b5f60208284031215611310575f5ffd5b813561131b816112d3565b9392505050565b5f60208284031215611332575f5ffd5b5035919050565b5f81518084528060208401602086015e5f6020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b602081525f61131b6020830184611339565b5f602082840312156113a7575f5ffd5b61131b82611283565b5f5f5f606084860312156113c2575f5ffd5b6113cb84611283565b95602085013595506040909401359392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016810167ffffffffffffffff81118282101715611454576114546113e0565b604052919050565b5f67ffffffffffffffff821115611475576114756113e0565b5060051b60200190565b5f82601f83011261148e575f5ffd5b81356114a161149c8261145c565b61140d565b8082825260208201915060208360051b8601019250858311156114c2575f5ffd5b602085015b838110156114df5780358352602092830192016114c7565b5095945050505050565b5f82601f8301126114f8575f5ffd5b813567ffffffffffffffff811115611512576115126113e0565b61154360207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f8401160161140d565b818152846020838601011115611557575f5ffd5b816020850160208301375f918101602001919091529392505050565b5f5f5f5f5f60a08688031215611587575f5ffd5b61159086611283565b945061159e60208701611283565b9350604086013567ffffffffffffffff8111156115b9575f5ffd5b6115c58882890161147f565b935050606086013567ffffffffffffffff8111156115e1575f5ffd5b6115ed8882890161147f565b925050608086013567ffffffffffffffff811115611609575f5ffd5b611615888289016114e9565b9150509295509295909350565b5f5f60408385031215611633575f5ffd5b823567ffffffffffffffff811115611649575f5ffd5b8301601f81018513611659575f5ffd5b803561166761149c8261145c565b8082825260208201915060208360051b850101925087831115611688575f5ffd5b6020840193505b828410156116b1576116a084611283565b82526020938401939091019061168f565b9450505050602083013567ffffffffffffffff8111156116cf575f5ffd5b6116db8582860161147f565b9150509250929050565b5f8151808452602084019350602083015f5b828110156117155781518652602095860195909101906001016116f7565b5093949350505050565b602081525f61131b60208301846116e5565b5f5f5f60608486031215611743575f5ffd5b61174c84611283565b9250602084013567ffffffffffffffff811115611767575f5ffd5b6117738682870161147f565b925050604084013567ffffffffffffffff81111561178f575f5ffd5b61179b8682870161147f565b9150509250925092565b5f5f604083850312156117b6575f5ffd5b6117bf83611283565b9150602083013580151581146117d3575f5ffd5b809150509250929050565b5f5f604083850312156117ef575f5ffd5b6117f883611283565b915061180660208401611283565b90509250929050565b5f5f5f5f5f60a08688031215611823575f5ffd5b61182c86611283565b945061183a60208701611283565b93506040860135925060608601359150608086013567ffffffffffffffff811115611609575f5ffd5b600181811c9082168061187757607f821691505b6020821081036118ae577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b50919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b73ffffffffffffffffffffffffffffffffffffffff8616815273ffffffffffffffffffffffffffffffffffffffff8516602082015260a060408201525f61192b60a08301866116e5565b828103606084015261193d81866116e5565b905082810360808401526119518185611339565b98975050505050505050565b5f6020828403121561196d575f5ffd5b815161131b816112d3565b73ffffffffffffffffffffffffffffffffffffffff8616815273ffffffffffffffffffffffffffffffffffffffff8516602082015283604082015282606082015260a060808201525f6119ce60a0830184611339565b979650505050505050565b80820180821115610323577f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b604081525f611a2360408301856116e5565b8281036020840152611a3581856116e5565b9594505050505056",
}

// MockErc1155ABI is the input ABI used to generate the binding from.
// Deprecated: Use MockErc1155MetaData.ABI instead.
var MockErc1155ABI = MockErc1155MetaData.ABI

// MockErc1155Bin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockErc1155MetaData.Bin instead.
var MockErc1155Bin = MockErc1155MetaData.Bin

// DeployMockErc1155 deploys a new Ethereum contract, binding an instance of MockErc1155 to it.
func DeployMockErc1155(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *MockErc1155, error) {
	parsed, err := MockErc1155MetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockErc1155Bin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockErc1155{MockErc1155Caller: MockErc1155Caller{contract: contract}, MockErc1155Transactor: MockErc1155Transactor{contract: contract}, MockErc1155Filterer: MockErc1155Filterer{contract: contract}}, nil
}

// MockErc1155 is an auto generated Go binding around an Ethereum contract.
type MockErc1155 struct {
	MockErc1155Caller     // Read-only binding to the contract
	MockErc1155Transactor // Write-only binding to the contract
	MockErc1155Filterer   // Log filterer for contract events
}

// MockErc1155Caller is an auto generated read-only Go binding around an Ethereum contract.
type MockErc1155Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc1155Transactor is an auto generated write-only Go binding around an Ethereum contract.
type MockErc1155Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc1155Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockErc1155Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc1155Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockErc1155Session struct {
	Contract     *MockErc1155      // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// MockErc1155CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockErc1155CallerSession struct {
	Contract *MockErc1155Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts      // Call options to use throughout this session
}

// MockErc1155TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockErc1155TransactorSession struct {
	Contract     *MockErc1155Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts      // Transaction auth options to use throughout this session
}

// MockErc1155Raw is an auto generated low-level Go binding around an Ethereum contract.
type MockErc1155Raw struct {
	Contract *MockErc1155 // Generic contract binding to access the raw methods on
}

// MockErc1155CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockErc1155CallerRaw struct {
	Contract *MockErc1155Caller // Generic read-only contract binding to access the raw methods on
}

// MockErc1155TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockErc1155TransactorRaw struct {
	Contract *MockErc1155Transactor // Generic write-only contract binding to access the raw methods on
}

// NewMockErc1155 creates a new instance of MockErc1155, bound to a specific deployed contract.
func NewMockErc1155(address common.Address, backend bind.ContractBackend) (*MockErc1155, error) {
	contract, err := bindMockErc1155(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockErc1155{MockErc1155Caller: MockErc1155Caller{contract: contract}, MockErc1155Transactor: MockErc1155Transactor{contract: contract}, MockErc1155Filterer: MockErc1155Filterer{contract: contract}}, nil
}

// NewMockErc1155Caller creates a new read-only instance of MockErc1155, bound to a specific deployed contract.
func NewMockErc1155Caller(address common.Address, caller bind.ContractCaller) (*MockErc1155Caller, error) {
	contract, err := bindMockErc1155(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockErc1155Caller{contract: contract}, nil
}

// NewMockErc1155Transactor creates a new write-only instance of MockErc1155, bound to a specific deployed contract.
func NewMockErc1155Transactor(address common.Address, transactor bind.ContractTransactor) (*MockErc1155Transactor, error) {
	contract, err := bindMockErc1155(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockErc1155Transactor{contract: contract}, nil
}

// NewMockErc1155Filterer creates a new log filterer instance of MockErc1155, bound to a specific deployed contract.
func NewMockErc1155Filterer(address common.Address, filterer bind.ContractFilterer) (*MockErc1155Filterer, error) {
	contract, err := bindMockErc1155(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockErc1155Filterer{contract: contract}, nil
}

// bindMockErc1155 binds a generic wrapper to an already deployed contract.
func bindMockErc1155(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockErc1155MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockErc1155 *MockErc1155Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockErc1155.Contract.MockErc1155Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockErc1155 *MockErc1155Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc1155.Contract.MockErc1155Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockErc1155 *MockErc1155Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockErc1155.Contract.MockErc1155Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockErc1155 *MockErc1155CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockErc1155.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockErc1155 *MockErc1155TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc1155.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockErc1155 *MockErc1155TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockErc1155.Contract.contract.Transact(opts, method, params...)
}

// AMOUNT is a free data retrieval call binding the contract method 0xd1789176.
//
// Solidity: function AMOUNT() view returns(uint256)
func (_MockErc1155 *MockErc1155Caller) AMOUNT(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockErc1155.contract.Call(opts, &out, "AMOUNT")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// AMOUNT is a free data retrieval call binding the contract method 0xd1789176.
//
// Solidity: function AMOUNT() view returns(uint256)
func (_MockErc1155 *MockErc1155Session) AMOUNT() (*big.Int, error) {
	return _MockErc1155.Contract.AMOUNT(&_MockErc1155.CallOpts)
}

// AMOUNT is a free data retrieval call binding the contract method 0xd1789176.
//
// Solidity: function AMOUNT() view returns(uint256)
func (_MockErc1155 *MockErc1155CallerSession) AMOUNT() (*big.Int, error) {
	return _MockErc1155.Contract.AMOUNT(&_MockErc1155.CallOpts)
}

// BRONZE is a free data retrieval call binding the contract method 0xe00fd543.
//
// Solidity: function BRONZE() view returns(uint256)
func (_MockErc1155 *MockErc1155Caller) BRONZE(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockErc1155.contract.Call(opts, &out, "BRONZE")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// BRONZE is a free data retrieval call binding the contract method 0xe00fd543.
//
// Solidity: function BRONZE() view returns(uint256)
func (_MockErc1155 *MockErc1155Session) BRONZE() (*big.Int, error) {
	return _MockErc1155.Contract.BRONZE(&_MockErc1155.CallOpts)
}

// BRONZE is a free data retrieval call binding the contract method 0xe00fd543.
//
// Solidity: function BRONZE() view returns(uint256)
func (_MockErc1155 *MockErc1155CallerSession) BRONZE() (*big.Int, error) {
	return _MockErc1155.Contract.BRONZE(&_MockErc1155.CallOpts)
}

// GOLD is a free data retrieval call binding the contract method 0x3e4bee38.
//
// Solidity: function GOLD() view returns(uint256)
func (_MockErc1155 *MockErc1155Caller) GOLD(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockErc1155.contract.Call(opts, &out, "GOLD")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GOLD is a free data retrieval call binding the contract method 0x3e4bee38.
//
// Solidity: function GOLD() view returns(uint256)
func (_MockErc1155 *MockErc1155Session) GOLD() (*big.Int, error) {
	return _MockErc1155.Contract.GOLD(&_MockErc1155.CallOpts)
}

// GOLD is a free data retrieval call binding the contract method 0x3e4bee38.
//
// Solidity: function GOLD() view returns(uint256)
func (_MockErc1155 *MockErc1155CallerSession) GOLD() (*big.Int, error) {
	return _MockErc1155.Contract.GOLD(&_MockErc1155.CallOpts)
}

// SILVER is a free data retrieval call binding the contract method 0xe3e55f08.
//
// Solidity: function SILVER() view returns(uint256)
func (_MockErc1155 *MockErc1155Caller) SILVER(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockErc1155.contract.Call(opts, &out, "SILVER")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// SILVER is a free data retrieval call binding the contract method 0xe3e55f08.
//
// Solidity: function SILVER() view returns(uint256)
func (_MockErc1155 *MockErc1155Session) SILVER() (*big.Int, error) {
	return _MockErc1155.Contract.SILVER(&_MockErc1155.CallOpts)
}

// SILVER is a free data retrieval call binding the contract method 0xe3e55f08.
//
// Solidity: function SILVER() view returns(uint256)
func (_MockErc1155 *MockErc1155CallerSession) SILVER() (*big.Int, error) {
	return _MockErc1155.Contract.SILVER(&_MockErc1155.CallOpts)
}

// BalanceOf is a free data retrieval call binding the contract method 0x00fdd58e.
//
// Solidity: function balanceOf(address account, uint256 id) view returns(uint256)
func (_MockErc1155 *MockErc1155Caller) BalanceOf(opts *bind.CallOpts, account common.Address, id *big.Int) (*big.Int, error) {
	var out []interface{}
	err := _MockErc1155.contract.Call(opts, &out, "balanceOf", account, id)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// BalanceOf is a free data retrieval call binding the contract method 0x00fdd58e.
//
// Solidity: function balanceOf(address account, uint256 id) view returns(uint256)
func (_MockErc1155 *MockErc1155Session) BalanceOf(account common.Address, id *big.Int) (*big.Int, error) {
	return _MockErc1155.Contract.BalanceOf(&_MockErc1155.CallOpts, account, id)
}

// BalanceOf is a free data retrieval call binding the contract method 0x00fdd58e.
//
// Solidity: function balanceOf(address account, uint256 id) view returns(uint256)
func (_MockErc1155 *MockErc1155CallerSession) BalanceOf(account common.Address, id *big.Int) (*big.Int, error) {
	return _MockErc1155.Contract.BalanceOf(&_MockErc1155.CallOpts, account, id)
}

// BalanceOfBatch is a free data retrieval call binding the contract method 0x4e1273f4.
//
// Solidity: function balanceOfBatch(address[] accounts, uint256[] ids) view returns(uint256[])
func (_MockErc1155 *MockErc1155Caller) BalanceOfBatch(opts *bind.CallOpts, accounts []common.Address, ids []*big.Int) ([]*big.Int, error) {
	var out []interface{}
	err := _MockErc1155.contract.Call(opts, &out, "balanceOfBatch", accounts, ids)

	if err != nil {
		return *new([]*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new([]*big.Int)).(*[]*big.Int)

	return out0, err

}

// BalanceOfBatch is a free data retrieval call binding the contract method 0x4e1273f4.
//
// Solidity: function balanceOfBatch(address[] accounts, uint256[] ids) view returns(uint256[])
func (_MockErc1155 *MockErc1155Session) BalanceOfBatch(accounts []common.Address, ids []*big.Int) ([]*big.Int, error) {
	return _MockErc1155.Contract.BalanceOfBatch(&_MockErc1155.CallOpts, accounts, ids)
}

// BalanceOfBatch is a free data retrieval call binding the contract method 0x4e1273f4.
//
// Solidity: function balanceOfBatch(address[] accounts, uint256[] ids) view returns(uint256[])
func (_MockErc1155 *MockErc1155CallerSession) BalanceOfBatch(accounts []common.Address, ids []*big.Int) ([]*big.Int, error) {
	return _MockErc1155.Contract.BalanceOfBatch(&_MockErc1155.CallOpts, accounts, ids)
}

// IsApprovedForAll is a free data retrieval call binding the contract method 0xe985e9c5.
//
// Solidity: function isApprovedForAll(address account, address operator) view returns(bool)
func (_MockErc1155 *MockErc1155Caller) IsApprovedForAll(opts *bind.CallOpts, account common.Address, operator common.Address) (bool, error) {
	var out []interface{}
	err := _MockErc1155.contract.Call(opts, &out, "isApprovedForAll", account, operator)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsApprovedForAll is a free data retrieval call binding the contract method 0xe985e9c5.
//
// Solidity: function isApprovedForAll(address account, address operator) view returns(bool)
func (_MockErc1155 *MockErc1155Session) IsApprovedForAll(account common.Address, operator common.Address) (bool, error) {
	return _MockErc1155.Contract.IsApprovedForAll(&_MockErc1155.CallOpts, account, operator)
}

// IsApprovedForAll is a free data retrieval call binding the contract method 0xe985e9c5.
//
// Solidity: function isApprovedForAll(address account, address operator) view returns(bool)
func (_MockErc1155 *MockErc1155CallerSession) IsApprovedForAll(account common.Address, operator common.Address) (bool, error) {
	return _MockErc1155.Contract.IsApprovedForAll(&_MockErc1155.CallOpts, account, operator)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc1155 *MockErc1155Caller) SupportsInterface(opts *bind.CallOpts, interfaceId [4]byte) (bool, error) {
	var out []interface{}
	err := _MockErc1155.contract.Call(opts, &out, "supportsInterface", interfaceId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc1155 *MockErc1155Session) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockErc1155.Contract.SupportsInterface(&_MockErc1155.CallOpts, interfaceId)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc1155 *MockErc1155CallerSession) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockErc1155.Contract.SupportsInterface(&_MockErc1155.CallOpts, interfaceId)
}

// Uri is a free data retrieval call binding the contract method 0x0e89341c.
//
// Solidity: function uri(uint256 ) view returns(string)
func (_MockErc1155 *MockErc1155Caller) Uri(opts *bind.CallOpts, arg0 *big.Int) (string, error) {
	var out []interface{}
	err := _MockErc1155.contract.Call(opts, &out, "uri", arg0)

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Uri is a free data retrieval call binding the contract method 0x0e89341c.
//
// Solidity: function uri(uint256 ) view returns(string)
func (_MockErc1155 *MockErc1155Session) Uri(arg0 *big.Int) (string, error) {
	return _MockErc1155.Contract.Uri(&_MockErc1155.CallOpts, arg0)
}

// Uri is a free data retrieval call binding the contract method 0x0e89341c.
//
// Solidity: function uri(uint256 ) view returns(string)
func (_MockErc1155 *MockErc1155CallerSession) Uri(arg0 *big.Int) (string, error) {
	return _MockErc1155.Contract.Uri(&_MockErc1155.CallOpts, arg0)
}

// DirectCheckOfReceived is a paid mutator transaction binding the contract method 0x90f93244.
//
// Solidity: function directCheckOfReceived(address account) returns(bool)
func (_MockErc1155 *MockErc1155Transactor) DirectCheckOfReceived(opts *bind.TransactOpts, account common.Address) (*types.Transaction, error) {
	return _MockErc1155.contract.Transact(opts, "directCheckOfReceived", account)
}

// DirectCheckOfReceived is a paid mutator transaction binding the contract method 0x90f93244.
//
// Solidity: function directCheckOfReceived(address account) returns(bool)
func (_MockErc1155 *MockErc1155Session) DirectCheckOfReceived(account common.Address) (*types.Transaction, error) {
	return _MockErc1155.Contract.DirectCheckOfReceived(&_MockErc1155.TransactOpts, account)
}

// DirectCheckOfReceived is a paid mutator transaction binding the contract method 0x90f93244.
//
// Solidity: function directCheckOfReceived(address account) returns(bool)
func (_MockErc1155 *MockErc1155TransactorSession) DirectCheckOfReceived(account common.Address) (*types.Transaction, error) {
	return _MockErc1155.Contract.DirectCheckOfReceived(&_MockErc1155.TransactOpts, account)
}

// DirectCheckOfReceivedBatch is a paid mutator transaction binding the contract method 0x5677d8b5.
//
// Solidity: function directCheckOfReceivedBatch(address account) returns(bool)
func (_MockErc1155 *MockErc1155Transactor) DirectCheckOfReceivedBatch(opts *bind.TransactOpts, account common.Address) (*types.Transaction, error) {
	return _MockErc1155.contract.Transact(opts, "directCheckOfReceivedBatch", account)
}

// DirectCheckOfReceivedBatch is a paid mutator transaction binding the contract method 0x5677d8b5.
//
// Solidity: function directCheckOfReceivedBatch(address account) returns(bool)
func (_MockErc1155 *MockErc1155Session) DirectCheckOfReceivedBatch(account common.Address) (*types.Transaction, error) {
	return _MockErc1155.Contract.DirectCheckOfReceivedBatch(&_MockErc1155.TransactOpts, account)
}

// DirectCheckOfReceivedBatch is a paid mutator transaction binding the contract method 0x5677d8b5.
//
// Solidity: function directCheckOfReceivedBatch(address account) returns(bool)
func (_MockErc1155 *MockErc1155TransactorSession) DirectCheckOfReceivedBatch(account common.Address) (*types.Transaction, error) {
	return _MockErc1155.Contract.DirectCheckOfReceivedBatch(&_MockErc1155.TransactOpts, account)
}

// MintBronze is a paid mutator transaction binding the contract method 0x5fa3c619.
//
// Solidity: function mintBronze(address account) returns()
func (_MockErc1155 *MockErc1155Transactor) MintBronze(opts *bind.TransactOpts, account common.Address) (*types.Transaction, error) {
	return _MockErc1155.contract.Transact(opts, "mintBronze", account)
}

// MintBronze is a paid mutator transaction binding the contract method 0x5fa3c619.
//
// Solidity: function mintBronze(address account) returns()
func (_MockErc1155 *MockErc1155Session) MintBronze(account common.Address) (*types.Transaction, error) {
	return _MockErc1155.Contract.MintBronze(&_MockErc1155.TransactOpts, account)
}

// MintBronze is a paid mutator transaction binding the contract method 0x5fa3c619.
//
// Solidity: function mintBronze(address account) returns()
func (_MockErc1155 *MockErc1155TransactorSession) MintBronze(account common.Address) (*types.Transaction, error) {
	return _MockErc1155.Contract.MintBronze(&_MockErc1155.TransactOpts, account)
}

// MintGold is a paid mutator transaction binding the contract method 0x1fb33b06.
//
// Solidity: function mintGold(address account) returns()
func (_MockErc1155 *MockErc1155Transactor) MintGold(opts *bind.TransactOpts, account common.Address) (*types.Transaction, error) {
	return _MockErc1155.contract.Transact(opts, "mintGold", account)
}

// MintGold is a paid mutator transaction binding the contract method 0x1fb33b06.
//
// Solidity: function mintGold(address account) returns()
func (_MockErc1155 *MockErc1155Session) MintGold(account common.Address) (*types.Transaction, error) {
	return _MockErc1155.Contract.MintGold(&_MockErc1155.TransactOpts, account)
}

// MintGold is a paid mutator transaction binding the contract method 0x1fb33b06.
//
// Solidity: function mintGold(address account) returns()
func (_MockErc1155 *MockErc1155TransactorSession) MintGold(account common.Address) (*types.Transaction, error) {
	return _MockErc1155.Contract.MintGold(&_MockErc1155.TransactOpts, account)
}

// MintSilver is a paid mutator transaction binding the contract method 0x2ecda339.
//
// Solidity: function mintSilver(address account) returns()
func (_MockErc1155 *MockErc1155Transactor) MintSilver(opts *bind.TransactOpts, account common.Address) (*types.Transaction, error) {
	return _MockErc1155.contract.Transact(opts, "mintSilver", account)
}

// MintSilver is a paid mutator transaction binding the contract method 0x2ecda339.
//
// Solidity: function mintSilver(address account) returns()
func (_MockErc1155 *MockErc1155Session) MintSilver(account common.Address) (*types.Transaction, error) {
	return _MockErc1155.Contract.MintSilver(&_MockErc1155.TransactOpts, account)
}

// MintSilver is a paid mutator transaction binding the contract method 0x2ecda339.
//
// Solidity: function mintSilver(address account) returns()
func (_MockErc1155 *MockErc1155TransactorSession) MintSilver(account common.Address) (*types.Transaction, error) {
	return _MockErc1155.Contract.MintSilver(&_MockErc1155.TransactOpts, account)
}

// SafeBatchTransferFrom is a paid mutator transaction binding the contract method 0x2eb2c2d6.
//
// Solidity: function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] values, bytes data) returns()
func (_MockErc1155 *MockErc1155Transactor) SafeBatchTransferFrom(opts *bind.TransactOpts, from common.Address, to common.Address, ids []*big.Int, values []*big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc1155.contract.Transact(opts, "safeBatchTransferFrom", from, to, ids, values, data)
}

// SafeBatchTransferFrom is a paid mutator transaction binding the contract method 0x2eb2c2d6.
//
// Solidity: function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] values, bytes data) returns()
func (_MockErc1155 *MockErc1155Session) SafeBatchTransferFrom(from common.Address, to common.Address, ids []*big.Int, values []*big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc1155.Contract.SafeBatchTransferFrom(&_MockErc1155.TransactOpts, from, to, ids, values, data)
}

// SafeBatchTransferFrom is a paid mutator transaction binding the contract method 0x2eb2c2d6.
//
// Solidity: function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] values, bytes data) returns()
func (_MockErc1155 *MockErc1155TransactorSession) SafeBatchTransferFrom(from common.Address, to common.Address, ids []*big.Int, values []*big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc1155.Contract.SafeBatchTransferFrom(&_MockErc1155.TransactOpts, from, to, ids, values, data)
}

// SafeMint is a paid mutator transaction binding the contract method 0x24eeedf6.
//
// Solidity: function safeMint(address account, uint256 id, uint256 amount) returns()
func (_MockErc1155 *MockErc1155Transactor) SafeMint(opts *bind.TransactOpts, account common.Address, id *big.Int, amount *big.Int) (*types.Transaction, error) {
	return _MockErc1155.contract.Transact(opts, "safeMint", account, id, amount)
}

// SafeMint is a paid mutator transaction binding the contract method 0x24eeedf6.
//
// Solidity: function safeMint(address account, uint256 id, uint256 amount) returns()
func (_MockErc1155 *MockErc1155Session) SafeMint(account common.Address, id *big.Int, amount *big.Int) (*types.Transaction, error) {
	return _MockErc1155.Contract.SafeMint(&_MockErc1155.TransactOpts, account, id, amount)
}

// SafeMint is a paid mutator transaction binding the contract method 0x24eeedf6.
//
// Solidity: function safeMint(address account, uint256 id, uint256 amount) returns()
func (_MockErc1155 *MockErc1155TransactorSession) SafeMint(account common.Address, id *big.Int, amount *big.Int) (*types.Transaction, error) {
	return _MockErc1155.Contract.SafeMint(&_MockErc1155.TransactOpts, account, id, amount)
}

// SafeMintBatch is a paid mutator transaction binding the contract method 0x637f68cd.
//
// Solidity: function safeMintBatch(address account, uint256[] ids, uint256[] amounts) returns()
func (_MockErc1155 *MockErc1155Transactor) SafeMintBatch(opts *bind.TransactOpts, account common.Address, ids []*big.Int, amounts []*big.Int) (*types.Transaction, error) {
	return _MockErc1155.contract.Transact(opts, "safeMintBatch", account, ids, amounts)
}

// SafeMintBatch is a paid mutator transaction binding the contract method 0x637f68cd.
//
// Solidity: function safeMintBatch(address account, uint256[] ids, uint256[] amounts) returns()
func (_MockErc1155 *MockErc1155Session) SafeMintBatch(account common.Address, ids []*big.Int, amounts []*big.Int) (*types.Transaction, error) {
	return _MockErc1155.Contract.SafeMintBatch(&_MockErc1155.TransactOpts, account, ids, amounts)
}

// SafeMintBatch is a paid mutator transaction binding the contract method 0x637f68cd.
//
// Solidity: function safeMintBatch(address account, uint256[] ids, uint256[] amounts) returns()
func (_MockErc1155 *MockErc1155TransactorSession) SafeMintBatch(account common.Address, ids []*big.Int, amounts []*big.Int) (*types.Transaction, error) {
	return _MockErc1155.Contract.SafeMintBatch(&_MockErc1155.TransactOpts, account, ids, amounts)
}

// SafeTransferFrom is a paid mutator transaction binding the contract method 0xf242432a.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data) returns()
func (_MockErc1155 *MockErc1155Transactor) SafeTransferFrom(opts *bind.TransactOpts, from common.Address, to common.Address, id *big.Int, value *big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc1155.contract.Transact(opts, "safeTransferFrom", from, to, id, value, data)
}

// SafeTransferFrom is a paid mutator transaction binding the contract method 0xf242432a.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data) returns()
func (_MockErc1155 *MockErc1155Session) SafeTransferFrom(from common.Address, to common.Address, id *big.Int, value *big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc1155.Contract.SafeTransferFrom(&_MockErc1155.TransactOpts, from, to, id, value, data)
}

// SafeTransferFrom is a paid mutator transaction binding the contract method 0xf242432a.
//
// Solidity: function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data) returns()
func (_MockErc1155 *MockErc1155TransactorSession) SafeTransferFrom(from common.Address, to common.Address, id *big.Int, value *big.Int, data []byte) (*types.Transaction, error) {
	return _MockErc1155.Contract.SafeTransferFrom(&_MockErc1155.TransactOpts, from, to, id, value, data)
}

// SetApprovalForAll is a paid mutator transaction binding the contract method 0xa22cb465.
//
// Solidity: function setApprovalForAll(address operator, bool approved) returns()
func (_MockErc1155 *MockErc1155Transactor) SetApprovalForAll(opts *bind.TransactOpts, operator common.Address, approved bool) (*types.Transaction, error) {
	return _MockErc1155.contract.Transact(opts, "setApprovalForAll", operator, approved)
}

// SetApprovalForAll is a paid mutator transaction binding the contract method 0xa22cb465.
//
// Solidity: function setApprovalForAll(address operator, bool approved) returns()
func (_MockErc1155 *MockErc1155Session) SetApprovalForAll(operator common.Address, approved bool) (*types.Transaction, error) {
	return _MockErc1155.Contract.SetApprovalForAll(&_MockErc1155.TransactOpts, operator, approved)
}

// SetApprovalForAll is a paid mutator transaction binding the contract method 0xa22cb465.
//
// Solidity: function setApprovalForAll(address operator, bool approved) returns()
func (_MockErc1155 *MockErc1155TransactorSession) SetApprovalForAll(operator common.Address, approved bool) (*types.Transaction, error) {
	return _MockErc1155.Contract.SetApprovalForAll(&_MockErc1155.TransactOpts, operator, approved)
}

// MockErc1155ApprovalForAllIterator is returned from FilterApprovalForAll and is used to iterate over the raw logs and unpacked data for ApprovalForAll events raised by the MockErc1155 contract.
type MockErc1155ApprovalForAllIterator struct {
	Event *MockErc1155ApprovalForAll // Event containing the contract specifics and raw log

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
func (it *MockErc1155ApprovalForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc1155ApprovalForAll)
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
		it.Event = new(MockErc1155ApprovalForAll)
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
func (it *MockErc1155ApprovalForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc1155ApprovalForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc1155ApprovalForAll represents a ApprovalForAll event raised by the MockErc1155 contract.
type MockErc1155ApprovalForAll struct {
	Account  common.Address
	Operator common.Address
	Approved bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApprovalForAll is a free log retrieval operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed account, address indexed operator, bool approved)
func (_MockErc1155 *MockErc1155Filterer) FilterApprovalForAll(opts *bind.FilterOpts, account []common.Address, operator []common.Address) (*MockErc1155ApprovalForAllIterator, error) {

	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockErc1155.contract.FilterLogs(opts, "ApprovalForAll", accountRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return &MockErc1155ApprovalForAllIterator{contract: _MockErc1155.contract, event: "ApprovalForAll", logs: logs, sub: sub}, nil
}

// WatchApprovalForAll is a free log subscription operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed account, address indexed operator, bool approved)
func (_MockErc1155 *MockErc1155Filterer) WatchApprovalForAll(opts *bind.WatchOpts, sink chan<- *MockErc1155ApprovalForAll, account []common.Address, operator []common.Address) (event.Subscription, error) {

	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockErc1155.contract.WatchLogs(opts, "ApprovalForAll", accountRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc1155ApprovalForAll)
				if err := _MockErc1155.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
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
// Solidity: event ApprovalForAll(address indexed account, address indexed operator, bool approved)
func (_MockErc1155 *MockErc1155Filterer) ParseApprovalForAll(log types.Log) (*MockErc1155ApprovalForAll, error) {
	event := new(MockErc1155ApprovalForAll)
	if err := _MockErc1155.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc1155TransferBatchIterator is returned from FilterTransferBatch and is used to iterate over the raw logs and unpacked data for TransferBatch events raised by the MockErc1155 contract.
type MockErc1155TransferBatchIterator struct {
	Event *MockErc1155TransferBatch // Event containing the contract specifics and raw log

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
func (it *MockErc1155TransferBatchIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc1155TransferBatch)
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
		it.Event = new(MockErc1155TransferBatch)
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
func (it *MockErc1155TransferBatchIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc1155TransferBatchIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc1155TransferBatch represents a TransferBatch event raised by the MockErc1155 contract.
type MockErc1155TransferBatch struct {
	Operator common.Address
	From     common.Address
	To       common.Address
	Ids      []*big.Int
	Values   []*big.Int
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterTransferBatch is a free log retrieval operation binding the contract event 0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb.
//
// Solidity: event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)
func (_MockErc1155 *MockErc1155Filterer) FilterTransferBatch(opts *bind.FilterOpts, operator []common.Address, from []common.Address, to []common.Address) (*MockErc1155TransferBatchIterator, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}
	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _MockErc1155.contract.FilterLogs(opts, "TransferBatch", operatorRule, fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return &MockErc1155TransferBatchIterator{contract: _MockErc1155.contract, event: "TransferBatch", logs: logs, sub: sub}, nil
}

// WatchTransferBatch is a free log subscription operation binding the contract event 0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb.
//
// Solidity: event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)
func (_MockErc1155 *MockErc1155Filterer) WatchTransferBatch(opts *bind.WatchOpts, sink chan<- *MockErc1155TransferBatch, operator []common.Address, from []common.Address, to []common.Address) (event.Subscription, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}
	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _MockErc1155.contract.WatchLogs(opts, "TransferBatch", operatorRule, fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc1155TransferBatch)
				if err := _MockErc1155.contract.UnpackLog(event, "TransferBatch", log); err != nil {
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

// ParseTransferBatch is a log parse operation binding the contract event 0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb.
//
// Solidity: event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)
func (_MockErc1155 *MockErc1155Filterer) ParseTransferBatch(log types.Log) (*MockErc1155TransferBatch, error) {
	event := new(MockErc1155TransferBatch)
	if err := _MockErc1155.contract.UnpackLog(event, "TransferBatch", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc1155TransferSingleIterator is returned from FilterTransferSingle and is used to iterate over the raw logs and unpacked data for TransferSingle events raised by the MockErc1155 contract.
type MockErc1155TransferSingleIterator struct {
	Event *MockErc1155TransferSingle // Event containing the contract specifics and raw log

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
func (it *MockErc1155TransferSingleIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc1155TransferSingle)
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
		it.Event = new(MockErc1155TransferSingle)
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
func (it *MockErc1155TransferSingleIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc1155TransferSingleIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc1155TransferSingle represents a TransferSingle event raised by the MockErc1155 contract.
type MockErc1155TransferSingle struct {
	Operator common.Address
	From     common.Address
	To       common.Address
	Id       *big.Int
	Value    *big.Int
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterTransferSingle is a free log retrieval operation binding the contract event 0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62.
//
// Solidity: event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)
func (_MockErc1155 *MockErc1155Filterer) FilterTransferSingle(opts *bind.FilterOpts, operator []common.Address, from []common.Address, to []common.Address) (*MockErc1155TransferSingleIterator, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}
	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _MockErc1155.contract.FilterLogs(opts, "TransferSingle", operatorRule, fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return &MockErc1155TransferSingleIterator{contract: _MockErc1155.contract, event: "TransferSingle", logs: logs, sub: sub}, nil
}

// WatchTransferSingle is a free log subscription operation binding the contract event 0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62.
//
// Solidity: event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)
func (_MockErc1155 *MockErc1155Filterer) WatchTransferSingle(opts *bind.WatchOpts, sink chan<- *MockErc1155TransferSingle, operator []common.Address, from []common.Address, to []common.Address) (event.Subscription, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}
	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _MockErc1155.contract.WatchLogs(opts, "TransferSingle", operatorRule, fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc1155TransferSingle)
				if err := _MockErc1155.contract.UnpackLog(event, "TransferSingle", log); err != nil {
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

// ParseTransferSingle is a log parse operation binding the contract event 0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62.
//
// Solidity: event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)
func (_MockErc1155 *MockErc1155Filterer) ParseTransferSingle(log types.Log) (*MockErc1155TransferSingle, error) {
	event := new(MockErc1155TransferSingle)
	if err := _MockErc1155.contract.UnpackLog(event, "TransferSingle", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc1155URIIterator is returned from FilterURI and is used to iterate over the raw logs and unpacked data for URI events raised by the MockErc1155 contract.
type MockErc1155URIIterator struct {
	Event *MockErc1155URI // Event containing the contract specifics and raw log

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
func (it *MockErc1155URIIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc1155URI)
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
		it.Event = new(MockErc1155URI)
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
func (it *MockErc1155URIIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc1155URIIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc1155URI represents a URI event raised by the MockErc1155 contract.
type MockErc1155URI struct {
	Value string
	Id    *big.Int
	Raw   types.Log // Blockchain specific contextual infos
}

// FilterURI is a free log retrieval operation binding the contract event 0x6bb7ff708619ba0610cba295a58592e0451dee2622938c8755667688daf3529b.
//
// Solidity: event URI(string value, uint256 indexed id)
func (_MockErc1155 *MockErc1155Filterer) FilterURI(opts *bind.FilterOpts, id []*big.Int) (*MockErc1155URIIterator, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _MockErc1155.contract.FilterLogs(opts, "URI", idRule)
	if err != nil {
		return nil, err
	}
	return &MockErc1155URIIterator{contract: _MockErc1155.contract, event: "URI", logs: logs, sub: sub}, nil
}

// WatchURI is a free log subscription operation binding the contract event 0x6bb7ff708619ba0610cba295a58592e0451dee2622938c8755667688daf3529b.
//
// Solidity: event URI(string value, uint256 indexed id)
func (_MockErc1155 *MockErc1155Filterer) WatchURI(opts *bind.WatchOpts, sink chan<- *MockErc1155URI, id []*big.Int) (event.Subscription, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _MockErc1155.contract.WatchLogs(opts, "URI", idRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc1155URI)
				if err := _MockErc1155.contract.UnpackLog(event, "URI", log); err != nil {
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

// ParseURI is a log parse operation binding the contract event 0x6bb7ff708619ba0610cba295a58592e0451dee2622938c8755667688daf3529b.
//
// Solidity: event URI(string value, uint256 indexed id)
func (_MockErc1155 *MockErc1155Filterer) ParseURI(log types.Log) (*MockErc1155URI, error) {
	event := new(MockErc1155URI)
	if err := _MockErc1155.contract.UnpackLog(event, "URI", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
