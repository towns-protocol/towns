// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IWalletLinkBase} from "contracts/src/river/wallet-link/IWalletLink.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// libraries

// contracts
import {WalletLinkSetup} from "./WalletLinkSetup.sol";
import {Nonces} from "contracts/src/diamond/utils/Nonces.sol";

contract WalletLinkTest is IWalletLinkBase, WalletLinkSetup {
  struct Wallet {
    address addr;
    uint256 privateKey;
  }

  function test_linkWalletToRootKey() external {
    Wallet memory rootKey = _generateWallet(bytes("rootKey"));
    Wallet memory wallet = _generateWallet(bytes("wallet"));

    uint256 nonce = 0;
    bytes memory rootKeySignature = _generateSignedLinkMessage(
      rootKey,
      wallet,
      nonce
    );

    // as a wallet, delegate to rootKey
    vm.startPrank(wallet.addr);
    walletLink.linkWalletToRootKey(rootKey.addr, rootKeySignature, nonce);
    vm.stopPrank();

    assertTrue(walletLink.checkIfLinked(rootKey.addr, wallet.addr));
  }

  function test_linkWalletToRootKey_reverts_when_already_linked() external {
    Wallet memory rootKey = _generateWallet(bytes("rootKey"));
    Wallet memory wallet = _generateWallet(bytes("wallet"));

    uint256 nonce = 0;
    bytes memory rootKeySignature = _generateSignedLinkMessage(
      rootKey,
      wallet,
      nonce
    );

    // as a wallet, delegate to rootKey
    vm.prank(wallet.addr);
    walletLink.linkWalletToRootKey(rootKey.addr, rootKeySignature, nonce);

    // this should fail
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__LinkAlreadyExists.selector,
        wallet.addr,
        rootKey.addr
      )
    );
    vm.prank(wallet.addr);
    walletLink.linkWalletToRootKey(rootKey.addr, rootKeySignature, nonce);
  }

  function test_linkWalletToRootKey_reverts_when_invalid_signature() external {
    Wallet memory rootKey = _generateWallet(bytes("rootKey"));
    Wallet memory wallet = _generateWallet(bytes("wallet"));

    uint256 nonce = 0;
    bytes memory rootKeySignature = _generateSignedLinkMessage(
      wallet,
      rootKey,
      nonce
    );

    // as a wallet, delegate to rootKey
    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__InvalidSignature.selector);
    walletLink.linkWalletToRootKey(rootKey.addr, rootKeySignature, nonce);
  }

  function test_getLinksByRootKey() external {
    (, Wallet memory rootKey, ) = _createNewWalletsAndLink();
    // get all the rootkeys made to the wallet
    address[] memory info = walletLink.getWalletsByRootKey(rootKey.addr);

    assertTrue(info.length == 1);
  }

  function test_multipleLinks() external {
    Wallet memory wallet1 = _generateWallet(bytes("wallet1"));
    Wallet memory wallet2 = _generateWallet(bytes("wallet2"));
    Wallet memory rootKey = _generateWallet(bytes("rootKey"));

    uint256 nonce = 0;
    _linkWalletToRootKey(wallet1, rootKey, nonce);

    uint256 nonce2 = 1;
    _linkWalletToRootKey(wallet2, rootKey, nonce2);

    address[] memory info = walletLink.getWalletsByRootKey(rootKey.addr);

    assertTrue(info.length == 2);
  }

  function test_reUseNonce() external {
    Wallet memory wallet1 = _generateWallet(bytes("wallet1"));
    Wallet memory wallet2 = _generateWallet(bytes("wallet2"));
    Wallet memory rootKey = _generateWallet(bytes("rootKey"));

    uint256 nonce = 0;
    _linkWalletToRootKey(wallet1, rootKey, nonce);

    //this should fail
    vm.expectRevert(
      abi.encodeWithSelector(
        Nonces.InvalidAccountNonce.selector,
        rootKey.addr,
        nonce + 1
      )
    );
    _linkWalletToRootKey(wallet2, rootKey, nonce);

    address[] memory info = walletLink.getWalletsByRootKey(rootKey.addr);
    assertTrue(info.length == 1);
  }

  function test_removeLinkViaWallet() external {
    (
      Wallet memory wallet,
      Wallet memory rootKey,

    ) = _createNewWalletsAndLink();
    // get all the rootkeys made to the wallet
    address[] memory info = walletLink.getWalletsByRootKey(rootKey.addr);

    assertTrue(info.length == 1);

    vm.startPrank(wallet.addr);
    walletLink.removeLink(rootKey.addr);
    vm.stopPrank();
    info = walletLink.getWalletsByRootKey(rootKey.addr);
    assertTrue(info.length == 0);
  }

  function test_removeLinkViaRootKey() external {
    (
      Wallet memory wallet,
      Wallet memory rootKey,

    ) = _createNewWalletsAndLink();
    // get all the rootkeys made to the wallet
    address[] memory info = walletLink.getWalletsByRootKey(rootKey.addr);

    assertTrue(info.length == 1);

    vm.startPrank(rootKey.addr);
    walletLink.removeLink(wallet.addr);
    vm.stopPrank();

    info = walletLink.getWalletsByRootKey(rootKey.addr);
    assertTrue(info.length == 0);
  }

  function test_removeLink_reverts_when_not_linked() external {
    Wallet memory wallet = _generateWallet(bytes("wallet"));
    Wallet memory rootKey = _generateWallet(bytes("rootKey"));

    vm.startPrank(wallet.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__NotLinked.selector,
        rootKey.addr,
        wallet.addr
      )
    );
    walletLink.removeLink(rootKey.addr);
    vm.stopPrank();
  }

  // =============================================================
  //                           Helpers
  // =============================================================

  function _createNewWalletsAndLink()
    internal
    returns (Wallet memory, Wallet memory, uint256)
  {
    Wallet memory wallet = _generateWallet(bytes("wallet"));
    Wallet memory rootKey = _generateWallet(bytes("rootKey"));

    uint256 nonce = 0;
    _linkWalletToRootKey(wallet, rootKey, nonce);
    return (wallet, rootKey, nonce);
  }

  function _linkWalletToRootKey(
    Wallet memory wallet,
    Wallet memory rootKey,
    uint256 nonce
  ) internal {
    bytes memory rootKeySignature = _generateSignedLinkMessage(
      rootKey,
      wallet,
      nonce
    );

    // delegate to rootKey
    vm.startPrank(wallet.addr);
    walletLink.linkWalletToRootKey(rootKey.addr, rootKeySignature, nonce);
    vm.stopPrank();
  }

  function _generateSignedLinkMessage(
    Wallet memory signingWallet,
    Wallet memory linkingWallet,
    uint256 nonce
  ) internal returns (bytes memory signedMessage) {
    bytes32 messageHash = keccak256(abi.encode(linkingWallet.addr, nonce));

    vm.startPrank(signingWallet.addr);
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(
      signingWallet.privateKey,
      ECDSA.toEthSignedMessageHash(messageHash)
    );
    vm.stopPrank();

    signedMessage = abi.encodePacked(r, s, v);
  }

  function _generateWallet(
    bytes memory name
  ) internal pure returns (Wallet memory) {
    // Wallet memory wallet = vm.createWallet(uint256(keccak256(name)));
    uint256 privateKey = uint256(keccak256(abi.encodePacked(name)));
    address addr = vm.addr(privateKey);
    Wallet memory wallet = Wallet({addr: addr, privateKey: privateKey});
    return wallet;
  }
}
