// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISwapRouterBase} from "../../src/router/ISwapRouter.sol";
import {ISignatureTransfer} from "@uniswap/permit2/src/interfaces/ISignatureTransfer.sol";

// libraries
import {BasisPoints} from "../../src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../src/utils/libraries/CurrencyTransfer.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {MockRouter} from "../mocks/MockRouter.sol";
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {EIP712Utils} from "@towns-protocol/diamond/test/facets/signature/EIP712Utils.sol";
import {DeployPermit2} from "@uniswap/permit2/test/utils/DeployPermit2.sol";
import {Test} from "forge-std/Test.sol";

/// @notice Base contract for swap-related tests with shared utilities
abstract contract SwapTestBase is Test, TestUtils, EIP712Utils, ISwapRouterBase {
    using SafeTransferLib for address;

    address internal constant permit2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    uint16 internal constant MAX_FEE_BPS = 200; // 2%
    uint16 internal constant PROTOCOL_BPS = 50; // 0.5%
    uint16 internal constant POSTER_BPS = 50; // 0.5%

    address internal feeRecipient;
    address internal POSTER = makeAddr("POSTER");

    bytes32 internal constant _TOKEN_PERMISSIONS_TYPEHASH =
        keccak256("TokenPermissions(address token,uint256 amount)");

    bytes32 internal constant _PERMIT_WITNESS_TRANSFER_FROM_TYPEHASH =
        keccak256(
            "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,SwapWitness witness)ExactInputParams(address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,address recipient)RouterParams(address router,address approveTarget,bytes swapData)SwapWitness(ExactInputParams exactInputParams,RouterParams routerParams,address poster)TokenPermissions(address token,uint256 amount)"
        );

    string internal constant SWAP_WITNESS_TYPE_STRING =
        "SwapWitness witness)ExactInputParams(address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,address recipient)RouterParams(address router,address approveTarget,bytes swapData)SwapWitness(ExactInputParams exactInputParams,RouterParams routerParams,address poster)TokenPermissions(address token,uint256 amount)";

    function setUp() public virtual {
        DeployPermit2 deployer = new DeployPermit2();
        deployer.deployPermit2();
        vm.label(permit2, "Permit2");
    }

    function _encodeSwapData(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address swapRouter
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(MockRouter.swap, (tokenIn, tokenOut, amountIn, amountOut, swapRouter));
    }

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

        routerParams = RouterParams({
            router: mockRouter,
            approveTarget: mockRouter,
            swapData: _encodeSwapData(tokenIn, tokenOut, amountIn, amountOut, swapRouter)
        });
    }

    function _createPermitTransferFrom(
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline
    ) internal pure returns (ISignatureTransfer.PermitTransferFrom memory permit) {
        permit = ISignatureTransfer.PermitTransferFrom(
            ISignatureTransfer.TokenPermissions(token, amount),
            nonce,
            deadline
        );
    }

    function _signPermitWitnessTransfer(
        uint256 privateKey,
        ISignatureTransfer.PermitTransferFrom memory permit,
        address spender,
        ExactInputParams memory exactInputParams,
        RouterParams memory routerParams,
        address poster
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 witness = _witnessHash(exactInputParams, routerParams, poster);
        bytes32 tokenPermissions = keccak256(
            abi.encode(_TOKEN_PERMISSIONS_TYPEHASH, permit.permitted)
        );

        bytes32 structHash = keccak256(
            abi.encode(
                _PERMIT_WITNESS_TRANSFER_FROM_TYPEHASH,
                tokenPermissions,
                spender,
                permit.nonce,
                permit.deadline,
                witness
            )
        );

        return signIntent(privateKey, permit2, structHash);
    }

    function _createPermitParams(
        uint256 privateKey,
        address owner,
        address token,
        uint256 amount,
        address spender,
        uint256 nonce,
        uint256 deadline,
        ExactInputParams memory exactInputParams,
        RouterParams memory routerParams,
        address poster
    ) internal view returns (Permit2Params memory permitParams) {
        (uint8 v, bytes32 r, bytes32 s) = _signPermitWitnessTransfer(
            privateKey,
            _createPermitTransferFrom(token, amount, nonce, deadline),
            spender,
            exactInputParams,
            routerParams,
            poster
        );

        permitParams = Permit2Params(
            owner,
            token,
            amount,
            nonce,
            deadline,
            bytes.concat(r, s, bytes1(v))
        );
    }

    /// @notice Creates a witness hash binding permit signature to exact swap parameters
    function _witnessHash(
        ExactInputParams memory params,
        RouterParams memory routerParams,
        address poster
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(params, routerParams, poster));
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
            assertEq(POSTER.balance, expectedPosterFee, "Incorrect ETH poster fee");
            assertEq(tokenOut.balanceOf(recipient), amountOut, "Incorrect tokenOut balance");
            return;
        }

        assertEq(tokenIn.balanceOf(payer), 0, "Incorrect tokenIn balance");

        uint256 expectedAmountOut = amountOut - expectedPosterFee - expectedProtocolFee;

        assertEq(_getBalance(tokenOut, recipient), expectedAmountOut, "Incorrect tokenOut balance");
        assertEq(
            _getBalance(tokenOut, feeRecipient),
            expectedProtocolFee,
            "Incorrect protocol fee"
        );
        assertEq(_getBalance(tokenOut, POSTER), expectedPosterFee, "Incorrect poster fee");
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
