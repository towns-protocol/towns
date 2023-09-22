// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IWalletLinkBase} from "contracts/src/river/wallet-link/IWalletLink.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// libraries

// contracts
import {WalletLinkSetup} from "./WalletLinkSetup.sol";

contract WalletLinkTest is IWalletLinkBase, WalletLinkSetup {
  using ECDSA for bytes32;
  struct Wallet {
    address addr;
    uint256 publicKeyX;
    uint256 publicKeyY;
    uint256 privateKey;
  }

  function test_linkWalletToRootKey() external {
    (Wallet memory wallet, Wallet memory rootKey, ) = createNewWalletsAndLink();

    assertTrue(walletLink.checkIfLinked(rootKey.addr, wallet.addr));
  }

  function test_getLinksByRootKey() external {
    (, Wallet memory rootKey, ) = createNewWalletsAndLink();
    // get all the rootkeys made to the wallet
    address[] memory info = walletLink.getWalletsByRootKey(rootKey.addr);

    assertTrue(info.length == 1);
  }

  function test_multipleLinks() external {
    Wallet memory wallet1 = generateWallet(bytes("wallet1"));
    Wallet memory wallet2 = generateWallet(bytes("wallet2"));
    Wallet memory rootKey = generateWallet(bytes("rootKey"));

    uint256 nonce = 1;

    linkWalletToRootKey(wallet1, rootKey, nonce);

    uint256 nonce2 = 2;
    linkWalletToRootKey(wallet2, rootKey, nonce2);

    address[] memory info = walletLink.getWalletsByRootKey(rootKey.addr);

    assertTrue(info.length == 2);
  }

  function test_reUseNonce() external {
    Wallet memory wallet1 = generateWallet(bytes("wallet1"));
    Wallet memory wallet2 = generateWallet(bytes("wallet2"));
    Wallet memory rootKey = generateWallet(bytes("rootKey"));

    uint256 nonce = 1;

    linkWalletToRootKey(wallet1, rootKey, nonce);

    //this should fail
    vm.expectRevert("WalletLink: nonce already used");
    linkWalletToRootKey(wallet2, rootKey, nonce);

    address[] memory info = walletLink.getWalletsByRootKey(rootKey.addr);
    assertTrue(info.length == 1);
  }

  function test_removeLinkViaWallet() external {
    (Wallet memory wallet, Wallet memory rootKey, ) = createNewWalletsAndLink();
    // get all the rootkeys made to the wallet
    address[] memory info = walletLink.getWalletsByRootKey(rootKey.addr);

    assertTrue(info.length == 1);

    uint256 removeNonce = 1;

    walletLink.removeLinkViaWallet(
      wallet.addr,
      generateSignedLinkMessage(wallet, rootKey, removeNonce),
      rootKey.addr,
      removeNonce
    );

    info = walletLink.getWalletsByRootKey(rootKey.addr);
    assertTrue(info.length == 0);
  }

  function test_removeLinkViaRootKey() external {
    (Wallet memory wallet, Wallet memory rootKey, ) = createNewWalletsAndLink();
    // get all the rootkeys made to the wallet
    address[] memory info = walletLink.getWalletsByRootKey(rootKey.addr);

    assertTrue(info.length == 1);

    uint256 removeNonce = 1;

    walletLink.removeLinkViaRootKey(
      rootKey.addr,
      generateSignedLinkMessage(rootKey, wallet, removeNonce),
      wallet.addr,
      removeNonce
    );

    info = walletLink.getWalletsByRootKey(rootKey.addr);
    assertTrue(info.length == 0);
  }

  function createNewWalletsAndLink()
    internal
    returns (Wallet memory, Wallet memory, uint256)
  {
    Wallet memory wallet = generateWallet(bytes("wallet"));
    Wallet memory rootKey = generateWallet(bytes("rootKey"));

    uint256 nonce = 1;

    linkWalletToRootKey(wallet, rootKey, nonce);
    return (wallet, rootKey, nonce);
  }

  function linkWalletToRootKey(
    Wallet memory wallet,
    Wallet memory rootKey,
    uint256 nonce
  ) internal {
    bytes memory walletSignature = generateSignedLinkMessage(
      wallet,
      rootKey,
      nonce
    );

    bytes memory rootKeySignature = generateSignedLinkMessage(
      rootKey,
      wallet,
      nonce
    );

    // delegate to rootKey
    walletLink.linkWalletToRootKey(
      wallet.addr,
      walletSignature,
      rootKey.addr,
      rootKeySignature,
      nonce
    );
  }

  function generateSignedLinkMessage(
    Wallet memory signingWallet,
    Wallet memory linkingWallet,
    uint256 nonce
  ) internal returns (bytes memory) {
    bytes32 messageHash = keccak256(abi.encode(linkingWallet.addr, nonce));

    vm.startPrank(signingWallet.addr);

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(
      signingWallet.privateKey,
      messageHash.toEthSignedMessageHash()
    );
    vm.stopPrank();

    bytes memory signedMessage = abi.encodePacked(r, s, v);

    return signedMessage;
  }

  function generateWallet(
    bytes memory name
  ) internal pure returns (Wallet memory) {
    // Wallet memory wallet = vm.createWallet(uint256(keccak256(name)));
    uint256 privateKey = uint256(keccak256(abi.encodePacked(name)));
    address addr = vm.addr(privateKey);
    Wallet memory wallet = Wallet({
      addr: addr,
      publicKeyX: 0,
      publicKeyY: 0,
      privateKey: privateKey
    });
    return wallet;
  }
}
