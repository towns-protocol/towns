// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IWalletLinkBase} from "./IWalletLink.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {WalletLinkStorage} from "./WalletLinkStorage.sol";

// contracts

abstract contract WalletLinkBase is IWalletLinkBase {
  using EnumerableSet for EnumerableSet.Bytes32Set;

  // =============================================================
  //                      External - Write
  // =============================================================
  function _linkForAll(address rootKey, bool value) internal {
    bytes32 rootKeyHash = _computeAllRootKeyHash(msg.sender, rootKey);
    _setLink(rootKey, rootKeyHash, value, msg.sender);
    emit LinkForAll(msg.sender, rootKey, value);
  }

  // =============================================================
  //                       External - Read
  // =============================================================

  function _getLinksByRootKey(
    address rootKey
  ) internal view returns (WalletLinkInfo[] memory info) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    EnumerableSet.Bytes32Set storage rootKeyHashes = ds.rootKeyHashes[rootKey];
    info = new WalletLinkInfo[](rootKeyHashes.length());

    for (uint256 i = 0; i < rootKeyHashes.length(); ) {
      bytes32 rootKeyHash = rootKeyHashes.at(i);
      info[i] = ds.rootKeyInfo[rootKeyHash];

      unchecked {
        i++;
      }
    }
  }

  function _getRootKeyFor(
    address wallet
  ) internal view returns (address[] memory rootKeys) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    EnumerableSet.Bytes32Set storage rootKeyHashes = ds.links[wallet][
      ds.walletVersion[wallet]
    ];
    uint256 potentialRootKeysLength = rootKeyHashes.length();
    rootKeys = new address[](potentialRootKeysLength);

    for (uint256 i = 0; i < potentialRootKeysLength; ) {
      bytes32 rootKeyHash = rootKeyHashes.at(i);
      rootKeys[i] = ds.rootKeyInfo[rootKeyHash].rootKey;

      unchecked {
        i++;
      }
    }
  }

  function _checkLinkForAll(
    address rootKey,
    address wallet
  ) internal view returns (bool) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    bytes32 rootKeyHash = keccak256(
      abi.encode(
        rootKey,
        wallet,
        ds.walletVersion[wallet],
        ds.rootKeyVersion[wallet][rootKey]
      )
    );

    return ds.links[wallet][ds.walletVersion[wallet]].contains(rootKeyHash);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  /**
   * @dev Helper function to set rootKey for a wallet
   */
  function _setLink(
    address rootKey,
    bytes32 rootKeyHash,
    bool value,
    address wallet
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    if (value) {
      if (ds.links[wallet][ds.walletVersion[wallet]].length() > 0)
        revert LinkAlreadyExists(wallet, rootKey);

      ds.links[wallet][ds.walletVersion[wallet]].add(rootKeyHash);
      ds.rootKeyHashes[rootKey].add(rootKeyHash);
      ds.rootKeyInfo[rootKeyHash] = WalletLinkInfo(wallet, rootKey);
    } else {
      ds.links[wallet][ds.walletVersion[wallet]].remove(rootKeyHash);
      ds.rootKeyHashes[rootKey].remove(rootKeyHash);
      delete ds.rootKeyInfo[rootKeyHash];
    }
  }

  /**
   * @dev Helper function to compute rootKey hash for wallet rootKey
   */
  function _computeAllRootKeyHash(
    address wallet,
    address rootKey
  ) internal view returns (bytes32) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    uint256 vaultVersion_ = ds.walletVersion[wallet];
    uint256 rootKeyVersion_ = ds.rootKeyVersion[wallet][rootKey];

    return
      keccak256(abi.encode(rootKey, wallet, vaultVersion_, rootKeyVersion_));
  }

  /**
   * @dev Helper function to revoke all rootKeys for a wallet
   */
  function _revokeAllLinks() internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    ++ds.walletVersion[msg.sender];
    emit RevokeAllLinks(msg.sender);
  }

  /**
   * @dev Helper function to revoke a rootKey for a wallet
   */
  function _revokeLink(address rootKey, address wallet) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    ++ds.rootKeyVersion[wallet][rootKey];
    emit RevokeLink(wallet, msg.sender);
  }
}
