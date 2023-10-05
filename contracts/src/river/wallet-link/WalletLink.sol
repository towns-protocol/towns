// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

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

  /**
   * @inheritdoc IWalletLink
   */
  function linkWalletToRootKey(
    address wallet,
    bytes calldata walletSignature,
    address rootKey,
    bytes calldata rootKeySignature,
    uint64 nonce
  ) external {
    _linkWalletToRootKey(
      wallet,
      walletSignature,
      rootKey,
      rootKeySignature,
      nonce
    );
  }

  function removeLinkViaRootKey(
    address rootKey,
    bytes calldata rootKeySignature,
    address wallet,
    uint64 removeNonce
  ) external {
    _removeLinkViaRootKey(rootKey, rootKeySignature, wallet, removeNonce);
  }

  function removeLinkViaWallet(
    address wallet,
    bytes calldata walletSignature,
    address rootKey,
    uint64 removeNonce
  ) external {
    _removeLinkViaWallet(wallet, walletSignature, rootKey, removeNonce);
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
  ) external view override returns (uint64) {
    return _getLatestNonceForRootKey(rootKey);
  }

  function getLatestRemoveNonceForWallet(
    address wallet
  ) external view override returns (uint64) {
    return _getLatestRemoveNonceForWallet(wallet);
  }

  function getLatestRemoveNonceForRootKey(
    address rootKey
  ) external view override returns (uint64) {
    return _getLatestRemoveNonceForRootKey(rootKey);
  }
}
