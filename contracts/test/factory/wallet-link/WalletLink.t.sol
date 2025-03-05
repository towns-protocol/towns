// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkBase} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";
import {WalletLink} from "contracts/src/factory/facets/wallet-link/WalletLink.sol";

// libraries
import {Vm} from "forge-std/Test.sol";
import {LibString} from "solady/utils/LibString.sol";
// contracts
import {DeployBase} from "contracts/scripts/common/DeployBase.s.sol";
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {Nonces} from "@river-build/diamond/src/utils/Nonces.sol";
import {MockDelegationRegistry} from "contracts/test/mocks/MockDelegationRegistry.sol";
import {SimpleAccount} from "account-abstraction/samples/SimpleAccount.sol";
import {console} from "forge-std/console.sol";

contract WalletLinkTest is IWalletLinkBase, BaseSetup, DeployBase {
  Vm.Wallet internal rootWallet;
  Vm.Wallet internal wallet;
  Vm.Wallet internal smartAccount;

  MockDelegationRegistry public mockDelegationRegistry;

  uint256 private constant MAX_LINKED_WALLETS = 10;
  bytes32 private constant DELEGATE_REGISTRY_V2 =
    bytes32("DELEGATE_REGISTRY_V2");

  function setUp() public override {
    super.setUp();

    rootWallet = vm.createWallet("rootKey");
    wallet = vm.createWallet("eoaWallet");
    smartAccount = vm.createWallet("smartAccount");

    mockDelegationRegistry = MockDelegationRegistry(
      walletLink.getDependency(DELEGATE_REGISTRY_V2)
    );
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

  function test_revertWhen_linkCallerToRootKeyMaxLinkedWalletsReached()
    external
  {
    address[] memory accounts = _createAccounts(MAX_LINKED_WALLETS);

    uint256 nonce;
    bytes memory signature;

    for (uint256 i = 0; i < MAX_LINKED_WALLETS; i++) {
      address account = accounts[i];

      nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
      signature = _signWalletLink(rootWallet.privateKey, account, nonce);

      vm.prank(account);
      walletLink.linkCallerToRootKey(
        LinkedWallet({
          addr: rootWallet.addr,
          signature: signature,
          message: LINKED_WALLET_MESSAGE
        }),
        nonce
      );
    }

    address failingAccount = _randomAddress();
    nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    signature = _signWalletLink(rootWallet.privateKey, failingAccount, nonce);

    vm.prank(failingAccount);
    vm.expectRevert(WalletLink__MaxLinkedWalletsReached.selector);
    walletLink.linkCallerToRootKey(
      LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
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
  //                         setDefaultWallet
  // =============================================================

  function test_setDefaultWallet() external givenWalletIsLinkedViaCaller {
    assertTrue(walletLink.checkIfLinked(rootWallet.addr, wallet.addr));

    vm.prank(wallet.addr);
    vm.expectEmit(address(walletLink));
    emit SetDefaultWallet(rootWallet.addr, wallet.addr);
    walletLink.setDefaultWallet(wallet.addr);

    assertEq(walletLink.getDefaultWallet(rootWallet.addr), wallet.addr);
  }

  function test_revertWhen_setDefaultWalletAddressIsZero() external {
    vm.expectRevert(WalletLink__InvalidAddress.selector);
    walletLink.setDefaultWallet(address(0));
  }

  function test_revertWhen_setDefaultWalletNotLinked() external {
    address anotherWallet = vm.createWallet("wallet2").addr;

    assertFalse(walletLink.checkIfLinked(rootWallet.addr, anotherWallet));

    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__NotLinked.selector,
        anotherWallet,
        address(0)
      )
    );
    walletLink.setDefaultWallet(anotherWallet);
  }

  function test_revertWhen_setDefaultWalletWalletNotLinked()
    external
    givenWalletIsLinkedViaCaller
  {
    address randomAddress = _randomAddress();

    vm.prank(randomAddress);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__NotLinked.selector,
        randomAddress,
        rootWallet.addr
      )
    );
    walletLink.setDefaultWallet(wallet.addr);
  }

  function test_revertWhen_setDefaultWalletDefaultWalletAlreadySet()
    external
    givenWalletIsLinkedViaCaller
  {
    vm.prank(wallet.addr);
    walletLink.setDefaultWallet(wallet.addr);

    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__DefaultWalletAlreadySet.selector);
    walletLink.setDefaultWallet(wallet.addr);
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

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Delegations                      */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  /*
   * @dev This test checks that a cold wallet can delegate to a linked wallet
   *      and that the linked wallet and the cold wallet are both included in
   *      the returned array
   */
  function test_getWalletsByRootKeyWithDelegations()
    external
    givenWalletIsLinkedViaCaller
  {
    address coldWallet = vm.createWallet("coldWallet").addr;

    // As a cold wallet, delegate to a linked wallet
    // This is what delegate.xyz v2 does
    vm.prank(coldWallet);
    mockDelegationRegistry.delegateAll(wallet.addr);

    WalletMetadata[] memory walletMetadata = walletLink
      .explicitWalletsByRootKey(
        rootWallet.addr,
        WalletQueryOptions({includeDelegations: true})
      );

    address[] memory wallets = new address[](walletMetadata.length);
    for (uint256 i; i < walletMetadata.length; ++i) {
      wallets[i] = vm.parseAddress(walletMetadata[i].wallet.addr);
    }

    assertContains(wallets, coldWallet);
    assertContains(wallets, wallet.addr);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                          Metadata                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_getWalletsByRootKeyWithMetadata()
    external
    givenWalletIsLinkedViaCaller
  {
    SimpleAccount simpleAccount = _createSimpleAccount(rootWallet.addr);
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      address(simpleAccount),
      nonce
    );

    vm.startPrank(address(simpleAccount));
    walletLink.linkCallerToRootKey(
      LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
    );
    walletLink.setDefaultWallet(address(simpleAccount));
    vm.stopPrank();

    WalletMetadata[] memory wallets = walletLink.explicitWalletsByRootKey(
      rootWallet.addr,
      WalletQueryOptions({includeDelegations: false})
    );
    uint256 walletLen = wallets.length;

    for (uint256 i; i < walletLen; ++i) {
      WalletMetadata memory w = wallets[i];
      if (
        LibString.eq(
          w.wallet.addr,
          LibString.toHexString(address(simpleAccount))
        )
      ) {
        assertEq(w.isDefaultWallet, true);
        assertEq(w.isSmartAccount, true);
      } else if (
        LibString.eq(w.wallet.addr, LibString.toHexString(wallet.addr))
      ) {
        assertEq(w.isDefaultWallet, false);
        assertEq(w.isSmartAccount, false);
      }
    }
  }
}
