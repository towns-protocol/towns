// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IWalletLinkBase} from "./IWalletLink.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {WalletLinkStorage} from "./WalletLinkStorage.sol";

// contracts

abstract contract WalletLinkBase is IWalletLinkBase {
  using EnumerableSet for EnumerableSet.Bytes32Set;
  using ECDSA for bytes32;

  // =============================================================
  //                      External - Write
  // =============================================================

  function _linkWalletToRootKey(
    address wallet,
    bytes calldata walletSignature,
    address rootKey,
    bytes calldata rootKeySignature,
    uint64 nonce
  ) internal {
    _addLink(wallet, walletSignature, rootKey, rootKeySignature, nonce);
    emit LinkWalletToRootKey(wallet, rootKey);
  }

  function _removeLinkViaRootKey(
    address rootKey,
    bytes calldata rootKeySignature,
    address wallet,
    uint64 removeNonce
  ) internal {
    _removeWalletLinkViaRootKey(rootKey, rootKeySignature, wallet, removeNonce);
    emit RemoveLinkViaRootKey(wallet, rootKey);
  }

  function _removeLinkViaWallet(
    address wallet,
    bytes calldata walletSignature,
    address rootKey,
    uint64 removeNonce
  ) internal {
    _removeWalletLinkViaWallet(wallet, walletSignature, rootKey, removeNonce);
    emit RemoveLinkViaWallet(wallet, rootKey);
  }

  // =============================================================
  //                       External - Read
  // =============================================================

  function _getWalletsByRootKey(
    address rootKey
  ) internal view returns (address[] memory wallets) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    return ds.rootKeysToWallets[rootKey];
  }

  function _getRootKeyForWallet(
    address wallet
  ) internal view returns (address rootKey) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    return ds.walletsToRootKeys[wallet];
  }

  function _checkIfLinked(
    address rootKey,
    address wallet
  ) internal view returns (bool) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    if (ds.walletsToRootKeys[wallet] == rootKey) {
      return true;
    }
    return false;
  }

  function _getLatestNonceForRootKey(
    address rootKey
  ) internal view returns (uint64) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    return ds.rootKeysToHighestNonce[rootKey];
  }

  function _getLatestRemoveNonceForRootKey(
    address rootKey
  ) internal view returns (uint64) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    return ds.rootKeysToHighestRemoveNonce[rootKey];
  }

  function _getLatestRemoveNonceForWallet(
    address wallet
  ) internal view returns (uint64) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    return ds.walletsToHighestRemoveNonce[wallet];
  }

  // =============================================================
  //                           Internal
  // =============================================================

  /**
   * @dev Helper function to set rootKey for a wallet
   */
  function _addLink(
    address wallet,
    bytes calldata walletSignature,
    address rootKey,
    bytes calldata rootKeySignature,
    uint64 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    //Check that the nonce being used is higher than the last nonce used
    require(
      nonce > ds.rootKeysToHighestNonce[rootKey],
      "WalletLink: nonce already used"
    );
    //Set the new nonce for this rootkey
    ds.rootKeysToHighestNonce[rootKey] = nonce;

    //Check that this wallet is not already linked to a rootkey
    require(
      ds.walletsToRootKeys[wallet] == address(0),
      "WalletLink: wallet already linked"
    );

    //Verify that the wallet signature contains the correct none and the correct root key
    bytes32 messageHash = keccak256(abi.encode(rootKey, nonce))
      .toEthSignedMessageHash();

    require(
      recoverSigner(messageHash, walletSignature) == wallet,
      "WalletLink: invalid wallet signature"
    );

    //Verify that the root key signature contains the correct nonce and the correct wallet
    bytes32 rootKeyMessageHash = keccak256(abi.encode(wallet, nonce))
      .toEthSignedMessageHash();

    require(
      recoverSigner(rootKeyMessageHash, rootKeySignature) == rootKey,
      "WalletLink: invalid rootKey signature"
    );

    //set link in mapping
    ds.rootKeysToWallets[rootKey].push(wallet);
    ds.walletsToRootKeys[wallet] = rootKey;
  }

  function _removeWalletLinkViaWallet(
    address wallet,
    bytes calldata walletSignature,
    address rootKey,
    uint64 removeNonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    require(
      removeNonce > ds.walletsToHighestRemoveNonce[wallet],
      "WalletLink: remove nonce already used"
    );

    require(
      ds.walletsToRootKeys[wallet] == rootKey,
      "WalletLink: wallet not linked to root key"
    );

    ds.walletsToHighestRemoveNonce[wallet] = removeNonce;

    //Verify that the wallet signature contains the correct none and the correct root key
    bytes32 walletMessage = keccak256(abi.encode(rootKey, removeNonce));
    require(
      recoverSigner(walletMessage.toEthSignedMessageHash(), walletSignature) ==
        wallet,
      "WalletLink: invalid wallet signature"
    );

    //remove the link in the wallet to root keys map
    ds.walletsToRootKeys[wallet] = address(0);

    //remove the link in the root keys to wallets[]  map
    for (uint64 i = 0; i < ds.rootKeysToWallets[rootKey].length; i++) {
      if (ds.rootKeysToWallets[rootKey][i] == wallet) {
        ds.rootKeysToWallets[rootKey][i] = ds.rootKeysToWallets[rootKey][
          ds.rootKeysToWallets[rootKey].length - 1
        ];
        ds.rootKeysToWallets[rootKey].pop();
        break;
      }
    }
  }

  function _removeWalletLinkViaRootKey(
    address rootKey,
    bytes calldata rootKeySignature,
    address wallet,
    uint64 removeNonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    require(
      removeNonce > ds.rootKeysToHighestRemoveNonce[rootKey],
      "WalletLink: remove nonce already used"
    );

    require(
      ds.walletsToRootKeys[wallet] == rootKey,
      "WalletLink: wallet not linked to root key"
    );

    ds.rootKeysToHighestRemoveNonce[rootKey] = removeNonce;

    //Verify that the wallet signature contains the correct none and the correct root key
    bytes32 rootKeyMessageHash = keccak256(abi.encode(wallet, removeNonce))
      .toEthSignedMessageHash();

    require(
      recoverSigner(rootKeyMessageHash, rootKeySignature) == rootKey,
      "WalletLink: invalid root key signature"
    );

    //remove the link in the wallet to root keys map
    ds.walletsToRootKeys[wallet] = address(0);

    //remove the link in the root keys to wallets[]  map
    for (uint64 i = 0; i < ds.rootKeysToWallets[rootKey].length; i++) {
      if (ds.rootKeysToWallets[rootKey][i] == wallet) {
        ds.rootKeysToWallets[rootKey][i] = ds.rootKeysToWallets[rootKey][
          ds.rootKeysToWallets[rootKey].length - 1
        ];
        ds.rootKeysToWallets[rootKey].pop();
        break;
      }
    }
  }

  function recoverSigner(
    bytes32 _ethSignedMessageHash,
    bytes memory _signature
  ) public pure returns (address) {
    (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
    return ecrecover(_ethSignedMessageHash, v, r, s);
  }

  function splitSignature(
    bytes memory sig
  ) public pure returns (bytes32 r, bytes32 s, uint8 v) {
    require(sig.length == 65, "invalid signature length");

    assembly {
      /*
            First 32 bytes stores the length of the signature

            add(sig, 32) = pointer of sig + 32
            effectively, skips first 32 bytes of signature

            mload(p) loads next 32 bytes starting at the memory address p into memory
            */

      // first 32 bytes, after the length prefix
      r := mload(add(sig, 32))
      // second 32 bytes
      s := mload(add(sig, 64))
      // final byte (first byte of the next 32 bytes)
      v := byte(0, mload(add(sig, 96)))
    }

    // implicitly return (r, s, v)
  }
}
