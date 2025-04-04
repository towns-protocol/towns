// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {IntrospectionFacet} from
    "@towns-protocol/diamond/src/facets/introspection/IntrospectionFacet.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

contract DeployIntrospection is FacetHelper, Deployer {
    constructor() {
        addSelector(IntrospectionFacet.supportsInterface.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return IntrospectionFacet.__Introspection_init.selector;
    }

    function versionName() public pure override returns (string memory) {
        return "facets/introspectionFacet";
    }

    function __deploy(address deployer) public override returns (address) {
        vm.startBroadcast(deployer);
        IntrospectionFacet facet = new IntrospectionFacet();
        vm.stopBroadcast();
        return address(facet);
    }
}
