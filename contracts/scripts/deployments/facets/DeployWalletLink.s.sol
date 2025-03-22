// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {WalletLink} from "contracts/src/factory/facets/wallet-link/WalletLink.sol";

contract DeployWalletLink is FacetHelper, Deployer {
  constructor() {
    addSelector(WalletLink.linkCallerToRootKey.selector);
    addSelector(WalletLink.linkWalletToRootKey.selector);
    addSelector(WalletLink.removeLink.selector);
    addSelector(WalletLink.getWalletsByRootKey.selector);
    addSelector(WalletLink.getRootKeyForWallet.selector);
    addSelector(WalletLink.checkIfLinked.selector);
    addSelector(WalletLink.getLatestNonceForRootKey.selector);
    addSelector(WalletLink.removeCallerLink.selector);
    addSelector(WalletLink.setDefaultWallet.selector);
    addSelector(WalletLink.getDefaultWallet.selector);
    addSelector(WalletLink.getWalletsByRootKeyWithDelegations.selector);
    addSelector(WalletLink.getDependency.selector);
    addSelector(WalletLink.setDependency.selector);
    addSelector(WalletLink.explicitWalletsByRootKey.selector);
    addSelector(WalletLink.linkNonEVMWalletToRootKey.selector);
    addSelector(WalletLink.removeNonEVMWalletLink.selector);
    addSelector(WalletLink.checkIfNonEVMWalletLinked.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return WalletLink.__WalletLink_init.selector;
  }

  // 0x6aa4029900000000000000000000000000000000000000447e69651d841bd8d104bed4930000000000000000000000001d19402769366dc08d3256a0ac148f227df105ce00000000000000000000000000000000000000000000000000000000
  function makeInitData(
    address delegateRegistry,
    address sclEip6565
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), delegateRegistry, sclEip6565);
  }

  function versionName() public pure override returns (string memory) {
    return "facets/walletLinkFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    WalletLink walletLink = new WalletLink();
    vm.stopBroadcast();
    return address(walletLink);
  }
}
