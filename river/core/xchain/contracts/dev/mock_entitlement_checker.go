// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package dev

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

// MockEntitlementCheckerMetaData contains all meta data concerning the MockEntitlementChecker contract.
var MockEntitlementCheckerMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"approvedOperators\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__EntitlementChecker_init\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__NodeOperator_init\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"getClaimAddressForOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getCommissionRate\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeAtIndex\",\"inputs\":[{\"name\":\"index\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getNodeCount\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getOperatorStatus\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint8\",\"internalType\":\"enumNodeOperatorStatus\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"getRandomNodes\",\"inputs\":[{\"name\":\"count\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isOperator\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"isValidNode\",\"inputs\":[{\"name\":\"node\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"registerNode\",\"inputs\":[{\"name\":\"node\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"registerOperator\",\"inputs\":[{\"name\":\"claimer\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"requestEntitlementCheck\",\"inputs\":[{\"name\":\"callerAddress\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"nodes\",\"type\":\"address[]\",\"internalType\":\"address[]\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setClaimAddressForOperator\",\"inputs\":[{\"name\":\"claimer\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setCommissionRate\",\"inputs\":[{\"name\":\"rateBps\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"setOperatorStatus\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"newStatus\",\"type\":\"uint8\",\"internalType\":\"enumNodeOperatorStatus\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"unregisterNode\",\"inputs\":[{\"name\":\"node\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ApprovalForAll\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"approved\",\"type\":\"bool\",\"indexed\":false,\"internalType\":\"bool\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"ConsecutiveTransfer\",\"inputs\":[{\"name\":\"fromTokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"},{\"name\":\"toTokenId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"EntitlementCheckRequested\",\"inputs\":[{\"name\":\"callerAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"contractAddress\",\"type\":\"address\",\"indexed\":false,\"internalType\":\"address\"},{\"name\":\"transactionId\",\"type\":\"bytes32\",\"indexed\":false,\"internalType\":\"bytes32\"},{\"name\":\"roleId\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"},{\"name\":\"selectedNodes\",\"type\":\"address[]\",\"indexed\":false,\"internalType\":\"address[]\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeRegistered\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"NodeUnregistered\",\"inputs\":[{\"name\":\"nodeAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorClaimAddressChanged\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"claimAddress\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorCommissionChanged\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"commission\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorRegistered\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OperatorStatusChanged\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newStatus\",\"type\":\"uint8\",\"indexed\":true,\"internalType\":\"enumNodeOperatorStatus\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"OwnershipTransferred\",\"inputs\":[{\"name\":\"previousOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"newOwner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"tokenId\",\"type\":\"uint256\",\"indexed\":true,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ApprovalCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"ApprovalQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"BalanceQueryForZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InsufficientNumberOfNodes\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InvalidNodeOperator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_InvalidOperator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NodeAlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"EntitlementChecker_NodeNotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintERC2309QuantityExceedsLimit\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"MintZeroQuantity\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__AlreadyDelegated\",\"inputs\":[{\"name\":\"operator\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"NodeOperator__AlreadyRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__ClaimAddressNotChanged\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__InvalidAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__InvalidCommissionRate\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__InvalidOperator\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__InvalidSpace\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__InvalidStakeRequirement\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__InvalidStatusTransition\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__NotClaimer\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__NotEnoughStake\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__NotRegistered\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__NotTransferable\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"NodeOperator__StatusNotChanged\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Ownable__NotOwner\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Ownable__ZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnerQueryForNonexistentToken\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"OwnershipNotInitializedForExtraData\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferCallerNotOwnerNorApproved\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferFromIncorrectOwner\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToNonERC721ReceiverImplementer\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"TransferToZeroAddress\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"URIQueryForNonexistentToken\",\"inputs\":[]}]",
	Bin: "0x60806040523480156200001157600080fd5b5060405162001e2538038062001e258339810160408190526200003491620005ae565b6200003e62000225565b62000050632ac4fee960e21b620002cd565b7f988e8266be98e92aff755bdd688f8f4a2421e26daa6089c7e2668053a3bf55006200007e336001620003ad565b60005b82518110156200021c57620000b7838281518110620000a457620000a462000680565b6020908102919091010151839062000509565b506001826002016000858481518110620000d557620000d562000680565b6020908102919091018101516001600160a01b03168252810191909152604001600020805460ff1916600183600381111562000115576200011562000696565b02179055503382600401600085848151811062000136576200013662000680565b60200260200101516001600160a01b03166001600160a01b0316815260200190815260200160002060006101000a8154816001600160a01b0302191690836001600160a01b03160217905550620001c08382815181106200019b576200019b62000680565b6020908102919091018101513360009081526005860190925260409091209062000509565b50828181518110620001d657620001d662000680565b60200260200101516001600160a01b03167f4d0eb1f4bac8744fd2be119845e23b3befc88094b42bcda1204c65694a00f9e560405160405180910390a260010162000081565b505050620006ac565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff161562000272576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff9081161015620002ca57805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff1615156001146200035c576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff1916600117905562000375565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b7f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df00546000829003620003f25760405163b562e8dd60e01b815260040160405180910390fd5b6001600160a01b03831660008181527f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df056020908152604080832080546801000000000000000188020190558483527f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df0490915281206001851460e11b4260a01b1783179055828401908390839060008051602062001e058339815191528180a4600183015b818114620004bf578083600060008051602062001e05833981519152600080a460010162000496565b5081600003620004e157604051622e076360e81b815260040160405180910390fd5b7f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df005550505050565b600062000520836001600160a01b03841662000529565b90505b92915050565b6000818152600183016020526040812054620005725750815460018181018455600084815260208082209093018490558454848252828601909352604090209190915562000523565b50600062000523565b634e487b7160e01b600052604160045260246000fd5b80516001600160a01b0381168114620005a957600080fd5b919050565b60006020808385031215620005c257600080fd5b82516001600160401b0380821115620005da57600080fd5b818501915085601f830112620005ef57600080fd5b8151818111156200060457620006046200057b565b8060051b604051601f19603f830116810181811085821117156200062c576200062c6200057b565b6040529182528482019250838101850191888311156200064b57600080fd5b938501935b828510156200067457620006648562000591565b8452938501939285019262000650565b98975050505050505050565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052602160045260246000fd5b61174980620006bc6000396000f3fe608060405234801561001057600080fd5b506004361061010b5760003560e01c806359f12a26116100a2578063a33d1ccb11610071578063a33d1ccb14610228578063c5e41cf614610230578063e0cc26a214610243578063e97cc6f61461028b578063fd39105a146102d657600080fd5b806359f12a26146101cc578063672d7a0d146101df5780636d70f7ae146101f25780639ebd11ef1461021557600080fd5b80633c59f126116100de5780633c59f1261461015b5780634463ba8f146101865780634f84544514610199578063541da4e5146101b957600080fd5b806319fac8fd146101105780633682a4501461012557806339bf397e1461013857806339dc5b3e14610153575b600080fd5b61012361011e3660046113e2565b61032e565b005b610123610133366004611417565b6103c7565b6101406104c4565b6040519081526020015b60405180910390f35b6101236104e4565b61016e6101693660046113e2565b610540565b6040516001600160a01b03909116815260200161014a565b610123610194366004611432565b6105b4565b6101ac6101a73660046113e2565b61091a565b60405161014a91906114b2565b6101236101c73660046114db565b61092b565b6101236101da3660046115c4565b610970565b6101236101ed366004611417565b610b2c565b610205610200366004611417565b610bf9565b604051901515815260200161014a565b610205610223366004611417565b610c18565b610123610c2f565b61012361023e366004611417565b610c89565b610140610251366004611417565b6001600160a01b031660009081527f988e8266be98e92aff755bdd688f8f4a2421e26daa6089c7e2668053a3bf5503602052604090205490565b61016e610299366004611417565b6001600160a01b0390811660009081527f988e8266be98e92aff755bdd688f8f4a2421e26daa6089c7e2668053a3bf550460205260409020541690565b6103216102e4366004611417565b6001600160a01b031660009081527f988e8266be98e92aff755bdd688f8f4a2421e26daa6089c7e2668053a3bf5502602052604090205460ff1690565b60405161014a919061160d565b6000805160206117298339815191526103478133610d8c565b610364576040516306e0839760e01b815260040160405180910390fd5b6127108211156103875760405163caf6558b60e01b815260040160405180910390fd5b336000818152600383016020526040808220859055518492917f3f8e6b052699b5c8512c54ad8f8c79ddbf0486d3263c519f20bdbb42cd4bd6da91a35050565b6001600160a01b0381166103ee576040516330bdf2f160e21b815260040160405180910390fd5b6000805160206117298339815191526104078133610d8c565b1561042557604051632e86c00360e11b815260040160405180910390fd5b610430336001610dad565b61043a8133610f27565b503360008181526002830160209081526040808320805460ff1916600117905560048501825280832080546001600160a01b0388166001600160a01b03199091168117909155835260058501909152902061049491610f27565b5060405133907f4d0eb1f4bac8744fd2be119845e23b3befc88094b42bcda1204c65694a00f9e590600090a25050565b60006000805160206117098339815191526104de81610f3c565b91505090565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff1661052e57604051630ef4733760e31b815260040160405180910390fd5b61053e630882d3fb60e21b610f46565b565b600060008051602061170983398151915261055a81610f3c565b83106105a35760405162461bcd60e51b8152602060048201526013602482015272496e646578206f7574206f6620626f756e647360681b60448201526064015b60405180910390fd5b6105ad8184611024565b9392505050565b7f4675fa8241f86f37157864d3d49b85ad4b164352c516da28e1678a90470ae300546001600160a01b03163314610600576040516365f4906560e01b815233600482015260240161059a565b6001600160a01b038216610627576040516330bdf2f160e21b815260040160405180910390fd5b6000805160206117298339815191526106408184610d8c565b61065d576040516306e0839760e01b815260040160405180910390fd5b6001600160a01b038316600090815260028201602052604090205460ff1682600381111561068d5761068d6115f7565b81600381111561069f5761069f6115f7565b036106bd576040516318324e6f60e01b815260040160405180910390fd5b60008160038111156106d1576106d16115f7565b1480156106f0575060018360038111156106ed576106ed6115f7565b14155b1561070e5760405163184186fd60e01b815260040160405180910390fd5b6001816003811115610722576107226115f7565b1480156107415750600283600381111561073e5761073e6115f7565b14155b1561075f5760405163184186fd60e01b815260040160405180910390fd5b6002816003811115610773576107736115f7565b1480156107af5750600083600381111561078f5761078f6115f7565b141580156107af575060038360038111156107ac576107ac6115f7565b14155b156107cd5760405163184186fd60e01b815260040160405180910390fd5b60038160038111156107e1576107e16115f7565b14801561081d575060008360038111156107fd576107fd6115f7565b1415801561081d5750600283600381111561081a5761081a6115f7565b14155b1561083b5760405163184186fd60e01b815260040160405180910390fd5b600383600381111561084f5761084f6115f7565b03610876576001600160a01b03841660009081526006830160205260409020429055610892565b6001600160a01b03841660009081526006830160205260408120555b6001600160a01b03841660009081526002830160205260409020805484919060ff191660018360038111156108c9576108c96115f7565b02179055508260038111156108e0576108e06115f7565b6040516001600160a01b038616907f7db2ae93d80cbf3cf719888318a0b92adff1855bcb01eda517607ed7b0f2183a90600090a350505050565b606061092582611030565b92915050565b7f4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f38433858585604051610962959493929190611635565b60405180910390a150505050565b3360008181527f988e8266be98e92aff755bdd688f8f4a2421e26daa6089c7e2668053a3bf5505602052604090208290600080516020611729833981519152906109ba9083610d8c565b6109d757604051637dd0ec8560e01b815260040160405180910390fd5b6000805160206117298339815191526109f08186610d8c565b610a0d576040516306e0839760e01b815260040160405180910390fd5b6001600160a01b03808616600090815260048301602052604090205481169087168103610a4d576040516366c7dd8d60e11b815260040160405180910390fd5b6001600160a01b03811660009081526005830160205260409020610a719087610d8c565b15610a9c576001600160a01b03811660009081526005830160205260409020610a9a9087611205565b505b6001600160a01b038681166000908152600484016020908152604080832080546001600160a01b031916948c16948517905592825260058501905220610ae29087610f27565b50866001600160a01b0316866001600160a01b03167f9acff66817c6f3fac3752bef82306270971b2a3da032a5cb876e05676bb8328860405160405180910390a350505050505050565b600080516020611729833981519152610b458133610d8c565b610b625760405163c931a1fb60e01b815260040160405180910390fd5b600080516020611709833981519152610b7b8184610d8c565b15610b995760405163d1922fc160e01b815260040160405180910390fd5b610ba38184610f27565b506001600160a01b038316600081815260028301602052604080822080546001600160a01b03191633179055517f564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf69190a2505050565b6000806000805160206117298339815191525b90506105ad8184610d8c565b600080600080516020611709833981519152610c0c565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16610c7957604051630ef4733760e31b815260040160405180910390fd5b61053e632ac4fee960e21b610f46565b6001600160a01b0380821660009081527f180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f60260260205260409020548291339160008051602061170983398151915291168214610cf65760405163fd2dc62f60e01b815260040160405180910390fd5b600080516020611709833981519152610d0f8186610d8c565b610d2c576040516317e3e0b960e01b815260040160405180910390fd5b610d368186611205565b506001600160a01b038516600081815260028301602052604080822080546001600160a01b0319169055517fb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a9190a25050505050565b6001600160a01b031660009081526001919091016020526040902054151590565b7f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df00546000829003610df15760405163b562e8dd60e01b815260040160405180910390fd5b6001600160a01b03831660008181527f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df056020908152604080832080546801000000000000000188020190558483527f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df0490915281206001851460e11b4260a01b178317905582840190839083907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8180a4600183015b818114610ede57808360007fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef600080a4600101610ea6565b5081600003610eff57604051622e076360e81b815260040160405180910390fd5b7f6569bde4a160c636ea8b8d11acb83a60d7fec0b8f2e09389306cba0e1340df005550505050565b60006105ad836001600160a01b03841661121a565b6000610925825490565b6001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff161515600114610fd3576001600160e01b0319811660009081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b0060205260409020805460ff19166001179055610fec565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f2290600090a250565b60006105ad8383611269565b6060600080516020611709833981519152600061104c82610f3c565b90508084111561106f57604051631762997d60e01b815260040160405180910390fd5b60008467ffffffffffffffff81111561108a5761108a6114c5565b6040519080825280602002602001820160405280156110b3578160200160208202803683370190505b50905060008267ffffffffffffffff8111156110d1576110d16114c5565b6040519080825280602002602001820160405280156110fa578160200160208202803683370190505b50905060005b8381101561112e578082828151811061111b5761111b61167a565b6020908102919091010152600101611100565b508260005b878110156111f95760006111478284611293565b905061117884828151811061115e5761115e61167a565b60200260200101518860000161102490919063ffffffff16565b85838151811061118a5761118a61167a565b6001600160a01b0390921660209283029190910190910152836111ae6001856116a6565b815181106111be576111be61167a565b60200260200101518482815181106111d8576111d861167a565b6020908102919091010152826111ed816116b9565b93505050600101611133565b50919695505050505050565b60006105ad836001600160a01b0384166112ef565b600081815260018301602052604081205461126157508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610925565b506000610925565b60008260000182815481106112805761128061167a565b9060005260206000200154905092915050565b604080514460208201524291810191909152606080820184905233901b6bffffffffffffffffffffffff1916608082015260009082906094016040516020818303038152906040528051906020012060001c6105ad91906116d0565b600081815260018301602052604081205480156113d85760006113136001836116a6565b8554909150600090611327906001906116a6565b905080821461138c5760008660000182815481106113475761134761167a565b906000526020600020015490508087600001848154811061136a5761136a61167a565b6000918252602080832090910192909255918252600188019052604090208390555b855486908061139d5761139d6116f2565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050610925565b6000915050610925565b6000602082840312156113f457600080fd5b5035919050565b80356001600160a01b038116811461141257600080fd5b919050565b60006020828403121561142957600080fd5b6105ad826113fb565b6000806040838503121561144557600080fd5b61144e836113fb565b915060208301356004811061146257600080fd5b809150509250929050565b60008151808452602080850194506020840160005b838110156114a75781516001600160a01b031687529582019590820190600101611482565b509495945050505050565b6020815260006105ad602083018461146d565b634e487b7160e01b600052604160045260246000fd5b600080600080608085870312156114f157600080fd5b6114fa856113fb565b9350602080860135935060408601359250606086013567ffffffffffffffff8082111561152657600080fd5b818801915088601f83011261153a57600080fd5b81358181111561154c5761154c6114c5565b8060051b604051601f19603f83011681018181108582111715611571576115716114c5565b60405291825284820192508381018501918b83111561158f57600080fd5b938501935b828510156115b4576115a5856113fb565b84529385019392850192611594565b989b979a50959850505050505050565b600080604083850312156115d757600080fd5b6115e0836113fb565b91506115ee602084016113fb565b90509250929050565b634e487b7160e01b600052602160045260246000fd5b602081016004831061162f57634e487b7160e01b600052602160045260246000fd5b91905290565b6001600160a01b03868116825285166020820152604081018490526060810183905260a06080820181905260009061166f9083018461146d565b979650505050505050565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b8181038181111561092557610925611690565b6000816116c8576116c8611690565b506000190190565b6000826116ed57634e487b7160e01b600052601260045260246000fd5b500690565b634e487b7160e01b600052603160045260246000fdfe180c1d0b9e5eeea9f2f078bc2712cd77acc6afea03b37705abe96dda6f602600988e8266be98e92aff755bdd688f8f4a2421e26daa6089c7e2668053a3bf5500ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
}

