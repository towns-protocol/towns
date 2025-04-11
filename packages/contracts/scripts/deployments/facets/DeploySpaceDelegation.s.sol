// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// helpers
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {SpaceDelegationFacet} from "src/base/registry/facets/delegation/SpaceDelegationFacet.sol";

contract DeploySpaceDelegation is Deployer, FacetHelper {
    constructor() {
        addSelector(SpaceDelegationFacet.addSpaceDelegation.selector);
        addSelector(SpaceDelegationFacet.removeSpaceDelegation.selector);
        addSelector(SpaceDelegationFacet.getSpaceDelegation.selector);
        addSelector(SpaceDelegationFacet.getSpaceDelegationsByOperator.selector);
        addSelector(SpaceDelegationFacet.setRiverToken.selector);
        addSelector(SpaceDelegationFacet.riverToken.selector);
        addSelector(SpaceDelegationFacet.getTotalDelegation.selector);
        addSelector(SpaceDelegationFacet.setMainnetDelegation.selector);
        addSelector(SpaceDelegationFacet.setSpaceFactory.selector);
        addSelector(SpaceDelegationFacet.getSpaceFactory.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return SpaceDelegationFacet.__SpaceDelegation_init.selector;
    }

    function makeInitData(address riverToken) public pure returns (bytes memory) {
        return abi.encodeWithSelector(initializer(), riverToken);
    }

    function versionName() public pure override returns (string memory) {
        return "facets/spaceDelegationFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        SpaceDelegationFacet spaceDelegationFacet = new SpaceDelegationFacet();
        vm.stopBroadcast();
        return address(spaceDelegationFacet);
    }
}
