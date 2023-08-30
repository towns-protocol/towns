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
  function linkForAll(address rootKey, bool value) external {
    _linkForAll(rootKey, value);
  }

  /**
   * @inheritdoc IWalletLink
   */
  function revokeAllLinks() external {
    _revokeAllLinks();
  }

  /**
   * @inheritdoc IWalletLink
   */
  function revokeLink(address rootKey) external {
    _revokeLink(rootKey, msg.sender);
  }

  /*
   * @inheritdoc IWalletLink
   */
  function getLinksByRootKey(
    address rootKey
  ) external view returns (WalletLinkInfo[] memory info) {
    return _getLinksByRootKey(rootKey);
  }

  /**
   * @inheritdoc IWalletLink
   */
  function getLinksForAll(
    address wallet
  ) external view returns (address[] memory delegates) {
    return _getRootKeyFor(wallet);
  }

  /**
   * @inheritdoc IWalletLink
   */
  function checkLinkForAll(
    address rootKey,
    address wallet
  ) external view returns (bool) {
    return _checkLinkForAll(rootKey, wallet);
  }
}
