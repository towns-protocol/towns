// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {Vm} from "forge-std/Vm.sol";
import {IWalletLinkBase} from "src/factory/facets/wallet-link/IWalletLink.sol";
import {WalletLink} from "src/factory/facets/wallet-link/WalletLink.sol";

// libraries
import {LibString} from "solady/utils/LibString.sol";
import {SCL_EIP6565_UTILS} from "crypto-lib/lib/libSCL_eddsaUtils.sol";
import {WalletLib} from "src/factory/facets/wallet-link/libraries/WalletLib.sol";
import {SolanaUtils} from "src/factory/facets/wallet-link/libraries/SolanaUtils.sol";

// contracts
import {SimpleAccount} from "@eth-infinitism/account-abstraction/samples/SimpleAccount.sol";
import {Nonces} from "@towns-protocol/diamond/src/utils/Nonces.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";

contract WalletLinkTest is IWalletLinkBase, BaseSetup {
    Vm.Wallet internal rootWallet;
    Vm.Wallet internal wallet;
    Vm.Wallet internal smartAccount;

    Vm.Wallet internal secondRootWallet;
    Vm.Wallet internal secondLinkedWallet;

    uint256 private constant MAX_LINKED_WALLETS = 10;
    string private constant SOLANA_WALLET_ADDRESS = "3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we";

    uint256[5] extPubKey;
    uint256[2] signer;

    function setUp() public override {
        super.setUp();

        rootWallet = vm.createWallet("rootKey");
        wallet = vm.createWallet("eoaWallet");
        smartAccount = vm.createWallet("smartAccount");

        secondRootWallet = vm.createWallet("secondRootKey");
        secondLinkedWallet = vm.createWallet("secondLinkedWallet");
    }

    // =============================================================
    //                           Modifiers
    // =============================================================

    /// @notice Modifier that links the caller (EOA wallet) to the root wallet
    // solhint-disable-next-line max-line-length
    /// @dev The root wallet signs its latest nonce and the caller's wallet address, but the EOA is the one calling the function to link
    modifier givenWalletIsLinkedViaCaller() {
        uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

        bytes memory signature = _signWalletLink(rootWallet.privateKey, wallet.addr, nonce);

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

        bytes memory rootSignature = _signWalletLink(rootWallet.privateKey, wallet.addr, rootNonce);

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

    modifier givenSolanaWalletIsLinkedToRootKey(uint256 secretSeed) {
        (extPubKey, signer) = SCL_EIP6565_UTILS.SetKey(secretSeed);

        string memory solanaAddress = SolanaUtils.toBase58String(bytes32(extPubKey[4]));

        string memory consentMessage = LibString.toHexString(rootWallet.addr);
        (uint256 r, uint256 s) = SCL_EIP6565_UTILS.Sign(extPubKey[4], signer, consentMessage);

        WalletLib.Wallet memory solanaWallet = WalletLib.Wallet({
            addr: solanaAddress,
            vmType: WalletLib.VirtualMachineType.SVM
        });

        VMSpecificData[] memory extraData = new VMSpecificData[](1);
        extraData[0] = VMSpecificData({
            key: "extPubKey",
            value: abi.encode(SolanaSpecificData({extPubKey: extPubKey}))
        });

        NonEVMLinkedWallet memory nonEVMWallet = NonEVMLinkedWallet({
            wallet: solanaWallet,
            signature: abi.encodePacked(r, s),
            message: consentMessage,
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
    ) external givenWalletIsLinkedViaCaller givenSolanaWalletIsLinkedToRootKey(secretSeed) {
        string memory solanaAddress = SolanaUtils.toBase58String(bytes32(extPubKey[4]));

        WalletLib.Wallet memory solanaWallet = WalletLib.Wallet({
            addr: solanaAddress,
            vmType: WalletLib.VirtualMachineType.SVM
        });

        bytes32 walletHash = keccak256(abi.encode(solanaWallet));

        assertTrue(walletLink.checkIfNonEVMWalletLinked(rootWallet.addr, walletHash));
    }

    function test_revertWhen_linkNonEVMWalletToRootKeyEmptyAddress() external {
        WalletLib.Wallet memory solanaWallet = WalletLib.Wallet({
            addr: "",
            vmType: WalletLib.VirtualMachineType.SVM
        });

        NonEVMLinkedWallet memory nonEVMWallet = NonEVMLinkedWallet({
            wallet: solanaWallet,
            signature: "",
            message: "",
            extraData: new VMSpecificData[](0)
        });

        vm.prank(wallet.addr);
        vm.expectRevert(WalletLink__InvalidNonEVMAddress.selector);
        walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
    }

    function test_revertWhen_linkNonEVMWalletToRootKeyAddressTooLong() external {
        string
            memory longAddress = "3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4we";

        WalletLib.Wallet memory solanaWallet = WalletLib.Wallet({
            addr: longAddress,
            vmType: WalletLib.VirtualMachineType.SVM
        });

        NonEVMLinkedWallet memory nonEVMWallet = NonEVMLinkedWallet({
            wallet: solanaWallet,
            signature: "",
            message: "",
            extraData: new VMSpecificData[](0)
        });

        vm.prank(wallet.addr);
        vm.expectRevert(WalletLink__InvalidNonEVMAddress.selector);
        walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
    }

    function test_revertWhen_linkNonEVMWalletToRootKeyNotLinked() external {
        WalletLib.Wallet memory solanaWallet = WalletLib.Wallet({
            addr: SOLANA_WALLET_ADDRESS,
            vmType: WalletLib.VirtualMachineType.SVM
        });

        NonEVMLinkedWallet memory nonEVMWallet = NonEVMLinkedWallet({
            wallet: solanaWallet,
            signature: "",
            message: "",
            extraData: new VMSpecificData[](0)
        });

        vm.prank(wallet.addr);
        vm.expectRevert(
            abi.encodeWithSelector(WalletLink__NotLinked.selector, wallet.addr, address(0))
        );
        walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
    }

    function test_revertWhen_linkNonEVMWalletToRootKeyDifferentRootKey(
        uint256 secretSeed
    ) external givenWalletIsLinkedViaCaller {
        // Link a second wallet to a second root key
        uint256 secondNonce = walletLink.getLatestNonceForRootKey(secondRootWallet.addr);
        bytes memory secondSignature = _signWalletLink(
            secondRootWallet.privateKey,
            secondLinkedWallet.addr,
            secondNonce
        );

        vm.prank(secondLinkedWallet.addr);
        walletLink.linkCallerToRootKey(
            LinkedWallet(secondRootWallet.addr, secondSignature, LINKED_WALLET_MESSAGE),
            secondNonce
        );

        // Generate Solana wallet data
        (uint256[5] memory solanaExtPubKey, uint256[2] memory solanaSigner) = SCL_EIP6565_UTILS
            .SetKey(secretSeed);

        string memory solanaAddress = SolanaUtils.toBase58String(bytes32(solanaExtPubKey[4]));

        string memory consentMessage = LibString.toHexString(secondRootWallet.addr);
        (uint256 r, uint256 s) = SCL_EIP6565_UTILS.Sign(
            solanaExtPubKey[4],
            solanaSigner,
            consentMessage
        );

        WalletLib.Wallet memory solanaWallet = WalletLib.Wallet({
            addr: solanaAddress,
            vmType: WalletLib.VirtualMachineType.SVM
        });

        VMSpecificData[] memory extraData = new VMSpecificData[](1);
        extraData[0] = VMSpecificData({
            key: "extPubKey",
            value: abi.encode(SolanaSpecificData({extPubKey: solanaExtPubKey}))
        });

        NonEVMLinkedWallet memory nonEVMWallet = NonEVMLinkedWallet({
            wallet: solanaWallet,
            signature: abi.encodePacked(r, s),
            message: consentMessage,
            extraData: extraData
        });

        // First link the Solana wallet to the second root key
        uint256 linkNonce = walletLink.getLatestNonceForRootKey(secondRootWallet.addr);

        vm.prank(secondLinkedWallet.addr);
        walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, linkNonce);

        // Now try to link the same Solana wallet to the first root key
        // This should fail with WalletLink__RootKeyMismatch
        uint256 firstRootKeyNonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

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
    ) external givenWalletIsLinkedViaCaller givenSolanaWalletIsLinkedToRootKey(secretSeed) {
        uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
        NonEVMLinkedWallet memory nonEVMWallet = _createNonEVMWallet(secretSeed, rootWallet.addr);

        vm.prank(wallet.addr);
        vm.expectRevert(
            abi.encodeWithSelector(
                WalletLink__NonEVMWalletAlreadyLinked.selector,
                nonEVMWallet.wallet.addr,
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
        NonEVMLinkedWallet memory nonEVMWallet;

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
        NonEVMLinkedWallet memory nonEVMWallet = _createNonEVMWallet(
            _randomUint256(),
            rootWallet.addr
        );

        uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

        nonEVMWallet.wallet.vmType = WalletLib.VirtualMachineType.UNKNOWN;

        vm.prank(wallet.addr);
        vm.expectRevert(WalletLink__UnsupportedVMType.selector);
        walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, nonce);
    }

    function test_revertWhen_linkNonEVMWalletToRootKeyInvalidSolanaAddress()
        external
        givenWalletIsLinkedViaCaller
    {
        NonEVMLinkedWallet memory nonEVMWallet = _createNonEVMWallet(
            _randomUint256(),
            rootWallet.addr
        );

        nonEVMWallet.wallet.addr = "3p5wau6jqBV8sQswjN1HEeSZLjv5TB173zBgupGQD4weinvalid";

        vm.prank(wallet.addr);
        vm.expectRevert(WalletLink__InvalidNonEVMAddress.selector);
        walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
    }

    function test_revertWhen_linkNonEVMWalletToRootKeyInvalidMismatchedSolanaAddress()
        external
        givenWalletIsLinkedViaCaller
    {
        NonEVMLinkedWallet memory nonEVMWallet = _createNonEVMWallet(
            _randomUint256(),
            rootWallet.addr
        );

        nonEVMWallet.wallet.addr = SOLANA_WALLET_ADDRESS;

        vm.prank(wallet.addr);
        vm.expectRevert(WalletLink__AddressMismatch.selector);
        walletLink.linkNonEVMWalletToRootKey(nonEVMWallet, 0);
    }

    function test_revertWhen_linkNonEVMWalletToRootKeyInvalidSignature()
        external
        givenWalletIsLinkedViaCaller
    {
        (uint256[5] memory secondExtPubKey, uint256[2] memory solanaSigner) = SCL_EIP6565_UTILS
            .SetKey(_randomUint256());
        string memory consentMessage = LibString.toHexString(rootWallet.addr);
        (uint256 r, uint256 s) = SCL_EIP6565_UTILS.Sign(
            secondExtPubKey[4],
            solanaSigner,
            consentMessage
        );

        NonEVMLinkedWallet memory nonEVMWallet = _createNonEVMWallet(
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

        bytes memory signature = _signWalletLink(rootWallet.privateKey, wallet.addr, nonce);

        vm.prank(wallet.addr);
        vm.expectRevert(WalletLink__InvalidAddress.selector);
        walletLink.linkCallerToRootKey(
            LinkedWallet(address(0), signature, LINKED_WALLET_MESSAGE),
            nonce
        );
    }

    function test_revertWhen_linkCallerToRootKeyLinkToSelf() external givenWalletIsLinkedViaCaller {
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

        bytes memory signature = _signWalletLink(rootWallet.privateKey, wallet.addr, nonce);

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
        walletLink.linkCallerToRootKey(LinkedWallet(wallet.addr, "", LINKED_WALLET_MESSAGE), nonce);
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

    function test_revertWhen_linkCallerToRootKeyMaxLinkedWalletsReached() external {
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

        bytes memory signature = _signWalletLink(wallet.privateKey, wallet.addr, nonce);

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

        bytes memory signature = _signWalletLink(rootWallet.privateKey, anotherWallet, nonce);

        vm.prank(anotherWallet);
        vm.expectRevert(
            abi.encodeWithSelector(Nonces.InvalidAccountNonce.selector, rootWallet.addr, 1)
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

        bytes memory signature = _signWalletLink(rootWallet.privateKey, wrongWallet, nonce);

        vm.prank(smartAccount.addr);
        vm.expectRevert(WalletLink__InvalidSignature.selector);
        walletLink.linkWalletToRootKey(
            LinkedWallet(wallet.addr, "", LINKED_WALLET_MESSAGE),
            LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
            nonce
        );
    }

    function test_revertWhen_linkWalletToRootKeyInvalidWalletSignature() external {
        address wrongWallet = vm.createWallet("wallet2").addr;

        uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);

        bytes memory rootSignature = _signWalletLink(rootWallet.privateKey, wallet.addr, nonce);

        bytes memory walletSignature = _signWalletLink(wallet.privateKey, wrongWallet, nonce);

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
            abi.encodeWithSelector(WalletLink__NotLinked.selector, anotherWallet, address(0))
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
            abi.encodeWithSelector(WalletLink__NotLinked.selector, randomAddress, rootWallet.addr)
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

        bytes memory signature = _signWalletLink(rootWallet.privateKey, wallet.addr, nonce);

        vm.startPrank(smartAccount.addr);
        vm.expectEmit(address(walletLink));
        emit RemoveLink(wallet.addr, smartAccount.addr);
        walletLink.removeLink({
            wallet: wallet.addr,
            rootWallet: LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
            nonce: nonce
        });
        vm.stopPrank();

        assertFalse(walletLink.checkIfLinked(rootWallet.addr, wallet.addr));
    }

    function test_revertWhen_removeLinkInvalidAddress() external {
        uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
        bytes memory signature = _signWalletLink(rootWallet.privateKey, wallet.addr, nonce);

        vm.prank(smartAccount.addr);
        vm.expectRevert(WalletLink__InvalidAddress.selector);
        walletLink.removeLink({
            wallet: address(0),
            rootWallet: LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
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
        bytes memory signature = _signWalletLink(rootWallet.privateKey, wallet.addr, nonce);

        vm.prank(smartAccount.addr);
        vm.expectRevert(WalletLink__CannotRemoveRootWallet.selector);
        walletLink.removeLink({
            wallet: rootWallet.addr,
            rootWallet: LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
            nonce: nonce
        });
    }

    function test_revertWhen_removeLinkWalletLink__NotLinked() external {
        uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr);
        bytes memory signature = _signWalletLink(rootWallet.privateKey, wallet.addr, nonce);

        vm.prank(smartAccount.addr);
        vm.expectRevert(
            abi.encodeWithSelector(WalletLink__NotLinked.selector, wallet.addr, rootWallet.addr)
        );
        walletLink.removeLink({
            wallet: wallet.addr,
            rootWallet: LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
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
            rootWallet: LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
            nonce: nonce
        });
    }

    function test_revertWhen_removeLinkInvalidAccountNonce() external givenWalletIsLinkedViaCaller {
        uint256 nonce = walletLink.getLatestNonceForRootKey(rootWallet.addr) + 1;
        bytes memory signature = _signWalletLink(rootWallet.privateKey, wallet.addr, nonce);

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
            rootWallet: LinkedWallet(rootWallet.addr, signature, LINKED_WALLET_MESSAGE),
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
            abi.encodeWithSelector(WalletLink__NotLinked.selector, wallet.addr, address(0))
        );
        walletLink.removeCallerLink();
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          Metadata                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_getWalletsByRootKeyWithMetadata() external givenWalletIsLinkedViaCaller {
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

        WalletLib.Wallet[] memory wallets = walletLink.getAllWalletsByRootKey(rootWallet.addr);
        uint256 walletLen = wallets.length;

        address[] memory walletAddresses = new address[](walletLen);
        for (uint256 i; i < walletLen; ++i) {
            walletAddresses[i] = vm.parseAddress(wallets[i].addr);
        }

        assertContains(walletAddresses, address(simpleAccount));
        assertContains(walletAddresses, wallet.addr);
    }

    function _createNonEVMWallet(
        uint256 secretSeed,
        address rootKey
    ) internal view returns (NonEVMLinkedWallet memory) {
        (uint256[5] memory solanaExtPubKey, uint256[2] memory solanaSigner) = SCL_EIP6565_UTILS
            .SetKey(secretSeed);

        string memory solanaAddress = SolanaUtils.toBase58String(bytes32(solanaExtPubKey[4]));

        string memory consentMessage = LibString.toHexString(rootKey);
        (uint256 r, uint256 s) = SCL_EIP6565_UTILS.Sign(
            solanaExtPubKey[4],
            solanaSigner,
            consentMessage
        );

        WalletLib.Wallet memory solanaWallet = WalletLib.Wallet({
            addr: solanaAddress,
            vmType: WalletLib.VirtualMachineType.SVM
        });

        VMSpecificData[] memory extraData = new VMSpecificData[](1);
        extraData[0] = VMSpecificData({
            key: "extPubKey",
            value: abi.encode(SolanaSpecificData({extPubKey: solanaExtPubKey}))
        });

        NonEVMLinkedWallet memory nonEVMWallet = NonEVMLinkedWallet({
            wallet: solanaWallet,
            signature: abi.encodePacked(r, s),
            message: consentMessage,
            extraData: extraData
        });

        return nonEVMWallet;
    }
}
