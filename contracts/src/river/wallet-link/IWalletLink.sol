// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface IWalletLinkBase {
  struct WalletLinkInfo {
    address wallet;
    address rootKey;
  }

  /// @notice Emitted when a user links their wallet to a rootKey
  event LinkForAll(address wallet, address rootKey, bool value);

  /// @notice Emitted when a user revokes all links for a given wallet
  event RevokeAllLinks(address wallet);

  /// @notice Emitted when a user revokes a single link for a given rootKey
  event RevokeLink(address wallet, address rootKey);

  // =============================================================
  //                      Errors
  // =============================================================
  error LinkAlreadyExists(address wallet, address rootKey);
}

interface IWalletLink is IWalletLinkBase {
  /**
   *
   * @param rootKey The key to link
   * @param value Whether to enable or disable linking for this address
   */
  function linkForAll(address rootKey, bool value) external;

  /**
   * @notice Revoke all root keys for a given wallet
   */
  function revokeAllLinks() external;

  /**
   * @notice Revoke a specific rootKey for all their permissions
   * @param rootKey The key to revoke
   */
  function revokeLink(address rootKey) external;

  // =============================================================
  //                      External - Read
  // =============================================================

  /**
   * @notice Get all links for a given rootKey
   * @param rootKey The rootKey to query
   * @return info An array of linking info
   */
  function getLinksByRootKey(
    address rootKey
  ) external view returns (WalletLinkInfo[] memory info);

  /**
   * @notice Returns an array of root keys for a given wallet
   * @param wallet The wallet who issued the link
   * @return addresses Array root keys for a given wallet
   */
  function getLinksForAll(
    address wallet
  ) external view returns (address[] memory);

  /**
   * @notice Returns true if the root key is linked to a wallet
   * @param rootKey The key to act on your behalf
   * @param wallet The wallet who issued the linking
   */
  function checkLinkForAll(
    address rootKey,
    address wallet
  ) external view returns (bool);
}
