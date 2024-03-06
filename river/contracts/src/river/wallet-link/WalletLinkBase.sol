// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkBase} from "./IWalletLink.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {WalletLinkStorage} from "./WalletLinkStorage.sol";

// contracts
import {Nonces} from "contracts/src/diamond/utils/Nonces.sol";

abstract contract WalletLinkBase is IWalletLinkBase, Nonces {
  using EnumerableSet for EnumerableSet.AddressSet;
  using ECDSA for bytes32;

  // =============================================================
  //                      External - Write
  // =============================================================

  function _linkWalletToRootKey(
    address rootKey,
    bytes calldata rootKeySignature,
    uint256 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    address linkingWallet = msg.sender;

    //Check that this wallet is not already linked to a rootkey
    if (ds.walletsToRootKey[linkingWallet] != address(0)) {
      revert WalletLink__LinkAlreadyExists(linkingWallet, rootKey);
    }

    //Verify that the root key signature contains the correct nonce and the correct wallet
    bytes32 rootKeyMessageHash = MessageHashUtils.toEthSignedMessageHash(
      keccak256(abi.encode(linkingWallet, nonce))
    );

    if (_recoverSigner(rootKeyMessageHash, rootKeySignature) != rootKey) {
      revert WalletLink__InvalidSignature();
    }

    //Check that the nonce being used is higher than the last nonce used
    _useCheckedNonce(rootKey, nonce);

    //set link in mapping
    ds.rootKeysToWallets[rootKey].add(linkingWallet);
    ds.walletsToRootKey[linkingWallet] = rootKey;

    emit LinkWalletToRootKey(linkingWallet, rootKey);
  }

  function _removeLink(address wallet) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    address originatingWallet = msg.sender;

    //if this is called from an originating wallet
    if (ds.walletsToRootKey[originatingWallet] == wallet) {
      _removeInternalLink(ds, wallet, originatingWallet);

      //if this is called from the root key wallet
    } else if (ds.walletsToRootKey[wallet] == originatingWallet) {
      _removeInternalLink(ds, originatingWallet, wallet);
    } else {
      revert WalletLink__NotLinked(wallet, originatingWallet);
    }
    emit RemoveLink(wallet, msg.sender);
  }

  function _removeInternalLink(
    WalletLinkStorage.Layout storage ds,
    address wallet,
    address originatingWallet
  ) internal {
    //remove the link in the wallet to root keys map
    ds.walletsToRootKey[originatingWallet] = address(0);

    //remove the link in the root keys to wallets[]  map
    ds.rootKeysToWallets[wallet].remove(originatingWallet);
  }

  // =============================================================
  //                        Read
  // =============================================================

  function _getWalletsByRootKey(
    address rootKey
  ) internal view returns (address[] memory wallets) {
    return WalletLinkStorage.layout().rootKeysToWallets[rootKey].values();
  }

  function _getRootKeyForWallet(
    address wallet
  ) internal view returns (address rootKey) {
    return WalletLinkStorage.layout().walletsToRootKey[wallet];
  }

  function _checkIfLinked(
    address rootKey,
    address wallet
  ) internal view returns (bool) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    return ds.walletsToRootKey[wallet] == rootKey;
  }

  function _recoverSigner(
    bytes32 _ethSignedMessageHash,
    bytes memory _signature
  ) internal pure returns (address) {
    (bytes32 r, bytes32 s, uint8 v) = _splitSignature(_signature);
    return ecrecover(_ethSignedMessageHash, v, r, s);
  }

  function _splitSignature(
    bytes memory sig
  ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
    if (sig.length != 65) {
      revert WalletLink__InvalidSignature();
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
