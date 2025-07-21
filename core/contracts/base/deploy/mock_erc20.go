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

// MockErc20MetaData contains all meta data concerning the MockErc20 contract.
var MockErc20MetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"name\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"symbol\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"DOMAIN_SEPARATOR\",\"inputs\":[],\"outputs\":[{\"name\":\"result\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"__ERC20PermitBase_init\",\"inputs\":[{\"name\":\"name_\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"symbol_\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"decimals_\",\"type\":\"uint8\",\"internalType\":\"uint8\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__ERC20_init\",\"inputs\":[{\"name\":\"name_\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"symbol_\",\"type\":\"string\",\"internalType\":\"string\"},{\"name\":\"decimals_\",\"type\":\"uint8\",\"internalType\":\"uint8\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"__Introspection_init\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"allowance\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"result\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"approve\",\"inputs\":[{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"balanceOf\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"decimals\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint8\",\"internalType\":\"uint8\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"mint\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"name\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"nonces\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}],\"outputs\":[{\"name\":\"result\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"permit\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"deadline\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"v\",\"type\":\"uint8\",\"internalType\":\"uint8\"},{\"name\":\"r\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"},{\"name\":\"s\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"supportsInterface\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"internalType\":\"bytes4\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"symbol\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"string\",\"internalType\":\"string\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"totalSupply\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"transfer\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"transferFrom\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"amount\",\"type\":\"uint256\",\"internalType\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\",\"internalType\":\"bool\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"Approval\",\"inputs\":[{\"name\":\"owner\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"spender\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"value\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Initialized\",\"inputs\":[{\"name\":\"version\",\"type\":\"uint32\",\"indexed\":false,\"internalType\":\"uint32\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceAdded\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"InterfaceRemoved\",\"inputs\":[{\"name\":\"interfaceId\",\"type\":\"bytes4\",\"indexed\":true,\"internalType\":\"bytes4\"}],\"anonymous\":false},{\"type\":\"event\",\"name\":\"Transfer\",\"inputs\":[{\"name\":\"from\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"to\",\"type\":\"address\",\"indexed\":true,\"internalType\":\"address\"},{\"name\":\"value\",\"type\":\"uint256\",\"indexed\":false,\"internalType\":\"uint256\"}],\"anonymous\":false},{\"type\":\"error\",\"name\":\"ERC20InsufficientAllowance\",\"inputs\":[{\"name\":\"spender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"allowance\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"needed\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC20InsufficientBalance\",\"inputs\":[{\"name\":\"sender\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"balance\",\"type\":\"uint256\",\"internalType\":\"uint256\"},{\"name\":\"needed\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC2612ExpiredSignature\",\"inputs\":[{\"name\":\"deadline\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]},{\"type\":\"error\",\"name\":\"ERC2612InvalidSigner\",\"inputs\":[{\"name\":\"signer\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"owner\",\"type\":\"address\",\"internalType\":\"address\"}]},{\"type\":\"error\",\"name\":\"Initializable_InInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Initializable_NotInInitializingState\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_AlreadySupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"Introspection_NotSupported\",\"inputs\":[]},{\"type\":\"error\",\"name\":\"InvalidAccountNonce\",\"inputs\":[{\"name\":\"account\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"currentNonce\",\"type\":\"uint256\",\"internalType\":\"uint256\"}]}]",
	Bin: "0x608060405234801561000f575f5ffd5b50604051611c4c380380611c4c83398101604081905261002e9161037d565b610036610052565b610042828260126100f8565b61004b8261019d565b5050610520565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef520008054640100000000900460ff161561009e576040516366008a2d60e01b815260040160405180910390fd5b805463ffffffff90811610156100f557805463ffffffff191663ffffffff90811782556040519081527fe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c9060200160405180910390a15b50565b6101086336372b0760e01b6101c6565b610118634ec7fbed60e11b6101c6565b61012863a219a02560e01b6101c6565b7f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc007f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc036101748582610466565b50600481016101838482610466565b50600501805460ff191660ff929092169190911790555050565b6100f581604051806040016040528060018152602001603160f81b81525061027660201b60201c565b6001600160e01b031981165f9081525f516020611c2c5f395f51905f52602052604090205460ff16610226576001600160e01b031981165f9081525f516020611c2c5f395f51905f5260205260409020805460ff1916600117905561023f565b604051637967f77d60e11b815260040160405180910390fd5b6040516001600160e01b03198216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22905f90a250565b7f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a6007f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a6026102c28482610466565b50600381016102d18382610466565b505f8082556001909101555050565b634e487b7160e01b5f52604160045260245ffd5b5f82601f830112610303575f5ffd5b81516001600160401b0381111561031c5761031c6102e0565b604051601f8201601f19908116603f011681016001600160401b038111828210171561034a5761034a6102e0565b604052818152838201602001851015610361575f5ffd5b8160208501602083015e5f918101602001919091529392505050565b5f5f6040838503121561038e575f5ffd5b82516001600160401b038111156103a3575f5ffd5b6103af858286016102f4565b602085015190935090506001600160401b038111156103cc575f5ffd5b6103d8858286016102f4565b9150509250929050565b600181811c908216806103f657607f821691505b60208210810361041457634e487b7160e01b5f52602260045260245ffd5b50919050565b601f82111561046157805f5260205f20601f840160051c8101602085101561043f5750805b601f840160051c820191505b8181101561045e575f815560010161044b565b50505b505050565b81516001600160401b0381111561047f5761047f6102e0565b6104938161048d84546103e2565b8461041a565b6020601f8211600181146104c5575f83156104ae5750848201515b5f19600385901b1c1916600184901b17845561045e565b5f84815260208120601f198516915b828110156104f457878501518255602094850194600190920191016104d4565b508482101561051157868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b6116ff8061052d5f395ff3fe608060405234801561000f575f5ffd5b5060043610610115575f3560e01c80635179965b116100ad57806395d89b411161007d578063aa23aa0211610063578063aa23aa021461025a578063d505accf1461026d578063dd62ed3e14610280575f5ffd5b806395d89b411461023f578063a9059cbb14610247575f5ffd5b80635179965b146101fe57806370a08231146102115780637ecebe0014610224578063930fc8ca14610237575f5ffd5b806323b872dd116100e857806323b872dd1461019a578063313ce567146101ad5780633644e515146101e157806340c10f19146101e9575f5ffd5b806301ffc9a71461011957806306fdde0314610141578063095ea7b31461015657806318160ddd14610169575b5f5ffd5b61012c6101273660046111d6565b610293565b60405190151581526020015b60405180910390f35b6101496102ed565b6040516101389190611215565b61012c610164366004611290565b61039f565b7f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc02545b604051908152602001610138565b61012c6101a83660046112b8565b610422565b7f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc055460405160ff9091168152602001610138565b61018c6104c0565b6101fc6101f7366004611290565b6104ce565b005b6101fc61020c3660046113f7565b6104fd565b61018c61021f36600461146b565b610579565b61018c61023236600461146b565b6105a4565b6101fc6105ed565b61014961065a565b61012c610255366004611290565b61068b565b6101fc6102683660046113f7565b610701565b6101fc61027b366004611484565b61076f565b61018c61028e3660046114ea565b6109c4565b7fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604081205460ff165b92915050565b60607f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc00600301805461031e9061151b565b80601f016020809104026020016040519081016040528092919081815260200182805461034a9061151b565b80156103955780601f1061036c57610100808354040283529160200191610395565b820191905f5260205f20905b81548152906001019060200180831161037857829003601f168201915b5050505050905090565b5f6103cb7f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc008484610a04565b60405182815273ffffffffffffffffffffffffffffffffffffffff84169033907f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906020015b60405180910390a350600192915050565b5f61044f7f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc00858585610a10565b8273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516104ae91815260200190565b60405180910390a35060019392505050565b5f6104c9610a2e565b905090565b6104f97f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc008383610aa1565b5050565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16610560576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b61056b838383610ad1565b61057483610bdf565b505050565b5f6102e77f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc0083610c21565b73ffffffffffffffffffffffffffffffffffffffff81165f9081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c0060205260408120546102e7565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16610650576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b610658610c34565b565b60607f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc00600401805461031e9061151b565b5f6106b77f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc008484610c5d565b60405182815273ffffffffffffffffffffffffffffffffffffffff84169033907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef90602001610411565b7f59b501c3653afc186af7d48dda36cf6732bd21629a6295693664240a6ef5200054640100000000900460ff16610764576040517f77a399b800000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b610574838383610ad1565b834211156107b1576040517f62791302000000000000000000000000000000000000000000000000000000008152600481018590526024015b60405180910390fd5b5f7f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98888886108288373ffffffffffffffffffffffffffffffffffffffff165f9081527fda5d6d87446d81938877f0ee239dac391146dd7466ea30567f72becf06773c006020526040902080546001810190915590565b60408051602081019690965273ffffffffffffffffffffffffffffffffffffffff94851690860152929091166060840152608083015260a082015260c0810186905260e0016040516020818303038152906040528051906020012090505f61088f82610c69565b90505f61089e82878787610caf565b90508973ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614610925576040517f4b800e4600000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff80831660048301528b1660248201526044016107a8565b6109517f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc008b8b8b610cf4565b8873ffffffffffffffffffffffffffffffffffffffff168a73ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258a6040516109b091815260200190565b60405180910390a350505050505050505050565b5f8281527f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc01602090815260408083209091528282528120545b9392505050565b61057483338484610cf4565b610a1c84843384610d16565b610a2884848484610d8e565b50505050565b5f7f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f610a58610d9a565b610a60610de2565b60408051602081019490945283019190915260608201524660808201523060a082015260c00160405160208183030381529060405280519060200120905090565b80836002015f828254610ab4919061156c565b90915550505f828152602084905260409020805482019055505050565b610afa7f36372b0700000000000000000000000000000000000000000000000000000000610dec565b610b237f9d8ff7da00000000000000000000000000000000000000000000000000000000610dec565b610b4c7fa219a02500000000000000000000000000000000000000000000000000000000610dec565b7f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc007f75807d58f669e9353223f5da7969ad5cf5c08f899e1a3ffa65554aaa556cbc03610b9885826115e8565b5060048101610ba784826115e8565b5060050180547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001660ff929092169190911790555050565b610c1e816040518060400160405280600181526020017f3100000000000000000000000000000000000000000000000000000000000000815250610f41565b50565b5f818152602083905260408120546109fd565b6106587f01ffc9a700000000000000000000000000000000000000000000000000000000610dec565b61057483338484610d8e565b5f6102e7610c75610a2e565b7f19010000000000000000000000000000000000000000000000000000000000005f90815260029190915260228481526042822091905290565b5f604051855f5260ff851660205283604052826060526020600160805f60015afa5191503d610ce557638baa579f5f526004601cfd5b5f606052604052949350505050565b5f83815260018501602090815260408083209091528382529020819055610a28565b5f5f610d2486868686610fab565b915091508115610d86576040517ffb8f41b200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8516600482015260248101829052604481018490526064016107a8565b505050505050565b610a2884848484611015565b5f5f610da4611038565b90505f815111610dd4577fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470610ddc565b805160208201205b91505090565b5f5f610da461104a565b7fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00602052604090205460ff16610ec0577fffffffff0000000000000000000000000000000000000000000000000000000081165f9081527f81088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b006020526040902080547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00166001179055610ef2565b6040517ff2cfeefa00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6040517fffffffff000000000000000000000000000000000000000000000000000000008216907f78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22905f90a250565b7f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a6007f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a602610f8d84826115e8565b5060038101610f9c83826115e8565b505f8082556001909101555050565b5f8080610fce6001880187875f9182526020928352604080832090935281522090565b9050805491507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff821461100b5783821092508261100b5783820381555b5094509492505050565b611020848483611055565b5f828152602085905260409020805482019055610a28565b60605f6110436110cb565b5092915050565b60605f6109fd6110cb565b5f5f61106285858561110a565b9150915081156110c4576040517fe450d38c00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8516600482015260248101829052604481018490526064016107a8565b5050505050565b6060807f219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a6006110f881611131565b9250611103816111c5565b9150509091565b5f828152602084905260409020805482811091826111285783820381555b50935093915050565b60608160020180546111429061151b565b80601f016020809104026020016040519081016040528092919081815260200182805461116e9061151b565b80156111b95780601f10611190576101008083540402835291602001916111b9565b820191905f5260205f20905b81548152906001019060200180831161119c57829003601f168201915b50505050509050919050565b60608160030180546111429061151b565b5f602082840312156111e6575f5ffd5b81357fffffffff00000000000000000000000000000000000000000000000000000000811681146109fd575f5ffd5b602081525f82518060208401528060208501604085015e5f6040828501015260407fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011684010191505092915050565b803573ffffffffffffffffffffffffffffffffffffffff8116811461128b575f5ffd5b919050565b5f5f604083850312156112a1575f5ffd5b6112aa83611268565b946020939093013593505050565b5f5f5f606084860312156112ca575f5ffd5b6112d384611268565b92506112e160208501611268565b929592945050506040919091013590565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b5f82601f83011261132e575f5ffd5b813567ffffffffffffffff811115611348576113486112f2565b6040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0603f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f8501160116810181811067ffffffffffffffff821117156113b4576113b46112f2565b6040528181528382016020018510156113cb575f5ffd5b816020850160208301375f918101602001919091529392505050565b803560ff8116811461128b575f5ffd5b5f5f5f60608486031215611409575f5ffd5b833567ffffffffffffffff81111561141f575f5ffd5b61142b8682870161131f565b935050602084013567ffffffffffffffff811115611447575f5ffd5b6114538682870161131f565b925050611462604085016113e7565b90509250925092565b5f6020828403121561147b575f5ffd5b6109fd82611268565b5f5f5f5f5f5f5f60e0888a03121561149a575f5ffd5b6114a388611268565b96506114b160208901611268565b955060408801359450606088013593506114cd608089016113e7565b9699959850939692959460a0840135945060c09093013592915050565b5f5f604083850312156114fb575f5ffd5b61150483611268565b915061151260208401611268565b90509250929050565b600181811c9082168061152f57607f821691505b602082108103611566577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b50919050565b808201808211156102e7577f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b601f82111561057457805f5260205f20601f840160051c810160208510156115c95750805b601f840160051c820191505b818110156110c4575f81556001016115d5565b815167ffffffffffffffff811115611602576116026112f2565b61161681611610845461151b565b846115a4565b6020601f821160018114611667575f83156116315750848201515b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600385901b1c1916600184901b1784556110c4565b5f848152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08516915b828110156116b45787850151825560209485019460019092019101611694565b50848210156116f057868401517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600387901b60f8161c191681555b50505050600190811b019055505681088bbc801e045ea3e7620779ab349988f58afbdfba10dff983df3f33522b00",
}

