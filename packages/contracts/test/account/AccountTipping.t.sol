// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ITipping, ITippingBase} from "src/spaces/facets/tipping/ITipping.sol";

// libraries
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {ERC6900Setup} from "./ERC6900Setup.sol";
import {DeployAccountModules} from "scripts/deployments/diamonds/DeployAccountModules.s.sol";
import {DeployMockERC20, MockERC20} from "scripts/deployments/utils/DeployMockERC20.s.sol";
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";

contract AccountTippingTest is ERC6900Setup, ITippingBase {
    DeployAccountModules internal deployAccountModules;
    DeployMockERC20 internal deployERC20 = new DeployMockERC20();

    ITipping internal tipping;
    MockERC20 internal mockERC20;

    function setUp() public override {
        super.setUp();

        deployAccountModules = new DeployAccountModules();
        deployAccountModules.setDependencies(spaceFactory, appRegistry);
        address mod = deployAccountModules.deploy(deployer);

        tipping = ITipping(mod);
        mockERC20 = MockERC20(deployERC20.deploy(deployer));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SEND TIP TESTS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_sendTip_native(address user, address receiver, uint96 amount) external {
        vm.assume(user != receiver);
        vm.assume(receiver != address(0));
        vm.assume(amount > 0);
        // Exclude precompiles and known contract addresses that can't receive ETH
        vm.assume(uint160(receiver) > 10);
        assumePayable(receiver);

        ModularAccount account = _createAccount(user, amount);

        AnyTipParams memory params = AnyTipParams({
            currency: CurrencyTransfer.NATIVE_TOKEN,
            sender: address(account),
            receiver: receiver,
            amount: amount,
            data: ""
        });

        uint256 receiverBalanceBefore = receiver.balance;

        vm.prank(address(account));
        vm.expectEmit(address(tipping));
        emit TipSent(
            address(account),
            receiver,
            TipRecipientType.Any,
            CurrencyTransfer.NATIVE_TOKEN,
            amount,
            ""
        );
        tipping.sendTip{value: amount}(TipRecipientType.Any, abi.encode(params));

        assertEq(receiver.balance, receiverBalanceBefore + amount);
        assertEq(tipping.tipsByWalletAndCurrency(receiver, CurrencyTransfer.NATIVE_TOKEN), amount);
        assertEq(tipping.tipCountByWalletAndCurrency(receiver, CurrencyTransfer.NATIVE_TOKEN), 1);
        assertEq(tipping.totalTipsByCurrency(CurrencyTransfer.NATIVE_TOKEN), 1);
        assertEq(tipping.tipAmountByCurrency(CurrencyTransfer.NATIVE_TOKEN), amount);
    }

    function test_sendTip_erc20(address user, address receiver, uint96 amount) external {
        vm.assume(user != receiver);
        vm.assume(receiver != address(0));
        vm.assume(amount > 0);

        ModularAccount account = _createAccount(user);

        // Mint and approve tokens
        mockERC20.mint(address(account), amount);
        vm.prank(address(account));
        mockERC20.approve(address(tipping), amount);

        AnyTipParams memory params = AnyTipParams({
            currency: address(mockERC20),
            sender: address(account),
            receiver: receiver,
            amount: amount,
            data: ""
        });

        uint256 receiverBalanceBefore = mockERC20.balanceOf(receiver);

        vm.prank(address(account));
        vm.expectEmit(address(tipping));
        emit TipSent(
            address(account),
            receiver,
            TipRecipientType.Any,
            address(mockERC20),
            amount,
            ""
        );
        tipping.sendTip(TipRecipientType.Any, abi.encode(params));

        assertEq(mockERC20.balanceOf(receiver), receiverBalanceBefore + amount);
        assertEq(tipping.tipsByWalletAndCurrency(receiver, address(mockERC20)), amount);
        assertEq(tipping.tipCountByWalletAndCurrency(receiver, address(mockERC20)), 1);
        assertEq(tipping.totalTipsByCurrency(address(mockERC20)), 1);
        assertEq(tipping.tipAmountByCurrency(address(mockERC20)), amount);
    }

    function test_sendTip_revertWhen_AmountIsZero(address user, address receiver) external {
        vm.assume(user != receiver);
        vm.assume(receiver != address(0));

        ModularAccount account = _createAccount(user);

        AnyTipParams memory params = AnyTipParams({
            currency: CurrencyTransfer.NATIVE_TOKEN,
            sender: address(account),
            receiver: receiver,
            amount: 0,
            data: ""
        });

        vm.prank(address(account));
        vm.expectRevert(AmountIsZero.selector);
        tipping.sendTip(TipRecipientType.Any, abi.encode(params));
    }

    function test_sendTip_revertWhen_CurrencyIsZero(
        address user,
        address receiver,
        uint96 amount
    ) external {
        vm.assume(user != receiver);
        vm.assume(receiver != address(0));
        vm.assume(amount > 0);

        ModularAccount account = _createAccount(user, amount);

        AnyTipParams memory params = AnyTipParams({
            currency: address(0),
            sender: address(account),
            receiver: receiver,
            amount: amount,
            data: ""
        });

        vm.prank(address(account));
        vm.expectRevert(CurrencyIsZero.selector);
        tipping.sendTip{value: amount}(TipRecipientType.Any, abi.encode(params));
    }

    function test_sendTip_revertWhen_SenderIsReceiver(address user, uint96 amount) external {
        vm.assume(amount > 0);

        ModularAccount account = _createAccount(user, amount);

        AnyTipParams memory params = AnyTipParams({
            currency: CurrencyTransfer.NATIVE_TOKEN,
            sender: address(account),
            receiver: address(account),
            amount: amount,
            data: ""
        });

        vm.prank(address(account));
        vm.expectRevert(CannotTipSelf.selector);
        tipping.sendTip{value: amount}(TipRecipientType.Any, abi.encode(params));
    }

    function test_sendTip_revertWhen_NotSenderOfTip(
        address user,
        address receiver,
        uint96 amount
    ) external {
        vm.assume(user != receiver);
        vm.assume(receiver != address(0));
        vm.assume(amount > 0);

        ModularAccount account = _createAccount(user, amount);

        // Sender in params doesn't match msg.sender
        AnyTipParams memory params = AnyTipParams({
            currency: CurrencyTransfer.NATIVE_TOKEN,
            sender: receiver, // Wrong sender
            receiver: address(account),
            amount: amount,
            data: ""
        });

        vm.prank(address(account));
        vm.expectRevert(NotSenderOfTip.selector);
        tipping.sendTip{value: amount}(TipRecipientType.Any, abi.encode(params));
    }

    function test_sendTip_revertWhen_InvalidRecipientType(
        address user,
        address receiver,
        uint96 amount
    ) external {
        vm.assume(user != receiver);
        vm.assume(receiver != address(0));
        vm.assume(amount > 0);

        ModularAccount account = _createAccount(user, amount);

        MembershipTipParams memory params = MembershipTipParams({
            receiver: receiver,
            tokenId: 1,
            currency: CurrencyTransfer.NATIVE_TOKEN,
            amount: amount,
            metadata: TipMetadata({messageId: bytes32(0), channelId: bytes32(0), data: ""})
        });

        vm.prank(address(account));
        vm.expectRevert(InvalidRecipientType.selector);
        tipping.sendTip{value: amount}(TipRecipientType.Member, abi.encode(params));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    DEPRECATED TESTS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_tip_revertWhen_Deprecated() external {
        TipRequest memory request = TipRequest({
            receiver: address(1),
            tokenId: 1,
            currency: CurrencyTransfer.NATIVE_TOKEN,
            amount: 1 ether,
            messageId: bytes32(0),
            channelId: bytes32(0)
        });

        vm.expectRevert(Deprecated.selector);
        tipping.tip(request);
    }

    function test_tipsByCurrencyAndTokenId_revertWhen_Deprecated() external {
        vm.expectRevert(Deprecated.selector);
        tipping.tipsByCurrencyAndTokenId(1, CurrencyTransfer.NATIVE_TOKEN);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    VIEW FUNCTION TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_tipsByWalletAndCurrency_returnsZero_whenNoTips(
        address wallet,
        address currency
    ) external view {
        assertEq(tipping.tipsByWalletAndCurrency(wallet, currency), 0);
    }

    function test_tipCountByWalletAndCurrency_returnsZero_whenNoTips(
        address wallet,
        address currency
    ) external view {
        assertEq(tipping.tipCountByWalletAndCurrency(wallet, currency), 0);
    }

    function test_tippingCurrencies_returnsEmpty_whenNoTips() external view {
        address[] memory currencies = tipping.tippingCurrencies();
        assertEq(currencies.length, 0);
    }

    function test_tippingCurrencies_tracksCurrencies(
        address user,
        address receiver,
        uint96 amount
    ) external {
        vm.assume(user != receiver);
        vm.assume(receiver != address(0));
        vm.assume(amount > 0);
        // Exclude precompiles and known contract addresses that can't receive ETH
        vm.assume(uint160(receiver) > 10);
        assumePayable(receiver);

        ModularAccount account = _createAccount(user, amount);

        AnyTipParams memory params = AnyTipParams({
            currency: CurrencyTransfer.NATIVE_TOKEN,
            sender: address(account),
            receiver: receiver,
            amount: amount,
            data: ""
        });

        vm.prank(address(account));
        tipping.sendTip{value: amount}(TipRecipientType.Any, abi.encode(params));

        address[] memory currencies = tipping.tippingCurrencies();
        assertEq(currencies.length, 1);
        assertEq(currencies[0], CurrencyTransfer.NATIVE_TOKEN);
    }

    function test_totalTipsByCurrency_returnsZero_whenNoTips(address currency) external view {
        assertEq(tipping.totalTipsByCurrency(currency), 0);
    }

    function test_tipAmountByCurrency_returnsZero_whenNoTips(address currency) external view {
        assertEq(tipping.tipAmountByCurrency(currency), 0);
    }
}
