// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface IWalletLinkBase {
  /// @notice Emitted when a user links their wallet to a rootKey
  event LinkWalletToRootKey(address wallet, address rootKey);

  /// @notice Emitted when two wallets are unlinked
  event RemoveLink(address wallet, address secondWallet);

  // =============================================================
  //                      Errors
  // =============================================================
  error WalletLink__LinkAlreadyExists(address wallet, address rootKey);
  error WalletLink__InvalidSignature();
  error WalletLink__NotLinked(address wallet, address rootKey);
}

interface IWalletLink is IWalletLinkBase {
  /**
   * @param rootKeySignature a signature signing the hash of the wallet address with the rootKey's private key
   * @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
   */
  function linkWalletToRootKey(
    address rootKey,
    bytes calldata rootKeySignature,
    uint256 nonce
  ) external;

  /**
   * @notice Called via the rootkey signing a message to a remove a wallet from itself
   * @param wallet the wallet being unlinked from the sending wallet
   */
  function removeLink(address wallet) external;

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
