// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISwapRouterBase} from "../../src/router/ISwapRouter.sol";

// libraries
import {BasisPoints} from "../../src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../src/utils/libraries/CurrencyTransfer.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {MockRouter} from "../mocks/MockRouter.sol";
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {EIP712Utils} from "@towns-protocol/diamond/test/facets/signature/EIP712Utils.sol";

/// @notice Base contract for swap-related tests with shared utilities
abstract contract SwapTestBase is TestUtils, EIP712Utils, ISwapRouterBase {
    using SafeTransferLib for address;

    uint16 internal constant MAX_FEE_BPS = 200; // 2%
    uint16 internal constant PROTOCOL_BPS = 50; // 0.5%
    uint16 internal constant POSTER_BPS = 50; // 0.5%

    address internal feeRecipient;
    address internal poster = makeAddr("poster");

    function _createSwapParams(
        address swapRouter,
        address mockRouter,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address recipient
    )
        internal
        pure
        returns (ExactInputParams memory inputParams, RouterParams memory routerParams)
    {
        // prepare swap parameters
        inputParams = ExactInputParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: 0,
            recipient: recipient
        });

        // create swap data for mock router
        bytes memory swapData = abi.encodeCall(
            MockRouter.swap,
            (tokenIn, tokenOut, amountIn, amountOut, swapRouter)
        );

        routerParams = RouterParams({
            router: mockRouter,
            approveTarget: mockRouter,
            swapData: swapData
        });
    }

    function _verifySwapResults(
        address tokenIn,
        address tokenOut,
        address payer,
        address recipient,
        uint256 amountIn,
        uint256 amountOut,
        uint16 protocolBps,
        uint16 posterBps
    ) internal view {
        uint256 amount = tokenIn == CurrencyTransfer.NATIVE_TOKEN ? amountIn : amountOut;
        uint256 expectedProtocolFee = BasisPoints.calculate(amount, protocolBps);
        uint256 expectedPosterFee = BasisPoints.calculate(amount, posterBps);

        if (tokenIn == CurrencyTransfer.NATIVE_TOKEN) {
            assertEq(payer.balance, 0, "Incorrect ETH balance");
            assertEq(feeRecipient.balance, expectedProtocolFee, "Incorrect ETH protocol fee");
            assertEq(poster.balance, expectedPosterFee, "Incorrect ETH poster fee");
            assertEq(tokenOut.balanceOf(recipient), amountOut, "Incorrect tokenOut balance");
            return;
        }

        assertEq(tokenIn.balanceOf(payer), 0, "Incorrect tokenIn balance");

        uint256 expectedAmountOut = amountOut - expectedPosterFee - expectedProtocolFee;

        // assert balances after swap
        assertEq(_getBalance(tokenOut, recipient), expectedAmountOut, "Incorrect tokenOut balance");
        assertEq(
            _getBalance(tokenOut, feeRecipient),
            expectedProtocolFee,
            "Incorrect protocol fee"
        );
        assertEq(_getBalance(tokenOut, poster), expectedPosterFee, "Incorrect poster fee");
    }

    function _getBalance(address token, address account) internal view returns (uint256) {
        if (token == CurrencyTransfer.NATIVE_TOKEN) {
            return account.balance;
        }
        return token.balanceOf(account);
    }

    function _calculateFees(
        uint256 amount,
        uint16 protocolBps,
        uint16 posterBps
    ) internal pure returns (uint256 protocolFee, uint256 posterFee) {
        protocolFee = BasisPoints.calculate(amount, protocolBps);
        posterFee = BasisPoints.calculate(amount, posterBps);
    }
}
