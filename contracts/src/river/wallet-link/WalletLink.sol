// SPDX-License-Identifier: Apache-2.0
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
  function linkWalletToRootKey(
    address rootKey,
    bytes calldata rootKeySignature,
    uint256 nonce
  ) external {
    _linkWalletToRootKey(rootKey, rootKeySignature, nonce);
  }

  /// @inheritdoc IWalletLink
  function removeLink(address wallet) external {
    _removeLink(wallet);
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
    return _getRootKeyForWallet(wallet);
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
