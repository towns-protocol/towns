// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {WalletLinkQueryable} from "contracts/src/factory/facets/wallet-link/WalletLinkQueryable.sol";

contract DeployWalletLinkQueryable is FacetHelper, Deployer {
  constructor() {
    addSelector(WalletLinkQueryable.explicitWalletsByRootKey.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return WalletLinkQueryable.__WalletLinkQueryable_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "walletLinkQueryableFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    WalletLinkQueryable walletLinkQueryable = new WalletLinkQueryable();
    vm.stopBroadcast();
    return address(walletLinkQueryable);
  }
}
