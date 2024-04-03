// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IWalletLink} from "contracts/src/river/wallet-link/IWalletLink.sol";

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {WalletLink} from "contracts/src/river/wallet-link/WalletLink.sol";

contract WalletLinkHelper is FacetHelper {
  function facet() public pure override returns (address) {
    return address(0);
  }

  function selectors() public override returns (bytes4[] memory) {
    addSelector(
      bytes4(keccak256("linkWalletToRootKey((address,bytes),uint256)"))
    );
    addSelector(IWalletLink.linkCallerToRootKey.selector);
    addSelector(IWalletLink.linkWalletToRootKey.selector);
    addSelector(IWalletLink.removeLink.selector);
    addSelector(IWalletLink.getWalletsByRootKey.selector);
    addSelector(IWalletLink.getRootKeyForWallet.selector);
    addSelector(IWalletLink.checkIfLinked.selector);
    addSelector(IWalletLink.getLatestNonceForRootKey.selector);
    return functionSelectors;
  }

  function initializer() public pure override returns (bytes4) {
    return WalletLink.__WalletLink_init.selector;
  }
}
