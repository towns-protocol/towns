// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {AppInstaller} from "contracts/src/app/facets/AppInstaller.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {ERC6909} from "solady/tokens/ERC6909.sol";

contract DeployAppInstaller is FacetHelper, Deployer {
  constructor() {
    addSelector(AppInstaller.install.selector);
    addSelector(AppInstaller.installedApps.selector);
    addSelector(AppInstaller.isInstalled.selector);
    addSelector(AppInstaller.isEntitled.selector);
    addSelector(AppInstaller.uninstall.selector);
    addSelector(AppInstaller.name.selector);
    addSelector(AppInstaller.symbol.selector);
    addSelector(AppInstaller.tokenURI.selector);

    // ERC6909
    addSelector(ERC6909.decimals.selector);
    addSelector(ERC6909.balanceOf.selector);
    addSelector(ERC6909.allowance.selector);
    addSelector(ERC6909.isOperator.selector);
    addSelector(ERC6909.setOperator.selector);
    addSelector(ERC6909.approve.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "appInstallerFacet";
  }

  function initializer() public pure override returns (bytes4) {
    return AppInstaller.__AppInstaller_init.selector;
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    AppInstaller appInstaller = new AppInstaller();
    vm.stopBroadcast();
    return address(appInstaller);
  }
}