// MockEntitlementCheckerABI is the input ABI used to generate the binding from.
// Deprecated: Use MockEntitlementCheckerMetaData.ABI instead.
var MockEntitlementCheckerABI = MockEntitlementCheckerMetaData.ABI

// MockEntitlementCheckerBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockEntitlementCheckerMetaData.Bin instead.
var MockEntitlementCheckerBin = MockEntitlementCheckerMetaData.Bin

// DeployMockEntitlementChecker deploys a new Ethereum contract, binding an instance of MockEntitlementChecker to it.
func DeployMockEntitlementChecker(auth *bind.TransactOpts, backend bind.ContractBackend, approvedOperators []common.Address) (common.Address, *types.Transaction, *MockEntitlementChecker, error) {
	parsed, err := MockEntitlementCheckerMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockEntitlementCheckerBin), backend, approvedOperators)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockEntitlementChecker{MockEntitlementCheckerCaller: MockEntitlementCheckerCaller{contract: contract}, MockEntitlementCheckerTransactor: MockEntitlementCheckerTransactor{contract: contract}, MockEntitlementCheckerFilterer: MockEntitlementCheckerFilterer{contract: contract}}, nil
}

// MockEntitlementChecker is an auto generated Go binding around an Ethereum contract.
type MockEntitlementChecker struct {
	MockEntitlementCheckerCaller     // Read-only binding to the contract
	MockEntitlementCheckerTransactor // Write-only binding to the contract
	MockEntitlementCheckerFilterer   // Log filterer for contract events
}

