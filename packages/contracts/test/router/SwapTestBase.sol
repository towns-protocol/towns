// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ISwapRouterBase, ISwapRouter} from "../../src/router/ISwapRouter.sol";
import {ISignatureTransfer} from "@uniswap/permit2/src/interfaces/ISignatureTransfer.sol";

// libraries
import {Permit2Hash} from "../../src/router/Permit2Hash.sol";
import {BasisPoints} from "../../src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../src/utils/libraries/CurrencyTransfer.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {PermitHash} from "@uniswap/permit2/src/libraries/PermitHash.sol";

// contracts
import {DeploySwapRouter} from "../../scripts/deployments/diamonds/DeploySwapRouter.s.sol";
import {DeployMockERC20, MockERC20} from "../../scripts/deployments/utils/DeployMockERC20.s.sol";
import {MockRouter} from "../mocks/MockRouter.sol";
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {EIP712Utils} from "@towns-protocol/diamond/test/facets/signature/EIP712Utils.sol";
import {DeployPermit2} from "@uniswap/permit2/test/utils/DeployPermit2.sol";
import {Test} from "forge-std/Test.sol";

/// @notice Base contract for swap-related tests with shared utilities
abstract contract SwapTestBase is Test, TestUtils, EIP712Utils, ISwapRouterBase {
    using SafeTransferLib for address;

    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    uint16 internal constant MAX_FEE_BPS = 200; // 2%
    uint16 internal constant PROTOCOL_BPS = 50; // 0.5%
    uint16 internal constant POSTER_BPS = 50; // 0.5%

    // prerequisites, set before calling setUp()
    address internal _deployer;
    address internal _spaceFactory;

    ISwapRouter internal swapRouter;
    address internal mockRouter;
    MockERC20 internal token0;
    MockERC20 internal token1;
    address internal feeRecipient;

    // Default test parameters
    ExactInputParams internal defaultInputParams;
    RouterParams internal defaultRouterParams;
    Permit2Params internal defaultEmptyPermit;
    uint256 internal constant DEFAULT_AMOUNT_IN = 100 ether;
    uint256 internal constant DEFAULT_AMOUNT_OUT = 95 ether;
    address internal immutable defaultRecipient = makeAddr("defaultRecipient");
    address internal immutable POSTER = makeAddr("POSTER");

    function setUp() public virtual {
        // etch Permit2 to the deterministic address
        new DeployPermit2().run();
        vm.label(PERMIT2, "Permit2");

        // deploy mock tokens
        DeployMockERC20 deployERC20 = new DeployMockERC20();
        token0 = MockERC20(deployERC20.deploy(_deployer));
        token1 = MockERC20(deployERC20.deploy(_deployer));

        // deploy mock router and whitelist it
        mockRouter = address(new MockRouter());
        vm.prank(_deployer);
        IPlatformRequirements(_spaceFactory).setRouterWhitelisted(mockRouter, true);

        // deploy and initialize SwapRouter
        DeploySwapRouter deploySwapRouter = new DeploySwapRouter();
        deploySwapRouter.setDependencies(_spaceFactory);
        swapRouter = ISwapRouter(deploySwapRouter.deploy(_deployer));
        vm.label(address(swapRouter), "SwapRouter");

        feeRecipient = IPlatformRequirements(_spaceFactory).getFeeRecipient();
        vm.label(feeRecipient, "FeeRecipient");

        (defaultInputParams, defaultRouterParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0),
            address(token1),
            DEFAULT_AMOUNT_IN,
            DEFAULT_AMOUNT_OUT,
            defaultRecipient
        );
    }

    function _encodeSwapData(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address _swapRouter
    ) internal pure returns (bytes memory) {
        return
            abi.encodeCall(MockRouter.swap, (tokenIn, tokenOut, amountIn, amountOut, _swapRouter));
    }

    function _createSwapParams(
        address _swapRouter,
        address _mockRouter,
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
            router: _mockRouter,
            approveTarget: _mockRouter,
            swapData: _encodeSwapData(tokenIn, tokenOut, amountIn, amountOut, _swapRouter)
        });
    }

    function _createPartialSwapParams(
        address tokenIn,
        address tokenOut,
        uint256 maxAmountIn,
        uint256 actualAmountIn,
        uint256 amountOut,
        address recipient
    )
        internal
        view
        returns (ExactInputParams memory inputParams, RouterParams memory routerParams)
    {
        (inputParams, routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            tokenIn,
            tokenOut,
            maxAmountIn,
            amountOut,
            recipient
        );

        bytes memory swapData = abi.encodeCall(
            MockRouter.partialSwap,
            (tokenIn, tokenOut, maxAmountIn, actualAmountIn, amountOut, address(swapRouter))
        );
        routerParams.swapData = swapData;
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
    ) internal view returns (bytes memory) {
        bytes32 witnessHash = Permit2Hash.hash(SwapWitness(exactInputParams, routerParams, poster));
        bytes32 tokenPermissions = keccak256(
            abi.encode(PermitHash._TOKEN_PERMISSIONS_TYPEHASH, permit.permitted)
        );

        bytes32 structHash = keccak256(
            abi.encode(
                Permit2Hash.PERMIT_WITNESS_TRANSFER_FROM_TYPEHASH,
                tokenPermissions,
                spender,
                permit.nonce,
                permit.deadline,
                witnessHash
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = signIntent(privateKey, PERMIT2, structHash);
        return bytes.concat(r, s, bytes1(v));
    }

    function _createPermitParams(
        uint256 privateKey,
        address owner,
        address spender,
        uint256 nonce,
        uint256 deadline,
        ExactInputParams memory exactInputParams,
        RouterParams memory routerParams,
        address poster
    ) internal view returns (Permit2Params memory permitParams) {
        bytes memory signature = _signPermitWitnessTransfer(
            privateKey,
            _createPermitTransferFrom(
                exactInputParams.tokenIn,
                exactInputParams.amountIn,
                nonce,
                deadline
            ),
            spender,
            exactInputParams,
            routerParams,
            poster
        );

        permitParams = Permit2Params(owner, nonce, deadline, signature);
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