// MockErc20ABI is the input ABI used to generate the binding from.
// Deprecated: Use MockErc20MetaData.ABI instead.
var MockErc20ABI = MockErc20MetaData.ABI

// MockErc20Bin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use MockErc20MetaData.Bin instead.
var MockErc20Bin = MockErc20MetaData.Bin

// DeployMockErc20 deploys a new Ethereum contract, binding an instance of MockErc20 to it.
func DeployMockErc20(auth *bind.TransactOpts, backend bind.ContractBackend, name string, symbol string) (common.Address, *types.Transaction, *MockErc20, error) {
	parsed, err := MockErc20MetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(MockErc20Bin), backend, name, symbol)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &MockErc20{MockErc20Caller: MockErc20Caller{contract: contract}, MockErc20Transactor: MockErc20Transactor{contract: contract}, MockErc20Filterer: MockErc20Filterer{contract: contract}}, nil
}

// MockErc20 is an auto generated Go binding around an Ethereum contract.
type MockErc20 struct {
	MockErc20Caller     // Read-only binding to the contract
	MockErc20Transactor // Write-only binding to the contract
	MockErc20Filterer   // Log filterer for contract events
}

// MockErc20Caller is an auto generated read-only Go binding around an Ethereum contract.
type MockErc20Caller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc20Transactor is an auto generated write-only Go binding around an Ethereum contract.
type MockErc20Transactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc20Filterer is an auto generated log filtering Go binding around an Ethereum contract events.
type MockErc20Filterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// MockErc20Session is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type MockErc20Session struct {
	Contract     *MockErc20        // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// MockErc20CallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type MockErc20CallerSession struct {
	Contract *MockErc20Caller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts    // Call options to use throughout this session
}