// MockEntitlementCheckerCaller is an auto generated read-only Go binding around an Ethereum contract.
type MockEntitlementCheckerCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockEntitlementCheckerTransactor is an auto generated write-only Go binding around an Ethereum contract.
type MockEntitlementCheckerTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockEntitlementCheckerFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockEntitlementCheckerFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockEntitlementCheckerSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockEntitlementCheckerSession struct {
	Contract     *MockEntitlementChecker // Generic contract binding to set the session for
	CallOpts     bind.CallOpts           // Call options to use throughout this session
	TransactOpts bind.TransactOpts       // Transaction auth options to use throughout this session
}

// MockEntitlementCheckerCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockEntitlementCheckerCallerSession struct {
	Contract *MockEntitlementCheckerCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                 // Call options to use throughout this session
}

// MockEntitlementCheckerTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockEntitlementCheckerTransactorSession struct {
	Contract     *MockEntitlementCheckerTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                 // Transaction auth options to use throughout this session
}

// MockEntitlementCheckerRaw is an auto generated low-level Go binding around an Ethereum contract.
type MockEntitlementCheckerRaw struct {
	Contract *MockEntitlementChecker // Generic contract binding to access the raw methods on
}

// MockEntitlementCheckerCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockEntitlementCheckerCallerRaw struct {
	Contract *MockEntitlementCheckerCaller // Generic read-only contract binding to access the raw methods on
}

// MockEntitlementCheckerTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockEntitlementCheckerTransactorRaw struct {
	Contract *MockEntitlementCheckerTransactor // Generic write-only contract binding to access the raw methods on
}

