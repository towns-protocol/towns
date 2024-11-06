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

// IWalletLinkBaseLinkedWallet is an auto generated low-level Go binding around an user-defined struct.
type IWalletLinkBaseLinkedWallet struct {
	Addr      common.Address
	Signature []byte
	Message   string
}

// WalletLinkMetaData contains all meta data concerning the WalletLink contract.
var WalletLinkMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"function\",\"name\":\"__WalletLink_init\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"checkIfLinked\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLatestNonceForRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRootKeyForWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"linkCallerToRootKey\",\"inputs\":[{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"linkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeCallerLink\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"LinkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RemoveLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"secondWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignatureLength\",\"inputs\":[{\"name\":\"length\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignatureS\",\"inputs\":[{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAccountNonce\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"currentNonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToRootWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveRootWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__LinkAlreadyExists\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__LinkedToAnotherRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__NotLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]}]",
	Bin: "0x608060405234801561001057600080fd5b5061001961001e565b6100c4565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff161561006a576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156100c157805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b6115b5806100d36000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c80632f461453116100665780632f461453146100ff57806335d2fb641461011257806364899d9814610125578063912b97581461012d578063f82103981461015057600080fd5b806302345b981461009857806320a00ac8146100c1578063243a7134146100e2578063260a409d146100f7575b600080fd5b6100ab6100a6366004611204565b61017b565b6040516100b8919061121f565b60405180910390f35b6100d46100cf366004611204565b61018c565b6040519081526020016100b8565b6100f56100f03660046113cc565b6101c9565b005b6100f56101d9565b6100f561010d366004611439565b610235565b6100f561012036600461147e565b610243565b6100f561024e565b61014061013b3660046114c4565b610256565b60405190151581526020016100b8565b61016361015e366004611204565b61029f565b6040516001600160a01b0390911681526020016100b8565b6060610186826102e0565b92915050565b6001600160a01b03811660009081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c006020526040812054610186565b6101d4838383610311565b505050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff1661022357604051630ef4733760e31b815260040160405180910390fd5b6102336311b9c60b60e01b61049f565b565b61023f8282610578565b5050565b6101d4838383610696565b610233610861565b6001600160a01b0381811660009081527f19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc01602052604081205490918481169116145b9392505050565b6001600160a01b0380821660009081527f19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc016020526040812054909116610186565b6001600160a01b03811660009081526000805160206115958339815191526020526040902060609061018690610960565b82518251600080516020611595833981519152916103319183919061096d565b60006103468560400151866000015185610ade565b9050600061035382610b48565b905084600001516001600160a01b0316610371828760200151610b75565b6001600160a01b03161461039857604051632af0041d60e11b815260040160405180910390fd5b6103ab8560400151866000015186610ade565b915060006103b883610b48565b905086600001516001600160a01b03166103d6828960200151610b75565b6001600160a01b0316146103fd57604051632af0041d60e11b815260040160405180910390fd5b85516104099086610b9f565b865186516001600160a01b0316600090815260208690526040902061042d91610c11565b50855187516001600160a01b03908116600090815260018701602052604080822080546001600160a01b0319169484169490941790935588518a51935190831693909216917f64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b57219190a350505050505050565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff16610527576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff19166001179055610540565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b8151600080516020611595833981519152903390610599908390839061096d565b60006105aa85604001518386610ade565b905060006105b782610b48565b905085600001516001600160a01b03166105d5828860200151610b75565b6001600160a01b0316146105fc57604051632af0041d60e11b815260040160405180910390fd5b85516106089086610b9f565b85516001600160a01b0316600090815260208590526040902061062b9084610c11565b5085516001600160a01b03848116600081815260018801602052604080822080546001600160a01b0319169585169590951790945589519351939092169290917f64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b572191a3505050505050565b6000805160206115958339815191526001600160a01b03841615806106c3575082516001600160a01b0316155b156106e157604051636df3f5c360e01b815260040160405180910390fd5b82600001516001600160a01b0316846001600160a01b031603610717576040516333976e3b60e11b815260040160405180910390fd5b82516001600160a01b0385811660009081526001840160205260409020548116911614610772578251604051635e300c8360e01b81526001600160a01b03808716600483015290911660248201526044015b60405180910390fd5b600061078384604001518685610ade565b9050600061079082610b48565b905084600001516001600160a01b03166107ae828760200151610b75565b6001600160a01b0316146107d557604051632af0041d60e11b815260040160405180910390fd5b84516107e19085610b9f565b6001600160a01b038087166000908152600185016020908152604080832080546001600160a01b031916905588519093168252859052206108229087610c26565b5060405133906001600160a01b038816907f9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da290600090a3505050505050565b3360008181527f19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc01602052604090205460008051602061159583398151915291906001600160a01b0316806108db57604051635e300c8360e01b81526001600160a01b03808416600483015282166024820152604401610769565b6001600160a01b038083166000908152600185016020908152604080832080546001600160a01b031916905592841682528590522061091a9083610c26565b50806001600160a01b0316826001600160a01b03167f9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da260405160405180910390a3505050565b6060600061029883610c3b565b6001600160a01b038216158061098a57506001600160a01b038116155b156109a857604051636df3f5c360e01b815260040160405180910390fd5b806001600160a01b0316826001600160a01b0316036109da5760405163848ba26d60e01b815260040160405180910390fd5b6001600160a01b0382811660009081526001850160205260409020541615610a28576040516314790b7f60e01b81526001600160a01b03808416600483015282166024820152604401610769565b6001600160a01b0381811660009081526001850160205260409020541615610a8b576001600160a01b038181166000908152600185016020526040908190205490516347227b5d60e01b8152848316600482015291166024820152604401610769565b6001600160a01b0382166000908152602084905260408120610aac90610c97565b11156101d457604051637b815eed60e11b81526001600160a01b03808416600483015282166024820152604401610769565b8251602093840120604080517f6bb89d031fcd292ecd4c0e6855878b7165cebc3a2f35bc6bbac48c088dd8325c81870152808201929092526001600160a01b039390931660608201526080808201929092528251808203909201825260a001909152805191012090565b6000610186610b55610ca1565b8360405161190160f01b8152600281019290925260228201526042902090565b600080600080610b858686610cb0565b925092509250610b958282610cfd565b5090949350505050565b6001600160a01b03821660009081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c00602052604090208054600181019091558181146101d4576040516301d4b62360e61b81526001600160a01b038416600482015260248101829052604401610769565b6000610298836001600160a01b038416610db6565b6000610298836001600160a01b038416610e05565b606081600001805480602002602001604051908101604052809291908181526020018280548015610c8b57602002820191906000526020600020905b815481526020019060010190808311610c77575b50505050509050919050565b6000610186825490565b6000610cab610ef8565b905090565b60008060008351604103610cea5760208401516040850151606086015160001a610cdc88828585610f6c565b955095509550505050610cf6565b50508151600091506002905b9250925092565b6000826003811115610d1157610d116114f7565b03610d1a575050565b6001826003811115610d2e57610d2e6114f7565b03610d4c5760405163f645eedf60e01b815260040160405180910390fd5b6002826003811115610d6057610d606114f7565b03610d815760405163fce698f760e01b815260048101829052602401610769565b6003826003811115610d9557610d956114f7565b0361023f576040516335e2f38360e21b815260048101829052602401610769565b6000818152600183016020526040812054610dfd57508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610186565b506000610186565b60008181526001830160205260408120548015610eee576000610e2960018361150d565b8554909150600090610e3d9060019061150d565b9050808214610ea2576000866000018281548110610e5d57610e5d61152e565b9060005260206000200154905080876000018481548110610e8057610e8061152e565b6000918252602080832090910192909255918252600188019052604090208390555b8554869080610eb357610eb3611544565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050610186565b6000915050610186565b60007f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f610f2361103b565b610f2b6110b3565b60408051602081019490945283019190915260608201524660808201523060a082015260c00160405160208183030381529060405280519060200120905090565b600080807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0841115610fa75750600091506003905082611031565b604080516000808252602082018084528a905260ff891692820192909252606081018790526080810186905260019060a0016020604051602081039080840390855afa158015610ffb573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b03811661102757506000925060019150829050611031565b9250600091508190505b9450945094915050565b600080611046611103565b80519091501561105d578051602090910120919050565b7f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a60054801561108b5792915050565b7fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4709250505090565b6000806110be6111b7565b8051909150156110d5578051602090910120919050565b7f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a60154801561108b5792915050565b60607f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a60060020180546111349061155a565b80601f01602080910402602001604051908101604052809291908181526020018280546111609061155a565b80156111ad5780601f10611182576101008083540402835291602001916111ad565b820191906000526020600020905b81548152906001019060200180831161119057829003601f168201915b5050505050905090565b60607f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a60060030180546111349061155a565b80356001600160a01b03811681146111ff57600080fd5b919050565b60006020828403121561121657600080fd5b610298826111e8565b6020808252825182820181905260009190848201906040850190845b818110156112605783516001600160a01b03168352928401929184019160010161123b565b50909695505050505050565b634e487b7160e01b600052604160045260246000fd5b6040516060810167ffffffffffffffff811182821017156112a5576112a561126c565b60405290565b600067ffffffffffffffff808411156112c6576112c661126c565b604051601f8501601f19908116603f011681019082821181831017156112ee576112ee61126c565b8160405280935085815286868601111561130757600080fd5b858560208301376000602087830101525050509392505050565b60006060828403121561133357600080fd5b61133b611282565b9050611346826111e8565b8152602082013567ffffffffffffffff8082111561136357600080fd5b818401915084601f83011261137757600080fd5b611386858335602085016112ab565b6020840152604084013591508082111561139f57600080fd5b508201601f810184136113b157600080fd5b6113c0848235602084016112ab565b60408301525092915050565b6000806000606084860312156113e157600080fd5b833567ffffffffffffffff808211156113f957600080fd5b61140587838801611321565b9450602086013591508082111561141b57600080fd5b5061142886828701611321565b925050604084013590509250925092565b6000806040838503121561144c57600080fd5b823567ffffffffffffffff81111561146357600080fd5b61146f85828601611321565b95602094909401359450505050565b60008060006060848603121561149357600080fd5b61149c846111e8565b9250602084013567ffffffffffffffff8111156114b857600080fd5b61142886828701611321565b600080604083850312156114d757600080fd5b6114e0836111e8565b91506114ee602084016111e8565b90509250929050565b634e487b7160e01b600052602160045260246000fd5b8181038181111561018657634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052603160045260246000fd5b600181811c9082168061156e57607f821691505b60208210810361158e57634e487b7160e01b600052602260045260246000fd5b5091905056fe19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc00",
}

