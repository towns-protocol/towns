// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IWalletLinkBase {
  // =============================================================
  //                           Structs
  // =============================================================

  struct LinkedWallet {
    address addr;
    bytes signature;
  }

  // =============================================================
  //                           Events
  // =============================================================

  /// @notice Emitted when a user links their wallet to a rootKey
  event LinkWalletToRootKey(address indexed wallet, address indexed rootKey);

  /// @notice Emitted when two wallets are unlinked
  event RemoveLink(address indexed wallet, address indexed secondWallet);

  // =============================================================
  //                      Errors
  // =============================================================
  error WalletLink__InvalidAddress();
  error WalletLink__LinkAlreadyExists(address wallet, address rootKey);
  error WalletLink__LinkedToAnotherRootKey(address wallet, address rootKey);
  error WalletLink__InvalidSignature();
  error WalletLink__NotLinked(address wallet, address rootKey);
  error WalletLink__CannotRemoveRootWallet();
  error WalletLink__CannotLinkToSelf();
  error WalletLink__CannotLinkToRootWallet(address wallet, address rootKey);
}

interface IWalletLink is IWalletLinkBase {
  /**
   * @notice Link caller wallet to a root wallet
   * @param rootWallet the root wallet that the caller is linking to
   * @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
   */
  function linkCallerToRootKey(
    LinkedWallet memory rootWallet,
    uint256 nonce
  ) external;

  /**
   * @notice Link a wallet to a root wallet
   * @param wallet the wallet being linked to the root wallet
   * @param rootWallet the root wallet that the caller is linking to
   * @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
   */
  function linkWalletToRootKey(
    LinkedWallet memory wallet,
    LinkedWallet memory rootWallet,
    uint256 nonce
  ) external;

  /**
   * @notice Called via the rootkey signing a message to a remove a wallet from itself
   * @param wallet the wallet being unlinked from the sending wallet
   */
  function removeLink(
    address wallet,
    LinkedWallet memory rootWallet,
    uint256 nonce
  ) external;

  // =============================================================
  //                      External - Read
  // =============================================================

  /**
   * @notice Returns all wallets linked to a root key
   * @param rootKey the public key of the users rootkey to find associated wallets for
   * @return wallets an array of ethereum wallets linked to this root key
   */
  function getWalletsByRootKey(
    address rootKey
  ) external view returns (address[] memory wallets);

  /**
   * @notice Returns the root key for a given wallet
   * @param wallet the ethereum wallet to find associated root key for
   * @return rootKey the rootkey that this wallet is linked to
   */
  function getRootKeyForWallet(
    address wallet
  ) external view returns (address rootKey);

  /**
   * @notice checks if a root key and wallet are linked
   * @param rootKey the public key of the users rootkey to check
   * @param wallet the ethereum wallet to check
   * @return areLinked boolean if they are linked together
   */
  function checkIfLinked(
    address rootKey,
    address wallet
  ) external view returns (bool);

  /**
   * @notice gets the latest nonce for a rootkey to use a higher one for next link action
   * @param rootKey the public key of the users rootkey to check
   */
  function getLatestNonceForRootKey(
    address rootKey
  ) external view returns (uint256);
}