// NewMockEntitlementChecker creates a new instance of MockEntitlementChecker, bound to a specific deployed contract.
func NewMockEntitlementChecker(address common.Address, backend bind.ContractBackend) (*MockEntitlementChecker, error) {
	contract, err := bindMockEntitlementChecker(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementChecker{MockEntitlementCheckerCaller: MockEntitlementCheckerCaller{contract: contract}, MockEntitlementCheckerTransactor: MockEntitlementCheckerTransactor{contract: contract}, MockEntitlementCheckerFilterer: MockEntitlementCheckerFilterer{contract: contract}}, nil
}

// NewMockEntitlementCheckerCaller creates a new read-only instance of MockEntitlementChecker, bound to a specific deployed contract.
func NewMockEntitlementCheckerCaller(address common.Address, caller bind.ContractCaller) (*MockEntitlementCheckerCaller, error) {
	contract, err := bindMockEntitlementChecker(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerCaller{contract: contract}, nil
}

// NewMockEntitlementCheckerTransactor creates a new write-only instance of MockEntitlementChecker, bound to a specific deployed contract.
func NewMockEntitlementCheckerTransactor(address common.Address, transactor bind.ContractTransactor) (*MockEntitlementCheckerTransactor, error) {
	contract, err := bindMockEntitlementChecker(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerTransactor{contract: contract}, nil
}

// NewMockEntitlementCheckerFilterer creates a new log filterer instance of MockEntitlementChecker, bound to a specific deployed contract.
func NewMockEntitlementCheckerFilterer(address common.Address, filterer bind.ContractFilterer) (*MockEntitlementCheckerFilterer, error) {
	contract, err := bindMockEntitlementChecker(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerFilterer{contract: contract}, nil
}

// bindMockEntitlementChecker binds a generic wrapper to an already deployed contract.
func bindMockEntitlementChecker(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockEntitlementCheckerMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockEntitlementChecker *MockEntitlementCheckerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockEntitlementChecker.Contract.MockEntitlementCheckerCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockEntitlementChecker *MockEntitlementCheckerRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.MockEntitlementCheckerTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockEntitlementChecker *MockEntitlementCheckerRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.MockEntitlementCheckerTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockEntitlementChecker *MockEntitlementCheckerCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockEntitlementChecker.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.contract.Transact(opts, method, params...)
}

// GetClaimAddressForOperator is a free data retrieval call binding the contract method 0xe97cc6f6.
//
// Solidity: function getClaimAddressForOperator(address operator) view returns(address)
func (_MockEntitlementChecker *MockEntitlementCheckerCaller) GetClaimAddressForOperator(opts *bind.CallOpts, operator common.Address) (common.Address, error) {
	var out []interface{}
	err := _MockEntitlementChecker.contract.Call(opts, &out, "getClaimAddressForOperator", operator)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetClaimAddressForOperator is a free data retrieval call binding the contract method 0xe97cc6f6.
//
// Solidity: function getClaimAddressForOperator(address operator) view returns(address)
func (_MockEntitlementChecker *MockEntitlementCheckerSession) GetClaimAddressForOperator(operator common.Address) (common.Address, error) {
	return _MockEntitlementChecker.Contract.GetClaimAddressForOperator(&_MockEntitlementChecker.CallOpts, operator)
}

// GetClaimAddressForOperator is a free data retrieval call binding the contract method 0xe97cc6f6.
//
// Solidity: function getClaimAddressForOperator(address operator) view returns(address)
func (_MockEntitlementChecker *MockEntitlementCheckerCallerSession) GetClaimAddressForOperator(operator common.Address) (common.Address, error) {
	return _MockEntitlementChecker.Contract.GetClaimAddressForOperator(&_MockEntitlementChecker.CallOpts, operator)
}

// GetCommissionRate is a free data retrieval call binding the contract method 0xe0cc26a2.
//
// Solidity: function getCommissionRate(address operator) view returns(uint256)
func (_MockEntitlementChecker *MockEntitlementCheckerCaller) GetCommissionRate(opts *bind.CallOpts, operator common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockEntitlementChecker.contract.Call(opts, &out, "getCommissionRate", operator)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetCommissionRate is a free data retrieval call binding the contract method 0xe0cc26a2.
//
// Solidity: function getCommissionRate(address operator) view returns(uint256)
func (_MockEntitlementChecker *MockEntitlementCheckerSession) GetCommissionRate(operator common.Address) (*big.Int, error) {
	return _MockEntitlementChecker.Contract.GetCommissionRate(&_MockEntitlementChecker.CallOpts, operator)
}

// GetCommissionRate is a free data retrieval call binding the contract method 0xe0cc26a2.
//
// Solidity: function getCommissionRate(address operator) view returns(uint256)
func (_MockEntitlementChecker *MockEntitlementCheckerCallerSession) GetCommissionRate(operator common.Address) (*big.Int, error) {
	return _MockEntitlementChecker.Contract.GetCommissionRate(&_MockEntitlementChecker.CallOpts, operator)
}

// GetNodeAtIndex is a free data retrieval call binding the contract method 0x3c59f126.
//
// Solidity: function getNodeAtIndex(uint256 index) view returns(address)
func (_MockEntitlementChecker *MockEntitlementCheckerCaller) GetNodeAtIndex(opts *bind.CallOpts, index *big.Int) (common.Address, error) {
	var out []interface{}
	err := _MockEntitlementChecker.contract.Call(opts, &out, "getNodeAtIndex", index)

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// GetNodeAtIndex is a free data retrieval call binding the contract method 0x3c59f126.
//
// Solidity: function getNodeAtIndex(uint256 index) view returns(address)
func (_MockEntitlementChecker *MockEntitlementCheckerSession) GetNodeAtIndex(index *big.Int) (common.Address, error) {
	return _MockEntitlementChecker.Contract.GetNodeAtIndex(&_MockEntitlementChecker.CallOpts, index)
}

// GetNodeAtIndex is a free data retrieval call binding the contract method 0x3c59f126.
//
// Solidity: function getNodeAtIndex(uint256 index) view returns(address)
func (_MockEntitlementChecker *MockEntitlementCheckerCallerSession) GetNodeAtIndex(index *big.Int) (common.Address, error) {
	return _MockEntitlementChecker.Contract.GetNodeAtIndex(&_MockEntitlementChecker.CallOpts, index)
}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_MockEntitlementChecker *MockEntitlementCheckerCaller) GetNodeCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockEntitlementChecker.contract.Call(opts, &out, "getNodeCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_MockEntitlementChecker *MockEntitlementCheckerSession) GetNodeCount() (*big.Int, error) {
	return _MockEntitlementChecker.Contract.GetNodeCount(&_MockEntitlementChecker.CallOpts)
}

// GetNodeCount is a free data retrieval call binding the contract method 0x39bf397e.
//
// Solidity: function getNodeCount() view returns(uint256)
func (_MockEntitlementChecker *MockEntitlementCheckerCallerSession) GetNodeCount() (*big.Int, error) {
	return _MockEntitlementChecker.Contract.GetNodeCount(&_MockEntitlementChecker.CallOpts)
}

// GetOperatorStatus is a free data retrieval call binding the contract method 0xfd39105a.
//
// Solidity: function getOperatorStatus(address operator) view returns(uint8)
func (_MockEntitlementChecker *MockEntitlementCheckerCaller) GetOperatorStatus(opts *bind.CallOpts, operator common.Address) (uint8, error) {
	var out []interface{}
	err := _MockEntitlementChecker.contract.Call(opts, &out, "getOperatorStatus", operator)

	if err != nil {
		return *new(uint8), err
	}

	out0 := *abi.ConvertType(out[0], new(uint8)).(*uint8)

	return out0, err

}

// GetOperatorStatus is a free data retrieval call binding the contract method 0xfd39105a.
//
// Solidity: function getOperatorStatus(address operator) view returns(uint8)
func (_MockEntitlementChecker *MockEntitlementCheckerSession) GetOperatorStatus(operator common.Address) (uint8, error) {
	return _MockEntitlementChecker.Contract.GetOperatorStatus(&_MockEntitlementChecker.CallOpts, operator)
}

// GetOperatorStatus is a free data retrieval call binding the contract method 0xfd39105a.
//
// Solidity: function getOperatorStatus(address operator) view returns(uint8)
func (_MockEntitlementChecker *MockEntitlementCheckerCallerSession) GetOperatorStatus(operator common.Address) (uint8, error) {
	return _MockEntitlementChecker.Contract.GetOperatorStatus(&_MockEntitlementChecker.CallOpts, operator)
}

// GetRandomNodes is a free data retrieval call binding the contract method 0x4f845445.
//
// Solidity: function getRandomNodes(uint256 count) view returns(address[])
func (_MockEntitlementChecker *MockEntitlementCheckerCaller) GetRandomNodes(opts *bind.CallOpts, count *big.Int) ([]common.Address, error) {
	var out []interface{}
	err := _MockEntitlementChecker.contract.Call(opts, &out, "getRandomNodes", count)

	if err != nil {
		return *new([]common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new([]common.Address)).(*[]common.Address)

	return out0, err

}

// GetRandomNodes is a free data retrieval call binding the contract method 0x4f845445.
//
// Solidity: function getRandomNodes(uint256 count) view returns(address[])
func (_MockEntitlementChecker *MockEntitlementCheckerSession) GetRandomNodes(count *big.Int) ([]common.Address, error) {
	return _MockEntitlementChecker.Contract.GetRandomNodes(&_MockEntitlementChecker.CallOpts, count)
}

// GetRandomNodes is a free data retrieval call binding the contract method 0x4f845445.
//
// Solidity: function getRandomNodes(uint256 count) view returns(address[])
func (_MockEntitlementChecker *MockEntitlementCheckerCallerSession) GetRandomNodes(count *big.Int) ([]common.Address, error) {
	return _MockEntitlementChecker.Contract.GetRandomNodes(&_MockEntitlementChecker.CallOpts, count)
}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_MockEntitlementChecker *MockEntitlementCheckerCaller) IsOperator(opts *bind.CallOpts, operator common.Address) (bool, error) {
	var out []interface{}
	err := _MockEntitlementChecker.contract.Call(opts, &out, "isOperator", operator)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_MockEntitlementChecker *MockEntitlementCheckerSession) IsOperator(operator common.Address) (bool, error) {
	return _MockEntitlementChecker.Contract.IsOperator(&_MockEntitlementChecker.CallOpts, operator)
}

// IsOperator is a free data retrieval call binding the contract method 0x6d70f7ae.
//
// Solidity: function isOperator(address operator) view returns(bool)
func (_MockEntitlementChecker *MockEntitlementCheckerCallerSession) IsOperator(operator common.Address) (bool, error) {
	return _MockEntitlementChecker.Contract.IsOperator(&_MockEntitlementChecker.CallOpts, operator)
}

// IsValidNode is a free data retrieval call binding the contract method 0x9ebd11ef.
//
// Solidity: function isValidNode(address node) view returns(bool)
func (_MockEntitlementChecker *MockEntitlementCheckerCaller) IsValidNode(opts *bind.CallOpts, node common.Address) (bool, error) {
	var out []interface{}
	err := _MockEntitlementChecker.contract.Call(opts, &out, "isValidNode", node)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsValidNode is a free data retrieval call binding the contract method 0x9ebd11ef.
//
// Solidity: function isValidNode(address node) view returns(bool)
func (_MockEntitlementChecker *MockEntitlementCheckerSession) IsValidNode(node common.Address) (bool, error) {
	return _MockEntitlementChecker.Contract.IsValidNode(&_MockEntitlementChecker.CallOpts, node)
}

// IsValidNode is a free data retrieval call binding the contract method 0x9ebd11ef.
//
// Solidity: function isValidNode(address node) view returns(bool)
func (_MockEntitlementChecker *MockEntitlementCheckerCallerSession) IsValidNode(node common.Address) (bool, error) {
	return _MockEntitlementChecker.Contract.IsValidNode(&_MockEntitlementChecker.CallOpts, node)
}

// EntitlementCheckerInit is a paid mutator transaction binding the contract method 0x39dc5b3e.
//
// Solidity: function __EntitlementChecker_init() returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactor) EntitlementCheckerInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockEntitlementChecker.contract.Transact(opts, "__EntitlementChecker_init")
}

// EntitlementCheckerInit is a paid mutator transaction binding the contract method 0x39dc5b3e.
//
// Solidity: function __EntitlementChecker_init() returns()
func (_MockEntitlementChecker *MockEntitlementCheckerSession) EntitlementCheckerInit() (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.EntitlementCheckerInit(&_MockEntitlementChecker.TransactOpts)
}

// EntitlementCheckerInit is a paid mutator transaction binding the contract method 0x39dc5b3e.
//
// Solidity: function __EntitlementChecker_init() returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorSession) EntitlementCheckerInit() (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.EntitlementCheckerInit(&_MockEntitlementChecker.TransactOpts)
}

// NodeOperatorInit is a paid mutator transaction binding the contract method 0xa33d1ccb.
//
// Solidity: function __NodeOperator_init() returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactor) NodeOperatorInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockEntitlementChecker.contract.Transact(opts, "__NodeOperator_init")
}

// NodeOperatorInit is a paid mutator transaction binding the contract method 0xa33d1ccb.
//
// Solidity: function __NodeOperator_init() returns()
func (_MockEntitlementChecker *MockEntitlementCheckerSession) NodeOperatorInit() (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.NodeOperatorInit(&_MockEntitlementChecker.TransactOpts)
}

// NodeOperatorInit is a paid mutator transaction binding the contract method 0xa33d1ccb.
//
// Solidity: function __NodeOperator_init() returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorSession) NodeOperatorInit() (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.NodeOperatorInit(&_MockEntitlementChecker.TransactOpts)
}

// RegisterNode is a paid mutator transaction binding the contract method 0x672d7a0d.
//
// Solidity: function registerNode(address node) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactor) RegisterNode(opts *bind.TransactOpts, node common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.contract.Transact(opts, "registerNode", node)
}

// RegisterNode is a paid mutator transaction binding the contract method 0x672d7a0d.
//
// Solidity: function registerNode(address node) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerSession) RegisterNode(node common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.RegisterNode(&_MockEntitlementChecker.TransactOpts, node)
}

// RegisterNode is a paid mutator transaction binding the contract method 0x672d7a0d.
//
// Solidity: function registerNode(address node) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorSession) RegisterNode(node common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.RegisterNode(&_MockEntitlementChecker.TransactOpts, node)
}