// WalletLinkABI is the input ABI used to generate the binding from.
// Deprecated: Use WalletLinkMetaData.ABI instead.
var WalletLinkABI = WalletLinkMetaData.ABI

// WalletLinkBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use WalletLinkMetaData.Bin instead.
var WalletLinkBin = WalletLinkMetaData.Bin

// DeployWalletLink deploys a new Ethereum contract, binding an instance of WalletLink to it.
func DeployWalletLink(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *WalletLink, error) {
	parsed, err := WalletLinkMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(WalletLinkBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &WalletLink{WalletLinkCaller: WalletLinkCaller{contract: contract}, WalletLinkTransactor: WalletLinkTransactor{contract: contract}, WalletLinkFilterer: WalletLinkFilterer{contract: contract}}, nil
}

// WalletLink is an auto generated Go binding around an Ethereum contract.
type WalletLink struct {
	WalletLinkCaller     // Read-only binding to the contract
	WalletLinkTransactor // Write-only binding to the contract
	WalletLinkFilterer   // Log filterer for contract events
}

// WalletLinkCaller is an auto generated read-only Go binding around an Ethereum contract.
type WalletLinkCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WalletLinkTransactor is an auto generated write-only Go binding around an Ethereum contract.
type WalletLinkTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WalletLinkFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type WalletLinkFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WalletLinkSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type WalletLinkSession struct {
	Contract     *WalletLink       // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// WalletLinkCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type WalletLinkCallerSession struct {
	Contract *WalletLinkCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts     // Call options to use throughout this session
}

// WalletLinkTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type WalletLinkTransactorSession struct {
	Contract     *WalletLinkTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts     // Transaction auth options to use throughout this session
}

