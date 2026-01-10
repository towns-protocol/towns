// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library PlatformRequirementsStorage {
    struct Layout {
        // slot 0
        uint256 membershipFee;
        // slot 1
        uint256 membershipMintLimit;
        // slot 2
        address feeRecipient;
        uint64 membershipDuration;
        uint16 membershipBps;
        // slot 3
        uint256 membershipMinPrice;
        // slot 4
        uint16 swapProtocolBps;
        uint16 swapPosterBps;
        // slot 5
        mapping(address => bool) whitelistedRouters;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.platform.requirements.storage")) - 1))
    // &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xb29a817dd0719f30ad87abc8dff26e6354077e5b46bf38f34d5ac48732860d00;

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
