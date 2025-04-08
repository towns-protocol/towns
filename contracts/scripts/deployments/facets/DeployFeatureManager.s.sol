// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FeatureManagerFacet} from "contracts/src/factory/facets/feature/FeatureManagerFacet.sol";

contract DeployFeatureManager is Deployer, FacetHelper {
    // FacetHelper
    constructor() {
        addSelector(FeatureManagerFacet.setFeatureCondition.selector);
        addSelector(FeatureManagerFacet.getFeatureCondition.selector);
        addSelector(FeatureManagerFacet.getFeatureConditions.selector);
        addSelector(FeatureManagerFacet.getFeatureConditionsForSpace.selector);
        addSelector(FeatureManagerFacet.checkFeatureCondition.selector);
        addSelector(FeatureManagerFacet.disableFeatureCondition.selector);
    }

    // Deploying
    function versionName() public pure override returns (string memory) {
        return "featureManagerFacet";
    }

    function initializer() public pure override returns (bytes4) {
        return FeatureManagerFacet.__FeatureManagerFacet_init.selector;
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        FeatureManagerFacet featureManagerFacet = new FeatureManagerFacet();
        vm.stopBroadcast();
        return address(featureManagerFacet);
    }
}