// MockErc20TransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type MockErc20TransactorSession struct {
	Contract     *MockErc20Transactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// MockErc20Raw is an auto generated low-level Go binding around an Ethereum contract.
type MockErc20Raw struct {
	Contract *MockErc20 // Generic contract binding to access the raw methods on
}

// MockErc20CallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type MockErc20CallerRaw struct {
	Contract *MockErc20Caller // Generic read-only contract binding to access the raw methods on
}

// MockErc20TransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type MockErc20TransactorRaw struct {
	Contract *MockErc20Transactor // Generic write-only contract binding to access the raw methods on
}

// NewMockErc20 creates a new instance of MockErc20, bound to a specific deployed contract.
func NewMockErc20(address common.Address, backend bind.ContractBackend) (*MockErc20, error) {
	contract, err := bindMockErc20(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &MockErc20{MockErc20Caller: MockErc20Caller{contract: contract}, MockErc20Transactor: MockErc20Transactor{contract: contract}, MockErc20Filterer: MockErc20Filterer{contract: contract}}, nil
}

// NewMockErc20Caller creates a new read-only instance of MockErc20, bound to a specific deployed contract.
func NewMockErc20Caller(address common.Address, caller bind.ContractCaller) (*MockErc20Caller, error) {
	contract, err := bindMockErc20(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &MockErc20Caller{contract: contract}, nil
}

// NewMockErc20Transactor creates a new write-only instance of MockErc20, bound to a specific deployed contract.
func NewMockErc20Transactor(address common.Address, transactor bind.ContractTransactor) (*MockErc20Transactor, error) {
	contract, err := bindMockErc20(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &MockErc20Transactor{contract: contract}, nil
}

// NewMockErc20Filterer creates a new log filterer instance of MockErc20, bound to a specific deployed contract.
func NewMockErc20Filterer(address common.Address, filterer bind.ContractFilterer) (*MockErc20Filterer, error) {
	contract, err := bindMockErc20(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &MockErc20Filterer{contract: contract}, nil
}

// bindMockErc20 binds a generic wrapper to an already deployed contract.
func bindMockErc20(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := MockErc20MetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockErc20 *MockErc20Raw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockErc20.Contract.MockErc20Caller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockErc20 *MockErc20Raw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc20.Contract.MockErc20Transactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockErc20 *MockErc20Raw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockErc20.Contract.MockErc20Transactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_MockErc20 *MockErc20CallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _MockErc20.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_MockErc20 *MockErc20TransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc20.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_MockErc20 *MockErc20TransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _MockErc20.Contract.contract.Transact(opts, method, params...)
}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32 result)
func (_MockErc20 *MockErc20Caller) DOMAINSEPARATOR(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "DOMAIN_SEPARATOR")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32 result)
func (_MockErc20 *MockErc20Session) DOMAINSEPARATOR() ([32]byte, error) {
	return _MockErc20.Contract.DOMAINSEPARATOR(&_MockErc20.CallOpts)
}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32 result)
func (_MockErc20 *MockErc20CallerSession) DOMAINSEPARATOR() ([32]byte, error) {
	return _MockErc20.Contract.DOMAINSEPARATOR(&_MockErc20.CallOpts)
}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address owner, address spender) view returns(uint256 result)
func (_MockErc20 *MockErc20Caller) Allowance(opts *bind.CallOpts, owner common.Address, spender common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "allowance", owner, spender)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address owner, address spender) view returns(uint256 result)
func (_MockErc20 *MockErc20Session) Allowance(owner common.Address, spender common.Address) (*big.Int, error) {
	return _MockErc20.Contract.Allowance(&_MockErc20.CallOpts, owner, spender)
}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address owner, address spender) view returns(uint256 result)
func (_MockErc20 *MockErc20CallerSession) Allowance(owner common.Address, spender common.Address) (*big.Int, error) {
	return _MockErc20.Contract.Allowance(&_MockErc20.CallOpts, owner, spender)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address account) view returns(uint256)
