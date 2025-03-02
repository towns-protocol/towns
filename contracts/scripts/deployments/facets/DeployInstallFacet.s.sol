// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {IInstallFacet, InstallFacet} from "contracts/src/spaces/facets/install/InstallFacet.sol";

contract DeployInstallFacet is Deployer, FacetHelper {
  // FacetHelper
  constructor() {
    addSelector(IInstallFacet.installApp.selector);
    addSelector(IInstallFacet.uninstallApp.selector);
  }

  // Deploying
  function versionName() public pure override returns (string memory) {
    return "installFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    InstallFacet installFacet = new InstallFacet();
    vm.stopBroadcast();
    return address(installFacet);
  }
}
