// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library ProxyDelegationStorage {
  // keccak256(abi.encode(uint256(keccak256("river.mainnet.delegation.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xc95eced7d596f82215fa5f7f46b3d150b8697bffebf6365a405c21281c2c9e00;

  struct Layout {
    address rvr;
    mapping(address => address) authorizedClaimers;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