func (_MockErc20 *MockErc20Caller) BalanceOf(opts *bind.CallOpts, account common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "balanceOf", account)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address account) view returns(uint256)
func (_MockErc20 *MockErc20Session) BalanceOf(account common.Address) (*big.Int, error) {
	return _MockErc20.Contract.BalanceOf(&_MockErc20.CallOpts, account)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address account) view returns(uint256)
func (_MockErc20 *MockErc20CallerSession) BalanceOf(account common.Address) (*big.Int, error) {
	return _MockErc20.Contract.BalanceOf(&_MockErc20.CallOpts, account)
}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_MockErc20 *MockErc20Caller) Decimals(opts *bind.CallOpts) (uint8, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "decimals")

	if err != nil {
		return *new(uint8), err
	}

	out0 := *abi.ConvertType(out[0], new(uint8)).(*uint8)

	return out0, err

}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_MockErc20 *MockErc20Session) Decimals() (uint8, error) {
	return _MockErc20.Contract.Decimals(&_MockErc20.CallOpts)
}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_MockErc20 *MockErc20CallerSession) Decimals() (uint8, error) {
	return _MockErc20.Contract.Decimals(&_MockErc20.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc20 *MockErc20Caller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc20 *MockErc20Session) Name() (string, error) {
	return _MockErc20.Contract.Name(&_MockErc20.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_MockErc20 *MockErc20CallerSession) Name() (string, error) {
	return _MockErc20.Contract.Name(&_MockErc20.CallOpts)
}

// Nonces is a free data retrieval call binding the contract method 0x7ecebe00.
//
// Solidity: function nonces(address owner) view returns(uint256 result)
func (_MockErc20 *MockErc20Caller) Nonces(opts *bind.CallOpts, owner common.Address) (*big.Int, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "nonces", owner)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Nonces is a free data retrieval call binding the contract method 0x7ecebe00.
//
// Solidity: function nonces(address owner) view returns(uint256 result)
func (_MockErc20 *MockErc20Session) Nonces(owner common.Address) (*big.Int, error) {
	return _MockErc20.Contract.Nonces(&_MockErc20.CallOpts, owner)
}

// Nonces is a free data retrieval call binding the contract method 0x7ecebe00.
//
// Solidity: function nonces(address owner) view returns(uint256 result)
func (_MockErc20 *MockErc20CallerSession) Nonces(owner common.Address) (*big.Int, error) {
	return _MockErc20.Contract.Nonces(&_MockErc20.CallOpts, owner)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc20 *MockErc20Caller) SupportsInterface(opts *bind.CallOpts, interfaceId [4]byte) (bool, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "supportsInterface", interfaceId)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc20 *MockErc20Session) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockErc20.Contract.SupportsInterface(&_MockErc20.CallOpts, interfaceId)
}

