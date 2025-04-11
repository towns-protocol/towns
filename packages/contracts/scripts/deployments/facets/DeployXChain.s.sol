// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";
import {XChain} from "src/base/registry/facets/xchain/XChain.sol";

contract DeployXChain is Deployer, FacetHelper {
    // FacetHelper
    constructor() {
        addSelector(XChain.postEntitlementCheckResult.selector);
        addSelector(XChain.isCheckCompleted.selector);
    }

    // Deploying
    function versionName() public pure override returns (string memory) {
        return "facets/xchainFacet";
    }

    function initializer() public pure override returns (bytes4) {
        return XChain.__XChain_init.selector;
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        XChain xchain = new XChain();
        vm.stopBroadcast();
        return address(xchain);
    }
}
