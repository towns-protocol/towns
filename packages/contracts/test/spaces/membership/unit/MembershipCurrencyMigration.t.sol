// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {MembershipBaseSetup} from "../MembershipBaseSetup.sol";

//interfaces
import {ITreasury} from "src/spaces/facets/treasury/ITreasury.sol";

//libraries
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";

contract MembershipCurrencyMigrationTest is MembershipBaseSetup {
    /// @notice Test migrating a space from ETH to USDC payments
    /// @dev Alice joins with ETH, then currency is migrated to USDC, then charlie joins with USDC
    function test_migrateCurrencyFromEthToUsdc()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
    {
        // Alice joined with ETH
        assertEq(membershipToken.balanceOf(alice), 1);
        assertEq(address(membership).balance, MEMBERSHIP_PRICE);
        assertEq(membership.getMembershipCurrency(), CurrencyTransfer.NATIVE_TOKEN);

        // Migrate currency from ETH to USDC
        vm.prank(founder);
        membership.setMembershipCurrency(address(mockUSDC));
        assertEq(membership.getMembershipCurrency(), address(mockUSDC));

        // Set a USDC price ($15 USDC, 6 decimals)
        uint256 usdcPrice = 15_000_000;
        vm.prank(founder);
        membership.setMembershipPrice(usdcPrice);

        // Charlie joins with USDC
        uint256 totalUsdcPrice = membership.getMembershipPrice();
        mockUSDC.mint(charlie, totalUsdcPrice);
        vm.prank(charlie);
        mockUSDC.approve(address(membership), totalUsdcPrice);
        vm.prank(charlie);
        membership.joinSpace(JoinType.Basic, abi.encode(charlie));
        assertEq(membershipToken.balanceOf(charlie), 1);

        // Verify space holds both currencies
        assertEq(address(membership).balance, MEMBERSHIP_PRICE, "ETH balance should remain");
        assertEq(
            mockUSDC.balanceOf(address(membership)),
            usdcPrice,
            "USDC balance should be price"
        );

        // Withdraw both currencies
        address recipient = makeAddr("recipient");

        vm.prank(founder);
        treasury.withdraw(CurrencyTransfer.NATIVE_TOKEN, recipient);
        assertEq(recipient.balance, MEMBERSHIP_PRICE, "Should withdraw ETH from old members");

        vm.prank(founder);
        treasury.withdraw(address(mockUSDC), recipient);
        assertEq(mockUSDC.balanceOf(recipient), usdcPrice, "Should withdraw USDC from new members");
    }

    /// @notice Test that after migration, ETH payments are rejected
    function test_migrateCurrencyFromEthToUsdc_rejectsEth()
        external
        givenMembershipHasPrice
        givenAliceHasPaidMembership
    {
        // Migrate currency from ETH to USDC
        vm.prank(founder);
        membership.setMembershipCurrency(address(mockUSDC));

        // Set a USDC price
        vm.prank(founder);
        membership.setMembershipPrice(15_000_000);

        // Charlie tries to join with ETH (should revert)
        uint256 totalPrice = membership.getMembershipPrice();
        vm.deal(charlie, totalPrice);
        vm.prank(charlie);
        vm.expectRevert(Membership__UnexpectedValue.selector);
        membership.joinSpace{value: totalPrice}(charlie);
    }

    /// @notice Test migrating from USDC back to ETH
    function test_migrateCurrencyFromUsdcToEth() external {
        // usdcMembership starts as USDC space
        assertEq(usdcMembership.getMembershipCurrency(), address(mockUSDC));

        // Set price and alice joins with USDC
        uint256 usdcPrice = 10_000_000;
        vm.prank(founder);
        usdcMembership.setMembershipPrice(usdcPrice);

        uint256 totalUsdcPrice = usdcMembership.getMembershipPrice();
        mockUSDC.mint(alice, totalUsdcPrice);
        vm.prank(alice);
        mockUSDC.approve(address(usdcMembership), totalUsdcPrice);
        vm.prank(alice);
        usdcMembership.joinSpace(JoinType.Basic, abi.encode(alice));
        assertEq(usdcMembershipToken.balanceOf(alice), 1);

        // Migrate to ETH
        vm.prank(founder);
        usdcMembership.setMembershipCurrency(CurrencyTransfer.NATIVE_TOKEN);
        assertEq(usdcMembership.getMembershipCurrency(), CurrencyTransfer.NATIVE_TOKEN);

        // Set ETH price
        vm.prank(founder);
        usdcMembership.setMembershipPrice(0.5 ether);

        // Charlie joins with ETH
        uint256 ethPrice = usdcMembership.getMembershipPrice();
        vm.deal(charlie, ethPrice);
        vm.prank(charlie);
        usdcMembership.joinSpace{value: ethPrice}(charlie);
        assertEq(usdcMembershipToken.balanceOf(charlie), 1);

        // Withdraw both currencies
        ITreasury usdcTreasury = ITreasury(address(usdcMembership));
        address recipient = makeAddr("recipient2");

        vm.prank(founder);
        usdcTreasury.withdraw(address(mockUSDC), recipient);
        assertEq(mockUSDC.balanceOf(recipient), usdcPrice);

        vm.prank(founder);
        usdcTreasury.withdraw(CurrencyTransfer.NATIVE_TOKEN, recipient);
        assertEq(recipient.balance, 0.5 ether);
    }
}