// WalletLinkRaw is an auto generated low-level Go binding around an Ethereum contract.
type WalletLinkRaw struct {
	Contract *WalletLink // Generic contract binding to access the raw methods on
}

// WalletLinkCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type WalletLinkCallerRaw struct {
	Contract *WalletLinkCaller // Generic read-only contract binding to access the raw methods on
}

// WalletLinkTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type WalletLinkTransactorRaw struct {
	Contract *WalletLinkTransactor // Generic write-only contract binding to access the raw methods on
}

// NewWalletLink creates a new instance of WalletLink, bound to a specific deployed contract.
func NewWalletLink(address common.Address, backend bind.ContractBackend) (*WalletLink, error) {
	contract, err := bindWalletLink(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &WalletLink{WalletLinkCaller: WalletLinkCaller{contract: contract}, WalletLinkTransactor: WalletLinkTransactor{contract: contract}, WalletLinkFilterer: WalletLinkFilterer{contract: contract}}, nil
}

// NewWalletLinkCaller creates a new read-only instance of WalletLink, bound to a specific deployed contract.
func NewWalletLinkCaller(address common.Address, caller bind.ContractCaller) (*WalletLinkCaller, error) {
	contract, err := bindWalletLink(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &WalletLinkCaller{contract: contract}, nil
}

// NewWalletLinkTransactor creates a new write-only instance of WalletLink, bound to a specific deployed contract.
func NewWalletLinkTransactor(address common.Address, transactor bind.ContractTransactor) (*WalletLinkTransactor, error) {
	contract, err := bindWalletLink(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &WalletLinkTransactor{contract: contract}, nil
}

// NewWalletLinkFilterer creates a new log filterer instance of WalletLink, bound to a specific deployed contract.
func NewWalletLinkFilterer(address common.Address, filterer bind.ContractFilterer) (*WalletLinkFilterer, error) {
	contract, err := bindWalletLink(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &WalletLinkFilterer{contract: contract}, nil
}

// bindWalletLink binds a generic wrapper to an already deployed contract.
func bindWalletLink(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := WalletLinkMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_WalletLink *WalletLinkRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _WalletLink.Contract.WalletLinkCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_WalletLink *WalletLinkRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WalletLink.Contract.WalletLinkTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_WalletLink *WalletLinkRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _WalletLink.Contract.WalletLinkTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_WalletLink *WalletLinkCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _WalletLink.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_WalletLink *WalletLinkTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WalletLink.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_WalletLink *WalletLinkTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _WalletLink.Contract.contract.Transact(opts, method, params...)
}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_WalletLink *WalletLinkCaller) CheckIfLinked(opts *bind.CallOpts, rootKey common.Address, wallet common.Address) (bool, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "checkIfLinked", rootKey, wallet)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_WalletLink *WalletLinkSession) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return _WalletLink.Contract.CheckIfLinked(&_WalletLink.CallOpts, rootKey, wallet)
}

// CheckIfLinked is a free data retrieval call binding the contract method 0x912b9758.
//
// Solidity: function checkIfLinked(address rootKey, address wallet) view returns(bool)
func (_WalletLink *WalletLinkCallerSession) CheckIfLinked(rootKey common.Address, wallet common.Address) (bool, error) {
	return _WalletLink.Contract.CheckIfLinked(&_WalletLink.CallOpts, rootKey, wallet)
}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address rootKey) view returns(uint256)
func (_WalletLink *WalletLinkCaller) GetLatestNonceForRootKey(opts *bind.CallOpts, rootKey common.Address) (*big.Int, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getLatestNonceForRootKey", rootKey)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address rootKey) view returns(uint256)
func (_WalletLink *WalletLinkSession) GetLatestNonceForRootKey(rootKey common.Address) (*big.Int, error) {
	return _WalletLink.Contract.GetLatestNonceForRootKey(&_WalletLink.CallOpts, rootKey)
}

// GetLatestNonceForRootKey is a free data retrieval call binding the contract method 0x20a00ac8.
//
// Solidity: function getLatestNonceForRootKey(address rootKey) view returns(uint256)
func (_WalletLink *WalletLinkCallerSession) GetLatestNonceForRootKey(rootKey common.Address) (*big.Int, error) {
	return _WalletLink.Contract.GetLatestNonceForRootKey(&_WalletLink.CallOpts, rootKey)
}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_WalletLink *WalletLinkCaller) GetRootKeyForWallet(opts *bind.CallOpts, wallet common.Address) (common.Address, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getRootKeyForWallet", wallet)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_WalletLink *WalletLinkSession) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return _WalletLink.Contract.GetRootKeyForWallet(&_WalletLink.CallOpts, wallet)
}

