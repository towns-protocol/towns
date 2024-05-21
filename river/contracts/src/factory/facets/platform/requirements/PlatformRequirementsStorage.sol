// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library PlatformRequirementsStorage {
  // keccak256(abi.encode(uint256(keccak256("spaces.facets.platform.requirements.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0xb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d00;

  struct Layout {
    uint256 membershipFee;
    uint256 membershipMintLimit;
    address feeRecipient;
    uint64 membershipDuration;
    uint16 membershipBps;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
