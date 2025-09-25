// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IMembershipTiers} from "./IMembershipTiers.sol";

// libraries
import {MembershipTier} from "./MembershipTiersStorage.sol";

// contracts
import {MembershipTiersBase} from "./MembershipTiersBase.sol";

contract MembershipTiersFacet is IMembershipTiers, MembershipTiersBase {
    function createTier(MembershipTier calldata params) external returns (MembershipTier memory) {
        return _createTier(params);
    }
}
