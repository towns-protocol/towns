// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {EntitlementGated} from "contracts/src/spaces/facets/gated/EntitlementGated.sol";
import {SpaceEntitlementGated} from "contracts/src/spaces/facets/xchain/SpaceEntitlementGated.sol";

contract DeploySpaceEntitlementGated is FacetHelper, Deployer {
    constructor() {
        addSelector(EntitlementGated.postEntitlementCheckResult.selector);
        addSelector(EntitlementGated.postEntitlementCheckResultV2.selector);
        addSelector(EntitlementGated.getRuleData.selector);
    }

    function versionName() public pure override returns (string memory) {
        return "facets/spaceEntitlementGatedFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        SpaceEntitlementGated facet = new SpaceEntitlementGated();
        vm.stopBroadcast();
        return address(facet);
    }
}
