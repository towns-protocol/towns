// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
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
  }

  function initializer() public pure override returns (bytes4) {
    return WalletLink.__WalletLink_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "walletLink";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    WalletLink walletLink = new WalletLink();
    vm.stopBroadcast();
    return address(walletLink);
  }
}