// SupportsInterface is a free data retrieval call binding the contract method 0x01ffc9a7.
//
// Solidity: function supportsInterface(bytes4 interfaceId) view returns(bool)
func (_MockErc20 *MockErc20CallerSession) SupportsInterface(interfaceId [4]byte) (bool, error) {
	return _MockErc20.Contract.SupportsInterface(&_MockErc20.CallOpts, interfaceId)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc20 *MockErc20Caller) Symbol(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "symbol")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc20 *MockErc20Session) Symbol() (string, error) {
	return _MockErc20.Contract.Symbol(&_MockErc20.CallOpts)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_MockErc20 *MockErc20CallerSession) Symbol() (string, error) {
	return _MockErc20.Contract.Symbol(&_MockErc20.CallOpts)
}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_MockErc20 *MockErc20Caller) TotalSupply(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _MockErc20.contract.Call(opts, &out, "totalSupply")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_MockErc20 *MockErc20Session) TotalSupply() (*big.Int, error) {
	return _MockErc20.Contract.TotalSupply(&_MockErc20.CallOpts)
}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_MockErc20 *MockErc20CallerSession) TotalSupply() (*big.Int, error) {
	return _MockErc20.Contract.TotalSupply(&_MockErc20.CallOpts)
}

// ERC20PermitBaseInit is a paid mutator transaction binding the contract method 0x5179965b.
//
// Solidity: function __ERC20PermitBase_init(string name_, string symbol_, uint8 decimals_) returns()
func (_MockErc20 *MockErc20Transactor) ERC20PermitBaseInit(opts *bind.TransactOpts, name_ string, symbol_ string, decimals_ uint8) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "__ERC20PermitBase_init", name_, symbol_, decimals_)
}

// ERC20PermitBaseInit is a paid mutator transaction binding the contract method 0x5179965b.
//
// Solidity: function __ERC20PermitBase_init(string name_, string symbol_, uint8 decimals_) returns()
func (_MockErc20 *MockErc20Session) ERC20PermitBaseInit(name_ string, symbol_ string, decimals_ uint8) (*types.Transaction, error) {
	return _MockErc20.Contract.ERC20PermitBaseInit(&_MockErc20.TransactOpts, name_, symbol_, decimals_)
}

