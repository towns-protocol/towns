// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

/**
 * @dev Provides tracking nonces for addresses. Nonces will only increment.
 */
abstract contract Nonces {
  /**
   * @dev The nonce used for an `account` is not the expected current nonce.
   */
  error InvalidAccountNonce(address account, uint256 currentNonce);

  /**
   * @dev Returns the current nonce for an address.
   */
  function _latestNonce(address owner) internal view virtual returns (uint256) {
    return NoncesStorage.layout()._nonces[owner];
  }

  /**
   * @dev Consumes a nonce.
   *
   * Returns the current value and increments nonce.
   */
  function _useNonce(address owner) internal virtual returns (uint256) {
    // For each account, the nonce has an initial value of 0, can only be incremented by one, and cannot be
    // decremented or reset. This guarantees that the nonce never overflows.
    unchecked {
      // It is important to do x++ and not ++x here.
      return NoncesStorage.layout()._nonces[owner]++;
    }
  }

  /**
   * @dev Same as {_useNonce} but checking that `nonce` is the next valid for `owner`.
   */
  function _useCheckedNonce(address owner, uint256 nonce) internal virtual {
    uint256 current = _useNonce(owner);
    if (nonce != current) {
      revert InvalidAccountNonce(owner, current);
    }
  }
}

library NoncesStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.diamond.facets.utils.NoncesStorage");

  struct Layout {
    mapping(address => uint256) _nonces;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 position = STORAGE_SLOT;
    assembly {
      l.slot := position
    }
  }
}
