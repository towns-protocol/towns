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
    address rootKey,
    bytes calldata rootKeySignature,
    uint64 nonce
  ) internal {
    _addLink(rootKey, rootKeySignature, nonce);
    emit LinkWalletToRootKey(msg.sender, rootKey);
  }

  function _removeLink(address wallet) internal {
    _removeWalletLink(wallet);
    emit RemoveLink(wallet, msg.sender);
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

    return ds.walletsToRootKey[wallet];
  }

  function _checkIfLinked(
    address rootKey,
    address wallet
  ) internal view returns (bool) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    if (ds.walletsToRootKey[wallet] == rootKey) {
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

  // =============================================================
  //                           Internal
  // =============================================================

  /**
   * @dev Helper function to set rootKey for a wallet
   */
  function _addLink(
    address rootKey,
    bytes calldata rootKeySignature,
    uint64 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    //Check that the nonce being used is higher than the last nonce used
    if (nonce <= ds.rootKeysToHighestNonce[rootKey]) {
      revert NonceAlreadyUsed(nonce);
    }
    //Set the new nonce for this rootkey
    ds.rootKeysToHighestNonce[rootKey] = nonce;

    address linkingWallet = msg.sender;

    //Check that this wallet is not already linked to a rootkey
    if (ds.walletsToRootKey[linkingWallet] != address(0)) {
      revert LinkAlreadyExists(linkingWallet, rootKey);
    }
    //Verify that the root key signature contains the correct nonce and the correct wallet
    bytes32 rootKeyMessageHash = keccak256(abi.encode(linkingWallet, nonce))
      .toEthSignedMessageHash();

    if (recoverSigner(rootKeyMessageHash, rootKeySignature) != rootKey) {
      revert InvalidSignature();
    }
    //set link in mapping
    ds.rootKeysToWallets[rootKey].push(linkingWallet);
    ds.walletsToRootKey[linkingWallet] = rootKey;
  }

  function _removeWalletLink(address linkedWallet) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    address originatingWallet = msg.sender;
    //if this is called from an originating wallet
    if (ds.walletsToRootKey[originatingWallet] == linkedWallet) {
      removeLink(linkedWallet, originatingWallet);
      //if this is called from the root key wallet
    } else if (ds.walletsToRootKey[linkedWallet] == originatingWallet) {
      removeLink(originatingWallet, linkedWallet);
    } else {
      revert("WalletLink: wallet not linked to root key");
    }
  }

  function removeLink(address rootKey, address externalWallet) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    //remove the link in the wallet to root keys map
    ds.walletsToRootKey[externalWallet] = address(0);

    //remove the link in the root keys to wallets[]  map
    for (uint64 i = 0; i < ds.rootKeysToWallets[rootKey].length; i++) {
      if (ds.rootKeysToWallets[rootKey][i] == externalWallet) {
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
    if (sig.length != 65) {
      revert InvalidSignature();
    }

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
