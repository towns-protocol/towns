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
    uint16 internal constant TREASURY_BPS = 50; // 0.5%
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

    function _createPermitParams(
        address token,
        uint256 privateKey,
        address owner,
        address spender,
        uint256 value,
        uint256 deadline
    ) internal view returns (PermitParams memory permitParams) {
        (uint8 v, bytes32 r, bytes32 s) = signPermit(
            privateKey,
            token,
            owner,
            spender,
            value,
            deadline
        );
        permitParams = PermitParams({
            owner: owner,
            spender: spender,
            value: value,
            deadline: deadline,
            v: v,
            r: r,
            s: s
        });
    }

    function _verifySwapResults(
        address tokenIn,
        address tokenOut,
        address payer,
        address recipient,
        uint256 amountOut,
        uint256 actualAmountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) internal view {
        // calculate expected fees
        uint256 expectedPosterFee = BasisPoints.calculate(amountOut, posterBps);
        uint256 expectedTreasuryFee = BasisPoints.calculate(amountOut, treasuryBps);
        uint256 expectedAmountOut = amountOut - expectedPosterFee - expectedTreasuryFee;

        // assert balances after swap
        if (tokenOut != CurrencyTransfer.NATIVE_TOKEN) {
            assertEq(tokenOut.balanceOf(recipient), expectedAmountOut, "Incorrect token1 balance");
            assertEq(tokenOut.balanceOf(poster), expectedPosterFee, "Incorrect poster fee");
            assertEq(
                tokenOut.balanceOf(feeRecipient),
                expectedTreasuryFee,
                "Incorrect treasury fee"
            );
        } else {
            assertEq(recipient.balance, expectedAmountOut, "Incorrect ETH balance");
            assertEq(poster.balance, expectedPosterFee, "Incorrect ETH poster fee");
            assertEq(feeRecipient.balance, expectedTreasuryFee, "Incorrect ETH treasury fee");
        }

        if (tokenIn != CurrencyTransfer.NATIVE_TOKEN) {
            assertEq(tokenIn.balanceOf(payer), 0, "Incorrect token0 balance");
        } else {
            assertEq(payer.balance, 0, "Incorrect ETH balance");
        }

        // assert returned amount is correct
        assertEq(actualAmountOut, expectedAmountOut, "Incorrect returned amount");
    }

    function _calculateFees(
        uint256 amount,
        uint16 treasuryBps,
        uint16 posterBps
    ) internal pure returns (uint256 posterFee, uint256 treasuryFee) {
        posterFee = BasisPoints.calculate(amount, posterBps);
        treasuryFee = BasisPoints.calculate(amount, treasuryBps);
    }
}