// GetRootKeyForWallet is a free data retrieval call binding the contract method 0xf8210398.
//
// Solidity: function getRootKeyForWallet(address wallet) view returns(address rootKey)
func (_WalletLink *WalletLinkCallerSession) GetRootKeyForWallet(wallet common.Address) (common.Address, error) {
	return _WalletLink.Contract.GetRootKeyForWallet(&_WalletLink.CallOpts, wallet)
}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkCaller) GetWalletsByRootKey(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getWalletsByRootKey", rootKey)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkSession) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return _WalletLink.Contract.GetWalletsByRootKey(&_WalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKey is a free data retrieval call binding the contract method 0x02345b98.
//
// Solidity: function getWalletsByRootKey(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkCallerSession) GetWalletsByRootKey(rootKey common.Address) ([]common.Address, error) {
	return _WalletLink.Contract.GetWalletsByRootKey(&_WalletLink.CallOpts, rootKey)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_WalletLink *WalletLinkTransactor) WalletLinkInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "__WalletLink_init")
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_WalletLink *WalletLinkSession) WalletLinkInit() (*types.Transaction, error) {
	return _WalletLink.Contract.WalletLinkInit(&_WalletLink.TransactOpts)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0x260a409d.
//
// Solidity: function __WalletLink_init() returns()
func (_WalletLink *WalletLinkTransactorSession) WalletLinkInit() (*types.Transaction, error) {
	return _WalletLink.Contract.WalletLinkInit(&_WalletLink.TransactOpts)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactor) LinkCallerToRootKey(opts *bind.TransactOpts, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "linkCallerToRootKey", rootWallet, nonce)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkSession) LinkCallerToRootKey(rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.LinkCallerToRootKey(&_WalletLink.TransactOpts, rootWallet, nonce)
}

