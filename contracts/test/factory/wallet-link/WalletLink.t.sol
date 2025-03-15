// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IWalletLinkBase} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";
import {WalletLink} from "contracts/src/factory/facets/wallet-link/WalletLink.sol";
import {WalletLinkQueryable} from "contracts/src/factory/facets/wallet-link/WalletLinkQueryable.sol";

// libraries
import {Vm} from "forge-std/Test.sol";
import {LibString} from "solady/utils/LibString.sol";
import {SCL_EIP6565_UTILS} from "crypto-lib/lib/libSCL_eddsaUtils.sol";
import {SolanaUtils} from "contracts/src/factory/facets/wallet-link/libraries/SolanaUtils.sol";

// contracts
import {DeployBase} from "contracts/scripts/common/DeployBase.s.sol";
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {Nonces} from "@river-build/diamond/src/utils/Nonces.sol";
import {MockDelegationRegistry} from "contracts/test/mocks/MockDelegationRegistry.sol";
import {SimpleAccount} from "account-abstraction/samples/SimpleAccount.sol";

contract WalletLinkTest is IWalletLinkBase, BaseSetup, DeployBase {
  Vm.Wallet internal rootWallet;
  Vm.Wallet internal wallet;
  Vm.Wallet internal smartAccount;

  Vm.Wallet internal secondRootWallet;
  Vm.Wallet internal secondLinkedWallet;

  MockDelegationRegistry public mockDelegationRegistry;

  uint256 private constant MAX_LINKED_WALLETS = 10;
  bytes32 private constant DELEGATE_REGISTRY_V2 =
    bytes32("DELEGATE_REGISTRY_V2");
  string private constant SOLANA_WALLET_ADDRESS =
    "3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we";

  uint256[5] extPubKey;
  uint256[2] signer;

  /// @dev flags for wallet type
  uint8 internal constant WALLET_TYPE_LINKED = 1 << 0;
  uint8 internal constant WALLET_TYPE_DELEGATED = 1 << 1;
  uint8 internal constant WALLET_TYPE_DEFAULT = 1 << 2;
  uint8 internal constant WALLET_TYPE_NON_EVM = 1 << 3;

  function setUp() public override {
    super.setUp();

    rootWallet = vm.createWallet("rootKey");
    wallet = vm.createWallet("eoaWallet");
    smartAccount = vm.createWallet("smartAccount");

    secondRootWallet = vm.createWallet("secondRootKey");
    secondLinkedWallet = vm.createWallet("secondLinkedWallet");

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
      LinkedWalletData(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(wallet.addr, walletSignature, LINKED_WALLET_MESSAGE),
      LinkedWalletData(rootWallet.addr, rootSignature, LINKED_WALLET_MESSAGE),
      rootNonce
    );
    vm.stopPrank();
    _;
  }

  modifier givenSolanaWalletIsLinkedToRootKey(uint256 secretSeed) {
    (extPubKey, signer) = SCL_EIP6565_UTILS.SetKey(secretSeed);

    string memory solanaAddress = SolanaUtils.toBase58String(
      bytes32(extPubKey[4])
    );

    string memory consentMessage = LibString.toHexString(rootWallet.addr);
    (uint256 r, uint256 s) = SCL_EIP6565_UTILS.Sign(
      extPubKey[4],
      signer,
      consentMessage
    );

    VMSpecificData[] memory extraData = new VMSpecificData[](1);
    extraData[0] = VMSpecificData({
      key: "extPubKey",
      value: abi.encode(SolanaSpecificData({extPubKey: extPubKey}))
    });

    NonEVMLinkedWalletData memory nonEVMWallet = NonEVMLinkedWalletData({
      addr: solanaAddress,
      signature: abi.encodePacked(r, s),
      message: consentMessage,
      vmType: VirtualMachineType.SVM,
      extraData: extraData
    });

    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    vm.prank(wallet.addr);
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, nonce);

    _;
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                   linkNonEVMWalletToRootKey                */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
  function test_linkNonEVMWalletToRootKey(
    uint256 secretSeed
  )
    external
    givenWalletIsLinkedViaCaller
    givenSolanaWalletIsLinkedToRootKey(secretSeed)
  {
    string memory solanaAddress = SolanaUtils.toBase58String(
      bytes32(extPubKey[4])
    );

    NonEVMLinkedWalletData memory nonEVMWallet = NonEVMLinkedWalletData({
      addr: solanaAddress,
      signature: "",
      message: "",
      vmType: VirtualMachineType.SVM,
      extraData: new VMSpecificData[](0)
    });

    bytes32 walletHash = keccak256(
      abi.encode(nonEVMWallet.addr, nonEVMWallet.vmType)
    );

    assertTrue(
      walletLink.checkIfNonEVMWalletLinked(rootWallet.addr, walletHash)
    );
  }

  function test_revertWhen_linkNonEVMWalletToRootKeyEmptyAddress() external {
    NonEVMLinkedWalletData memory nonEVMWallet = NonEVMLinkedWalletData({
      addr: "",
      signature: "",
      message: "",
      vmType: VirtualMachineType.SVM,
      extraData: new VMSpecificData[](0)
    });

    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__InvalidNonEVMAddress.selector);
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
  }

  function test_revertWhen_linkNonEVMWalletToRootKeyAddressTooLong() external {
    string
      memory longAddress = "3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we";

    NonEVMLinkedWalletData memory nonEVMWallet = NonEVMLinkedWalletData({
      addr: longAddress,
      signature: "",
      message: "",
      vmType: VirtualMachineType.SVM,
      extraData: new VMSpecificData[](0)
    });

    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__InvalidNonEVMAddress.selector);
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
  }

  function test_revertWhen_linkNonEVMWalletToRootKeyNotLinked() external {
    NonEVMLinkedWalletData memory nonEVMWallet = NonEVMLinkedWalletData({
      addr: SOLANA_WALLET_ADDRESS,
      signature: "",
      message: "",
      vmType: VirtualMachineType.SVM,
      extraData: new VMSpecificData[](0)
    });

    vm.prank(wallet.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__NotLinked.selector,
        wallet.addr,
        address(0)
      )
    );
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
  }

  function test_revertWhen_linkNonEVMWalletToRootKeyDifferentRootKey(
    uint256 secretSeed
  ) external givenWalletIsLinkedViaCaller {
    // Link a second wallet to a second root key
    uint256 secondNonce = walletLink.getLatestNonceForRootKey(
      secondRootWallet.addr
    );
    bytes memory secondSignature = _signWalletLink(
      secondRootWallet.privateKey,
      secondLinkedWallet.addr,
      secondNonce
    );

    vm.prank(secondLinkedWallet.addr);
    walletLink.linkCallerToRootKey(
      LinkedWalletData(
        secondRootWallet.addr,
        secondSignature,
        LINKED_WALLET_MESSAGE
      ),
      secondNonce
    );

    // Generate Solana wallet data
    (
      uint256[5] memory solanaExtPubKey,
      uint256[2] memory solanaSigner
    ) = SCL_EIP6565_UTILS.SetKey(secretSeed);

    string memory solanaAddress = SolanaUtils.toBase58String(
      bytes32(solanaExtPubKey[4])
    );

    string memory consentMessage = LibString.toHexString(secondRootWallet.addr);
    (uint256 r, uint256 s) = SCL_EIP6565_UTILS.Sign(
      solanaExtPubKey[4],
      solanaSigner,
      consentMessage
    );

    VMSpecificData[] memory extraData = new VMSpecificData[](1);
    extraData[0] = VMSpecificData({
      key: "extPubKey",
      value: abi.encode(SolanaSpecificData({extPubKey: solanaExtPubKey}))
    });

    NonEVMLinkedWalletData memory nonEVMWallet = NonEVMLinkedWalletData({
      addr: solanaAddress,
      signature: abi.encodePacked(r, s),
      message: consentMessage,
      vmType: VirtualMachineType.SVM,
      extraData: extraData
    });

    // First link the Solana wallet to the second root key
    uint256 linkNonce = walletLink.getLatestNonceForRootKey(
      secondRootWallet.addr
    );

    vm.prank(secondLinkedWallet.addr);
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, linkNonce);

    // Now try to link the same Solana wallet to the first root key
    // This should fail with WalletLink__RootKeyMismatch
    uint256 firstRootKeyNonce = walletLink.getLatestNonceForRootKey(
      rootWallet.addr
    );

    vm.prank(wallet.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__RootKeyMismatch.selector,
        rootWallet.addr,
        secondRootWallet.addr
      )
    );
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, firstRootKeyNonce);
  }

  function test_revertWhen_linkNonEVMWalletToRootKeyRootKeyAlreadyLinked(
    uint256 secretSeed
  )
    external
    givenWalletIsLinkedViaCaller
    givenSolanaWalletIsLinkedToRootKey(secretSeed)
  {
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    NonEVMLinkedWalletData memory nonEVMWallet = _createNonEVMWallet(
      secretSeed,
      rootWallet.addr
    );

    vm.prank(wallet.addr);
    vm.expectRevert(
      abi.encodeWithSelector(
        WalletLink__NonEVMWalletAlreadyLinked.selector,
        nonEVMWallet.addr,
        rootWallet.addr
      )
    );
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, nonce);
  }

  function test_revertWhen_linkNonEVMWalletToRootKeyMaxLinkedWalletsReached()
    external
    givenWalletIsLinkedViaCaller
  {
    uint256 nonce;
    NonEVMLinkedWalletData memory nonEVMWallet;

    for (uint256 i = 0; i < MAX_LINKED_WALLETS; i++) {
      nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
      nonEVMWallet = _createNonEVMWallet(i, rootWallet.addr);
      vm.prank(wallet.addr);
      walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, nonce);
    }

    nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    nonEVMWallet = _createNonEVMWallet(_randomUint256(), rootWallet.addr);

    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__MaxLinkedWalletsReached.selector);
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, nonce);
  }

  function test_revertWhen_linkNonEVMWalletToRootKeyInvalidVM()
    external
    givenWalletIsLinkedViaCaller
  {
    NonEVMLinkedWalletData memory nonEVMWallet = _createNonEVMWallet(
      _randomUint256(),
      rootWallet.addr
    );

    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    nonEVMWallet.vmType = VirtualMachineType.UNKNOWN;

    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__UnsupportedVMType.selector);
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, nonce);
  }

  function test_revertWhen_linkNonEVMWalletToRootKeyInvalidSolanaAddress()
    external
    givenWalletIsLinkedViaCaller
  {
    NonEVMLinkedWalletData memory nonEVMWallet = _createNonEVMWallet(
      _randomUint256(),
      rootWallet.addr
    );

    nonEVMWallet.addr = "3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4weinvalid";

    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__InvalidNonEVMAddress.selector);
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
  }

  function test_revertWhen_linkNonEVMWalletToRootKeyInvalidMismatchedSolanaAddress()
    external
    givenWalletIsLinkedViaCaller
  {
    NonEVMLinkedWalletData memory nonEVMWallet = _createNonEVMWallet(
      _randomUint256(),
      rootWallet.addr
    );

    nonEVMWallet.addr = SOLANA_WALLET_ADDRESS;

    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__AddressMismatch.selector);
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
  }

  function test_revertWhen_linkNonEVMWalletToRootKeyInvalidSignature()
    external
    givenWalletIsLinkedViaCaller
  {
    (
      uint256[5] memory secondExtPubKey,
      uint256[2] memory solanaSigner
    ) = SCL_EIP6565_UTILS.SetKey(_randomUint256());
    string memory consentMessage = LibString.toHexString(rootWallet.addr);
    (uint256 r, uint256 s) = SCL_EIP6565_UTILS.Sign(
      secondExtPubKey[4],
      solanaSigner,
      consentMessage
    );

    NonEVMLinkedWalletData memory nonEVMWallet = _createNonEVMWallet(
      _randomUint256(),
      rootWallet.addr
    );

    nonEVMWallet.signature = abi.encodePacked(r, s);

    vm.prank(wallet.addr);
    vm.expectRevert(WalletLink__InvalidSignature.selector);
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
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
      LinkedWalletData(address(0), signature, LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(wallet.addr, "", LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(root, signature, LINKED_WALLET_MESSAGE),
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
        LinkedWalletData({
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
      LinkedWalletData(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(address(0), "", LINKED_WALLET_MESSAGE),
      LinkedWalletData(address(0), "", LINKED_WALLET_MESSAGE),
      0
    );
  }

  function test_revertWhen_linkWalletToRootKeyCannotSelfLink() external {
    vm.prank(smartAccount.addr);
    vm.expectRevert(WalletLink__CannotLinkToSelf.selector);
    walletLink.linkWalletToRootKey(
      LinkedWalletData(wallet.addr, "", LINKED_WALLET_MESSAGE),
      LinkedWalletData(wallet.addr, "", LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(wallet.addr, "", LINKED_WALLET_MESSAGE),
      LinkedWalletData(rootWallet.addr, "", LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(anotherWallet, "", LINKED_WALLET_MESSAGE),
      LinkedWalletData(wallet.addr, "", LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(rootWallet.addr, "", LINKED_WALLET_MESSAGE),
      LinkedWalletData(root, "", LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(wallet.addr, "", LINKED_WALLET_MESSAGE),
      LinkedWalletData(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(wallet.addr, walletSignature, LINKED_WALLET_MESSAGE),
      LinkedWalletData(rootWallet.addr, rootSignature, LINKED_WALLET_MESSAGE),
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
      LinkedWalletData(
        anotherWallet.addr,
        walletSignature,
        LINKED_WALLET_MESSAGE
      ),
      LinkedWalletData(rootWallet.addr, rootSignature, LINKED_WALLET_MESSAGE),
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
      rootWallet: LinkedWalletData(
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
      rootWallet: LinkedWalletData(
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
      rootWallet: LinkedWalletData(
        address(0),
        signature,
        LINKED_WALLET_MESSAGE
      ),
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
      rootWallet: LinkedWalletData(
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
      rootWallet: LinkedWalletData(
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
      rootWallet: LinkedWalletData(
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
      rootWallet: LinkedWalletData(
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

    address[] memory wallets = walletLink.getWalletsByRootKeyWithDelegations(
      rootWallet.addr
    );

    assertContains(wallets, coldWallet);
    assertContains(wallets, wallet.addr);
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                          Metadata                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function test_explicitGetWalletsByRootKeyWithNoDelegations()
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
      LinkedWalletData(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
    );
    walletLink.setDefaultWallet(address(simpleAccount));
    vm.stopPrank();

    WalletData[] memory wallets = walletLinkQueryable.explicitWalletsByRootKey(
      rootWallet.addr
    );
    uint256 walletLen = wallets.length;

    address[] memory walletAddresses = new address[](walletLen);

    for (uint256 i; i < walletLen; ++i) {
      walletAddresses[i] = vm.parseAddress(wallets[i].addr);

      // Check if wallet is the default wallet
      if ((wallets[i].walletType & WALLET_TYPE_DEFAULT) != 0) {
        assertEq(walletAddresses[i], address(simpleAccount));
      }

      // All wallets should have the LINKED flag set
      assertTrue(
        (wallets[i].walletType & WALLET_TYPE_LINKED) != 0,
        "Wallet should be linked"
      );

      // No wallets should have the DELEGATED flag set
      assertTrue(
        (wallets[i].walletType & WALLET_TYPE_DELEGATED) == 0,
        "Wallet should not be delegated"
      );
    }

    assertContains(walletAddresses, address(simpleAccount));
    assertContains(walletAddresses, wallet.addr);
  }

  function test_explicitGetWalletsByRootKeyWithDelegations()
    external
    givenWalletIsLinkedViaCaller
  {
    // Create and set up a default wallet
    SimpleAccount simpleAccount = _createSimpleAccount(rootWallet.addr);
    uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      address(simpleAccount),
      nonce
    );

    vm.startPrank(address(simpleAccount));
    walletLink.linkCallerToRootKey(
      LinkedWalletData(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
    );
    walletLink.setDefaultWallet(address(simpleAccount));
    vm.stopPrank();

    // Create a cold wallet that will delegate to our linked wallet
    address coldWallet = vm.createWallet("coldWallet").addr;
    vm.prank(coldWallet);
    mockDelegationRegistry.delegateAll(wallet.addr);

    // Get all wallets with delegations included
    WalletData[] memory wallets = walletLinkQueryable.explicitWalletsByRootKey(
      rootWallet.addr
    );

    // We should have 3 wallets total:
    // 1. wallet.addr (linked)
    // 2. simpleAccount (linked + default)
    // 3. coldWallet (delegated to wallet.addr)
    assertEq(wallets.length, 3, "Should have 3 wallets total");

    bool foundColdWallet = false;
    bool foundSimpleAccount = false;
    bool foundLinkedWallet = false;

    for (uint256 i; i < wallets.length; i++) {
      address currentWallet = vm.parseAddress(wallets[i].addr);

      if (currentWallet == coldWallet) {
        foundColdWallet = true;
        // Cold wallet should only have DELEGATED flag
        assertTrue(
          (wallets[i].walletType & WALLET_TYPE_DELEGATED) != 0,
          "Cold wallet should be delegated"
        );
        assertTrue(
          (wallets[i].walletType & WALLET_TYPE_LINKED) == 0,
          "Cold wallet should not be linked"
        );
        assertTrue(
          (wallets[i].walletType & WALLET_TYPE_DEFAULT) == 0,
          "Cold wallet should not be default"
        );
      } else if (currentWallet == address(simpleAccount)) {
        foundSimpleAccount = true;
        // Simple account should be linked and default
        assertTrue(
          (wallets[i].walletType & WALLET_TYPE_LINKED) != 0,
          "Simple account should be linked"
        );
        assertTrue(
          (wallets[i].walletType & WALLET_TYPE_DEFAULT) != 0,
          "Simple account should be default"
        );
        assertTrue(
          (wallets[i].walletType & WALLET_TYPE_DELEGATED) == 0,
          "Simple account should not be delegated"
        );
      } else if (currentWallet == wallet.addr) {
        foundLinkedWallet = true;
        // Original wallet should only be linked
        assertTrue(
          (wallets[i].walletType & WALLET_TYPE_LINKED) != 0,
          "Wallet should be linked"
        );
        assertTrue(
          (wallets[i].walletType & WALLET_TYPE_DEFAULT) == 0,
          "Wallet should not be default"
        );
        assertTrue(
          (wallets[i].walletType & WALLET_TYPE_DELEGATED) == 0,
          "Wallet should not be delegated"
        );
      }

      // All wallets should have EVM as VM type
      assertEq(
        uint8(wallets[i].vmType),
        uint8(VirtualMachineType.EVM),
        "All wallets should be EVM type"
      );
    }

    assertTrue(foundColdWallet, "Cold wallet should be in results");
    assertTrue(foundSimpleAccount, "Simple account should be in results");
    assertTrue(foundLinkedWallet, "Linked wallet should be in results");
  }

  function _verifyWalletData(
    WalletData memory currentWallet,
    address coldWallet,
    address simpleAccount,
    address linkedWallet,
    string memory solanaAddress,
    bool[] memory found
  ) internal pure {
    // First check if it's a non-EVM wallet
    if (currentWallet.vmType == VirtualMachineType.SVM) {
      if (LibString.eq(currentWallet.addr, solanaAddress)) {
        found[3] = true;
        // Solana wallet should only be linked
        assertTrue(
          (currentWallet.walletType & WALLET_TYPE_NON_EVM) != 0,
          "Solana wallet should be linked"
        );
        assertTrue(
          (currentWallet.walletType & WALLET_TYPE_DEFAULT) == 0,
          "Solana wallet should not be default"
        );
        assertTrue(
          (currentWallet.walletType & WALLET_TYPE_DELEGATED) == 0,
          "Solana wallet should not be delegated"
        );
        assertEq(
          uint8(currentWallet.vmType),
          uint8(VirtualMachineType.SVM),
          "Solana wallet should be SVM type"
        );
      }
      return; // Skip EVM address parsing for non-EVM wallets
    }

    // Only parse address for EVM wallets
    address parsedAddr = vm.parseAddress(currentWallet.addr);

    if (parsedAddr == coldWallet) {
      found[0] = true;
      // Cold wallet should only have DELEGATED flag
      assertTrue(
        (currentWallet.walletType & WALLET_TYPE_DELEGATED) != 0,
        "Cold wallet should be delegated"
      );
      assertTrue(
        (currentWallet.walletType & WALLET_TYPE_LINKED) == 0,
        "Cold wallet should not be linked"
      );
      assertTrue(
        (currentWallet.walletType & WALLET_TYPE_DEFAULT) == 0,
        "Cold wallet should not be default"
      );
      assertEq(
        uint8(currentWallet.vmType),
        uint8(VirtualMachineType.EVM),
        "Cold wallet should be EVM type"
      );
    } else if (parsedAddr == simpleAccount) {
      found[1] = true;
      // Simple account should be linked and default
      assertTrue(
        (currentWallet.walletType & WALLET_TYPE_LINKED) != 0,
        "Simple account should be linked"
      );
      assertTrue(
        (currentWallet.walletType & WALLET_TYPE_DEFAULT) != 0,
        "Simple account should be default"
      );
      assertTrue(
        (currentWallet.walletType & WALLET_TYPE_DELEGATED) == 0,
        "Simple account should not be delegated"
      );
      assertEq(
        uint8(currentWallet.vmType),
        uint8(VirtualMachineType.EVM),
        "Simple account should be EVM type"
      );
    } else if (parsedAddr == linkedWallet) {
      found[2] = true;
      // Original wallet should only be linked
      assertTrue(
        (currentWallet.walletType & WALLET_TYPE_LINKED) != 0,
        "Wallet should be linked"
      );
      assertTrue(
        (currentWallet.walletType & WALLET_TYPE_DEFAULT) == 0,
        "Wallet should not be default"
      );
      assertTrue(
        (currentWallet.walletType & WALLET_TYPE_DELEGATED) == 0,
        "Wallet should not be delegated"
      );
      assertEq(
        uint8(currentWallet.vmType),
        uint8(VirtualMachineType.EVM),
        "Wallet should be EVM type"
      );
    }
  }

  function test_explicitGetWalletsByRootKeyWithNonEVMWallets()
    external
    givenWalletIsLinkedViaCaller
  {
    // Create and set up a default wallet
    SimpleAccount simpleAccount = _createSimpleAccount(rootWallet.addr);
    uint256 nonce;

    nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    bytes memory signature = _signWalletLink(
      rootWallet.privateKey,
      address(simpleAccount),
      nonce
    );

    vm.startPrank(address(simpleAccount));
    walletLink.linkCallerToRootKey(
      LinkedWalletData(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
      nonce
    );
    walletLink.setDefaultWallet(address(simpleAccount));
    vm.stopPrank();

    // Create a cold wallet that will delegate to our linked wallet
    address coldWallet = vm.createWallet("coldWallet").addr;
    vm.prank(coldWallet);
    mockDelegationRegistry.delegateAll(wallet.addr);

    nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
    NonEVMLinkedWalletData memory nonEVMWallet = _createNonEVMWallet(
      _randomUint256(),
      rootWallet.addr
    );

    vm.prank(wallet.addr);
    walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, nonce);

    // Get all wallets with delegations included
    WalletData[] memory wallets = walletLinkQueryable.explicitWalletsByRootKey(
      rootWallet.addr
    );

    // We should have 4 wallets total:
    // 1. wallet.addr (linked)
    // 2. simpleAccount (linked + default)
    // 3. coldWallet (delegated to wallet.addr)
    // 4. solanaWallet (linked)
    assertEq(wallets.length, 4, "Should have 4 wallets total");

    bool[] memory found = new bool[](4);

    for (uint256 i; i < wallets.length; i++) {
      _verifyWalletData(
        wallets[i],
        coldWallet,
        address(simpleAccount),
        wallet.addr,
        nonEVMWallet.addr,
        found
      );
    }

    // assertTrue(found[0], "Cold wallet should be in results");
    // assertTrue(found[1], "Simple account should be in results");
    // assertTrue(found[2], "Linked wallet should be in results");
    // assertTrue(found[3], "Solana wallet should be in results");
  }

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                           Helpers                          */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _createNonEVMWallet(
    uint256 secretSeed,
    address rootKey
  ) internal view returns (NonEVMLinkedWalletData memory) {
    (
      uint256[5] memory solanaExtPubKey,
      uint256[2] memory solanaSigner
    ) = SCL_EIP6565_UTILS.SetKey(secretSeed);

    string memory solanaAddress = SolanaUtils.toBase58String(
      bytes32(solanaExtPubKey[4])
    );

    string memory consentMessage = LibString.toHexString(rootKey);
    (uint256 r, uint256 s) = SCL_EIP6565_UTILS.Sign(
      solanaExtPubKey[4],
      solanaSigner,
      consentMessage
    );

    VMSpecificData[] memory extraData = new VMSpecificData[](1);
    extraData[0] = VMSpecificData({
      key: "extPubKey",
      value: abi.encode(SolanaSpecificData({extPubKey: solanaExtPubKey}))
    });

    NonEVMLinkedWalletData memory nonEVMWallet = NonEVMLinkedWalletData({
      addr: solanaAddress,
      signature: abi.encodePacked(r, s),
      message: consentMessage,
      vmType: VirtualMachineType.SVM,
      extraData: extraData
    });

    return nonEVMWallet;
  }
}
