// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLink} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";

// libraries
import {WalletLinkProxyStorage} from "./WalletLinkProxyStorage.sol";

// contracts

abstract contract WalletLinkProxyBase {
  function _setWalletLinkProxy(IWalletLink wallet) internal {
    WalletLinkProxyStorage.layout().walletLink = wallet;
  }

  function _getWalletLinkProxy() internal view returns (IWalletLink) {
    return WalletLinkProxyStorage.layout().walletLink;
  }
}
