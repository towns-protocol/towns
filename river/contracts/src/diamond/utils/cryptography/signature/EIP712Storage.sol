// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces

// libraries

// contracts

library EIP712Storage {
  struct Layout {
    bytes32 hashedName;
    bytes32 hashedVersion;
    string name;
    string version;
  }

  // keccak256(abi.encode(uint256(keccak256("diamond.utils.cryptography.eip712.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x219639d1c7dec7d049ffb8dc11e39f070f052764b142bd61682a7811a502a600;

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
