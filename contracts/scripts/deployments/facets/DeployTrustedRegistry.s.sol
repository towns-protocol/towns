// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts

import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {TrustedRegistry} from "contracts/src/app/TrustedRegistry.sol";

contract DeployTrustedRegistry is FacetHelper, Deployer {
    constructor() {
        addSelector(TrustedRegistry.trustAttesters.selector);
        addSelector(TrustedRegistry.checkForAccount.selector);
        addSelector(bytes4(keccak256("check(address)")));
        addSelector(bytes4(keccak256("check(address,address[],uint256)")));
    }

    function initializer() public pure override returns (bytes4) {
        return TrustedRegistry.__TrustedRegistry_init.selector;
    }

    function versionName() public pure override returns (string memory) {
        return "facets/trustedRegistryFacet";
    }

    function __deploy(address deployer) public override returns (address) {
        vm.startBroadcast(deployer);
        TrustedRegistry trustedRegistry = new TrustedRegistry();
        vm.stopBroadcast();
        return address(trustedRegistry);
    }
}
