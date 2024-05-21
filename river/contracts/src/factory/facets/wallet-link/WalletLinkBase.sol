// SPDX-License-Identifier: MIT
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

  // =============================================================
  //                      External - Write
  // =============================================================

  /// @dev Links a caller address to a root wallet
  /// @param rootWallet the root wallet that the caller is linking to
  /// @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
  function _linkCallerToRootWallet(
    LinkedWallet memory rootWallet,
    uint256 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    // The caller is the wallet that is being linked to the root wallet
    address newWallet = msg.sender;

    _verifyWallets(ds, newWallet, rootWallet.addr);

    //Verify that the root wallet signature contains the correct nonce and the correct caller wallet
    bytes32 rootKeyMessageHash = MessageHashUtils.toEthSignedMessageHash(
      keccak256(abi.encode(newWallet, nonce))
    );

    // Verify the signature of the root wallet is correct for the nonce and wallet address
    if (
      ECDSA.recover(rootKeyMessageHash, rootWallet.signature) != rootWallet.addr
    ) {
      revert WalletLink__InvalidSignature();
    }

    //Check that the nonce being used is higher than the last nonce used
    _useCheckedNonce(rootWallet.addr, nonce);

    //set link in mapping
    ds.walletsByRootKey[rootWallet.addr].add(newWallet);
    ds.rootKeyByWallet[newWallet] = rootWallet.addr;

    emit LinkWalletToRootKey(newWallet, rootWallet.addr);
  }

  /// @dev Links a wallet to a root wallet
  /// @param wallet the wallet that is being linked to the root wallet
  /// @param rootWallet the root wallet that the wallet is linking to
  /// @param nonce a nonce used to prevent replay attacks, nonce must always be higher than previous nonce
  function _linkWalletToRootWallet(
    LinkedWallet memory wallet,
    LinkedWallet memory rootWallet,
    uint256 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    _verifyWallets(ds, wallet.addr, rootWallet.addr);

    //Verify that the root wallet signature contains the correct nonce and the correct wallet
    bytes32 rootKeyMessageHash = MessageHashUtils.toEthSignedMessageHash(
      keccak256(abi.encode(wallet.addr, nonce))
    );

    // Verify the signature of the root wallet is correct for the nonce and wallet address
    if (
      ECDSA.recover(rootKeyMessageHash, rootWallet.signature) != rootWallet.addr
    ) {
      revert WalletLink__InvalidSignature();
    }

    bytes32 walletMessageHash = MessageHashUtils.toEthSignedMessageHash(
      keccak256(abi.encode(rootWallet.addr, nonce))
    );

    // Verify the signature of the wallet is correct for the nonce and root wallet address
    if (ECDSA.recover(walletMessageHash, wallet.signature) != wallet.addr) {
      revert WalletLink__InvalidSignature();
    }

    //Check that the nonce being used is higher than the last nonce used
    _useCheckedNonce(rootWallet.addr, nonce);

    //set link in mapping
    ds.walletsByRootKey[rootWallet.addr].add(wallet.addr);
    ds.rootKeyByWallet[wallet.addr] = rootWallet.addr;

    emit LinkWalletToRootKey(wallet.addr, rootWallet.addr);
  }

  // =============================================================
  //                           Remove
  // =============================================================

  function _removeLink(
    address walletToRemove,
    LinkedWallet memory rootWallet,
    uint256 nonce
  ) internal {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();

    // Check walletToRemove or rootWallet.addr are not address(0)
    if (walletToRemove == address(0) || rootWallet.addr == address(0)) {
      revert WalletLink__InvalidAddress();
    }

    // Check walletToRemove is not the root wallet
    if (walletToRemove == rootWallet.addr) {
      revert WalletLink__CannotRemoveRootWallet();
    }

    // Check that the wallet is linked to the root wallet
    if (ds.rootKeyByWallet[walletToRemove] != rootWallet.addr) {
      revert WalletLink__NotLinked(walletToRemove, rootWallet.addr);
    }

    bytes32 rootKeyMessageHash = MessageHashUtils.toEthSignedMessageHash(
      keccak256(abi.encode(walletToRemove, nonce))
    );

    // Verify the signature of the root wallet is correct for the nonce and wallet address
    if (
      ECDSA.recover(rootKeyMessageHash, rootWallet.signature) != rootWallet.addr
    ) {
      revert WalletLink__InvalidSignature();
    }

    // Remove the link in the walletToRemove to root keys map
    ds.rootKeyByWallet[walletToRemove] = address(0);
    ds.walletsByRootKey[rootWallet.addr].remove(walletToRemove);

    emit RemoveLink(walletToRemove, msg.sender);
  }

  // =============================================================
  //                        Read
  // =============================================================
  function _getWalletsByRootKey(
    address rootKey
  ) internal view returns (address[] memory wallets) {
    return WalletLinkStorage.layout().walletsByRootKey[rootKey].values();
  }

  function _getRootKeyByWallet(
    address wallet
  ) internal view returns (address rootKey) {
    return WalletLinkStorage.layout().rootKeyByWallet[wallet];
  }

  function _checkIfLinked(
    address rootKey,
    address wallet
  ) internal view returns (bool) {
    WalletLinkStorage.Layout storage ds = WalletLinkStorage.layout();
    return ds.rootKeyByWallet[wallet] == rootKey;
  }

  // =============================================================
  //                           Helpers
  // =============================================================

  function _verifyWallets(
    WalletLinkStorage.Layout storage ds,
    address wallet,
    address rootWallet
  ) internal view {
    // Check wallet or rootWallet.addr are not address(0)
    if (wallet == address(0) || rootWallet == address(0)) {
      revert WalletLink__InvalidAddress();
    }

    // Check not linking wallet to itself
    if (wallet == rootWallet) {
      revert WalletLink__CannotLinkToSelf();
    }

    // Check that the wallet is not already linked to the root wallet
    if (ds.rootKeyByWallet[wallet] != address(0)) {
      revert WalletLink__LinkAlreadyExists(wallet, rootWallet);
    }

    // Check that the root wallet is not already linked to another root wallet
    if (ds.rootKeyByWallet[rootWallet] != address(0)) {
      revert WalletLink__LinkedToAnotherRootKey(
        wallet,
        ds.rootKeyByWallet[rootWallet]
      );
    }

    // Check that the wallet is not itself a root wallet
    if (ds.walletsByRootKey[wallet].length() > 0) {
      revert WalletLink__CannotLinkToRootWallet(wallet, rootWallet);
    }
  }
}
