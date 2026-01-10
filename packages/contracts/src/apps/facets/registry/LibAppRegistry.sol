// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IPlatformRequirements} from "../../../factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IAppRegistryBase} from "./IAppRegistry.sol";

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// contracts

library LibAppRegistry {
    using CustomRevert for bytes4;

    uint48 internal constant MAX_DURATION = 365 days;

    function validatePricing(
        IPlatformRequirements platformRequirements,
        uint256 price
    ) internal view returns (uint256) {
        uint256 minPlatformFee = platformRequirements.getMembershipFee();
        if (price > 0 && price < minPlatformFee)
            IAppRegistryBase.AppRegistry__InvalidPrice.selector.revertWith();
        return price;
    }

    function validateDuration(uint48 accessDuration) internal pure returns (uint48 duration) {
        if (accessDuration > MAX_DURATION)
            IAppRegistryBase.AppRegistry__InvalidDuration.selector.revertWith();
        duration = accessDuration == 0 ? MAX_DURATION : accessDuration;
    }
}
