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
	ABI: "[{\"type\":\"function\",\"name\":\"__WalletLink_init\",\"inputs\":[{\"name\":\"delegateRegistry\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"checkIfLinked\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getDefaultWallet\",\"inputs\":[{\"name\":\"rootWallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getDelegateByVersion\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getLatestNonceForRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRootKeyForWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKey\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getWalletsByRootKeyWithDelegations\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"wallets\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"linkCallerToRootKey\",\"inputs\":[{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"linkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeCallerLink\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"removeLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootWallet\",\"type\":\"tuple\",\"internalType\":\"structIWalletLinkBase.LinkedWallet\",\"components\":[{\"name\":\"addr\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"signature\",\"type\":\"bytes\",\"internalType\":\"bytes\"},{\"name\":\"message\",\"type\":\"string\",\"internalType\":\"string\"}]},{\"name\":\"nonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setDefaultWallet\",\"inputs\":[{\"name\":\"defaultWallet\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setDelegateByVersion\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"delegate\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"LinkThirdPartyDelegation\",\"inputs\":[{\"name\":\"delegator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"delegatedWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"LinkWalletToRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"RemoveLink\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"secondWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"SetDefaultWallet\",\"inputs\":[{\"name\":\"rootKey\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"defaultWallet\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignatureLength\",\"inputs\":[{\"name\":\"length\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ECDSAInvalidSignatureS\",\"inputs\":[{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAccountNonce\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"currentNonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToRootWallet\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__CannotLinkToSelf\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveDefaultWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__CannotRemoveRootWallet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__DefaultWalletAlreadySet\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__InvalidSignature\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__LinkAlreadyExists\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__LinkedToAnotherRootKey\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"WalletLink__MaxLinkedWalletsReached\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"WalletLink__NotLinked\",\"inputs\":[{\"name\":\"wallet\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"rootKey\",\"type\":\"address\",\"internalType\":\"address\"}]}]",
	Bin: "0x608060405234801561001057600080fd5b5061001961001e565b6100c4565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff161561006a576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156100c157805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b611eed806100d36000396000f3fe608060405234801561001057600080fd5b50600436106100ea5760003560e01c806364899d981161008c578063a3f100e511610066578063a3f100e5146101f0578063baafda6b14610203578063d1093a3e14610216578063f82103981461022957600080fd5b806364899d98146101b25780638a56a2c5146101ba578063912b9758146101cd57600080fd5b8063243a7134116100c8578063243a7134146101645780632f4614531461017957806335d2fb641461018c5780633d005eab1461019f57600080fd5b806302345b98146100ef578063101659b11461011857806320a00ac814610143575b600080fd5b6101026100fd36600461196c565b61023c565b60405161010f9190611989565b60405180910390f35b61012b61012636600461196c565b61024d565b6040516001600160a01b03909116815260200161010f565b61015661015136600461196c565b61028e565b60405190815260200161010f565b610177610172366004611b6e565b6102cb565b005b610177610187366004611bdb565b6102db565b61017761019a366004611c20565b6102e9565b6101026101ad36600461196c565b6102f4565b6101776102ff565b6101776101c8366004611c68565b610309565b6101e06101db366004611c98565b610364565b604051901515815260200161010f565b6101776101fe36600461196c565b610377565b61017761021136600461196c565b6103df565b61012b610224366004611cc6565b6103e9565b61012b61023736600461196c565b610425565b606061024782610430565b92915050565b6001600160a01b0380821660009081527f19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc026020526040812054909116610247565b6001600160a01b03811660009081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c006020526040812054610247565b6102d6838383610461565b505050565b6102e582826105ef565b5050565b6102d683838361070d565b606061024782610914565b610307610c1c565b565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae300546001600160a01b0316331461035a576040516365f4906560e01b81523360048201526024015b60405180910390fd5b6102e58282610d5a565b60006103708383610da7565b9392505050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff166103c157604051630ef4733760e31b815260040160405180910390fd5b6103d163dd5f838160e01b610de8565b6103dc600282610d5a565b50565b6103dc3382610ec1565b60008181527f19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc0360205260408120546001600160a01b0316610247565b600061024782611050565b6001600160a01b0381166000908152600080516020611ecd833981519152602052604090206060906102479061108d565b82518251600080516020611ecd833981519152916104819183919061109a565b6000610496856040015186600001518561124d565b905060006104a3826112b7565b905084600001516001600160a01b03166104c18287602001516112e4565b6001600160a01b0316146104e857604051632af0041d60e11b815260040160405180910390fd5b6104fb856040015186600001518661124d565b91506000610508836112b7565b905086600001516001600160a01b03166105268289602001516112e4565b6001600160a01b03161461054d57604051632af0041d60e11b815260040160405180910390fd5b8551610559908661130e565b865186516001600160a01b0316600090815260208690526040902061057d91611380565b50855187516001600160a01b03908116600090815260018701602052604080822080546001600160a01b0319169484169490941790935588518a51935190831693909216917f64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b57219190a350505050505050565b8151600080516020611ecd833981519152903390610610908390839061109a565b60006106218560400151838661124d565b9050600061062e826112b7565b905085600001516001600160a01b031661064c8288602001516112e4565b6001600160a01b03161461067357604051632af0041d60e11b815260040160405180910390fd5b855161067f908661130e565b85516001600160a01b031660009081526020859052604090206106a29084611380565b5085516001600160a01b03848116600081815260018801602052604080822080546001600160a01b0319169585169590951790945589519351939092169290917f64126824352170c4025060d1f6e215159635e4b08e649830695f26ef6d2b572191a3505050505050565b600080516020611ecd8339815191526001600160a01b038416158061073a575082516001600160a01b0316155b1561075857604051636df3f5c360e01b815260040160405180910390fd5b82600001516001600160a01b0316846001600160a01b03160361078e576040516333976e3b60e11b815260040160405180910390fd5b82516001600160a01b03858116600090815260018401602052604090205481169116146107e4578251604051635e300c8360e01b81526001600160a01b0380871660048301529091166024820152604401610351565b82516001600160a01b0390811660009081526002830160205260409020548186169116036108255760405163d51f04c160e01b815260040160405180910390fd5b60006108368460400151868561124d565b90506000610843826112b7565b905084600001516001600160a01b03166108618287602001516112e4565b6001600160a01b03161461088857604051632af0041d60e11b815260040160405180910390fd5b8451610894908561130e565b6001600160a01b038087166000908152600185016020908152604080832080546001600160a01b031916905588519093168252859052206108d59087611395565b5060405133906001600160a01b038816907f9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da290600090a3505050505050565b7f989d2388c6a5fc3dee13258ddf735b250fbeb82643bfc0ba04212219b3139c7b546001600160a01b038281166000908152600080516020611ecd833981519152602081905260408220606094919390911691610970826113aa565b905080600003610993575050604080516000815260208101909152949350505050565b600061099e8361108d565b90508160005b83811015610aaf576000866001600160a01b03166342f87c258584815181106109cf576109cf611cdf565b60200260200101516040518263ffffffff1660e01b8152600401610a0291906001600160a01b0391909116815260200190565b600060405180830381865afa158015610a1f573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f19168201604052610a479190810190611d05565b805190915060005b81811015610aa1576001838281518110610a6b57610a6b611cdf565b6020026020010151600001516005811115610a8857610a88611e24565b03610a9957610a9685611e50565b94505b600101610a4f565b5050508060010190506109a4565b508067ffffffffffffffff811115610ac957610ac96119d6565b604051908082528060200260200182016040528015610af2578160200160208202803683370190505b5096506020870160208301602085028083828460045afa50505060208402016040528260005b84811015610c0f576000876001600160a01b03166342f87c25868481518110610b4357610b43611cdf565b60200260200101516040518263ffffffff1660e01b8152600401610b7691906001600160a01b0391909116815260200190565b600060405180830381865afa158015610b93573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f19168201604052610bbb9190810190611d05565b80519091506020808301908c0160005b83811015610bff57602081028301516001815103610bf6576040810151602089028401526001880197505b50600101610bcb565b5050508260010192505050610b18565b5050505050505050919050565b3360008181527f19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc016020526040902054600080516020611ecd83398151915291906001600160a01b031680610c9657604051635e300c8360e01b81526001600160a01b03808416600483015282166024820152604401610351565b6001600160a01b038181166000908152600285016020526040902054818416911603610cd55760405163d51f04c160e01b815260040160405180910390fd5b6001600160a01b038083166000908152600185016020908152604080832080546001600160a01b0319169055928416825285905220610d149083611395565b50806001600160a01b0316826001600160a01b03167f9a9d98629b39adf596077fc95a0712ba55c38f40a354e99d366a10f9c3e27da260405160405180910390a3505050565b60009182527f19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc03602052604090912080546001600160a01b0319166001600160a01b03909216919091179055565b6001600160a01b0390811660009081527f19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc016020526040902054811691161490565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff16610e70576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff19166001179055610e89565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b6001600160a01b038116610ee857604051636df3f5c360e01b815260040160405180910390fd5b6000610ef382611050565b90506001600160a01b038116610f2f57604051635e300c8360e01b81526001600160a01b03808416600483015282166024820152604401610351565b610f398184610da7565b158015610f585750806001600160a01b0316836001600160a01b031614155b15610f8957604051635e300c8360e01b81526001600160a01b03808516600483015282166024820152604401610351565b6001600160a01b0381811660009081527f19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc026020526040902054600080516020611ecd83398151915291848116911603610ff557604051632febf33760e01b815260040160405180910390fd5b6001600160a01b03828116600081815260028401602052604080822080546001600160a01b0319169488169485179055517f63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db5550369190a350505050565b6001600160a01b0390811660009081527f19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc0160205260409020541690565b60606000610370836113b4565b6001600160a01b03821615806110b757506001600160a01b038116155b156110d557604051636df3f5c360e01b815260040160405180910390fd5b806001600160a01b0316826001600160a01b0316036111075760405163848ba26d60e01b815260040160405180910390fd5b6001600160a01b0382811660009081526001850160205260409020541615611155576040516314790b7f60e01b81526001600160a01b03808416600483015282166024820152604401610351565b6001600160a01b03818116600090815260018501602052604090205416156111b8576001600160a01b038181166000908152600185016020526040908190205490516347227b5d60e01b8152848316600482015291166024820152604401610351565b6001600160a01b03821660009081526020849052604081206111d9906113aa565b111561120b57604051637b815eed60e11b81526001600160a01b03808416600483015282166024820152604401610351565b6001600160a01b0381166000908152602084905260409020600a9061122f906113aa565b106102d657604051634c8780db60e01b815260040160405180910390fd5b8251602093840120604080517f6bb89d031fcd292ecd4c0e6855878b7165cebc3a2f35bc6bbac48c088dd8325c81870152808201929092526001600160a01b039390931660608201526080808201929092528251808203909201825260a001909152805191012090565b60006102476112c4611410565b8360405161190160f01b8152600281019290925260228201526042902090565b6000806000806112f4868661141f565b925092509250611304828261146c565b5090949350505050565b6001600160a01b03821660009081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c00602052604090208054600181019091558181146102d6576040516301d4b62360e61b81526001600160a01b038416600482015260248101829052604401610351565b6000610370836001600160a01b038416611525565b6000610370836001600160a01b038416611574565b6000610247825490565b60608160000180548060200260200160405190810160405280929190818152602001828054801561140457602002820191906000526020600020905b8154815260200190600101908083116113f0575b50505050509050919050565b600061141a611667565b905090565b600080600083516041036114595760208401516040850151606086015160001a61144b888285856116db565b955095509550505050611465565b50508151600091506002905b9250925092565b600082600381111561148057611480611e24565b03611489575050565b600182600381111561149d5761149d611e24565b036114bb5760405163f645eedf60e01b815260040160405180910390fd5b60028260038111156114cf576114cf611e24565b036114f05760405163fce698f760e01b815260048101829052602401610351565b600382600381111561150457611504611e24565b036102e5576040516335e2f38360e21b815260048101829052602401610351565b600081815260018301602052604081205461156c57508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610247565b506000610247565b6000818152600183016020526040812054801561165d576000611598600183611e69565b85549091506000906115ac90600190611e69565b90508082146116115760008660000182815481106115cc576115cc611cdf565b90600052602060002001549050808760000184815481106115ef576115ef611cdf565b6000918252602080832090910192909255918252600188019052604090208390555b855486908061162257611622611e7c565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050610247565b6000915050610247565b60007f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f6116926117aa565b61169a611822565b60408051602081019490945283019190915260608201524660808201523060a082015260c00160405160208183030381529060405280519060200120905090565b600080807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a084111561171657506000915060039050826117a0565b604080516000808252602082018084528a905260ff891692820192909252606081018790526080810186905260019060a0016020604051602081039080840390855afa15801561176a573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b038116611796575060009250600191508290506117a0565b9250600091508190505b9450945094915050565b6000806117b5611872565b8051909150156117cc578051602090910120919050565b7f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a6005480156117fa5792915050565b7fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4709250505090565b60008061182d611926565b805190915015611844578051602090910120919050565b7f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a6015480156117fa5792915050565b60607f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a60060020180546118a390611e92565b80601f01602080910402602001604051908101604052809291908181526020018280546118cf90611e92565b801561191c5780601f106118f15761010080835404028352916020019161191c565b820191906000526020600020905b8154815290600101906020018083116118ff57829003601f168201915b5050505050905090565b60607f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a60060030180546118a390611e92565b6001600160a01b03811681146103dc57600080fd5b60006020828403121561197e57600080fd5b813561037081611957565b6020808252825182820181905260009190848201906040850190845b818110156119ca5783516001600160a01b0316835292840192918401916001016119a5565b50909695505050505050565b634e487b7160e01b600052604160045260246000fd5b6040516060810167ffffffffffffffff81118282101715611a0f57611a0f6119d6565b60405290565b60405160e0810167ffffffffffffffff81118282101715611a0f57611a0f6119d6565b604051601f8201601f1916810167ffffffffffffffff81118282101715611a6157611a616119d6565b604052919050565b600067ffffffffffffffff831115611a8357611a836119d6565b611a96601f8401601f1916602001611a38565b9050828152838383011115611aaa57600080fd5b828260208301376000602084830101529392505050565b600060608284031215611ad357600080fd5b611adb6119ec565b90508135611ae881611957565b8152602082013567ffffffffffffffff80821115611b0557600080fd5b818401915084601f830112611b1957600080fd5b611b2885833560208501611a69565b60208401526040840135915080821115611b4157600080fd5b508201601f81018413611b5357600080fd5b611b6284823560208401611a69565b60408301525092915050565b600080600060608486031215611b8357600080fd5b833567ffffffffffffffff80821115611b9b57600080fd5b611ba787838801611ac1565b94506020860135915080821115611bbd57600080fd5b50611bca86828701611ac1565b925050604084013590509250925092565b60008060408385031215611bee57600080fd5b823567ffffffffffffffff811115611c0557600080fd5b611c1185828601611ac1565b95602094909401359450505050565b600080600060608486031215611c3557600080fd5b8335611c4081611957565b9250602084013567ffffffffffffffff811115611c5c57600080fd5b611bca86828701611ac1565b60008060408385031215611c7b57600080fd5b823591506020830135611c8d81611957565b809150509250929050565b60008060408385031215611cab57600080fd5b8235611cb681611957565b91506020830135611c8d81611957565b600060208284031215611cd857600080fd5b5035919050565b634e487b7160e01b600052603260045260246000fd5b8051611d0081611957565b919050565b60006020808385031215611d1857600080fd5b825167ffffffffffffffff80821115611d3057600080fd5b818501915085601f830112611d4457600080fd5b815181811115611d5657611d566119d6565b611d64848260051b01611a38565b818152848101925060e0918202840185019188831115611d8357600080fd5b938501935b82851015611e185780858a031215611da05760008081fd5b611da8611a15565b855160068110611db85760008081fd5b8152611dc5868801611cf5565b878201526040611dd6818801611cf5565b90820152606086810151908201526080611df1818801611cf5565b9082015260a0868101519082015260c0808701519082015284529384019392850192611d88565b50979650505050505050565b634e487b7160e01b600052602160045260246000fd5b634e487b7160e01b600052601160045260246000fd5b600060018201611e6257611e62611e3a565b5060010190565b8181038181111561024757610247611e3a565b634e487b7160e01b600052603160045260246000fd5b600181811c90821680611ea657607f821691505b602082108103611ec657634e487b7160e01b600052602260045260246000fd5b5091905056fe19511ce7944c192b1007be99b82019218d1decfc513f05239612743360a0dc00",
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

