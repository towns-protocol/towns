// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library ReferralsStorage {
    struct Referral {
        uint256 bpsFee; // fee in basis points
        address recipient;
    }

    struct ReferralSettings {
        uint256 maxBpsFee; // fee in basis points
        uint256 defaultBpsFee; // fee in basis points
    }

    struct Layout {
        ReferralSettings referralSettings;
        mapping(bytes32 referralCode => Referral) referrals;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.referrals.v2.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xaca21cc4d2a125f3e0ae03aa135d42b2b9177631aca87599d42a68b47e900800;

    function layout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }
}
