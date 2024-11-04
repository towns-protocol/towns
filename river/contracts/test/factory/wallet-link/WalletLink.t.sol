// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkBase} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";
import {WalletLink} from "contracts/src/factory/facets/wallet-link/WalletLink.sol";

// libraries
import {Vm} from "forge-std/Test.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

import {Nonces} from "contracts/src/diamond/utils/Nonces.sol";

contract WalletLinkTest is IWalletLinkBase, BaseSetup {
  Vm.Wallet internal rootWallet;
  Vm.Wallet internal wallet;
  Vm.Wallet internal smartAccount;

  function setUp() public override {
    super.setUp();

    rootWallet = vm.createWallet("rootKey");
    wallet = vm.createWallet("eoaWallet");
    smartAccount = vm.createWallet("smartAccount");
  }

  // =============================================================
  //                           Modifiers
  // =============================================================

  /// @notice Modifier that links the caller (EOA wallet) to the root wallet
  // solhint-disable-next-line max-line-length
  /// @dev The root wallet signs its latest nonce and the caller's wallet address, but the EOA is the one calling the function to link
  modifier givenWalletIsLinkedViaCaller() {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      wallet.addr,
      nonce
    );

    // as a wallet, delegate to root wallet
    vm.startPrank(wallet.addr);
    vm.expectEmit(address(walletLink));
    emit LinkWalletToRootKey(wallet.addr, rootWallet.addr);
    walletLink.linkCallerToRootKey(
      LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
    );
    vm.stopPrank();
    _;
  }

  /// @notice Modifier that links a wallet to the root wallet through a proxy wallet (smart wallet)
  // solhint-disable-next-line max-line-length
  /// @dev The root wallet signs its latest nonce and the wallet's address, then the EOA wallet signs its latest nonce and the root wallet's address, but the smart wallet is the one calling the function to link both of these wallets
  modifier givenWalletIsLinkedViaProxy() {
    uint256 rootNonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    bytes memory rootSignature = _signWalletLink(
      rootWallet.privateKey,
      wallet.addr,
      rootNonce
    );

    uint256 walletNonce = walletLink.getLatestNonceForRootKey(wallet.addr);

    bytes memory walletSignature = _signWalletLink(
      wallet.privateKey,
      rootWallet.addr,
      walletNonce
    );

    // as a smart wallet, delegate another wallet to a root wallet
    vm.startPrank(smartAccount.addr);
    vm.expectEmit(address(walletLink));
    emit LinkWalletToRootKey(wallet.addr, rootWallet.addr);
    walletLink.linkWalletToRootKey(
      LinkedWallet(wallet.addr, walletSignature, LINKED_WALLET_MESSAGE),
      LinkedWallet(rootWallet.addr, rootSignature, LINKED_WALLET_MESSAGE),
      rootNonce
    );
    vm.stopPrank();
    _;
  }

  // =============================================================
  //                   linkCallerToRootKey
  // =============================================================

  function test_linkCallerToRootKey() external givenWalletIsLinkedViaCaller {
    assertTrue(walletLink.checkIfLinked(rootWallet.addr, wallet.addr));
  }

  function test_revertWhen_linkCallerToRootKeyAddressIsZero() external {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      wallet.addr,
      nonce
    );

    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__InvalidAddress.selector);
    walletLink.linkCallerToRootKey(
      LinkedWallet(address(0), signature, LINKED_WALLET_MESSAGE),
      nonce
    );
  }

  function test_revertWhen_linkCallerToRootKeyLinkToSelf()
    external
    givenWalletIsLinkedViaCaller
  {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    bytes memory signature = "0x00";

    vm.prank(rootWallet.addr);
    vm.expectRevert(WalletLink__CannotLinkToSelf.selector);
    walletLink.linkCallerToRootKey(
      LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
    );
  }

  function test_revertWhen_linkCallerToRootKeyAlreadyLinked()
    external
    givenWalletIsLinkedViaCaller
  {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      wallet.addr,
      nonce
    );

    vm.startPrank(wallet.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__LinkAlreadyExists.selector,
        wallet.addr,
        rootWallet.addr
      )
    );
    walletLink.linkCallerToRootKey(
      LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
    );
    vm.stopPrank();
  }

  function test_revertWhen_linkCallerToRootKeyRootLinkAlreadyExists()
    external
    givenWalletIsLinkedViaCaller
  {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    address caller = vm.createWallet("wallet3").addr;

    vm.prank(caller);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__LinkedToAnotherRootKey.selector,
        caller,
        rootWallet.addr
      )
    );
    walletLink.linkCallerToRootKey(
      LinkedWallet(wallet.addr, "", LINKED_WALLET_MESSAGE),
      nonce
    );
  }

  function test_revertWhen_linkCallerToRootKeyLinkingToAnotherRootWallet()
    external
    givenWalletIsLinkedViaCaller
  {
    address root = vm.createWallet("rootKey2").addr;

    uint256 nonce2 = walletLink.getLatestNonceForRootKey(root);
    bytes memory signature = "";

    vm.prank(rootWallet.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__CannotLinkToRootWallet.selector,
        rootWallet.addr,
        root
      )
    );
    walletLink.linkCallerToRootKey(
      LinkedWallet(root, signature, LINKED_WALLET_MESSAGE),
      nonce2
    );
  }

  function test_revertWhen_linkCallerToRootKeyInvalidSignature() external {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    bytes memory signature = _signWalletLink(
      wallet.privateKey,
      wallet.addr,
      nonce
    );

    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__InvalidSignature.selector);
    walletLink.linkCallerToRootKey(
      LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
    );
  }

  function test_revertWhen_linkCallerToRootKeyInvalidNonce()
    external
    givenWalletIsLinkedViaCaller
  {
    uint256 nonce = 0;
    address anotherWallet = vm.createWallet("wallet2").addr;

    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      anotherWallet,
      nonce
    );

    vm.prank(anotherWallet);
    vm.expectRevert(
      abi.encodeWithSelector(
        Nonces.InvalidAccountNonce.selector,
        rootWallet.addr,
        1
      )
    );
    walletLink.linkCallerToRootKey(
      LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
    );
  }

  // =============================================================
  //                   linkWalletToRootKey
  // =============================================================

  function test_linkWalletToRootKey() external givenWalletIsLinkedViaProxy {
    assertTrue(walletLink.checkIfLinked(rootWallet.addr, wallet.addr));
  }

  function test_revertWhen_linkWalletToRootKeyAddressIsZero() external {
    vm.prank(smartAccount.addr);
    vm.expectRevert(WalletLink__InvalidAddress.selector);
    walletLink.linkWalletToRootKey(
      LinkedWallet(address(0), "", LINKED_WALLET_MESSAGE),
      LinkedWallet(address(0), "", LINKED_WALLET_MESSAGE),
      0
    );
  }

  function test_revertWhen_linkWalletToRootKeyCannotSelfLink() external {
    vm.prank(smartAccount.addr);
    vm.expectRevert(WalletLink__CannotLinkToSelf.selector);
    walletLink.linkWalletToRootKey(
      LinkedWallet(wallet.addr, "", LINKED_WALLET_MESSAGE),
      LinkedWallet(wallet.addr, "", LINKED_WALLET_MESSAGE),
      0
    );
  }

  function test_revertWhen_linkWalletToRootKeyAlreadyLinked()
    external
    givenWalletIsLinkedViaProxy
  {
    vm.startPrank(smartAccount.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__LinkAlreadyExists.selector,
        wallet.addr,
        rootWallet.addr
      )
    );
    walletLink.linkWalletToRootKey(
      LinkedWallet(wallet.addr, "", LINKED_WALLET_MESSAGE),
      LinkedWallet(rootWallet.addr, "", LINKED_WALLET_MESSAGE),
      0
    );
    vm.stopPrank();
  }

  function test_revertWhen_linkWalletToRootKeyRootLinkAlreadyExists()
    external
    givenWalletIsLinkedViaProxy
  {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    address anotherWallet = vm.createWallet("wallet3").addr;

    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__LinkedToAnotherRootKey.selector,
        anotherWallet,
        rootWallet.addr
      )
    );
    walletLink.linkWalletToRootKey(
      LinkedWallet(anotherWallet, "", LINKED_WALLET_MESSAGE),
      LinkedWallet(wallet.addr, "", LINKED_WALLET_MESSAGE),
      nonce
    );
  }

  function test_revertWhen_linkWalletToRootKeyLinkingToAnotherRootWallet()
    external
    givenWalletIsLinkedViaProxy
  {
    address root = vm.createWallet("rootKey2").addr;
    uint256 nonce2 = walletLink.getLatestNonceForRootKey(root);

    vm.prank(smartAccount.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__CannotLinkToRootWallet.selector,
        rootWallet.addr,
        root
      )
    );
    walletLink.linkWalletToRootKey(
      LinkedWallet(rootWallet.addr, "", LINKED_WALLET_MESSAGE),
      LinkedWallet(root, "", LINKED_WALLET_MESSAGE),
      nonce2
    );
  }

  function test_revertWhen_linkWalletToRootKeyInvalidRootSignature() external {
    address wrongWallet = vm.createWallet("wallet2").addr;

    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      wrongWallet,
      nonce
    );

    vm.prank(smartAccount.addr);
    vm.expectRevert(WalletLink__InvalidSignature.selector);
    walletLink.linkWalletToRootKey(
      LinkedWallet(wallet.addr, "", LINKED_WALLET_MESSAGE),
      LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
    );
  }

  function test_revertWhen_linkWalletToRootKeyInvalidWalletSignature()
    external
  {
    address wrongWallet = vm.createWallet("wallet2").addr;

    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    bytes memory rootSignature = _signWalletLink(
      rootWallet.privateKey,
      wallet.addr,
      nonce
    );

    bytes memory walletSignature = _signWalletLink(
      wallet.privateKey,
      wrongWallet,
      nonce
    );

    vm.prank(smartAccount.addr);
    vm.expectRevert(WalletLink__InvalidSignature.selector);
    walletLink.linkWalletToRootKey(
      LinkedWallet(wallet.addr, walletSignature, LINKED_WALLET_MESSAGE),
      LinkedWallet(rootWallet.addr, rootSignature, LINKED_WALLET_MESSAGE),
      nonce
    );
  }

  function test_revertWhen_linkWalletToRootKeyInvalidNonce()
    external
    givenWalletIsLinkedViaProxy
  {
    uint256 nonce = 0;
    Vm.Wallet memory anotherWallet = vm.createWallet("wallet2");

    bytes memory rootSignature = _signWalletLink(
      rootWallet.privateKey,
      anotherWallet.addr,
      nonce
    );

    bytes memory walletSignature = _signWalletLink(
      anotherWallet.privateKey,
      rootWallet.addr,
      nonce
    );

    vm.prank(smartAccount.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        Nonces.InvalidAccountNonce.selector,
        rootWallet.addr,
        walletLink.getLatestNonceForRootKey(rootWallet.addr)
      )
    );
    walletLink.linkWalletToRootKey(
      LinkedWallet(anotherWallet.addr, walletSignature, LINKED_WALLET_MESSAGE),
      LinkedWallet(rootWallet.addr, rootSignature, LINKED_WALLET_MESSAGE),
      nonce
    );
  }

  // =============================================================
  //                         removeLink
  // =============================================================
  function test_removeLink() external givenWalletIsLinkedViaCaller {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      wallet.addr,
      nonce
    );

    vm.startPrank(smartAccount.addr);
    vm.expectEmit(address(walletLink));
    emit RemoveLink(wallet.addr, smartAccount.addr);
    walletLink.removeLink({
      wallet: wallet.addr,
      rootWallet: LinkedWallet(
        rootWallet.addr,
        signature,
        LINKED_WALLET_MESSAGE
      ),
      nonce: nonce
    });
    vm.stopPrank();

    assertFalse(walletLink.checkIfLinked(rootWallet.addr, wallet.addr));
  }

  function test_revertWhen_removeLinkInvalidAddress() external {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      wallet.addr,
      nonce
    );

    vm.prank(smartAccount.addr);
    vm.expectRevert(WalletLink__InvalidAddress.selector);
    walletLink.removeLink({
      wallet: address(0),
      rootWallet: LinkedWallet(
        rootWallet.addr,
        signature,
        LINKED_WALLET_MESSAGE
      ),
      nonce: nonce
    });

    vm.prank(smartAccount.addr);
    vm.expectRevert(WalletLink__InvalidAddress.selector);
    walletLink.removeLink({
      wallet: wallet.addr,
      rootWallet: LinkedWallet(address(0), signature, LINKED_WALLET_MESSAGE),
      nonce: nonce
    });
  }

  function test_revertWhen_removeLinkCannotRemoveRootWallet() external {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      wallet.addr,
      nonce
    );

    vm.prank(smartAccount.addr);
    vm.expectRevert(WalletLink__CannotRemoveRootWallet.selector);
    walletLink.removeLink({
      wallet: rootWallet.addr,
      rootWallet: LinkedWallet(
        rootWallet.addr,
        signature,
        LINKED_WALLET_MESSAGE
      ),
      nonce: nonce
    });
  }

  function test_revertWhen_removeLinkWalletLink__NotLinked() external {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      wallet.addr,
      nonce
    );

    vm.prank(smartAccount.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__NotLinked.selector,
        wallet.addr,
        rootWallet.addr
      )
    );
    walletLink.removeLink({
      wallet: wallet.addr,
      rootWallet: LinkedWallet(
        rootWallet.addr,
        signature,
        LINKED_WALLET_MESSAGE
      ),
      nonce: nonce
    });
  }

  function test_revertWhen_removeLinkWalletLink__InvalidSignature()
    external
    givenWalletIsLinkedViaCaller
  {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    bytes memory signature = _signWalletLink(
      wallet.privateKey, // wrong private key
      wallet.addr,
      nonce
    );

    vm.prank(smartAccount.addr);
    vm.expectRevert(WalletLink__InvalidSignature.selector);
    walletLink.removeLink({
      wallet: wallet.addr,
      rootWallet: LinkedWallet(
        rootWallet.addr,
        signature,
        LINKED_WALLET_MESSAGE
      ),
      nonce: nonce
    });
  }

  function test_revertWhen_removeLinkInvalidAccountNonce()
    external
    givenWalletIsLinkedViaCaller
  {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr) + 1;
    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      wallet.addr,
      nonce
    );

    vm.prank(smartAccount.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        Nonces.InvalidAccountNonce.selector,
        rootWallet.addr,
        walletLink.getLatestNonceForRootKey(rootWallet.addr)
      )
    );
    walletLink.removeLink({
      wallet: wallet.addr,
      rootWallet: LinkedWallet(
        rootWallet.addr,
        signature,
        LINKED_WALLET_MESSAGE
      ),
      nonce: nonce
    });
  }

  // =============================================================
  //                   removeCallerLink
  // =============================================================

  function test_removeCallerLink() external givenWalletIsLinkedViaCaller {
    vm.startPrank(wallet.addr);
    vm.expectEmit(address(walletLink));
    emit RemoveLink(wallet.addr, rootWallet.addr);
    walletLink.removeCallerLink();
    vm.stopPrank();

    assertFalse(walletLink.checkIfLinked(rootWallet.addr, wallet.addr));
    assertEq(walletLink.getRootKeyForWallet(wallet.addr), address(0));
  }

  function test_revertWhen_removeCallerLinkNotLinked() external {
    vm.prank(wallet.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__NotLinked.selector,
        wallet.addr,
        address(0)
      )
    );
    walletLink.removeCallerLink();
  }
}
