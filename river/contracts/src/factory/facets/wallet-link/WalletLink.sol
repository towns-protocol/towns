// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLink} from "./IWalletLink.sol";

// libraries

// contracts
import {Facet} from "contracts/src/diamond/facets/Facet.sol";
import {WalletLinkBase} from "./WalletLinkBase.sol";

contract WalletLink is IWalletLink, WalletLinkBase, Facet {
  function __WalletLink_init() external onlyInitializing {
    _addInterface(type(IWalletLink).interfaceId);
  }

  /// @inheritdoc IWalletLink
  function linkCallerToRootKey(
    LinkedWallet memory rootWallet,
    uint256 nonce
  ) external {
    _linkCallerToRootWallet(rootWallet, nonce);
  }

  /// @inheritdoc IWalletLink
  function linkWalletToRootKey(
    LinkedWallet memory wallet,
    LinkedWallet memory rootWallet,
    uint256 nonce
  ) external {
    _linkWalletToRootWallet(wallet, rootWallet, nonce);
  }

  /// @inheritdoc IWalletLink
  function removeLink(
    address wallet,
    LinkedWallet memory rootWallet,
    uint256 nonce
  ) external {
    _removeLink(wallet, rootWallet, nonce);
  }

  /*
   * @inheritdoc IWalletLink
   */
  function getWalletsByRootKey(
    address rootKey
  ) external view returns (address[] memory wallets) {
    return _getWalletsByRootKey(rootKey);
  }

  /**
   * @inheritdoc IWalletLink
   */
  function getRootKeyForWallet(
    address wallet
  ) external view returns (address rootKey) {
    return _getRootKeyByWallet(wallet);
  }

  /**
   * @inheritdoc IWalletLink
   */
  function checkIfLinked(
    address rootKey,
    address wallet
  ) external view returns (bool) {
    return _checkIfLinked(rootKey, wallet);
  }

  function getLatestNonceForRootKey(
    address rootKey
  ) external view returns (uint256) {
    return _latestNonce(rootKey);
  }
}
