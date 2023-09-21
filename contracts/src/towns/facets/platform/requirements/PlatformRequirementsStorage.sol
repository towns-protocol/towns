// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

library PlatformRequirementsStorage {
  bytes32 internal constant STORAGE_SLOT =
    keccak256("towns.facets.platform.requirements.PlatformRequirementsStorage");

  struct Layout {
    address feeRecipient;
    uint16 membershipBps;
    uint256 membershipFee;
    uint256 membershipMintLimit;
    uint256 membershipDuration;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
