// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {ProxyManager} from "@towns-protocol/diamond/src/proxy/manager/ProxyManager.sol";
import {Deployer} from "scripts/common/Deployer.s.sol";

contract DeployProxyManager is Deployer, FacetHelper {
    constructor() {
        addSelector(ProxyManager.getImplementation.selector);
        addSelector(ProxyManager.setImplementation.selector);
    }

    function initializer() public pure override returns (bytes4) {
        return ProxyManager.__ProxyManager_init.selector;
    }

    function makeInitData(address implementation) public pure returns (bytes memory) {
        return abi.encodeWithSelector(ProxyManager.__ProxyManager_init.selector, implementation);
    }

    function versionName() public pure override returns (string memory) {
        return "facets/proxyManagerFacet";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        ProxyManager facet = new ProxyManager();
        vm.stopBroadcast();
        return address(facet);
    }
}
