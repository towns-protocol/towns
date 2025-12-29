// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// test base
import {TippingFeeIntegrationBaseTest} from "./TippingFeeIntegrationBase.t.sol";

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFeeManagerBase} from "src/factory/facets/fee/IFeeManager.sol";

// libraries
import {FeeTypesLib} from "src/factory/facets/fee/FeeTypesLib.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

/// @title TippingFeeIntegrationTest
/// @notice Integration tests for tipping with FeeManager
contract TippingFeeIntegrationTest is TippingFeeIntegrationBaseTest, IFeeManagerBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    MEMBER TIPS WITH FEES                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_sendMemberTip_chargesFee() external {
        uint256 receiverBalanceBefore = tipReceiver.balance;
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;
        uint256 pointsBefore = IERC20(riverAirdrop).balanceOf(tipper);

        _sendMemberTip(tipper, tipReceiver, TIP_AMOUNT);

        assertEq(tipper.balance, 0); // Paid full tip amount
        assertEq(tipReceiver.balance, receiverBalanceBefore + (TIP_AMOUNT - EXPECTED_FEE)); // Received tip minus fee
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore + EXPECTED_FEE); // Received fee
        assertGt(IERC20(riverAirdrop).balanceOf(tipper), pointsBefore); // Points minted for ETH tips
    }

    function test_sendMemberTip_updatesStats() external {
        _sendMemberTip(tipper, tipReceiver, TIP_AMOUNT);

        uint256 tipsByWallet = tipping.tipsByWalletAndCurrency(
            tipReceiver,
            CurrencyTransfer.NATIVE_TOKEN
        );
        uint256 tipCount = tipping.tipCountByWalletAndCurrency(
            tipReceiver,
            CurrencyTransfer.NATIVE_TOKEN
        );

        assertEq(tipsByWallet, TIP_AMOUNT - EXPECTED_FEE); // Stats track actual received amount
        assertEq(tipCount, 1);
    }

    function test_sendMemberTip_emitsEvents() external {
        // Expect FeeCharged from feeManager
        vm.expectEmit(address(feeManager));
        emit FeeCharged(
            FeeTypesLib.TIP_MEMBER,
            tipper,
            CurrencyTransfer.NATIVE_TOKEN,
            EXPECTED_FEE,
            feeRecipient
        );

        _sendMemberTip(tipper, tipReceiver, TIP_AMOUNT);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    LEGACY TIP FUNCTION                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_legacyTip_chargesFee() external {
        uint256 receiverBalanceBefore = tipReceiver.balance;
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;
        uint256 pointsBefore = IERC20(riverAirdrop).balanceOf(tipper);

        _sendLegacyTip(tipper, tipReceiver, TIP_AMOUNT);

        assertEq(tipper.balance, 0);
        assertEq(tipReceiver.balance, receiverBalanceBefore + (TIP_AMOUNT - EXPECTED_FEE));
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore + EXPECTED_FEE);
        assertGt(IERC20(riverAirdrop).balanceOf(tipper), pointsBefore); // Points minted for ETH tips
    }

    function test_legacyTip_updatesStats() external {
        _sendLegacyTip(tipper, tipReceiver, TIP_AMOUNT);

        uint256 tipsByWallet = tipping.tipsByWalletAndCurrency(
            tipReceiver,
            CurrencyTransfer.NATIVE_TOKEN
        );
        assertEq(tipsByWallet, TIP_AMOUNT - EXPECTED_FEE);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    BOT TIPS (NO FEES)                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_sendBotTip_noFeeCharged() external {
        uint256 receiverBalanceBefore = tipReceiver.balance;
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;

        _sendBotTip(tipper, tipReceiver, TIP_AMOUNT);

        assertEq(tipper.balance, 0);
        assertEq(tipReceiver.balance, receiverBalanceBefore + TIP_AMOUNT); // Full amount
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore); // No fee charged
    }

    function test_sendBotTip_updatesStats() external {
        _sendBotTip(tipper, tipReceiver, TIP_AMOUNT);

        uint256 tipsByWallet = tipping.tipsByWalletAndCurrency(
            tipReceiver,
            CurrencyTransfer.NATIVE_TOKEN
        );
        assertEq(tipsByWallet, TIP_AMOUNT);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  STAKING EXEMPTION HOOK                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_sendMemberTip_withStakingExemption() external givenStakingHookConfigured {
        address hook = feeManager.getFeeHook(FeeTypesLib.TIP_MEMBER);
        assertEq(hook, address(stakingHook));
        assertEq(
            stakingHook.getExemptionThreshold(FeeTypesLib.TIP_MEMBER),
            STAKING_EXEMPTION_THRESHOLD
        );
    }

    function test_sendMemberTip_withStakingExemption_belowThreshold()
        external
        givenStakingHookConfigured
    {
        // User with no stake should still pay fees
        uint256 receiverBalanceBefore = tipReceiver.balance;
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;

        _sendMemberTip(tipper, tipReceiver, TIP_AMOUNT);

        assertEq(tipReceiver.balance, receiverBalanceBefore + (TIP_AMOUNT - EXPECTED_FEE));
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore + EXPECTED_FEE);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      MULTIPLE TIPS                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_sendMemberTip_multipleTips() external {
        _sendMemberTip(tipper, tipReceiver, TIP_AMOUNT);

        address tipper2 = _randomAddress();
        _sendMemberTip(tipper2, tipReceiver, TIP_AMOUNT * 2);

        uint256 tipsByWallet = tipping.tipsByWalletAndCurrency(
            tipReceiver,
            CurrencyTransfer.NATIVE_TOKEN
        );
        uint256 tipCount = tipping.tipCountByWalletAndCurrency(
            tipReceiver,
            CurrencyTransfer.NATIVE_TOKEN
        );

        uint256 fee1 = feeManager.calculateFee(FeeTypesLib.TIP_MEMBER, tipper, TIP_AMOUNT, "");
        uint256 fee2 = feeManager.calculateFee(FeeTypesLib.TIP_MEMBER, tipper2, TIP_AMOUNT * 2, "");
        assertEq(tipsByWallet, (TIP_AMOUNT - fee1) + (TIP_AMOUNT * 2 - fee2));
        assertEq(tipCount, 2);
    }

    function test_sendMemberTip_differentReceivers() external {
        _sendMemberTip(tipper, tipReceiver, TIP_AMOUNT);

        address receiver2 = _randomAddress();
        _sendMemberTip(tipper, receiver2, TIP_AMOUNT);

        uint256 tipsByWallet1 = tipping.tipsByWalletAndCurrency(
            tipReceiver,
            CurrencyTransfer.NATIVE_TOKEN
        );
        uint256 tipsByWallet2 = tipping.tipsByWalletAndCurrency(
            receiver2,
            CurrencyTransfer.NATIVE_TOKEN
        );

        assertEq(tipsByWallet1, TIP_AMOUNT - EXPECTED_FEE);
        assertEq(tipsByWallet2, TIP_AMOUNT - EXPECTED_FEE);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    FEE CALCULATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_calculateFee_beforeTipping() external view {
        uint256 fee = feeManager.calculateFee(FeeTypesLib.TIP_MEMBER, tipper, TIP_AMOUNT, "");
        assertEq(fee, EXPECTED_FEE);
    }

    function test_calculateFee_differentAmounts() external view {
        uint256 fee1 = feeManager.calculateFee(FeeTypesLib.TIP_MEMBER, tipper, 0.1 ether, "");
        uint256 fee2 = feeManager.calculateFee(FeeTypesLib.TIP_MEMBER, tipper, 10 ether, "");

        assertEq(fee1, 0.0005 ether); // 0.5% of 0.1 ether
        assertEq(fee2, 0.05 ether); // 0.5% of 10 ether
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  ERC20 TIPS WITH FEES                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_sendMemberTipERC20_chargesFee() external {
        uint256 receiverBalanceBefore = mockUSDC.balanceOf(tipReceiver);
        uint256 feeRecipientBalanceBefore = mockUSDC.balanceOf(feeRecipient);
        uint256 pointsBefore = IERC20(riverAirdrop).balanceOf(tipper);

        _sendMemberTipERC20(tipper, tipReceiver, ERC20_TIP_AMOUNT);

        assertEq(mockUSDC.balanceOf(tipper), 0); // Paid full tip amount
        assertEq(
            mockUSDC.balanceOf(tipReceiver),
            receiverBalanceBefore + (ERC20_TIP_AMOUNT - ERC20_EXPECTED_FEE)
        ); // Received tip minus fee
        assertEq(mockUSDC.balanceOf(feeRecipient), feeRecipientBalanceBefore + ERC20_EXPECTED_FEE); // Received fee
        assertEq(IERC20(riverAirdrop).balanceOf(tipper), pointsBefore); // No points for ERC20 tips
    }

    function test_sendMemberTipERC20_updatesStats() external {
        _sendMemberTipERC20(tipper, tipReceiver, ERC20_TIP_AMOUNT);

        uint256 tipsByWallet = tipping.tipsByWalletAndCurrency(tipReceiver, address(mockUSDC));
        uint256 tipCount = tipping.tipCountByWalletAndCurrency(tipReceiver, address(mockUSDC));

        assertEq(tipsByWallet, ERC20_TIP_AMOUNT - ERC20_EXPECTED_FEE); // Stats track actual received amount
        assertEq(tipCount, 1);
    }

    function test_sendMemberTipERC20_multipleTips() external {
        _sendMemberTipERC20(tipper, tipReceiver, ERC20_TIP_AMOUNT);

        address tipper2 = _randomAddress();
        _sendMemberTipERC20(tipper2, tipReceiver, ERC20_TIP_AMOUNT * 2);

        uint256 tipsByWallet = tipping.tipsByWalletAndCurrency(tipReceiver, address(mockUSDC));
        uint256 tipCount = tipping.tipCountByWalletAndCurrency(tipReceiver, address(mockUSDC));

        uint256 fee1 = feeManager.calculateFee(
            FeeTypesLib.TIP_MEMBER,
            tipper,
            ERC20_TIP_AMOUNT,
            ""
        );
        uint256 fee2 = feeManager.calculateFee(
            FeeTypesLib.TIP_MEMBER,
            tipper2,
            ERC20_TIP_AMOUNT * 2,
            ""
        );
        assertEq(tipsByWallet, (ERC20_TIP_AMOUNT - fee1) + (ERC20_TIP_AMOUNT * 2 - fee2));
        assertEq(tipCount, 2);
    }

    function test_sendMemberTipERC20_differentReceivers() external {
        _sendMemberTipERC20(tipper, tipReceiver, ERC20_TIP_AMOUNT);

        address receiver2 = _randomAddress();
        _sendMemberTipERC20(tipper, receiver2, ERC20_TIP_AMOUNT);

        uint256 tipsByWallet1 = tipping.tipsByWalletAndCurrency(tipReceiver, address(mockUSDC));
        uint256 tipsByWallet2 = tipping.tipsByWalletAndCurrency(receiver2, address(mockUSDC));

        assertEq(tipsByWallet1, ERC20_TIP_AMOUNT - ERC20_EXPECTED_FEE);
        assertEq(tipsByWallet2, ERC20_TIP_AMOUNT - ERC20_EXPECTED_FEE);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*               LEGACY ERC20 TIP FUNCTION                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_legacyTipERC20_chargesFee() external {
        uint256 receiverBalanceBefore = mockUSDC.balanceOf(tipReceiver);
        uint256 feeRecipientBalanceBefore = mockUSDC.balanceOf(feeRecipient);
        uint256 pointsBefore = IERC20(riverAirdrop).balanceOf(tipper);

        _sendLegacyTipERC20(tipper, tipReceiver, ERC20_TIP_AMOUNT);

        assertEq(mockUSDC.balanceOf(tipper), 0);
        assertEq(
            mockUSDC.balanceOf(tipReceiver),
            receiverBalanceBefore + (ERC20_TIP_AMOUNT - ERC20_EXPECTED_FEE)
        );
        assertEq(mockUSDC.balanceOf(feeRecipient), feeRecipientBalanceBefore + ERC20_EXPECTED_FEE);
        assertEq(IERC20(riverAirdrop).balanceOf(tipper), pointsBefore); // No points for ERC20 tips
    }

    function test_legacyTipERC20_updatesStats() external {
        _sendLegacyTipERC20(tipper, tipReceiver, ERC20_TIP_AMOUNT);

        uint256 tipsByWallet = tipping.tipsByWalletAndCurrency(tipReceiver, address(mockUSDC));
        assertEq(tipsByWallet, ERC20_TIP_AMOUNT - ERC20_EXPECTED_FEE);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                ERC20 BOT TIPS (NO FEES)                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_sendBotTipERC20_noFeeCharged() external {
        uint256 receiverBalanceBefore = mockUSDC.balanceOf(tipReceiver);
        uint256 feeRecipientBalanceBefore = mockUSDC.balanceOf(feeRecipient);

        _sendBotTipERC20(tipper, tipReceiver, ERC20_TIP_AMOUNT);

        assertEq(mockUSDC.balanceOf(tipper), 0);
        assertEq(mockUSDC.balanceOf(tipReceiver), receiverBalanceBefore + ERC20_TIP_AMOUNT); // Full amount
        assertEq(mockUSDC.balanceOf(feeRecipient), feeRecipientBalanceBefore); // No fee charged
    }

    function test_sendBotTipERC20_updatesStats() external {
        _sendBotTipERC20(tipper, tipReceiver, ERC20_TIP_AMOUNT);

        uint256 tipsByWallet = tipping.tipsByWalletAndCurrency(tipReceiver, address(mockUSDC));
        assertEq(tipsByWallet, ERC20_TIP_AMOUNT);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  MIXED CURRENCY TIPPING                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_sendMixedCurrencyTips_trackedSeparately() external {
        // Send ETH tip
        _sendMemberTip(tipper, tipReceiver, TIP_AMOUNT);
        uint256 pointsAfterETHTip = IERC20(riverAirdrop).balanceOf(tipper);

        // Send USDC tip
        _sendMemberTipERC20(tipper, tipReceiver, ERC20_TIP_AMOUNT);
        uint256 pointsAfterERC20Tip = IERC20(riverAirdrop).balanceOf(tipper);

        // Verify separate tracking
        uint256 ethTips = tipping.tipsByWalletAndCurrency(
            tipReceiver,
            CurrencyTransfer.NATIVE_TOKEN
        );
        uint256 usdcTips = tipping.tipsByWalletAndCurrency(tipReceiver, address(mockUSDC));

        assertEq(ethTips, TIP_AMOUNT - EXPECTED_FEE);
        assertEq(usdcTips, ERC20_TIP_AMOUNT - ERC20_EXPECTED_FEE);

        // Only ETH tip mints points
        assertGt(pointsAfterETHTip, 0);
        assertEq(pointsAfterERC20Tip, pointsAfterETHTip);
    }

    function test_sendMixedCurrencyTips_feeRecipientReceivesBoth() external {
        uint256 ethFeeRecipientBefore = feeRecipient.balance;
        uint256 usdcFeeRecipientBefore = mockUSDC.balanceOf(feeRecipient);

        // Send ETH tip
        _sendMemberTip(tipper, tipReceiver, TIP_AMOUNT);

        // Send USDC tip
        address tipper2 = _randomAddress();
        _sendMemberTipERC20(tipper2, tipReceiver, ERC20_TIP_AMOUNT);

        // Verify fee recipient received fees in both currencies
        assertEq(feeRecipient.balance, ethFeeRecipientBefore + EXPECTED_FEE);
        assertEq(mockUSDC.balanceOf(feeRecipient), usdcFeeRecipientBefore + ERC20_EXPECTED_FEE);
    }
}
