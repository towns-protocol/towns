// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLink} from "./IWalletLink.sol";

// libraries

// contracts
import {Facet} from "@river-build/diamond/src/facets/Facet.sol";
import {WalletLinkBase} from "./WalletLinkBase.sol";
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";

contract WalletLink is IWalletLink, WalletLinkBase, OwnableBase, Facet {
  function __WalletLink_init(
    address delegateRegistry
  ) external onlyInitializing {
    _addInterface(type(IWalletLink).interfaceId);
    _setDependency(DELEGATE_REGISTRY_V2, delegateRegistry);
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

  /// @inheritdoc IWalletLink
  function removeCallerLink() external {
    _removeCallerLink();
  }

  /// @inheritdoc IWalletLink
  function setDefaultWallet(address defaultWallet) external {
    _setDefaultWallet(msg.sender, defaultWallet);
  }

  /// @inheritdoc IWalletLink
  function getDefaultWallet(
    address rootWallet
  ) external view returns (address) {
    return _getDefaultWallet(rootWallet);
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
  function getWalletsByRootKeyWithDelegations(
    address rootKey
  ) external view returns (address[] memory wallets) {
    return _getWalletsByRootKeyWithDelegations(rootKey);
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

  /**
   * @inheritdoc IWalletLink
   */
  function getLatestNonceForRootKey(
    address rootKey
  ) external view returns (uint256) {
    return _latestNonce(rootKey);
  }

  /**
   * @inheritdoc IWalletLink
   */
  function getDependency(bytes32 dependency) external view returns (address) {
    return _getDependency(dependency);
  }

  /**
   * @inheritdoc IWalletLink
   */
  function setDependency(
    bytes32 dependency,
    address dependencyAddress
  ) external onlyOwner {
    _setDependency(dependency, dependencyAddress);
  }
}