// ERC20PermitBaseInit is a paid mutator transaction binding the contract method 0x5179965b.
//
// Solidity: function __ERC20PermitBase_init(string name_, string symbol_, uint8 decimals_) returns()
func (_MockErc20 *MockErc20TransactorSession) ERC20PermitBaseInit(name_ string, symbol_ string, decimals_ uint8) (*types.Transaction, error) {
	return _MockErc20.Contract.ERC20PermitBaseInit(&_MockErc20.TransactOpts, name_, symbol_, decimals_)
}

// ERC20Init is a paid mutator transaction binding the contract method 0xaa23aa02.
//
// Solidity: function __ERC20_init(string name_, string symbol_, uint8 decimals_) returns()
func (_MockErc20 *MockErc20Transactor) ERC20Init(opts *bind.TransactOpts, name_ string, symbol_ string, decimals_ uint8) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "__ERC20_init", name_, symbol_, decimals_)
}

// ERC20Init is a paid mutator transaction binding the contract method 0xaa23aa02.
//
// Solidity: function __ERC20_init(string name_, string symbol_, uint8 decimals_) returns()
func (_MockErc20 *MockErc20Session) ERC20Init(name_ string, symbol_ string, decimals_ uint8) (*types.Transaction, error) {
	return _MockErc20.Contract.ERC20Init(&_MockErc20.TransactOpts, name_, symbol_, decimals_)
}

// ERC20Init is a paid mutator transaction binding the contract method 0xaa23aa02.
//
// Solidity: function __ERC20_init(string name_, string symbol_, uint8 decimals_) returns()
func (_MockErc20 *MockErc20TransactorSession) ERC20Init(name_ string, symbol_ string, decimals_ uint8) (*types.Transaction, error) {
	return _MockErc20.Contract.ERC20Init(&_MockErc20.TransactOpts, name_, symbol_, decimals_)
}

// IntrospectionInit is a paid mutator transaction binding the contract method 0x930fc8ca.
//
// Solidity: function __Introspection_init() returns()
func (_MockErc20 *MockErc20Transactor) IntrospectionInit(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "__Introspection_init")
}

// IntrospectionInit is a paid mutator transaction binding the contract method 0x930fc8ca.
//
// Solidity: function __Introspection_init() returns()
func (_MockErc20 *MockErc20Session) IntrospectionInit() (*types.Transaction, error) {
	return _MockErc20.Contract.IntrospectionInit(&_MockErc20.TransactOpts)
}

// IntrospectionInit is a paid mutator transaction binding the contract method 0x930fc8ca.
//
// Solidity: function __Introspection_init() returns()
func (_MockErc20 *MockErc20TransactorSession) IntrospectionInit() (*types.Transaction, error) {
	return _MockErc20.Contract.IntrospectionInit(&_MockErc20.TransactOpts)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Transactor) Approve(opts *bind.TransactOpts, spender common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "approve", spender, amount)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Session) Approve(spender common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Approve(&_MockErc20.TransactOpts, spender, amount)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20TransactorSession) Approve(spender common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Approve(&_MockErc20.TransactOpts, spender, amount)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address account, uint256 amount) returns()
func (_MockErc20 *MockErc20Transactor) Mint(opts *bind.TransactOpts, account common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "mint", account, amount)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address account, uint256 amount) returns()
func (_MockErc20 *MockErc20Session) Mint(account common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Mint(&_MockErc20.TransactOpts, account, amount)
}

// Mint is a paid mutator transaction binding the contract method 0x40c10f19.
//
// Solidity: function mint(address account, uint256 amount) returns()
func (_MockErc20 *MockErc20TransactorSession) Mint(account common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Mint(&_MockErc20.TransactOpts, account, amount)
}

// Permit is a paid mutator transaction binding the contract method 0xd505accf.
//
// Solidity: function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns()
func (_MockErc20 *MockErc20Transactor) Permit(opts *bind.TransactOpts, owner common.Address, spender common.Address, amount *big.Int, deadline *big.Int, v uint8, r [32]byte, s [32]byte) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "permit", owner, spender, amount, deadline, v, r, s)
}

// Permit is a paid mutator transaction binding the contract method 0xd505accf.
//
// Solidity: function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns()
func (_MockErc20 *MockErc20Session) Permit(owner common.Address, spender common.Address, amount *big.Int, deadline *big.Int, v uint8, r [32]byte, s [32]byte) (*types.Transaction, error) {
	return _MockErc20.Contract.Permit(&_MockErc20.TransactOpts, owner, spender, amount, deadline, v, r, s)
}

