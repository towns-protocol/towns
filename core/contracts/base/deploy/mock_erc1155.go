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
	ABI: "[{\"type\":\"constructor\",\"inputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"AMOUNT\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"BRONZE\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"GOLD\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"SILVER\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"balanceOf\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"id\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"balanceOfBatch\",\"inputs\":[{\"name\":\"accounts\",\"type\":\"address[]\",\"internalType\":\"address[]\"},{\"name\":\"ids\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isApprovedForAll\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"mintBronze\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"mintGold\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"mintSilver\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"safeBatchTransferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"ids\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"values\",\"type\":\"uint256[]\",\"internalType\":\"uint256[]\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"safeTransferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"id\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"value\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setApprovalForAll\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"supportsInterface\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"uri\",\"inputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"TransferBatch\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"ids\",\"type\":\"uint256[]\",\"indexed\":false,\"internalType\":\"uint256[]\"},{\"name\":\"values\",\"type\":\"uint256[]\",\"indexed\":false,\"internalType\":\"uint256[]\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"TransferSingle\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"id\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"value\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"URI\",\"inputs\":[{\"name\":\"value\",\"type\":\"string\",\"indexed\":false,\"internalType\":\"string\"},{\"name\":\"id\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ERC1155InsufficientBalance\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"balance\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"needed\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC1155InvalidApprover\",\"inputs\":[{\"name\":\"approver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC1155InvalidArrayLength\",\"inputs\":[{\"name\":\"idsLength\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"valuesLength\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC1155InvalidOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC1155InvalidReceiver\",\"inputs\":[{\"name\":\"receiver\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC1155InvalidSender\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"ERC1155MissingApprovalForAll\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}]}]",
	Bin: "0x608060405234801561000f575f5ffd5b5060408051808201909152600b81526a4d6f636b4552433131353560a81b602082015261003b81610041565b506101a3565b600261004d82826100e9565b5050565b634e487b7160e01b5f52604160045260245ffd5b600181811c9082168061007957607f821691505b60208210810361009757634e487b7160e01b5f52602260045260245ffd5b50919050565b601f8211156100e457805f5260205f20601f840160051c810160208510156100c25750805b601f840160051c820191505b818110156100e1575f81556001016100ce565b50505b505050565b81516001600160401b0381111561010257610102610051565b610116816101108454610065565b8461009d565b6020601f821160018114610148575f83156101315750848201515b5f19600385901b1c1916600184901b1784556100e1565b5f84815260208120601f198516915b828110156101775787850151825560209485019460019092019101610157565b508482101561019457868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b61178c806101b05f395ff3fe608060405234801561000f575f5ffd5b50600436106100ef575f3560e01c80634e1273f411610093578063e00fd54311610063578063e00fd543146101e5578063e3e55f08146101ed578063e985e9c5146101f5578063f242432a1461023d575f5ffd5b80634e1273f41461019f5780635fa3c619146101bf578063a22cb465146101d2578063d178917614610197575f5ffd5b80631fb33b06116100ce5780631fb33b061461015c5780632eb2c2d6146101715780632ecda339146101845780633e4bee3814610197575f5ffd5b8062fdd58e146100f357806301ffc9a7146101195780630e89341c1461013c575b5f5ffd5b61010661010136600461109d565b610250565b6040519081526020015b60405180910390f35b61012c6101273660046110f2565b610284565b6040519015158152602001610110565b61014f61014a366004611114565b610366565b6040516101109190611177565b61016f61016a366004611189565b6103f8565b005b61016f61017f366004611335565b610416565b61016f610192366004611189565b6104e0565b610106600181565b6101b26101ad3660046113e4565b6104fc565b60405161011091906114e1565b61016f6101cd366004611189565b6105e0565b61016f6101e03660046114f3565b6105fc565b610106600381565b610106600281565b61012c61020336600461152c565b73ffffffffffffffffffffffffffffffffffffffff9182165f90815260016020908152604080832093909416825291909152205460ff1690565b61016f61024b36600461155d565b61060b565b5f8181526020818152604080832073ffffffffffffffffffffffffffffffffffffffff861684529091529020545b92915050565b5f7fffffffff0000000000000000000000000000000000000000000000000000000082167fd9b67a2600000000000000000000000000000000000000000000000000000000148061031657507fffffffff0000000000000000000000000000000000000000000000000000000082167f0e89341c00000000000000000000000000000000000000000000000000000000145b8061027e57507f01ffc9a7000000000000000000000000000000000000000000000000000000007fffffffff0000000000000000000000000000000000000000000000000000000083161461027e565b606060028054610375906115b1565b80601f01602080910402602001604051908101604052809291908181526020018280546103a1906115b1565b80156103ec5780601f106103c3576101008083540402835291602001916103ec565b820191905f5260205f20905b8154815290600101906020018083116103cf57829003601f168201915b50505050509050919050565b6104138160018060405180602001604052805f8152506106c8565b50565b3373ffffffffffffffffffffffffffffffffffffffff8616811480159061046f575073ffffffffffffffffffffffffffffffffffffffff8087165f9081526001602090815260408083209385168352929052205460ff16155b156104cb576040517fe237d92200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8083166004830152871660248201526044015b60405180910390fd5b6104d88686868686610749565b505050505050565b610413816002600160405180602001604052805f8152506106c8565b6060815183511461054657815183516040517f5b059991000000000000000000000000000000000000000000000000000000008152600481019290925260248201526044016104c2565b5f835167ffffffffffffffff811115610561576105616111a2565b60405190808252806020026020018201604052801561058a578160200160208202803683370190505b5090505f5b84518110156105d8576020808202860101516105b390602080840287010151610250565b8282815181106105c5576105c5611602565b602090810291909101015260010161058f565b509392505050565b610413816003600160405180602001604052805f8152506106c8565b6106073383836107fb565b5050565b3373ffffffffffffffffffffffffffffffffffffffff86168114801590610664575073ffffffffffffffffffffffffffffffffffffffff8087165f9081526001602090815260408083209385168352929052205460ff16155b156106bb576040517fe237d92200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8083166004830152871660248201526044016104c2565b6104d886868686866108e1565b73ffffffffffffffffffffffffffffffffffffffff8416610717576040517f57f447ce0000000000000000000000000000000000000000000000000000000081525f60048201526024016104c2565b604080516001808252602082018690528183019081526060820185905260808201909252906104d85f878484876109ba565b73ffffffffffffffffffffffffffffffffffffffff8416610798576040517f57f447ce0000000000000000000000000000000000000000000000000000000081525f60048201526024016104c2565b73ffffffffffffffffffffffffffffffffffffffff85166107e7576040517f01a835140000000000000000000000000000000000000000000000000000000081525f60048201526024016104c2565b6107f485858585856109ba565b5050505050565b73ffffffffffffffffffffffffffffffffffffffff821661084a576040517fced3e1000000000000000000000000000000000000000000000000000000000081525f60048201526024016104c2565b73ffffffffffffffffffffffffffffffffffffffff8381165f8181526001602090815260408083209487168084529482529182902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001686151590811790915591519182527f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31910160405180910390a3505050565b73ffffffffffffffffffffffffffffffffffffffff8416610930576040517f57f447ce0000000000000000000000000000000000000000000000000000000081525f60048201526024016104c2565b73ffffffffffffffffffffffffffffffffffffffff851661097f576040517f01a835140000000000000000000000000000000000000000000000000000000081525f60048201526024016104c2565b604080516001808252602082018690528183019081526060820185905260808201909252906109b187878484876109ba565b50505050505050565b6109c685858585610a1a565b73ffffffffffffffffffffffffffffffffffffffff8416156107f45782513390600103610a0c5760208481015190840151610a05838989858589610cf7565b50506104d8565b6104d8818787878787610ee6565b8051825114610a6257815181516040517f5b059991000000000000000000000000000000000000000000000000000000008152600481019290925260248201526044016104c2565b335f5b8351811015610bcb5760208181028581018201519085019091015173ffffffffffffffffffffffffffffffffffffffff881615610b63575f8281526020818152604080832073ffffffffffffffffffffffffffffffffffffffff8c16845290915290205481811015610b30576040517f03dee4c500000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8a1660048201526024810182905260448101839052606481018490526084016104c2565b5f8381526020818152604080832073ffffffffffffffffffffffffffffffffffffffff8d16845290915290209082900390555b73ffffffffffffffffffffffffffffffffffffffff871615610bc1575f8281526020818152604080832073ffffffffffffffffffffffffffffffffffffffff8b16845290915281208054839290610bbb90849061162f565b90915550505b5050600101610a65565b508251600103610c725760208301515f9060208401519091508573ffffffffffffffffffffffffffffffffffffffff168773ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f628585604051610c63929190918252602082015260400190565b60405180910390a450506107f4565b8373ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff167f4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb8686604051610ce8929190611667565b60405180910390a45050505050565b73ffffffffffffffffffffffffffffffffffffffff84163b156104d8576040517ff23a6e6100000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff85169063f23a6e6190610d6e9089908990889088908890600401611694565b6020604051808303815f875af1925050508015610dc6575060408051601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201909252610dc3918101906116f5565b60015b610e53573d808015610df3576040519150601f19603f3d011682016040523d82523d5f602084013e610df8565b606091505b5080515f03610e4b576040517f57f447ce00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff861660048201526024016104c2565b805181602001fd5b7fffffffff0000000000000000000000000000000000000000000000000000000081167ff23a6e6100000000000000000000000000000000000000000000000000000000146109b1576040517f57f447ce00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff861660048201526024016104c2565b73ffffffffffffffffffffffffffffffffffffffff84163b156104d8576040517fbc197c8100000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff85169063bc197c8190610f5d9089908990889088908890600401611710565b6020604051808303815f875af1925050508015610fb5575060408051601f3d9081017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0168201909252610fb2918101906116f5565b60015b610fe2573d808015610df3576040519150601f19603f3d011682016040523d82523d5f602084013e610df8565b7fffffffff0000000000000000000000000000000000000000000000000000000081167fbc197c8100000000000000000000000000000000000000000000000000000000146109b1576040517f57f447ce00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff861660048201526024016104c2565b803573ffffffffffffffffffffffffffffffffffffffff81168114611098575f5ffd5b919050565b5f5f604083850312156110ae575f5ffd5b6110b783611075565b946020939093013593505050565b7fffffffff0000000000000000000000000000000000000000000000000000000081168114610413575f5ffd5b5f60208284031215611102575f5ffd5b813561110d816110c5565b9392505050565b5f60208284031215611124575f5ffd5b5035919050565b5f81518084528060208401602086015e5f6020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b602081525f61110d602083018461112b565b5f60208284031215611199575f5ffd5b61110d82611075565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b604051601f82017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe016810167ffffffffffffffff81118282101715611216576112166111a2565b604052919050565b5f67ffffffffffffffff821115611237576112376111a2565b5060051b60200190565b5f82601f830112611250575f5ffd5b813561126361125e8261121e565b6111cf565b8082825260208201915060208360051b860101925085831115611284575f5ffd5b602085015b838110156112a1578035835260209283019201611289565b5095945050505050565b5f82601f8301126112ba575f5ffd5b813567ffffffffffffffff8111156112d4576112d46111a2565b61130560207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f840116016111cf565b818152846020838601011115611319575f5ffd5b816020850160208301375f918101602001919091529392505050565b5f5f5f5f5f60a08688031215611349575f5ffd5b61135286611075565b945061136060208701611075565b9350604086013567ffffffffffffffff81111561137b575f5ffd5b61138788828901611241565b935050606086013567ffffffffffffffff8111156113a3575f5ffd5b6113af88828901611241565b925050608086013567ffffffffffffffff8111156113cb575f5ffd5b6113d7888289016112ab565b9150509295509295909350565b5f5f604083850312156113f5575f5ffd5b823567ffffffffffffffff81111561140b575f5ffd5b8301601f8101851361141b575f5ffd5b803561142961125e8261121e565b8082825260208201915060208360051b85010192508783111561144a575f5ffd5b6020840193505b828410156114735761146284611075565b825260209384019390910190611451565b9450505050602083013567ffffffffffffffff811115611491575f5ffd5b61149d85828601611241565b9150509250929050565b5f8151808452602084019350602083015f5b828110156114d75781518652602095860195909101906001016114b9565b5093949350505050565b602081525f61110d60208301846114a7565b5f5f60408385031215611504575f5ffd5b61150d83611075565b915060208301358015158114611521575f5ffd5b809150509250929050565b5f5f6040838503121561153d575f5ffd5b61154683611075565b915061155460208401611075565b90509250929050565b5f5f5f5f5f60a08688031215611571575f5ffd5b61157a86611075565b945061158860208701611075565b93506040860135925060608601359150608086013567ffffffffffffffff8111156113cb575f5ffd5b600181811c908216806115c557607f821691505b6020821081036115fc577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b50919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b8082018082111561027e577f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b604081525f61167960408301856114a7565b828103602084015261168b81856114a7565b95945050505050565b73ffffffffffffffffffffffffffffffffffffffff8616815273ffffffffffffffffffffffffffffffffffffffff8516602082015283604082015282606082015260a060808201525f6116ea60a083018461112b565b979650505050505050565b5f60208284031215611705575f5ffd5b815161110d816110c5565b73ffffffffffffffffffffffffffffffffffffffff8616815273ffffffffffffffffffffffffffffffffffffffff8516602082015260a060408201525f61175a60a08301866114a7565b828103606084015261176c81866114a7565b90508281036080840152611780818561112b565b9897505050505050505056",
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