// LinkCallerToRootKey is a paid mutator transaction binding the contract method 0x2f461453.
//
// Solidity: function linkCallerToRootKey((address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactorSession) LinkCallerToRootKey(rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.LinkCallerToRootKey(&_WalletLink.TransactOpts, rootWallet, nonce)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactor) LinkWalletToRootKey(opts *bind.TransactOpts, wallet IWalletLinkBaseLinkedWallet, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "linkWalletToRootKey", wallet, rootWallet, nonce)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkSession) LinkWalletToRootKey(wallet IWalletLinkBaseLinkedWallet, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.LinkWalletToRootKey(&_WalletLink.TransactOpts, wallet, rootWallet, nonce)
}

// LinkWalletToRootKey is a paid mutator transaction binding the contract method 0x243a7134.
//
// Solidity: function linkWalletToRootKey((address,bytes,string) wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactorSession) LinkWalletToRootKey(wallet IWalletLinkBaseLinkedWallet, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.LinkWalletToRootKey(&_WalletLink.TransactOpts, wallet, rootWallet, nonce)
}

// RemoveCallerLink is a paid mutator transaction binding the contract method 0x64899d98.
//
// Solidity: function removeCallerLink() returns()
func (_WalletLink *WalletLinkTransactor) RemoveCallerLink(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "removeCallerLink")
}

// RemoveCallerLink is a paid mutator transaction binding the contract method 0x64899d98.
//
// Solidity: function removeCallerLink() returns()
func (_WalletLink *WalletLinkSession) RemoveCallerLink() (*types.Transaction, error) {
	return _WalletLink.Contract.RemoveCallerLink(&_WalletLink.TransactOpts)
}

// RemoveCallerLink is a paid mutator transaction binding the contract method 0x64899d98.
//
// Solidity: function removeCallerLink() returns()
func (_WalletLink *WalletLinkTransactorSession) RemoveCallerLink() (*types.Transaction, error) {
	return _WalletLink.Contract.RemoveCallerLink(&_WalletLink.TransactOpts)
}

// RemoveLink is a paid mutator transaction binding the contract method 0x35d2fb64.
//
// Solidity: function removeLink(address wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactor) RemoveLink(opts *bind.TransactOpts, wallet common.Address, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "removeLink", wallet, rootWallet, nonce)
}