// Permit is a paid mutator transaction binding the contract method 0xd505accf.
//
// Solidity: function permit(address owner, address spender, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns()
func (_MockErc20 *MockErc20TransactorSession) Permit(owner common.Address, spender common.Address, amount *big.Int, deadline *big.Int, v uint8, r [32]byte, s [32]byte) (*types.Transaction, error) {
	return _MockErc20.Contract.Permit(&_MockErc20.TransactOpts, owner, spender, amount, deadline, v, r, s)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Transactor) Transfer(opts *bind.TransactOpts, to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "transfer", to, amount)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Session) Transfer(to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Transfer(&_MockErc20.TransactOpts, to, amount)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20TransactorSession) Transfer(to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.Transfer(&_MockErc20.TransactOpts, to, amount)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Transactor) TransferFrom(opts *bind.TransactOpts, from common.Address, to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.contract.Transact(opts, "transferFrom", from, to, amount)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20Session) TransferFrom(from common.Address, to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.TransferFrom(&_MockErc20.TransactOpts, from, to, amount)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 amount) returns(bool)
func (_MockErc20 *MockErc20TransactorSession) TransferFrom(from common.Address, to common.Address, amount *big.Int) (*types.Transaction, error) {
	return _MockErc20.Contract.TransferFrom(&_MockErc20.TransactOpts, from, to, amount)
}

