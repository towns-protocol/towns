// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC5267} from "./IERC5267.sol";

// libraries
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// contracts
import {Initializable} from "contracts/src/diamond/facets/initializable/Initializable.sol";

/**
 * @dev https://eips.ethereum.org/EIPS/eip-712[EIP 712] is a standard for hashing and signing of typed structured data.
 *
 * The encoding specified in the EIP is very generic, and such a generic implementation in Solidity is not feasible,
 * thus this contract does not implement the encoding itself. Protocols need to implement the type-specific encoding
 * they need in their contracts using a combination of `abi.encode` and `keccak256`.
 *
 * This contract implements the EIP 712 domain separator ({_domainSeparatorV4}) that is used as part of the encoding
 * scheme, and the final step of the encoding to obtain the message digest that is then signed via ECDSA
 * ({_hashTypedDataV4}).
 *
 * The implementation of the domain separator was designed to be as efficient as possible while still properly updating
 * the chain id to protect against replay attacks on an eventual fork of the chain.
 *
 * NOTE: This contract implements the version of the encoding known as "v4", as implemented by the JSON RPC method
 * https://docs.metamask.io/guide/signing-data.html[`eth_signTypedDataV4` in MetaMask].
 *
 * NOTE: In the upgradeable version of this contract, the cached values will correspond to the address, and the domain
 * separator of the implementation contract. This will cause the `_domainSeparatorV4` function to always rebuild the
 * separator from the immutable values, which is cheaper than accessing a cached version in cold storage.
 *
 * _Available since v3.4._
 *
 * @custom:storage-size 52
 */
abstract contract EIP712 is Initializable, IERC5267 {
  using EIP712Storage for EIP712Storage.Layout;

  bytes32 private constant _TYPE_HASH =
    keccak256(
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

  /**
   * @dev Initializes the domain separator and parameter caches.
   *
   * The meaning of `name` and `version` is specified in
   * https://eips.ethereum.org/EIPS/eip-712#definition-of-domainseparator[EIP 712]:
   *
   * - `name`: the user readable name of the signing domain, i.e. the name of the DApp or the protocol.
   * - `version`: the current major version of the signing domain.
   *
   * NOTE: These parameters cannot be changed except through a xref:learn::upgrading-smart-contracts.adoc[smart
   * contract upgrade].
   */
  function __EIP712_init(
    string memory name,
    string memory version
  ) internal onlyInitializing {
    __EIP712_init_unchained(name, version);
  }

  function __EIP712_init_unchained(
    string memory name,
    string memory version
  ) internal {
    EIP712Storage.layout()._name = name;
    EIP712Storage.layout()._version = version;

    // Reset prior values in storage if upgrading
    EIP712Storage.layout()._hashedName = 0;
    EIP712Storage.layout()._hashedVersion = 0;
  }

  /**
   * @dev Returns the domain separator for the current chain.
   */
  function _domainSeparatorV4() internal view returns (bytes32) {
    return _buildDomainSeparator();
  }

  function _buildDomainSeparator() private view returns (bytes32) {
    return
      keccak256(
        abi.encode(
          _TYPE_HASH,
          _EIP712NameHash(),
          _EIP712VersionHash(),
          block.chainid,
          address(this)
        )
      );
  }

  /**
   * @dev Given an already https://eips.ethereum.org/EIPS/eip-712#definition-of-hashstruct[hashed struct], this
   * function returns the hash of the fully encoded EIP712 message for this domain.
   *
   * This hash can be used together with {ECDSA-recover} to obtain the signer of a message. For example:
   *
   * ```solidity
   * bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
   *     keccak256("Mail(address to,string contents)"),
   *     mailTo,
   *     keccak256(bytes(mailContents))
   * )));
   * address signer = ECDSA.recover(digest, signature);
   * ```
   */
  function _hashTypedDataV4(
    bytes32 structHash
  ) internal view virtual returns (bytes32) {
    return MessageHashUtils.toTypedDataHash(_domainSeparatorV4(), structHash);
  }

  /**
   * @dev See {EIP-5267}.
   *
   * _Available since v4.9._
   */
  function eip712Domain()
    public
    view
    virtual
    override
    returns (
      bytes1 fields,
      string memory name,
      string memory version,
      uint256 chainId,
      address verifyingContract,
      bytes32 salt,
      uint256[] memory extensions
    )
  {
    // If the hashed name and version in storage are non-zero, the contract hasn't been properly initialized
    // and the EIP712 domain is not reliable, as it will be missing name and version.
    require(
      EIP712Storage.layout()._hashedName == 0 &&
        EIP712Storage.layout()._hashedVersion == 0,
      "EIP712: Uninitialized"
    );

    return (
      hex"0f", // 01111
      _EIP712Name(),
      _EIP712Version(),
      block.chainid,
      address(this),
      bytes32(0),
      new uint256[](0)
    );
  }

  /**
   * @dev The name parameter for the EIP712 domain.
   *
   * NOTE: This function reads from storage by default, but can be redefined to return a constant value if gas costs
   * are a concern.
   */
  function _EIP712Name() internal view virtual returns (string memory) {
    return EIP712Storage.layout()._name;
  }

  /**
   * @dev The version parameter for the EIP712 domain.
   *
   * NOTE: This function reads from storage by default, but can be redefined to return a constant value if gas costs
   * are a concern.
   */
  function _EIP712Version() internal view virtual returns (string memory) {
    return EIP712Storage.layout()._version;
  }

  /**
   * @dev The hash of the name parameter for the EIP712 domain.
   *
   * NOTE: In previous versions this function was virtual. In this version you should override `_EIP712Name` instead.
   */
  function _EIP712NameHash() internal view returns (bytes32) {
    string memory name = _EIP712Name();
    if (bytes(name).length > 0) {
      return keccak256(bytes(name));
    } else {
      // If the name is empty, the contract may have been upgraded without initializing the new storage.
      // We return the name hash in storage if non-zero, otherwise we assume the name is empty by design.
      bytes32 hashedName = EIP712Storage.layout()._hashedName;
      if (hashedName != 0) {
        return hashedName;
      } else {
        return keccak256("");
      }
    }
  }

  /**
   * @dev The hash of the version parameter for the EIP712 domain.
   *
   * NOTE: In previous versions this function was virtual. In this version you should override `_EIP712Version` instead.
   */
  function _EIP712VersionHash() internal view returns (bytes32) {
    string memory version = _EIP712Version();
    if (bytes(version).length > 0) {
      return keccak256(bytes(version));
    } else {
      // If the version is empty, the contract may have been upgraded without initializing the new storage.
      // We return the version hash in storage if non-zero, otherwise we assume the version is empty by design.
      bytes32 hashedVersion = EIP712Storage.layout()._hashedVersion;
      if (hashedVersion != 0) {
        return hashedVersion;
      } else {
        return keccak256("");
      }
    }
  }
}

library EIP712Storage {
  struct Layout {
    bytes32 _hashedName;
    bytes32 _hashedVersion;
    string _name;
    string _version;
  }

  bytes32 internal constant STORAGE_SLOT =
    keccak256("diamond.utils.cryptography.EIP712Storage");

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
