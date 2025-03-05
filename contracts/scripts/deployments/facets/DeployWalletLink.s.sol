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
    addSelector(WalletLink.removeCallerLink.selector);
    addSelector(WalletLink.setDefaultWallet.selector);
    addSelector(WalletLink.getDefaultWallet.selector);
    addSelector(WalletLink.getWalletsByRootKeyWithDelegations.selector);
    addSelector(WalletLink.getDependency.selector);
    addSelector(WalletLink.setDependency.selector);
    addSelector(WalletLink.getWalletsByRootKeyWithMetadata.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return WalletLink.__WalletLink_init.selector;
  }

  // 0xa3f100e500000000000000000000000000000000000000447e69651d841bd8d104bed49300000000000000000000000000000000000000000000000000000000
  function makeInitData(
    address delegateRegistry,
    address sclEip6565
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), delegateRegistry, sclEip6565);
  }

  function versionName() public pure override returns (string memory) {
    return "walletLinkFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    WalletLink walletLink = new WalletLink();
    vm.stopBroadcast();
    return address(walletLink);
  }
}