// GetDefaultWallet is a free data retrieval call binding the contract method 0x101659b1.
//
// Solidity: function getDefaultWallet(address rootWallet) view returns(address)
func (_WalletLink *WalletLinkCaller) GetDefaultWallet(opts *bind.CallOpts, rootWallet common.Address) (common.Address, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getDefaultWallet", rootWallet)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetDefaultWallet is a free data retrieval call binding the contract method 0x101659b1.
//
// Solidity: function getDefaultWallet(address rootWallet) view returns(address)
func (_WalletLink *WalletLinkSession) GetDefaultWallet(rootWallet common.Address) (common.Address, error) {
	return _WalletLink.Contract.GetDefaultWallet(&_WalletLink.CallOpts, rootWallet)
}

// GetDefaultWallet is a free data retrieval call binding the contract method 0x101659b1.
//
// Solidity: function getDefaultWallet(address rootWallet) view returns(address)
func (_WalletLink *WalletLinkCallerSession) GetDefaultWallet(rootWallet common.Address) (common.Address, error) {
	return _WalletLink.Contract.GetDefaultWallet(&_WalletLink.CallOpts, rootWallet)
}

// GetDelegateByVersion is a free data retrieval call binding the contract method 0xd1093a3e.
//
// Solidity: function getDelegateByVersion(uint256 version) view returns(address)
func (_WalletLink *WalletLinkCaller) GetDelegateByVersion(opts *bind.CallOpts, version *big.Int) (common.Address, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getDelegateByVersion", version)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetDelegateByVersion is a free data retrieval call binding the contract method 0xd1093a3e.
//
// Solidity: function getDelegateByVersion(uint256 version) view returns(address)
func (_WalletLink *WalletLinkSession) GetDelegateByVersion(version *big.Int) (common.Address, error) {
	return _WalletLink.Contract.GetDelegateByVersion(&_WalletLink.CallOpts, version)
}

// GetDelegateByVersion is a free data retrieval call binding the contract method 0xd1093a3e.
//
// Solidity: function getDelegateByVersion(uint256 version) view returns(address)
func (_WalletLink *WalletLinkCallerSession) GetDelegateByVersion(version *big.Int) (common.Address, error) {
	return _WalletLink.Contract.GetDelegateByVersion(&_WalletLink.CallOpts, version)
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

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkCaller) GetWalletsByRootKeyWithDelegations(opts *bind.CallOpts, rootKey common.Address) ([]common.Address, error) {
	var out []interface{}
	err := _WalletLink.contract.Call(opts, &out, "getWalletsByRootKeyWithDelegations", rootKey)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkSession) GetWalletsByRootKeyWithDelegations(rootKey common.Address) ([]common.Address, error) {
	return _WalletLink.Contract.GetWalletsByRootKeyWithDelegations(&_WalletLink.CallOpts, rootKey)
}

// GetWalletsByRootKeyWithDelegations is a free data retrieval call binding the contract method 0x3d005eab.
//
// Solidity: function getWalletsByRootKeyWithDelegations(address rootKey) view returns(address[] wallets)
func (_WalletLink *WalletLinkCallerSession) GetWalletsByRootKeyWithDelegations(rootKey common.Address) ([]common.Address, error) {
	return _WalletLink.Contract.GetWalletsByRootKeyWithDelegations(&_WalletLink.CallOpts, rootKey)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0xa3f100e5.
//
// Solidity: function __WalletLink_init(address delegateRegistry) returns()
func (_WalletLink *WalletLinkTransactor) WalletLinkInit(opts *bind.TransactOpts, delegateRegistry common.Address) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "__WalletLink_init", delegateRegistry)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0xa3f100e5.
//
// Solidity: function __WalletLink_init(address delegateRegistry) returns()
func (_WalletLink *WalletLinkSession) WalletLinkInit(delegateRegistry common.Address) (*types.Transaction, error) {
	return _WalletLink.Contract.WalletLinkInit(&_WalletLink.TransactOpts, delegateRegistry)
}

// WalletLinkInit is a paid mutator transaction binding the contract method 0xa3f100e5.
//
// Solidity: function __WalletLink_init(address delegateRegistry) returns()
func (_WalletLink *WalletLinkTransactorSession) WalletLinkInit(delegateRegistry common.Address) (*types.Transaction, error) {
	return _WalletLink.Contract.WalletLinkInit(&_WalletLink.TransactOpts, delegateRegistry)
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

// SetDefaultWallet is a paid mutator transaction binding the contract method 0xbaafda6b.
//
// Solidity: function setDefaultWallet(address defaultWallet) returns()
func (_WalletLink *WalletLinkTransactor) SetDefaultWallet(opts *bind.TransactOpts, defaultWallet common.Address) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "setDefaultWallet", defaultWallet)
}

// SetDefaultWallet is a paid mutator transaction binding the contract method 0xbaafda6b.
//
// Solidity: function setDefaultWallet(address defaultWallet) returns()
func (_WalletLink *WalletLinkSession) SetDefaultWallet(defaultWallet common.Address) (*types.Transaction, error) {
	return _WalletLink.Contract.SetDefaultWallet(&_WalletLink.TransactOpts, defaultWallet)
}

// SetDefaultWallet is a paid mutator transaction binding the contract method 0xbaafda6b.
//
// Solidity: function setDefaultWallet(address defaultWallet) returns()
func (_WalletLink *WalletLinkTransactorSession) SetDefaultWallet(defaultWallet common.Address) (*types.Transaction, error) {
	return _WalletLink.Contract.SetDefaultWallet(&_WalletLink.TransactOpts, defaultWallet)
}

// SetDelegateByVersion is a paid mutator transaction binding the contract method 0x8a56a2c5.
//
// Solidity: function setDelegateByVersion(uint256 version, address delegate) returns()
func (_WalletLink *WalletLinkTransactor) SetDelegateByVersion(opts *bind.TransactOpts, version *big.Int, delegate common.Address) (*types.Transaction, error) {
	return _WalletLink.contract.Transact(opts, "setDelegateByVersion", version, delegate)
}

// SetDelegateByVersion is a paid mutator transaction binding the contract method 0x8a56a2c5.
//
// Solidity: function setDelegateByVersion(uint256 version, address delegate) returns()
func (_WalletLink *WalletLinkSession) SetDelegateByVersion(version *big.Int, delegate common.Address) (*types.Transaction, error) {
	return _WalletLink.Contract.SetDelegateByVersion(&_WalletLink.TransactOpts, version, delegate)
}

// SetDelegateByVersion is a paid mutator transaction binding the contract method 0x8a56a2c5.
//
// Solidity: function setDelegateByVersion(uint256 version, address delegate) returns()
func (_WalletLink *WalletLinkTransactorSession) SetDelegateByVersion(version *big.Int, delegate common.Address) (*types.Transaction, error) {
	return _WalletLink.Contract.SetDelegateByVersion(&_WalletLink.TransactOpts, version, delegate)
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

// WalletLinkLinkThirdPartyDelegationIterator is returned from FilterLinkThirdPartyDelegation and is used to iterate over the raw logs and unpacked data for LinkThirdPartyDelegation events raised by the WalletLink contract.
type WalletLinkLinkThirdPartyDelegationIterator struct {
	Event *WalletLinkLinkThirdPartyDelegation // Event containing the contract specifics and raw log

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
func (it *WalletLinkLinkThirdPartyDelegationIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkLinkThirdPartyDelegation)
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
		it.Event = new(WalletLinkLinkThirdPartyDelegation)
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
func (it *WalletLinkLinkThirdPartyDelegationIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkLinkThirdPartyDelegationIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkLinkThirdPartyDelegation represents a LinkThirdPartyDelegation event raised by the WalletLink contract.
type WalletLinkLinkThirdPartyDelegation struct {
	Delegator       common.Address
	DelegatedWallet common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterLinkThirdPartyDelegation is a free log retrieval operation binding the contract event 0x940bab3abd8e37cf3cb3ed9f3dd4b7d6f8a22ec30d8f6e9d05f753e8d7879fba.
//
// Solidity: event LinkThirdPartyDelegation(address indexed delegator, address indexed delegatedWallet)
func (_WalletLink *WalletLinkFilterer) FilterLinkThirdPartyDelegation(opts *bind.FilterOpts, delegator []common.Address, delegatedWallet []common.Address) (*WalletLinkLinkThirdPartyDelegationIterator, error) {

	var delegatorRule []interface{}
	for _, delegatorItem := range delegator {
		delegatorRule = append(delegatorRule, delegatorItem)
	}
	var delegatedWalletRule []interface{}
	for _, delegatedWalletItem := range delegatedWallet {
		delegatedWalletRule = append(delegatedWalletRule, delegatedWalletItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "LinkThirdPartyDelegation", delegatorRule, delegatedWalletRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkLinkThirdPartyDelegationIterator{contract: _WalletLink.contract, event: "LinkThirdPartyDelegation", logs: logs, sub: sub}, nil
}

// WatchLinkThirdPartyDelegation is a free log subscription operation binding the contract event 0x940bab3abd8e37cf3cb3ed9f3dd4b7d6f8a22ec30d8f6e9d05f753e8d7879fba.
//
// Solidity: event LinkThirdPartyDelegation(address indexed delegator, address indexed delegatedWallet)
func (_WalletLink *WalletLinkFilterer) WatchLinkThirdPartyDelegation(opts *bind.WatchOpts, sink chan<- *WalletLinkLinkThirdPartyDelegation, delegator []common.Address, delegatedWallet []common.Address) (event.Subscription, error) {

	var delegatorRule []interface{}
	for _, delegatorItem := range delegator {
		delegatorRule = append(delegatorRule, delegatorItem)
	}
	var delegatedWalletRule []interface{}
	for _, delegatedWalletItem := range delegatedWallet {
		delegatedWalletRule = append(delegatedWalletRule, delegatedWalletItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "LinkThirdPartyDelegation", delegatorRule, delegatedWalletRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkLinkThirdPartyDelegation)
				if err := _WalletLink.contract.UnpackLog(event, "LinkThirdPartyDelegation", log); err != nil {
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

// ParseLinkThirdPartyDelegation is a log parse operation binding the contract event 0x940bab3abd8e37cf3cb3ed9f3dd4b7d6f8a22ec30d8f6e9d05f753e8d7879fba.
//
// Solidity: event LinkThirdPartyDelegation(address indexed delegator, address indexed delegatedWallet)
func (_WalletLink *WalletLinkFilterer) ParseLinkThirdPartyDelegation(log types.Log) (*WalletLinkLinkThirdPartyDelegation, error) {
	event := new(WalletLinkLinkThirdPartyDelegation)
	if err := _WalletLink.contract.UnpackLog(event, "LinkThirdPartyDelegation", log); err != nil {
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

// WalletLinkOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the WalletLink contract.
type WalletLinkOwnershipTransferredIterator struct {
	Event *WalletLinkOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *WalletLinkOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkOwnershipTransferred)
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
		it.Event = new(WalletLinkOwnershipTransferred)
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
func (it *WalletLinkOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkOwnershipTransferred represents a OwnershipTransferred event raised by the WalletLink contract.
type WalletLinkOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_WalletLink *WalletLinkFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*WalletLinkOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkOwnershipTransferredIterator{contract: _WalletLink.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_WalletLink *WalletLinkFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *WalletLinkOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkOwnershipTransferred)
				if err := _WalletLink.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_WalletLink *WalletLinkFilterer) ParseOwnershipTransferred(log types.Log) (*WalletLinkOwnershipTransferred, error) {
	event := new(WalletLinkOwnershipTransferred)
	if err := _WalletLink.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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

// WalletLinkSetDefaultWalletIterator is returned from FilterSetDefaultWallet and is used to iterate over the raw logs and unpacked data for SetDefaultWallet events raised by the WalletLink contract.
type WalletLinkSetDefaultWalletIterator struct {
	Event *WalletLinkSetDefaultWallet // Event containing the contract specifics and raw log

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
func (it *WalletLinkSetDefaultWalletIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WalletLinkSetDefaultWallet)
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
		it.Event = new(WalletLinkSetDefaultWallet)
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
func (it *WalletLinkSetDefaultWalletIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WalletLinkSetDefaultWalletIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WalletLinkSetDefaultWallet represents a SetDefaultWallet event raised by the WalletLink contract.
type WalletLinkSetDefaultWallet struct {
	RootKey       common.Address
	DefaultWallet common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterSetDefaultWallet is a free log retrieval operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_WalletLink *WalletLinkFilterer) FilterSetDefaultWallet(opts *bind.FilterOpts, rootKey []common.Address, defaultWallet []common.Address) (*WalletLinkSetDefaultWalletIterator, error) {

	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}
	var defaultWalletRule []interface{}
	for _, defaultWalletItem := range defaultWallet {
		defaultWalletRule = append(defaultWalletRule, defaultWalletItem)
	}

	logs, sub, err := _WalletLink.contract.FilterLogs(opts, "SetDefaultWallet", rootKeyRule, defaultWalletRule)
	if err != nil {
		return nil, err
	}
	return &WalletLinkSetDefaultWalletIterator{contract: _WalletLink.contract, event: "SetDefaultWallet", logs: logs, sub: sub}, nil
}

// WatchSetDefaultWallet is a free log subscription operation binding the contract event 0x63a3f19f9166855a56a40467088468f9ae049d32865102cf64b70444db555036.
//
// Solidity: event SetDefaultWallet(address indexed rootKey, address indexed defaultWallet)
func (_WalletLink *WalletLinkFilterer) WatchSetDefaultWallet(opts *bind.WatchOpts, sink chan<- *WalletLinkSetDefaultWallet, rootKey []common.Address, defaultWallet []common.Address) (event.Subscription, error) {

	var rootKeyRule []interface{}
	for _, rootKeyItem := range rootKey {
		rootKeyRule = append(rootKeyRule, rootKeyItem)
	}
	var defaultWalletRule []interface{}
	for _, defaultWalletItem := range defaultWallet {
		defaultWalletRule = append(defaultWalletRule, defaultWalletItem)
	}

	logs, sub, err := _WalletLink.contract.WatchLogs(opts, "SetDefaultWallet", rootKeyRule, defaultWalletRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WalletLinkSetDefaultWallet)
				if err := _WalletLink.contract.UnpackLog(event, "SetDefaultWallet", log); err != nil {
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
func (_WalletLink *WalletLinkFilterer) ParseSetDefaultWallet(log types.Log) (*WalletLinkSetDefaultWallet, error) {
	event := new(WalletLinkSetDefaultWallet)
	if err := _WalletLink.contract.UnpackLog(event, "SetDefaultWallet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
