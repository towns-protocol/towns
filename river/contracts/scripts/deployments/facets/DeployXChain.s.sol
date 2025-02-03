// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {XChain} from "contracts/src/base/registry/facets/xchain/XChain.sol";

contract DeployXChain is Deployer, FacetHelper {
  // FacetHelper
  constructor() {
    addSelector(XChain.postEntitlementCheckResult.selector);
    addSelector(XChain.isCheckCompleted.selector);
  }

  // Deploying
  function versionName() public pure override returns (string memory) {
    return "xchainFacet";
  }

  function initializer() public pure override returns (bytes4) {
    return XChain.__XChain_init.selector;
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    XChain xchain = new XChain();
    vm.stopBroadcast();
    return address(xchain);
  }
}
