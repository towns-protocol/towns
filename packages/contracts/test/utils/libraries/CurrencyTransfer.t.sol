// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {Test} from "forge-std/Test.sol";
import {WETH} from "solady/tokens/WETH.sol";
import {CurrencyTransfer} from "src/utils/libraries/CurrencyTransfer.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";

contract CurrencyTransferTest is Test, TestUtils {
    CurrencyTransferTestHarness internal harness = new CurrencyTransferTestHarness();
    MockERC20 internal token = new MockERC20("Test Token", "TEST", 18);
    WETH internal weth = new WETH();
    RejectETH internal rejectETH = new RejectETH();

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal charlie = makeAddr("charlie");

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     BASIC TRANSFER TESTS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_transferCurrency_zeroAmount(address to, uint256 initialBalance) public {
        vm.assume(to != address(0));

        deal(to, initialBalance);
        harness.transferCurrency(NATIVE_TOKEN, address(harness), to, 0);
        assertEq(to.balance, initialBalance, "Balance should not change for zero transfer");

        deal(address(token), to, initialBalance);
        harness.transferCurrency(address(token), address(harness), to, 0);
        assertEq(
            token.balanceOf(to),
            initialBalance,
            "Token balance should not change for zero transfer"
        );
    }

    function test_transferCurrency_nativeToken(
        address to,
        uint256 fromBalanceBefore,
        uint256 toBalanceBefore,
        uint256 amount
    ) public assumeEOA(to) {
        vm.assume(to != address(harness));
        fromBalanceBefore = bound(fromBalanceBefore, 1, type(uint256).max);
        toBalanceBefore = bound(toBalanceBefore, 0, type(uint256).max - fromBalanceBefore);
        amount = bound(amount, 1, fromBalanceBefore);

        deal(address(harness), fromBalanceBefore);
        deal(to, toBalanceBefore);

        harness.transferCurrency(NATIVE_TOKEN, address(harness), to, amount);

        assertEq(
            address(harness).balance,
            fromBalanceBefore - amount,
            "From balance should decrease"
        );
        assertEq(to.balance, toBalanceBefore + amount, "To balance should increase");
    }

    function test_transferCurrency_ERC20(
        address to,
        uint256 fromBalanceBefore,
        uint256 toBalanceBefore,
        uint256 amount
    ) public {
        vm.assume(to != address(0) && to != address(harness) && to != address(token));
        fromBalanceBefore = bound(fromBalanceBefore, 1, type(uint256).max);
        toBalanceBefore = bound(toBalanceBefore, 0, type(uint256).max - fromBalanceBefore);
        amount = bound(amount, 1, fromBalanceBefore);

        token.mint(address(harness), fromBalanceBefore);
        token.mint(to, toBalanceBefore);

        harness.transferCurrency(address(token), address(harness), to, amount);

        assertEq(
            token.balanceOf(address(harness)),
            fromBalanceBefore - amount,
            "From token balance should decrease"
        );
        assertEq(token.balanceOf(to), toBalanceBefore + amount, "To token balance should increase");
    }

    function test_transferCurrency_ERC20_external(
        address from,
        address to,
        uint256 fromBalanceBefore,
        uint256 toBalanceBefore,
        uint256 amount
    ) public {
        vm.assume(from != address(0) && from != to && from != address(harness));
        vm.assume(to != address(0) && to != address(harness) && to != address(token));
        fromBalanceBefore = bound(fromBalanceBefore, 1, type(uint256).max);
        toBalanceBefore = bound(toBalanceBefore, 0, type(uint256).max - fromBalanceBefore);
        amount = bound(amount, 1, fromBalanceBefore);

        token.mint(from, fromBalanceBefore);
        token.mint(to, toBalanceBefore);

        vm.prank(from);
        token.approve(address(harness), amount);

        harness.transferCurrency(address(token), from, to, amount);

        assertEq(token.balanceOf(from), fromBalanceBefore - amount, "From balance should decrease");
        assertEq(token.balanceOf(to), toBalanceBefore + amount, "To balance should increase");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 WRAPPER TRANSFER TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_transferCurrencyWithWrapper_zeroAmount(
        address from,
        address to,
        uint256 initialBalance
    ) public {
        vm.assume(from != address(0) && to != address(0));

        deal(from, initialBalance);

        harness.transferCurrencyWithWrapper(NATIVE_TOKEN, from, to, 0, address(weth));
        assertEq(from.balance, initialBalance, "Balance should not change for zero transfer");
    }

    function test_transferCurrencyWithWrapper_nativeFromContract(
        address to,
        uint256 amount,
        uint256 initialBalance
    ) public assumeEOA(to) {
        vm.assume(to != address(harness) && to != address(weth));
        vm.assume(to.balance == 0);
        initialBalance = bound(initialBalance, 1, type(uint256).max);
        amount = bound(amount, 1, initialBalance);

        deal(address(harness), initialBalance);
        vm.prank(address(harness));
        weth.deposit{value: initialBalance}();

        harness.transferCurrencyWithWrapper(
            NATIVE_TOKEN,
            address(harness),
            to,
            amount,
            address(weth)
        );

        assertEq(
            weth.balanceOf(address(harness)),
            initialBalance - amount,
            "WETH balance should decrease"
        );
        assertEq(to.balance, amount, "To balance should increase");
    }

    function test_transferCurrencyWithWrapper_nativeToContract(
        uint256 amount,
        uint256 initialBalance
    ) public {
        initialBalance = bound(initialBalance, 0, type(uint256).max - 1);
        amount = bound(amount, 1, type(uint256).max - initialBalance);

        deal(address(weth), address(harness), initialBalance);
        deal(address(this), amount);

        harness.transferCurrencyWithWrapper{value: amount}(
            NATIVE_TOKEN,
            alice,
            address(harness),
            amount,
            address(weth)
        );

        assertEq(
            weth.balanceOf(address(harness)),
            initialBalance + amount,
            "WETH balance should increase"
        );
    }

    function test_transferCurrencyWithWrapper_nativeExternalToExternal(
        address to,
        uint256 amount,
        uint256 initialBalance
    ) public assumeEOA(to) {
        vm.assume(to != address(0) && to != alice && to != address(harness));
        initialBalance = bound(initialBalance, 0, type(uint256).max - 1);
        amount = bound(amount, 1, type(uint256).max - initialBalance);

        deal(alice, amount);
        deal(to, initialBalance);

        vm.prank(alice);
        harness.transferCurrencyWithWrapper{value: amount}(
            NATIVE_TOKEN,
            alice,
            to,
            amount,
            address(weth)
        );

        assertEq(to.balance, initialBalance + amount, "To balance should increase");
    }

    function test_transferCurrencyWithWrapper_revertIf_msgValueMismatch(
        address from,
        address to,
        uint256 msgValue,
        uint256 amount
    ) public {
        vm.assume(from != address(0) && to != address(0));
        vm.assume(from != address(harness));
        msgValue = bound(msgValue, 1, type(uint256).max - 1);
        amount = bound(amount, msgValue + 1, type(uint256).max); // amount > msgValue

        deal(from, msgValue);

        vm.expectRevert(CurrencyTransfer.MsgValueMismatch.selector);
        vm.prank(from);
        harness.transferCurrencyWithWrapper{value: msgValue}(
            NATIVE_TOKEN,
            from,
            to,
            amount,
            address(weth)
        );
    }

    function test_transferCurrencyWithWrapper_ERC20(
        address from,
        address to,
        uint256 fromBalanceBefore,
        uint256 toBalanceBefore,
        uint256 amount
    ) public {
        vm.assume(from != address(0) && from != to && from != address(harness));
        vm.assume(to != address(0) && to != address(harness) && to != address(token));
        fromBalanceBefore = bound(fromBalanceBefore, 1, type(uint256).max);
        toBalanceBefore = bound(toBalanceBefore, 0, type(uint256).max - fromBalanceBefore);
        amount = bound(amount, 1, fromBalanceBefore);

        token.mint(from, fromBalanceBefore);
        token.mint(to, toBalanceBefore);

        vm.prank(from);
        token.approve(address(harness), amount);

        harness.transferCurrencyWithWrapper(address(token), from, to, amount, address(weth));

        assertEq(token.balanceOf(from), fromBalanceBefore - amount, "From balance should decrease");
        assertEq(token.balanceOf(to), toBalanceBefore + amount, "To balance should increase");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INDIVIDUAL FUNCTION TESTS              */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_safeTransferERC20_selfTransfer(
        address account,
        uint256 amount,
        uint256 initialBalance
    ) public {
        vm.assume(account != address(0) && account != address(token));
        initialBalance = bound(initialBalance, 1, type(uint256).max);
        amount = bound(amount, 1, initialBalance);

        token.mint(account, initialBalance);
        vm.prank(account);
        token.approve(address(harness), amount);

        harness.safeTransferERC20(address(token), account, account, amount);

        assertEq(
            token.balanceOf(account),
            initialBalance,
            "Self transfer should not change balance"
        );
    }

    function test_safeTransferERC20_fromContract(
        address to,
        uint256 fromBalanceBefore,
        uint256 toBalanceBefore,
        uint256 amount
    ) public {
        vm.assume(to != address(0) && to != address(harness) && to != address(token));
        fromBalanceBefore = bound(fromBalanceBefore, 1, type(uint256).max);
        toBalanceBefore = bound(toBalanceBefore, 0, type(uint256).max - fromBalanceBefore);
        amount = bound(amount, 1, fromBalanceBefore);

        token.mint(address(harness), fromBalanceBefore);
        token.mint(to, toBalanceBefore);

        harness.safeTransferERC20(address(token), address(harness), to, amount);

        assertEq(
            token.balanceOf(address(harness)),
            fromBalanceBefore - amount,
            "From balance should decrease"
        );
        assertEq(token.balanceOf(to), toBalanceBefore + amount, "To balance should increase");
    }

    function test_safeTransferERC20_external(
        address from,
        address to,
        uint256 fromBalanceBefore,
        uint256 toBalanceBefore,
        uint256 amount
    ) public {
        test_transferCurrencyWithWrapper_ERC20(
            from,
            to,
            fromBalanceBefore,
            toBalanceBefore,
            amount
        );
    }

    function test_safeTransferNativeToken(
        address to,
        uint256 fromBalanceBefore,
        uint256 toBalanceBefore,
        uint256 amount
    ) public assumeEOA(to) {
        vm.assume(to != address(harness));
        fromBalanceBefore = bound(fromBalanceBefore, 1, type(uint256).max);
        toBalanceBefore = bound(toBalanceBefore, 0, type(uint256).max - fromBalanceBefore);
        amount = bound(amount, 1, fromBalanceBefore);

        deal(address(harness), fromBalanceBefore);
        deal(to, toBalanceBefore);

        harness.safeTransferNativeToken(to, amount);

        assertEq(
            address(harness).balance,
            fromBalanceBefore - amount,
            "From balance should decrease"
        );
        assertEq(to.balance, toBalanceBefore + amount, "To balance should increase");
    }

    function test_safeTransferNativeTokenWithWrapper_success(
        address to,
        uint256 fromBalanceBefore,
        uint256 toBalanceBefore,
        uint256 amount
    ) public assumeEOA(to) {
        vm.assume(to != address(harness) && to != address(weth));
        fromBalanceBefore = bound(fromBalanceBefore, 1, type(uint256).max);
        toBalanceBefore = bound(toBalanceBefore, 0, type(uint256).max - fromBalanceBefore);
        amount = bound(amount, 1, fromBalanceBefore);

        deal(address(harness), fromBalanceBefore);
        deal(to, toBalanceBefore);

        harness.safeTransferNativeTokenWithWrapper(to, amount, address(weth));

        assertEq(
            address(harness).balance,
            fromBalanceBefore - amount,
            "From balance should decrease"
        );
        assertEq(to.balance, toBalanceBefore + amount, "To balance should increase");
    }

    function test_safeTransferNativeTokenWithWrapper_fallbackToWETH(
        uint256 fromBalanceBefore,
        uint256 toBalanceBefore,
        uint256 amount
    ) public {
        fromBalanceBefore = bound(fromBalanceBefore, 1, type(uint256).max);
        toBalanceBefore = bound(toBalanceBefore, 0, type(uint256).max - fromBalanceBefore);
        amount = bound(amount, 1, fromBalanceBefore);

        deal(address(harness), fromBalanceBefore);
        deal(address(weth), address(rejectETH), toBalanceBefore);

        harness.safeTransferNativeTokenWithWrapper(address(rejectETH), amount, address(weth));

        assertEq(
            address(harness).balance,
            fromBalanceBefore - amount,
            "From balance should decrease"
        );
        assertEq(
            weth.balanceOf(address(rejectETH)),
            toBalanceBefore + amount,
            "WETH balance should increase"
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      EDGE CASE TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_transferCurrency_maxAmount(
        uint256 amount,
        uint256 aliceBalanceBefore,
        uint256 bobBalanceBefore
    ) public {
        amount = bound(amount, 1, type(uint256).max);
        aliceBalanceBefore = bound(aliceBalanceBefore, 0, type(uint256).max - amount);
        bobBalanceBefore = bound(bobBalanceBefore, 0, type(uint256).max - amount);

        deal(address(harness), amount);
        token.mint(address(harness), amount);

        if (amount <= address(harness).balance) {
            deal(alice, aliceBalanceBefore);
            harness.transferCurrency(NATIVE_TOKEN, address(harness), alice, amount);
            assertEq(alice.balance, aliceBalanceBefore + amount, "Native token transfer failed");
        }

        if (amount <= token.balanceOf(address(harness))) {
            token.mint(bob, bobBalanceBefore);
            harness.transferCurrency(address(token), address(harness), bob, amount);
            assertEq(token.balanceOf(bob), bobBalanceBefore + amount, "ERC20 transfer failed");
        }
    }

    function test_transferCurrency_multipleTransfers(uint256 amount, uint8 numTransfers) public {
        amount = bound(amount, 1, type(uint128).max);
        numTransfers = uint8(bound(numTransfers, 1, 100));

        deal(address(harness), amount * numTransfers);

        for (uint256 i = 0; i < numTransfers; i++) {
            address recipient = makeAddr(string(abi.encodePacked("recipient", i)));
            uint256 balanceBefore = recipient.balance;

            harness.transferCurrency(NATIVE_TOKEN, address(harness), recipient, amount);

            assertEq(recipient.balance, balanceBefore + amount, "Sequential transfer failed");
        }
    }

    function test_wethIntegration_depositAndWithdraw(
        address user,
        uint256 amount,
        uint256 initialBalance
    ) public assumeEOA(user) {
        vm.assume(user != address(harness) && user != address(weth));
        initialBalance = bound(initialBalance, 1, type(uint256).max);
        amount = bound(amount, 1, initialBalance);

        deal(user, initialBalance);

        vm.prank(user);
        harness.transferCurrencyWithWrapper{value: amount}(
            NATIVE_TOKEN,
            user,
            address(harness),
            amount,
            address(weth)
        );

        assertEq(weth.balanceOf(address(harness)), amount, "WETH deposit failed");

        harness.transferCurrencyWithWrapper(
            NATIVE_TOKEN,
            address(harness),
            user,
            amount,
            address(weth)
        );

        assertEq(user.balance, initialBalance, "ETH withdrawal failed");
        assertEq(weth.balanceOf(address(harness)), 0, "WETH should be withdrawn");
    }
}

contract RejectETH {
    receive() external payable {
        revert("RejectETH: cannot receive ETH");
    }
}

contract CurrencyTransferTestHarness {
    function transferCurrency(
        address currency,
        address from,
        address to,
        uint256 amount
    ) external payable {
        CurrencyTransfer.transferCurrency(currency, from, to, amount);
    }

    function transferCurrencyWithWrapper(
        address currency,
        address from,
        address to,
        uint256 amount,
        address wrapper
    ) external payable {
        CurrencyTransfer.transferCurrencyWithWrapper(currency, from, to, amount, wrapper);
    }

    function safeTransferERC20(address token, address from, address to, uint256 amount) external {
        CurrencyTransfer.safeTransferERC20(token, from, to, amount);
    }

    function safeTransferNativeToken(address to, uint256 value) external {
        CurrencyTransfer.safeTransferNativeToken(to, value);
    }

    function safeTransferNativeTokenWithWrapper(
        address to,
        uint256 value,
        address wrapper
    ) external {
        CurrencyTransfer.safeTransferNativeTokenWithWrapper(to, value, wrapper);
    }

    receive() external payable {}
}