// RegisterOperator is a paid mutator transaction binding the contract method 0x3682a450.
//
// Solidity: function registerOperator(address claimer) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactor) RegisterOperator(opts *bind.TransactOpts, claimer common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.contract.Transact(opts, "registerOperator", claimer)
}

// RegisterOperator is a paid mutator transaction binding the contract method 0x3682a450.
//
// Solidity: function registerOperator(address claimer) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerSession) RegisterOperator(claimer common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.RegisterOperator(&_MockEntitlementChecker.TransactOpts, claimer)
}

// RegisterOperator is a paid mutator transaction binding the contract method 0x3682a450.
//
// Solidity: function registerOperator(address claimer) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorSession) RegisterOperator(claimer common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.RegisterOperator(&_MockEntitlementChecker.TransactOpts, claimer)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x541da4e5.
//
// Solidity: function requestEntitlementCheck(address callerAddress, bytes32 transactionId, uint256 roleId, address[] nodes) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactor) RequestEntitlementCheck(opts *bind.TransactOpts, callerAddress common.Address, transactionId [32]byte, roleId *big.Int, nodes []common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.contract.Transact(opts, "requestEntitlementCheck", callerAddress, transactionId, roleId, nodes)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x541da4e5.
//
// Solidity: function requestEntitlementCheck(address callerAddress, bytes32 transactionId, uint256 roleId, address[] nodes) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerSession) RequestEntitlementCheck(callerAddress common.Address, transactionId [32]byte, roleId *big.Int, nodes []common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.RequestEntitlementCheck(&_MockEntitlementChecker.TransactOpts, callerAddress, transactionId, roleId, nodes)
}

// RequestEntitlementCheck is a paid mutator transaction binding the contract method 0x541da4e5.
//
// Solidity: function requestEntitlementCheck(address callerAddress, bytes32 transactionId, uint256 roleId, address[] nodes) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorSession) RequestEntitlementCheck(callerAddress common.Address, transactionId [32]byte, roleId *big.Int, nodes []common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.RequestEntitlementCheck(&_MockEntitlementChecker.TransactOpts, callerAddress, transactionId, roleId, nodes)
}

// SetClaimAddressForOperator is a paid mutator transaction binding the contract method 0x59f12a26.
//
// Solidity: function setClaimAddressForOperator(address claimer, address operator) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactor) SetClaimAddressForOperator(opts *bind.TransactOpts, claimer common.Address, operator common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.contract.Transact(opts, "setClaimAddressForOperator", claimer, operator)
}

// SetClaimAddressForOperator is a paid mutator transaction binding the contract method 0x59f12a26.
//
// Solidity: function setClaimAddressForOperator(address claimer, address operator) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerSession) SetClaimAddressForOperator(claimer common.Address, operator common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.SetClaimAddressForOperator(&_MockEntitlementChecker.TransactOpts, claimer, operator)
}

// SetClaimAddressForOperator is a paid mutator transaction binding the contract method 0x59f12a26.
//
// Solidity: function setClaimAddressForOperator(address claimer, address operator) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorSession) SetClaimAddressForOperator(claimer common.Address, operator common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.SetClaimAddressForOperator(&_MockEntitlementChecker.TransactOpts, claimer, operator)
}

// SetCommissionRate is a paid mutator transaction binding the contract method 0x19fac8fd.
//
// Solidity: function setCommissionRate(uint256 rateBps) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactor) SetCommissionRate(opts *bind.TransactOpts, rateBps *big.Int) (*types.Transaction, error) {
	return _MockEntitlementChecker.contract.Transact(opts, "setCommissionRate", rateBps)
}

// SetCommissionRate is a paid mutator transaction binding the contract method 0x19fac8fd.
//
// Solidity: function setCommissionRate(uint256 rateBps) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerSession) SetCommissionRate(rateBps *big.Int) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.SetCommissionRate(&_MockEntitlementChecker.TransactOpts, rateBps)
}

// SetCommissionRate is a paid mutator transaction binding the contract method 0x19fac8fd.
//
// Solidity: function setCommissionRate(uint256 rateBps) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorSession) SetCommissionRate(rateBps *big.Int) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.SetCommissionRate(&_MockEntitlementChecker.TransactOpts, rateBps)
}

// SetOperatorStatus is a paid mutator transaction binding the contract method 0x4463ba8f.
//
// Solidity: function setOperatorStatus(address operator, uint8 newStatus) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactor) SetOperatorStatus(opts *bind.TransactOpts, operator common.Address, newStatus uint8) (*types.Transaction, error) {
	return _MockEntitlementChecker.contract.Transact(opts, "setOperatorStatus", operator, newStatus)
}

// SetOperatorStatus is a paid mutator transaction binding the contract method 0x4463ba8f.
//
// Solidity: function setOperatorStatus(address operator, uint8 newStatus) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerSession) SetOperatorStatus(operator common.Address, newStatus uint8) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.SetOperatorStatus(&_MockEntitlementChecker.TransactOpts, operator, newStatus)
}

// SetOperatorStatus is a paid mutator transaction binding the contract method 0x4463ba8f.
//
// Solidity: function setOperatorStatus(address operator, uint8 newStatus) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorSession) SetOperatorStatus(operator common.Address, newStatus uint8) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.SetOperatorStatus(&_MockEntitlementChecker.TransactOpts, operator, newStatus)
}

// UnregisterNode is a paid mutator transaction binding the contract method 0xc5e41cf6.
//
// Solidity: function unregisterNode(address node) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactor) UnregisterNode(opts *bind.TransactOpts, node common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.contract.Transact(opts, "unregisterNode", node)
}

// UnregisterNode is a paid mutator transaction binding the contract method 0xc5e41cf6.
//
// Solidity: function unregisterNode(address node) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerSession) UnregisterNode(node common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.UnregisterNode(&_MockEntitlementChecker.TransactOpts, node)
}

// UnregisterNode is a paid mutator transaction binding the contract method 0xc5e41cf6.
//
// Solidity: function unregisterNode(address node) returns()
func (_MockEntitlementChecker *MockEntitlementCheckerTransactorSession) UnregisterNode(node common.Address) (*types.Transaction, error) {
	return _MockEntitlementChecker.Contract.UnregisterNode(&_MockEntitlementChecker.TransactOpts, node)
}