// RemoveLink is a paid mutator transaction binding the contract method 0x35d2fb64.
//
// Solidity: function removeLink(address wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkSession) RemoveLink(wallet common.Address, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.RemoveLink(&_WalletLink.TransactOpts, wallet, rootWallet, nonce)
}

// RemoveLink is a paid mutator transaction binding the contract method 0x35d2fb64.
//
// Solidity: function removeLink(address wallet, (address,bytes,string) rootWallet, uint256 nonce) returns()
func (_WalletLink *WalletLinkTransactorSession) RemoveLink(wallet common.Address, rootWallet IWalletLinkBaseLinkedWallet, nonce *big.Int) (*types.Transaction, error) {
	return _WalletLink.Contract.RemoveLink(&_WalletLink.TransactOpts, wallet, rootWallet, nonce)
}

// WalletLinkInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the WalletLink contract.
type WalletLinkInitializedIterator struct {
	Event *WalletLinkInitialized // Event containing the contract specifics and raw log

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
func (it *WalletLinkInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkInitialized)
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
		it.Event = new(WalletLinkInitialized)
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
func (it *WalletLinkInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkInitialized represents a Initialized event raised by the WalletLink contract.
type WalletLinkInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_WalletLink *WalletLinkFilterer) FilterInitialized(opts *bind.FilterOpts) (*WalletLinkInitializedIterator, error) {

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &WalletLinkInitializedIterator{contract: _WalletLink.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_WalletLink *WalletLinkFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *WalletLinkInitialized) (event.Subscription, error) {

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkInitialized)
				if err := _WalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_WalletLink *WalletLinkFilterer) ParseInitialized(log types.Log) (*WalletLinkInitialized, error) {
	event := new(WalletLinkInitialized)
	if err := _WalletLink.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WalletLinkInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the WalletLink contract.
type WalletLinkInterfaceAddedIterator struct {
	Event *WalletLinkInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *WalletLinkInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkInterfaceAdded)
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
		it.Event = new(WalletLinkInterfaceAdded)
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
func (it *WalletLinkInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkInterfaceAdded represents a InterfaceAdded event raised by the WalletLink contract.
type WalletLinkInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_WalletLink *WalletLinkFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*WalletLinkInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkInterfaceAddedIterator{contract: _WalletLink.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_WalletLink *WalletLinkFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *WalletLinkInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkInterfaceAdded)
				if err := _WalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_WalletLink *WalletLinkFilterer) ParseInterfaceAdded(log types.Log) (*WalletLinkInterfaceAdded, error) {
	event := new(WalletLinkInterfaceAdded)
	if err := _WalletLink.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WalletLinkInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the WalletLink contract.
type WalletLinkInterfaceRemovedIterator struct {
	Event *WalletLinkInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *WalletLinkInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkInterfaceRemoved)
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
		it.Event = new(WalletLinkInterfaceRemoved)
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
func (it *WalletLinkInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkInterfaceRemoved represents a InterfaceRemoved event raised by the WalletLink contract.
type WalletLinkInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_WalletLink *WalletLinkFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*WalletLinkInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkInterfaceRemovedIterator{contract: _WalletLink.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_WalletLink *WalletLinkFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *WalletLinkInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkInterfaceRemoved)
				if err := _WalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_WalletLink *WalletLinkFilterer) ParseInterfaceRemoved(log types.Log) (*WalletLinkInterfaceRemoved, error) {
	event := new(WalletLinkInterfaceRemoved)
	if err := _WalletLink.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WalletLinkLinkWalletToRootKeyIterator is returned from FilterLinkWalletToRootKey and is used to iterate over the raw logs and unpacked data for LinkWalletToRootKey events raised by the WalletLink contract.
type WalletLinkLinkWalletToRootKeyIterator struct {
	Event *WalletLinkLinkWalletToRootKey // Event containing the contract specifics and raw log

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
func (it *WalletLinkLinkWalletToRootKeyIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkLinkWalletToRootKey)
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
		it.Event = new(WalletLinkLinkWalletToRootKey)
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
func (it *WalletLinkLinkWalletToRootKeyIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkLinkWalletToRootKeyIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkLinkWalletToRootKey represents a LinkWalletToRootKey event raised by the WalletLink contract.
type WalletLinkLinkWalletToRootKey struct {
	Wallet  common.Address
	RootKey common.Address
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterLinkWalletToRootKey is a free log retrieval operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_WalletLink *WalletLinkFilterer) FilterLinkWalletToRootKey(opts *bind.FilterOpts, wallet []common.Address, rootKey []common.Address) (*WalletLinkLinkWalletToRootKeyIterator, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "LinkWalletToRootKey", walletRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkLinkWalletToRootKeyIterator{contract: _WalletLink.contract, event: "LinkWalletToRootKey", logs: logs, sub: sub}, nil
}

// WatchLinkWalletToRootKey is a free log subscription operation binding the contract event 0x64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b5721.
//
// Solidity: event LinkWalletToRootKey(address indexed wallet, address indexed rootKey)
func (_WalletLink *WalletLinkFilterer) WatchLinkWalletToRootKey(opts *bind.WatchOpts, sink chan<- *WalletLinkLinkWalletToRootKey, wallet []common.Address, rootKey []common.Address) (event.Subscription, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "LinkWalletToRootKey", walletRule, rootKeyRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkLinkWalletToRootKey)
				if err := _WalletLink.contract.UnpackLog(event, "LinkWalletToRootKey", log); err != nil {
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
func (_WalletLink *WalletLinkFilterer) ParseLinkWalletToRootKey(log types.Log) (*WalletLinkLinkWalletToRootKey, error) {
	event := new(WalletLinkLinkWalletToRootKey)
	if err := _WalletLink.contract.UnpackLog(event, "LinkWalletToRootKey", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WalletLinkRemoveLinkIterator is returned from FilterRemoveLink and is used to iterate over the raw logs and unpacked data for RemoveLink events raised by the WalletLink contract.
type WalletLinkRemoveLinkIterator struct {
	Event *WalletLinkRemoveLink // Event containing the contract specifics and raw log

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
func (it *WalletLinkRemoveLinkIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkRemoveLink)
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
		it.Event = new(WalletLinkRemoveLink)
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
func (it *WalletLinkRemoveLinkIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkRemoveLinkIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkRemoveLink represents a RemoveLink event raised by the WalletLink contract.
type WalletLinkRemoveLink struct {
	Wallet       common.Address
	SecondWallet common.Address
	Raw          types.Log // Blockchain specific contextual infos
}

// FilterRemoveLink is a free log retrieval operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_WalletLink *WalletLinkFilterer) FilterRemoveLink(opts *bind.FilterOpts, wallet []common.Address, secondWallet []common.Address) (*WalletLinkRemoveLinkIterator, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var secondWalletRule []interface{}
	for _, secondWalletItem := range secondWallet {
		secondWalletRule = append(secondWalletRule, secondWalletItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "RemoveLink", walletRule, secondWalletRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkRemoveLinkIterator{contract: _WalletLink.contract, event: "RemoveLink", logs: logs, sub: sub}, nil
}

// WatchRemoveLink is a free log subscription operation binding the contract event 0x9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da2.
//
// Solidity: event RemoveLink(address indexed wallet, address indexed secondWallet)
func (_WalletLink *WalletLinkFilterer) WatchRemoveLink(opts *bind.WatchOpts, sink chan<- *WalletLinkRemoveLink, wallet []common.Address, secondWallet []common.Address) (event.Subscription, error) {

	var walletRule []interface{}
	for _, walletItem := range wallet {
		walletRule = append(walletRule, walletItem)
	}
	var secondWalletRule []interface{}
	for _, secondWalletItem := range secondWallet {
		secondWalletRule = append(secondWalletRule, secondWalletItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "RemoveLink", walletRule, secondWalletRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkRemoveLink)
				if err := _WalletLink.contract.UnpackLog(event, "RemoveLink", log); err != nil {
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
func (_WalletLink *WalletLinkFilterer) ParseRemoveLink(log types.Log) (*WalletLinkRemoveLink, error) {
	event := new(WalletLinkRemoveLink)
	if err := _WalletLink.contract.UnpackLog(event, "RemoveLink", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
