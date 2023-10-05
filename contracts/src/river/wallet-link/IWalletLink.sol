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
  event LinkWalletToRootKey(address wallet, address rootKey);

  /// @notice Emitted when a user removes a wallet from a rootKey, via the rootkey
  event RemoveLinkViaRootKey(address wallet, address rootKey);

  /// @notice Emitted when a user removes a wallet from a rootKey, via the wallet
  event RemoveLinkViaWallet(address wallet, address rootKey);

  // =============================================================
  //                      Errors
  // =============================================================
  error LinkAlreadyExists(address wallet, address rootKey);
}

interface IWalletLink is IWalletLinkBase {
  /**
   * @param wallet an ethereum wallet address
   * @param walletSignature A signature signing the hash of the rootKey's public key with the wallet's private key
   * @param rootKey the public key of the users rootkey used as an ethereum address
   * @param rootKeySignature a signature signing the has of the wallet address with the rootKey's private key
   * @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
   */
  function linkWalletToRootKey(
    address wallet,
    bytes calldata walletSignature,
    address rootKey,
    bytes calldata rootKeySignature,
    uint64 nonce
  ) external;

  /**
   * @notice Called via the rootkey signing a message to a remove a wallet from itself
   * @param rootKey the public key of the users rootkey used as an ethereum address
   * @param rootKeySignature A signature signing the hash of the wallet's public key with the root keys's private key
   * @param wallet the ethereum wallet to remove from the root key
   * @param removeNonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
   */
  function removeLinkViaRootKey(
    address rootKey,
    bytes calldata rootKeySignature,
    address wallet,
    uint64 removeNonce
  ) external;

  /**
   * @notice Called via a wallet to remove itself from a root key
   * @param wallet the ethereum wallet to remove from the root key
   * @param walletSignature A signature signing the hash of the rootKey's public key with the wallet's private key
   * @param rootKey the public key of the users rootkey used as an ethereum address
   * @param removeNonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
   */
  function removeLinkViaWallet(
    address wallet,
    bytes calldata walletSignature,
    address rootKey,
    uint64 removeNonce
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
  ) external view returns (uint64);

  /**
   * @notice gets the latest Remove nonce for a wallet to use a higher one for next remove action
   * @param wallet the ethereum wallet to get the nonce for
   */
  function getLatestRemoveNonceForWallet(
    address wallet
  ) external view returns (uint64);

  /**
   * @notice gets the latest Remove nonce for a rootkey to use a higher one for next remove action
   * @param rootKey the public key of the users rootkey to get the nonce for
   */
  function getLatestRemoveNonceForRootKey(
    address rootKey
  ) external view returns (uint64);
}