// MockEntitlementCheckerApprovalIterator is returned from FilterApproval and is used to iterate over the raw logs and unpacked data for Approval events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerApprovalIterator struct {
	Event *MockEntitlementCheckerApproval // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerApprovalIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerApproval)
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
		it.Event = new(MockEntitlementCheckerApproval)
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
func (it *MockEntitlementCheckerApprovalIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerApprovalIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerApproval represents a Approval event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerApproval struct {
	Owner    common.Address
	Approved common.Address
	TokenId  *big.Int
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApproval is a free log retrieval operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterApproval(opts *bind.FilterOpts, owner []common.Address, approved []common.Address, tokenId []*big.Int) (*MockEntitlementCheckerApprovalIterator, error) {

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

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "Approval", ownerRule, approvedRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerApprovalIterator{contract: _MockEntitlementChecker.contract, event: "Approval", logs: logs, sub: sub}, nil
}

// WatchApproval is a free log subscription operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchApproval(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerApproval, owner []common.Address, approved []common.Address, tokenId []*big.Int) (event.Subscription, error) {

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

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "Approval", ownerRule, approvedRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerApproval)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "Approval", log); err != nil {
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
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseApproval(log types.Log) (*MockEntitlementCheckerApproval, error) {
	event := new(MockEntitlementCheckerApproval)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "Approval", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerApprovalForAllIterator is returned from FilterApprovalForAll and is used to iterate over the raw logs and unpacked data for ApprovalForAll events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerApprovalForAllIterator struct {
	Event *MockEntitlementCheckerApprovalForAll // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerApprovalForAllIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerApprovalForAll)
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
		it.Event = new(MockEntitlementCheckerApprovalForAll)
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
func (it *MockEntitlementCheckerApprovalForAllIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerApprovalForAllIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerApprovalForAll represents a ApprovalForAll event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerApprovalForAll struct {
	Owner    common.Address
	Operator common.Address
	Approved bool
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterApprovalForAll is a free log retrieval operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterApprovalForAll(opts *bind.FilterOpts, owner []common.Address, operator []common.Address) (*MockEntitlementCheckerApprovalForAllIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "ApprovalForAll", ownerRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerApprovalForAllIterator{contract: _MockEntitlementChecker.contract, event: "ApprovalForAll", logs: logs, sub: sub}, nil
}

// WatchApprovalForAll is a free log subscription operation binding the contract event 0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31.
//
// Solidity: event ApprovalForAll(address indexed owner, address indexed operator, bool approved)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchApprovalForAll(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerApprovalForAll, owner []common.Address, operator []common.Address) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "ApprovalForAll", ownerRule, operatorRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerApprovalForAll)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
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
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseApprovalForAll(log types.Log) (*MockEntitlementCheckerApprovalForAll, error) {
	event := new(MockEntitlementCheckerApprovalForAll)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "ApprovalForAll", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerConsecutiveTransferIterator is returned from FilterConsecutiveTransfer and is used to iterate over the raw logs and unpacked data for ConsecutiveTransfer events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerConsecutiveTransferIterator struct {
	Event *MockEntitlementCheckerConsecutiveTransfer // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerConsecutiveTransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerConsecutiveTransfer)
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
		it.Event = new(MockEntitlementCheckerConsecutiveTransfer)
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
func (it *MockEntitlementCheckerConsecutiveTransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerConsecutiveTransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerConsecutiveTransfer represents a ConsecutiveTransfer event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerConsecutiveTransfer struct {
	FromTokenId *big.Int
	ToTokenId   *big.Int
	From        common.Address
	To          common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterConsecutiveTransfer is a free log retrieval operation binding the contract event 0xdeaa91b6123d068f5821d0fb0678463d1a8a6079fe8af5de3ce5e896dcf9133d.
//
// Solidity: event ConsecutiveTransfer(uint256 indexed fromTokenId, uint256 toTokenId, address indexed from, address indexed to)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterConsecutiveTransfer(opts *bind.FilterOpts, fromTokenId []*big.Int, from []common.Address, to []common.Address) (*MockEntitlementCheckerConsecutiveTransferIterator, error) {

	var fromTokenIdRule []interface{}
	for _, fromTokenIdItem := range fromTokenId {
		fromTokenIdRule = append(fromTokenIdRule, fromTokenIdItem)
	}

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "ConsecutiveTransfer", fromTokenIdRule, fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerConsecutiveTransferIterator{contract: _MockEntitlementChecker.contract, event: "ConsecutiveTransfer", logs: logs, sub: sub}, nil
}

// WatchConsecutiveTransfer is a free log subscription operation binding the contract event 0xdeaa91b6123d068f5821d0fb0678463d1a8a6079fe8af5de3ce5e896dcf9133d.
//
// Solidity: event ConsecutiveTransfer(uint256 indexed fromTokenId, uint256 toTokenId, address indexed from, address indexed to)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchConsecutiveTransfer(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerConsecutiveTransfer, fromTokenId []*big.Int, from []common.Address, to []common.Address) (event.Subscription, error) {

	var fromTokenIdRule []interface{}
	for _, fromTokenIdItem := range fromTokenId {
		fromTokenIdRule = append(fromTokenIdRule, fromTokenIdItem)
	}

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "ConsecutiveTransfer", fromTokenIdRule, fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerConsecutiveTransfer)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "ConsecutiveTransfer", log); err != nil {
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

// ParseConsecutiveTransfer is a log parse operation binding the contract event 0xdeaa91b6123d068f5821d0fb0678463d1a8a6079fe8af5de3ce5e896dcf9133d.
//
// Solidity: event ConsecutiveTransfer(uint256 indexed fromTokenId, uint256 toTokenId, address indexed from, address indexed to)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseConsecutiveTransfer(log types.Log) (*MockEntitlementCheckerConsecutiveTransfer, error) {
	event := new(MockEntitlementCheckerConsecutiveTransfer)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "ConsecutiveTransfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerEntitlementCheckRequestedIterator is returned from FilterEntitlementCheckRequested and is used to iterate over the raw logs and unpacked data for EntitlementCheckRequested events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerEntitlementCheckRequestedIterator struct {
	Event *MockEntitlementCheckerEntitlementCheckRequested // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerEntitlementCheckRequestedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerEntitlementCheckRequested)
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
		it.Event = new(MockEntitlementCheckerEntitlementCheckRequested)
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
func (it *MockEntitlementCheckerEntitlementCheckRequestedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerEntitlementCheckRequestedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerEntitlementCheckRequested represents a EntitlementCheckRequested event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerEntitlementCheckRequested struct {
	CallerAddress   common.Address
	ContractAddress common.Address
	TransactionId   [32]byte
	RoleId          *big.Int
	SelectedNodes   []common.Address
	Raw             types.Log // Blockchain specific contextual infos
}

// FilterEntitlementCheckRequested is a free log retrieval operation binding the contract event 0x4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f3.
//
// Solidity: event EntitlementCheckRequested(address callerAddress, address contractAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterEntitlementCheckRequested(opts *bind.FilterOpts) (*MockEntitlementCheckerEntitlementCheckRequestedIterator, error) {

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "EntitlementCheckRequested")
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerEntitlementCheckRequestedIterator{contract: _MockEntitlementChecker.contract, event: "EntitlementCheckRequested", logs: logs, sub: sub}, nil
}

// WatchEntitlementCheckRequested is a free log subscription operation binding the contract event 0x4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f3.
//
// Solidity: event EntitlementCheckRequested(address callerAddress, address contractAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchEntitlementCheckRequested(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerEntitlementCheckRequested) (event.Subscription, error) {

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "EntitlementCheckRequested")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerEntitlementCheckRequested)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
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

// ParseEntitlementCheckRequested is a log parse operation binding the contract event 0x4675e3cc15801ffde520a3076d6ad75c0c6dbe8f23bdbea1dd45b676caffe4f3.
//
// Solidity: event EntitlementCheckRequested(address callerAddress, address contractAddress, bytes32 transactionId, uint256 roleId, address[] selectedNodes)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseEntitlementCheckRequested(log types.Log) (*MockEntitlementCheckerEntitlementCheckRequested, error) {
	event := new(MockEntitlementCheckerEntitlementCheckRequested)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "EntitlementCheckRequested", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerInitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerInitializedIterator struct {
	Event *MockEntitlementCheckerInitialized // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerInitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerInitialized)
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
		it.Event = new(MockEntitlementCheckerInitialized)
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
func (it *MockEntitlementCheckerInitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerInitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerInitialized represents a Initialized event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerInitialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterInitialized(opts *bind.FilterOpts) (*MockEntitlementCheckerInitializedIterator, error) {

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerInitializedIterator{contract: _MockEntitlementChecker.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerInitialized) (event.Subscription, error) {

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerInitialized)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseInitialized(log types.Log) (*MockEntitlementCheckerInitialized, error) {
	event := new(MockEntitlementCheckerInitialized)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerInterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerInterfaceAddedIterator struct {
	Event *MockEntitlementCheckerInterfaceAdded // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerInterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerInterfaceAdded)
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
		it.Event = new(MockEntitlementCheckerInterfaceAdded)
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
func (it *MockEntitlementCheckerInterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerInterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerInterfaceAdded represents a InterfaceAdded event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerInterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*MockEntitlementCheckerInterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerInterfaceAddedIterator{contract: _MockEntitlementChecker.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerInterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerInterfaceAdded)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseInterfaceAdded(log types.Log) (*MockEntitlementCheckerInterfaceAdded, error) {
	event := new(MockEntitlementCheckerInterfaceAdded)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerInterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerInterfaceRemovedIterator struct {
	Event *MockEntitlementCheckerInterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerInterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerInterfaceRemoved)
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
		it.Event = new(MockEntitlementCheckerInterfaceRemoved)
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
func (it *MockEntitlementCheckerInterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerInterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerInterfaceRemoved represents a InterfaceRemoved event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerInterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*MockEntitlementCheckerInterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerInterfaceRemovedIterator{contract: _MockEntitlementChecker.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerInterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerInterfaceRemoved)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseInterfaceRemoved(log types.Log) (*MockEntitlementCheckerInterfaceRemoved, error) {
	event := new(MockEntitlementCheckerInterfaceRemoved)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerNodeRegisteredIterator is returned from FilterNodeRegistered and is used to iterate over the raw logs and unpacked data for NodeRegistered events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerNodeRegisteredIterator struct {
	Event *MockEntitlementCheckerNodeRegistered // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerNodeRegisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerNodeRegistered)
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
		it.Event = new(MockEntitlementCheckerNodeRegistered)
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
func (it *MockEntitlementCheckerNodeRegisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerNodeRegisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerNodeRegistered represents a NodeRegistered event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerNodeRegistered struct {
	NodeAddress common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeRegistered is a free log retrieval operation binding the contract event 0x564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf6.
//
// Solidity: event NodeRegistered(address indexed nodeAddress)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterNodeRegistered(opts *bind.FilterOpts, nodeAddress []common.Address) (*MockEntitlementCheckerNodeRegisteredIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "NodeRegistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerNodeRegisteredIterator{contract: _MockEntitlementChecker.contract, event: "NodeRegistered", logs: logs, sub: sub}, nil
}

// WatchNodeRegistered is a free log subscription operation binding the contract event 0x564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf6.
//
// Solidity: event NodeRegistered(address indexed nodeAddress)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchNodeRegistered(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerNodeRegistered, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "NodeRegistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerNodeRegistered)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "NodeRegistered", log); err != nil {
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

// ParseNodeRegistered is a log parse operation binding the contract event 0x564728e6a7c8edd446557d94e0339d5e6ca2e05f42188914efdbdc87bcbbabf6.
//
// Solidity: event NodeRegistered(address indexed nodeAddress)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseNodeRegistered(log types.Log) (*MockEntitlementCheckerNodeRegistered, error) {
	event := new(MockEntitlementCheckerNodeRegistered)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "NodeRegistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerNodeUnregisteredIterator is returned from FilterNodeUnregistered and is used to iterate over the raw logs and unpacked data for NodeUnregistered events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerNodeUnregisteredIterator struct {
	Event *MockEntitlementCheckerNodeUnregistered // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerNodeUnregisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerNodeUnregistered)
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
		it.Event = new(MockEntitlementCheckerNodeUnregistered)
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
func (it *MockEntitlementCheckerNodeUnregisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerNodeUnregisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerNodeUnregistered represents a NodeUnregistered event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerNodeUnregistered struct {
	NodeAddress common.Address
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterNodeUnregistered is a free log retrieval operation binding the contract event 0xb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a.
//
// Solidity: event NodeUnregistered(address indexed nodeAddress)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterNodeUnregistered(opts *bind.FilterOpts, nodeAddress []common.Address) (*MockEntitlementCheckerNodeUnregisteredIterator, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "NodeUnregistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerNodeUnregisteredIterator{contract: _MockEntitlementChecker.contract, event: "NodeUnregistered", logs: logs, sub: sub}, nil
}

// WatchNodeUnregistered is a free log subscription operation binding the contract event 0xb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a.
//
// Solidity: event NodeUnregistered(address indexed nodeAddress)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchNodeUnregistered(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerNodeUnregistered, nodeAddress []common.Address) (event.Subscription, error) {

	var nodeAddressRule []interface{}
	for _, nodeAddressItem := range nodeAddress {
		nodeAddressRule = append(nodeAddressRule, nodeAddressItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "NodeUnregistered", nodeAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerNodeUnregistered)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "NodeUnregistered", log); err != nil {
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

// ParseNodeUnregistered is a log parse operation binding the contract event 0xb1864577e4f285436a80ebc833984755393e2450d58622a65fb4fce87ea3573a.
//
// Solidity: event NodeUnregistered(address indexed nodeAddress)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseNodeUnregistered(log types.Log) (*MockEntitlementCheckerNodeUnregistered, error) {
	event := new(MockEntitlementCheckerNodeUnregistered)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "NodeUnregistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerOperatorClaimAddressChangedIterator is returned from FilterOperatorClaimAddressChanged and is used to iterate over the raw logs and unpacked data for OperatorClaimAddressChanged events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerOperatorClaimAddressChangedIterator struct {
	Event *MockEntitlementCheckerOperatorClaimAddressChanged // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerOperatorClaimAddressChangedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerOperatorClaimAddressChanged)
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
		it.Event = new(MockEntitlementCheckerOperatorClaimAddressChanged)
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
func (it *MockEntitlementCheckerOperatorClaimAddressChangedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerOperatorClaimAddressChangedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerOperatorClaimAddressChanged represents a OperatorClaimAddressChanged event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerOperatorClaimAddressChanged struct {
	Operator     common.Address
	ClaimAddress common.Address
	Raw          types.Log // Blockchain specific contextual infos
}

// FilterOperatorClaimAddressChanged is a free log retrieval operation binding the contract event 0x9acff66817c6f3fac3752bef82306270971b2a3da032a5cb876e05676bb83288.
//
// Solidity: event OperatorClaimAddressChanged(address indexed operator, address indexed claimAddress)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterOperatorClaimAddressChanged(opts *bind.FilterOpts, operator []common.Address, claimAddress []common.Address) (*MockEntitlementCheckerOperatorClaimAddressChangedIterator, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}
	var claimAddressRule []interface{}
	for _, claimAddressItem := range claimAddress {
		claimAddressRule = append(claimAddressRule, claimAddressItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "OperatorClaimAddressChanged", operatorRule, claimAddressRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerOperatorClaimAddressChangedIterator{contract: _MockEntitlementChecker.contract, event: "OperatorClaimAddressChanged", logs: logs, sub: sub}, nil
}

// WatchOperatorClaimAddressChanged is a free log subscription operation binding the contract event 0x9acff66817c6f3fac3752bef82306270971b2a3da032a5cb876e05676bb83288.
//
// Solidity: event OperatorClaimAddressChanged(address indexed operator, address indexed claimAddress)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchOperatorClaimAddressChanged(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerOperatorClaimAddressChanged, operator []common.Address, claimAddress []common.Address) (event.Subscription, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}
	var claimAddressRule []interface{}
	for _, claimAddressItem := range claimAddress {
		claimAddressRule = append(claimAddressRule, claimAddressItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "OperatorClaimAddressChanged", operatorRule, claimAddressRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerOperatorClaimAddressChanged)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "OperatorClaimAddressChanged", log); err != nil {
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

// ParseOperatorClaimAddressChanged is a log parse operation binding the contract event 0x9acff66817c6f3fac3752bef82306270971b2a3da032a5cb876e05676bb83288.
//
// Solidity: event OperatorClaimAddressChanged(address indexed operator, address indexed claimAddress)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseOperatorClaimAddressChanged(log types.Log) (*MockEntitlementCheckerOperatorClaimAddressChanged, error) {
	event := new(MockEntitlementCheckerOperatorClaimAddressChanged)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "OperatorClaimAddressChanged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerOperatorCommissionChangedIterator is returned from FilterOperatorCommissionChanged and is used to iterate over the raw logs and unpacked data for OperatorCommissionChanged events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerOperatorCommissionChangedIterator struct {
	Event *MockEntitlementCheckerOperatorCommissionChanged // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerOperatorCommissionChangedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerOperatorCommissionChanged)
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
		it.Event = new(MockEntitlementCheckerOperatorCommissionChanged)
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
func (it *MockEntitlementCheckerOperatorCommissionChangedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerOperatorCommissionChangedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerOperatorCommissionChanged represents a OperatorCommissionChanged event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerOperatorCommissionChanged struct {
	Operator   common.Address
	Commission *big.Int
	Raw        types.Log // Blockchain specific contextual infos
}

// FilterOperatorCommissionChanged is a free log retrieval operation binding the contract event 0x3f8e6b052699b5c8512c54ad8f8c79ddbf0486d3263c519f20bdbb42cd4bd6da.
//
// Solidity: event OperatorCommissionChanged(address indexed operator, uint256 indexed commission)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterOperatorCommissionChanged(opts *bind.FilterOpts, operator []common.Address, commission []*big.Int) (*MockEntitlementCheckerOperatorCommissionChangedIterator, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}
	var commissionRule []interface{}
	for _, commissionItem := range commission {
		commissionRule = append(commissionRule, commissionItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "OperatorCommissionChanged", operatorRule, commissionRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerOperatorCommissionChangedIterator{contract: _MockEntitlementChecker.contract, event: "OperatorCommissionChanged", logs: logs, sub: sub}, nil
}

// WatchOperatorCommissionChanged is a free log subscription operation binding the contract event 0x3f8e6b052699b5c8512c54ad8f8c79ddbf0486d3263c519f20bdbb42cd4bd6da.
//
// Solidity: event OperatorCommissionChanged(address indexed operator, uint256 indexed commission)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchOperatorCommissionChanged(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerOperatorCommissionChanged, operator []common.Address, commission []*big.Int) (event.Subscription, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}
	var commissionRule []interface{}
	for _, commissionItem := range commission {
		commissionRule = append(commissionRule, commissionItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "OperatorCommissionChanged", operatorRule, commissionRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerOperatorCommissionChanged)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "OperatorCommissionChanged", log); err != nil {
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

// ParseOperatorCommissionChanged is a log parse operation binding the contract event 0x3f8e6b052699b5c8512c54ad8f8c79ddbf0486d3263c519f20bdbb42cd4bd6da.
//
// Solidity: event OperatorCommissionChanged(address indexed operator, uint256 indexed commission)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseOperatorCommissionChanged(log types.Log) (*MockEntitlementCheckerOperatorCommissionChanged, error) {
	event := new(MockEntitlementCheckerOperatorCommissionChanged)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "OperatorCommissionChanged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerOperatorRegisteredIterator is returned from FilterOperatorRegistered and is used to iterate over the raw logs and unpacked data for OperatorRegistered events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerOperatorRegisteredIterator struct {
	Event *MockEntitlementCheckerOperatorRegistered // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerOperatorRegisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerOperatorRegistered)
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
		it.Event = new(MockEntitlementCheckerOperatorRegistered)
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
func (it *MockEntitlementCheckerOperatorRegisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerOperatorRegisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerOperatorRegistered represents a OperatorRegistered event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerOperatorRegistered struct {
	Operator common.Address
	Raw      types.Log // Blockchain specific contextual infos
}

// FilterOperatorRegistered is a free log retrieval operation binding the contract event 0x4d0eb1f4bac8744fd2be119845e23b3befc88094b42bcda1204c65694a00f9e5.
//
// Solidity: event OperatorRegistered(address indexed operator)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterOperatorRegistered(opts *bind.FilterOpts, operator []common.Address) (*MockEntitlementCheckerOperatorRegisteredIterator, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "OperatorRegistered", operatorRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerOperatorRegisteredIterator{contract: _MockEntitlementChecker.contract, event: "OperatorRegistered", logs: logs, sub: sub}, nil
}

// WatchOperatorRegistered is a free log subscription operation binding the contract event 0x4d0eb1f4bac8744fd2be119845e23b3befc88094b42bcda1204c65694a00f9e5.
//
// Solidity: event OperatorRegistered(address indexed operator)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchOperatorRegistered(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerOperatorRegistered, operator []common.Address) (event.Subscription, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "OperatorRegistered", operatorRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerOperatorRegistered)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "OperatorRegistered", log); err != nil {
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

// ParseOperatorRegistered is a log parse operation binding the contract event 0x4d0eb1f4bac8744fd2be119845e23b3befc88094b42bcda1204c65694a00f9e5.
//
// Solidity: event OperatorRegistered(address indexed operator)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseOperatorRegistered(log types.Log) (*MockEntitlementCheckerOperatorRegistered, error) {
	event := new(MockEntitlementCheckerOperatorRegistered)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "OperatorRegistered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerOperatorStatusChangedIterator is returned from FilterOperatorStatusChanged and is used to iterate over the raw logs and unpacked data for OperatorStatusChanged events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerOperatorStatusChangedIterator struct {
	Event *MockEntitlementCheckerOperatorStatusChanged // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerOperatorStatusChangedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerOperatorStatusChanged)
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
		it.Event = new(MockEntitlementCheckerOperatorStatusChanged)
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
func (it *MockEntitlementCheckerOperatorStatusChangedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerOperatorStatusChangedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerOperatorStatusChanged represents a OperatorStatusChanged event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerOperatorStatusChanged struct {
	Operator  common.Address
	NewStatus uint8
	Raw       types.Log // Blockchain specific contextual infos
}

// FilterOperatorStatusChanged is a free log retrieval operation binding the contract event 0x7db2ae93d80cbf3cf719888318a0b92adff1855bcb01eda517607ed7b0f2183a.
//
// Solidity: event OperatorStatusChanged(address indexed operator, uint8 indexed newStatus)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterOperatorStatusChanged(opts *bind.FilterOpts, operator []common.Address, newStatus []uint8) (*MockEntitlementCheckerOperatorStatusChangedIterator, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}
	var newStatusRule []interface{}
	for _, newStatusItem := range newStatus {
		newStatusRule = append(newStatusRule, newStatusItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "OperatorStatusChanged", operatorRule, newStatusRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerOperatorStatusChangedIterator{contract: _MockEntitlementChecker.contract, event: "OperatorStatusChanged", logs: logs, sub: sub}, nil
}

// WatchOperatorStatusChanged is a free log subscription operation binding the contract event 0x7db2ae93d80cbf3cf719888318a0b92adff1855bcb01eda517607ed7b0f2183a.
//
// Solidity: event OperatorStatusChanged(address indexed operator, uint8 indexed newStatus)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchOperatorStatusChanged(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerOperatorStatusChanged, operator []common.Address, newStatus []uint8) (event.Subscription, error) {

	var operatorRule []interface{}
	for _, operatorItem := range operator {
		operatorRule = append(operatorRule, operatorItem)
	}
	var newStatusRule []interface{}
	for _, newStatusItem := range newStatus {
		newStatusRule = append(newStatusRule, newStatusItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "OperatorStatusChanged", operatorRule, newStatusRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerOperatorStatusChanged)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "OperatorStatusChanged", log); err != nil {
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

// ParseOperatorStatusChanged is a log parse operation binding the contract event 0x7db2ae93d80cbf3cf719888318a0b92adff1855bcb01eda517607ed7b0f2183a.
//
// Solidity: event OperatorStatusChanged(address indexed operator, uint8 indexed newStatus)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseOperatorStatusChanged(log types.Log) (*MockEntitlementCheckerOperatorStatusChanged, error) {
	event := new(MockEntitlementCheckerOperatorStatusChanged)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "OperatorStatusChanged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerOwnershipTransferredIterator is returned from FilterOwnershipTransferred and is used to iterate over the raw logs and unpacked data for OwnershipTransferred events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerOwnershipTransferredIterator struct {
	Event *MockEntitlementCheckerOwnershipTransferred // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerOwnershipTransferredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerOwnershipTransferred)
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
		it.Event = new(MockEntitlementCheckerOwnershipTransferred)
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
func (it *MockEntitlementCheckerOwnershipTransferredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerOwnershipTransferredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerOwnershipTransferred represents a OwnershipTransferred event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerOwnershipTransferred struct {
	PreviousOwner common.Address
	NewOwner      common.Address
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterOwnershipTransferred is a free log retrieval operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterOwnershipTransferred(opts *bind.FilterOpts, previousOwner []common.Address, newOwner []common.Address) (*MockEntitlementCheckerOwnershipTransferredIterator, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerOwnershipTransferredIterator{contract: _MockEntitlementChecker.contract, event: "OwnershipTransferred", logs: logs, sub: sub}, nil
}

// WatchOwnershipTransferred is a free log subscription operation binding the contract event 0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0.
//
// Solidity: event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchOwnershipTransferred(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerOwnershipTransferred, previousOwner []common.Address, newOwner []common.Address) (event.Subscription, error) {

	var previousOwnerRule []interface{}
	for _, previousOwnerItem := range previousOwner {
		previousOwnerRule = append(previousOwnerRule, previousOwnerItem)
	}
	var newOwnerRule []interface{}
	for _, newOwnerItem := range newOwner {
		newOwnerRule = append(newOwnerRule, newOwnerItem)
	}

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "OwnershipTransferred", previousOwnerRule, newOwnerRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerOwnershipTransferred)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
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
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseOwnershipTransferred(log types.Log) (*MockEntitlementCheckerOwnershipTransferred, error) {
	event := new(MockEntitlementCheckerOwnershipTransferred)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "OwnershipTransferred", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockEntitlementCheckerTransferIterator is returned from FilterTransfer and is used to iterate over the raw logs and unpacked data for Transfer events raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerTransferIterator struct {
	Event *MockEntitlementCheckerTransfer // Event containing the contract specifics and raw log

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
func (it *MockEntitlementCheckerTransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockEntitlementCheckerTransfer)
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
		it.Event = new(MockEntitlementCheckerTransfer)
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
func (it *MockEntitlementCheckerTransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockEntitlementCheckerTransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockEntitlementCheckerTransfer represents a Transfer event raised by the MockEntitlementChecker contract.
type MockEntitlementCheckerTransfer struct {
	From    common.Address
	To      common.Address
	TokenId *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterTransfer is a free log retrieval operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) FilterTransfer(opts *bind.FilterOpts, from []common.Address, to []common.Address, tokenId []*big.Int) (*MockEntitlementCheckerTransferIterator, error) {

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

	logs, sub, err := _MockEntitlementChecker.contract.FilterLogs(opts, "Transfer", fromRule, toRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return &MockEntitlementCheckerTransferIterator{contract: _MockEntitlementChecker.contract, event: "Transfer", logs: logs, sub: sub}, nil
}

// WatchTransfer is a free log subscription operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) WatchTransfer(opts *bind.WatchOpts, sink chan<- *MockEntitlementCheckerTransfer, from []common.Address, to []common.Address, tokenId []*big.Int) (event.Subscription, error) {

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

	logs, sub, err := _MockEntitlementChecker.contract.WatchLogs(opts, "Transfer", fromRule, toRule, tokenIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockEntitlementCheckerTransfer)
				if err := _MockEntitlementChecker.contract.UnpackLog(event, "Transfer", log); err != nil {
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
func (_MockEntitlementChecker *MockEntitlementCheckerFilterer) ParseTransfer(log types.Log) (*MockEntitlementCheckerTransfer, error) {
	event := new(MockEntitlementCheckerTransfer)
	if err := _MockEntitlementChecker.contract.UnpackLog(event, "Transfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
