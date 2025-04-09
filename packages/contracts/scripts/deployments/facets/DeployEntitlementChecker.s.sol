// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {EntitlementChecker} from "src/base/registry/facets/checker/EntitlementChecker.sol";

contract DeployEntitlementChecker is Deployer, FacetHelper {
    constructor() {
        addSelector(EntitlementChecker.registerNode.selector);
        addSelector(EntitlementChecker.unregisterNode.selector);
        addSelector(EntitlementChecker.isValidNode.selector);
        addSelector(EntitlementChecker.getNodeCount.selector);
        addSelector(EntitlementChecker.getNodeAtIndex.selector);
        addSelector(EntitlementChecker.getRandomNodes.selector);
        addSelector(EntitlementChecker.requestEntitlementCheck.selector);
        addSelector(EntitlementChecker.requestEntitlementCheckV2.selector);
        addSelector(EntitlementChecker.getNodesByOperator.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return EntitlementChecker.__EntitlementChecker_init.selector;
    }

    function versionName() public pure override returns (string memory) {
        return "facets/entitlementCheckerFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        EntitlementChecker entitlementChecker = new EntitlementChecker();
        vm.stopBroadcast();
        return address(entitlementChecker);
    }
}