// MockErc20ApprovalIterator is returned from FilterApproval and is used to iterate over the raw logs and unpacked data for Approval events raised by the MockErc20 contract.
type MockErc20ApprovalIterator struct {
	Event *MockErc20Approval // Event containing the contract specifics and raw log

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
func (it *MockErc20ApprovalIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20Approval)
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
		it.Event = new(MockErc20Approval)
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
func (it *MockErc20ApprovalIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20ApprovalIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20Approval represents a Approval event raised by the MockErc20 contract.
type MockErc20Approval struct {
	Owner   common.Address
	Spender common.Address
	Value   *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterApproval is a free log retrieval operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_MockErc20 *MockErc20Filterer) FilterApproval(opts *bind.FilterOpts, owner []common.Address, spender []common.Address) (*MockErc20ApprovalIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var spenderRule []interface{}
	for _, spenderItem := range spender {
		spenderRule = append(spenderRule, spenderItem)
	}

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "Approval", ownerRule, spenderRule)
	if err != nil {
		return nil, err
	}
	return &MockErc20ApprovalIterator{contract: _MockErc20.contract, event: "Approval", logs: logs, sub: sub}, nil
}

// WatchApproval is a free log subscription operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_MockErc20 *MockErc20Filterer) WatchApproval(opts *bind.WatchOpts, sink chan<- *MockErc20Approval, owner []common.Address, spender []common.Address) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var spenderRule []interface{}
	for _, spenderItem := range spender {
		spenderRule = append(spenderRule, spenderItem)
	}

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "Approval", ownerRule, spenderRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20Approval)
				if err := _MockErc20.contract.UnpackLog(event, "Approval", log); err != nil {
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
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_MockErc20 *MockErc20Filterer) ParseApproval(log types.Log) (*MockErc20Approval, error) {
	event := new(MockErc20Approval)
	if err := _MockErc20.contract.UnpackLog(event, "Approval", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc20InitializedIterator is returned from FilterInitialized and is used to iterate over the raw logs and unpacked data for Initialized events raised by the MockErc20 contract.
type MockErc20InitializedIterator struct {
	Event *MockErc20Initialized // Event containing the contract specifics and raw log

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
func (it *MockErc20InitializedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20Initialized)
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
		it.Event = new(MockErc20Initialized)
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
func (it *MockErc20InitializedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20InitializedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20Initialized represents a Initialized event raised by the MockErc20 contract.
type MockErc20Initialized struct {
	Version uint32
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterInitialized is a free log retrieval operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockErc20 *MockErc20Filterer) FilterInitialized(opts *bind.FilterOpts) (*MockErc20InitializedIterator, error) {

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return &MockErc20InitializedIterator{contract: _MockErc20.contract, event: "Initialized", logs: logs, sub: sub}, nil
}

// WatchInitialized is a free log subscription operation binding the contract event 0xe9c9b456cb2994b80aeef036cf59d26e9617df80f816a6ee5a5b4166e07e2f5c.
//
// Solidity: event Initialized(uint32 version)
func (_MockErc20 *MockErc20Filterer) WatchInitialized(opts *bind.WatchOpts, sink chan<- *MockErc20Initialized) (event.Subscription, error) {

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "Initialized")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20Initialized)
				if err := _MockErc20.contract.UnpackLog(event, "Initialized", log); err != nil {
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
func (_MockErc20 *MockErc20Filterer) ParseInitialized(log types.Log) (*MockErc20Initialized, error) {
	event := new(MockErc20Initialized)
	if err := _MockErc20.contract.UnpackLog(event, "Initialized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc20InterfaceAddedIterator is returned from FilterInterfaceAdded and is used to iterate over the raw logs and unpacked data for InterfaceAdded events raised by the MockErc20 contract.
type MockErc20InterfaceAddedIterator struct {
	Event *MockErc20InterfaceAdded // Event containing the contract specifics and raw log

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
func (it *MockErc20InterfaceAddedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20InterfaceAdded)
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
		it.Event = new(MockErc20InterfaceAdded)
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
func (it *MockErc20InterfaceAddedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20InterfaceAddedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20InterfaceAdded represents a InterfaceAdded event raised by the MockErc20 contract.
type MockErc20InterfaceAdded struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceAdded is a free log retrieval operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockErc20 *MockErc20Filterer) FilterInterfaceAdded(opts *bind.FilterOpts, interfaceId [][4]byte) (*MockErc20InterfaceAddedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &MockErc20InterfaceAddedIterator{contract: _MockErc20.contract, event: "InterfaceAdded", logs: logs, sub: sub}, nil
}

// WatchInterfaceAdded is a free log subscription operation binding the contract event 0x78f84e5b1c5c05be2b5ad3800781dd404d6d6c6302bc755c0fe20f58a33a7f22.
//
// Solidity: event InterfaceAdded(bytes4 indexed interfaceId)
func (_MockErc20 *MockErc20Filterer) WatchInterfaceAdded(opts *bind.WatchOpts, sink chan<- *MockErc20InterfaceAdded, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "InterfaceAdded", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20InterfaceAdded)
				if err := _MockErc20.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
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
func (_MockErc20 *MockErc20Filterer) ParseInterfaceAdded(log types.Log) (*MockErc20InterfaceAdded, error) {
	event := new(MockErc20InterfaceAdded)
	if err := _MockErc20.contract.UnpackLog(event, "InterfaceAdded", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc20InterfaceRemovedIterator is returned from FilterInterfaceRemoved and is used to iterate over the raw logs and unpacked data for InterfaceRemoved events raised by the MockErc20 contract.
type MockErc20InterfaceRemovedIterator struct {
	Event *MockErc20InterfaceRemoved // Event containing the contract specifics and raw log

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
func (it *MockErc20InterfaceRemovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20InterfaceRemoved)
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
		it.Event = new(MockErc20InterfaceRemoved)
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
func (it *MockErc20InterfaceRemovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20InterfaceRemovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20InterfaceRemoved represents a InterfaceRemoved event raised by the MockErc20 contract.
type MockErc20InterfaceRemoved struct {
	InterfaceId [4]byte
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterInterfaceRemoved is a free log retrieval operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockErc20 *MockErc20Filterer) FilterInterfaceRemoved(opts *bind.FilterOpts, interfaceId [][4]byte) (*MockErc20InterfaceRemovedIterator, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return &MockErc20InterfaceRemovedIterator{contract: _MockErc20.contract, event: "InterfaceRemoved", logs: logs, sub: sub}, nil
}

// WatchInterfaceRemoved is a free log subscription operation binding the contract event 0x8bd383568d0bc57b64b8e424138fc19ae827e694e05757faa8fea8f63fb87315.
//
// Solidity: event InterfaceRemoved(bytes4 indexed interfaceId)
func (_MockErc20 *MockErc20Filterer) WatchInterfaceRemoved(opts *bind.WatchOpts, sink chan<- *MockErc20InterfaceRemoved, interfaceId [][4]byte) (event.Subscription, error) {

	var interfaceIdRule []interface{}
	for _, interfaceIdItem := range interfaceId {
		interfaceIdRule = append(interfaceIdRule, interfaceIdItem)
	}

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "InterfaceRemoved", interfaceIdRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20InterfaceRemoved)
				if err := _MockErc20.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
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
func (_MockErc20 *MockErc20Filterer) ParseInterfaceRemoved(log types.Log) (*MockErc20InterfaceRemoved, error) {
	event := new(MockErc20InterfaceRemoved)
	if err := _MockErc20.contract.UnpackLog(event, "InterfaceRemoved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// MockErc20TransferIterator is returned from FilterTransfer and is used to iterate over the raw logs and unpacked data for Transfer events raised by the MockErc20 contract.
type MockErc20TransferIterator struct {
	Event *MockErc20Transfer // Event containing the contract specifics and raw log

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
func (it *MockErc20TransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(MockErc20Transfer)
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
		it.Event = new(MockErc20Transfer)
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
func (it *MockErc20TransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *MockErc20TransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// MockErc20Transfer represents a Transfer event raised by the MockErc20 contract.
type MockErc20Transfer struct {
	From  common.Address
	To    common.Address
	Value *big.Int
	Raw   types.Log // Blockchain specific contextual infos
}

// FilterTransfer is a free log retrieval operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_MockErc20 *MockErc20Filterer) FilterTransfer(opts *bind.FilterOpts, from []common.Address, to []common.Address) (*MockErc20TransferIterator, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _MockErc20.contract.FilterLogs(opts, "Transfer", fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return &MockErc20TransferIterator{contract: _MockErc20.contract, event: "Transfer", logs: logs, sub: sub}, nil
}

// WatchTransfer is a free log subscription operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_MockErc20 *MockErc20Filterer) WatchTransfer(opts *bind.WatchOpts, sink chan<- *MockErc20Transfer, from []common.Address, to []common.Address) (event.Subscription, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _MockErc20.contract.WatchLogs(opts, "Transfer", fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(MockErc20Transfer)
				if err := _MockErc20.contract.UnpackLog(event, "Transfer", log); err != nil {
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
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_MockErc20 *MockErc20Filterer) ParseTransfer(log types.Log) (*MockErc20Transfer, error) {
	event := new(MockErc20Transfer)
	if err := _MockErc20.contract.UnpackLog(event, "Transfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
