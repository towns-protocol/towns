// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ISwapRouterBase} from "../../src/router/ISwapRouter.sol";

// libraries
import {BasisPoints} from "../../src/utils/libraries/BasisPoints.sol";

// contracts
import {DeployMockERC20, MockERC20} from "../../scripts/deployments/utils/DeployMockERC20.s.sol";
import {SwapRouter} from "../../src/router/SwapRouter.sol";
import {MockRouter} from "../mocks/MockRouter.sol";

// helpers
import {DeploySpaceFactory} from "../../scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeploySwapRouter} from "../../scripts/deployments/diamonds/DeploySwapRouter.s.sol";
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {EIP712Utils} from "@towns-protocol/diamond/test/facets/signature/EIP712Utils.sol";

contract SwapRouterTest is TestUtils, EIP712Utils, ISwapRouterBase {
    address internal spaceFactory;
    SwapRouter internal swapRouter;
    address internal mockRouter;
    MockERC20 internal token0;
    MockERC20 internal token1;

    address internal feeRecipient;
    address internal deployer = makeAddr("deployer");
    address internal poster = makeAddr("poster");
    uint16 internal constant TREASURY_BPS = 50; // 0.5%
    uint16 internal constant POSTER_BPS = 50; // 0.5%

    function setUp() public {
        DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
        spaceFactory = deploySpaceFactory.deploy(deployer);

        DeployMockERC20 deployERC20 = new DeployMockERC20();
        token0 = MockERC20(deployERC20.deploy(deployer));
        token1 = MockERC20(deployERC20.deploy(deployer));
        feeRecipient = IPlatformRequirements(spaceFactory).getFeeRecipient();

        // deploy mock router and whitelist it
        mockRouter = address(new MockRouter());
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setRouterWhitelisted(mockRouter, true);

        // set swap fees
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(TREASURY_BPS, POSTER_BPS);

        // deploy and initialize SwapRouter
        DeploySwapRouter deploySwapRouter = new DeploySwapRouter();
        deploySwapRouter.setDependencies(spaceFactory);
        swapRouter = SwapRouter(deploySwapRouter.deploy(deployer));
    }

    function test_executeSwap() public {
        test_fuzz_executeSwap(address(this), 100 ether, 95 ether, TREASURY_BPS, POSTER_BPS);
    }

    function test_fuzz_executeSwap(
        address caller,
        uint256 amountIn,
        uint256 minAmountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) public {
        vm.assume(
            caller != address(0) &&
                caller != address(swapRouter) &&
                caller != mockRouter &&
                caller != feeRecipient &&
                caller != poster
        );

        // ensure amountIn and minAmountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        minAmountOut = bound(minAmountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // ensure fee basis points are within reasonable limits (0-10%)
        treasuryBps = uint16(bound(treasuryBps, 0, 1000));
        posterBps = uint16(bound(posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(treasuryBps, posterBps);

        // get swap parameters
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            caller,
            amountIn,
            minAmountOut
        );

        // mint tokens and approve
        vm.startPrank(caller);
        token0.mint(caller, amountIn);
        token0.approve(address(swapRouter), amountIn);

        // execute swap
        uint256 amountOut = swapRouter.executeSwap(inputParams, routerParams, poster);
        vm.stopPrank();

        // verify results
        _verifySwapResults(caller, minAmountOut, amountOut, treasuryBps, posterBps);
    }

    function test_executeSwapWithPermit() public {
        test_fuzz_executeSwapWithPermit(
            0xabc,
            1 hours,
            100 ether,
            95 ether,
            TREASURY_BPS,
            POSTER_BPS
        );
    }

    function test_fuzz_executeSwapWithPermit(
        uint256 privateKey,
        uint256 deadline,
        uint256 amountIn,
        uint256 minAmountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) public {
        privateKey = boundPrivateKey(privateKey);
        deadline = bound(deadline, block.timestamp + 1, type(uint256).max);
        address owner = vm.addr(privateKey);
        vm.assume(
            owner != address(0) &&
                owner != address(swapRouter) &&
                owner != mockRouter &&
                owner != feeRecipient &&
                owner != poster
        );

        // ensure amountIn and minAmountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        minAmountOut = bound(minAmountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // get the permit signature
        PermitParams memory permitParams;
        {
            (uint8 v, bytes32 r, bytes32 s) = signPermit(
                privateKey,
                address(token0),
                owner,
                address(swapRouter),
                amountIn,
                deadline
            );
            permitParams = PermitParams({
                owner: owner,
                spender: address(swapRouter),
                value: amountIn,
                deadline: deadline,
                v: v,
                r: r,
                s: s
            });
        }

        // ensure fee basis points are within reasonable limits (0-10%)
        treasuryBps = uint16(bound(treasuryBps, 0, 1000));
        posterBps = uint16(bound(posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(treasuryBps, posterBps);

        // get swap parameters
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            owner,
            amountIn,
            minAmountOut
        );

        // mint tokens for owner
        token0.mint(owner, amountIn);

        // execute swap with permit
        uint256 amountOut = swapRouter.executeSwapWithPermit(
            inputParams,
            routerParams,
            permitParams,
            poster
        );

        // verify results
        _verifySwapResults(owner, minAmountOut, amountOut, treasuryBps, posterBps);
    }

    function _createSwapParams(
        address recipient,
        uint256 amountIn,
        uint256 minAmountOut
    )
        internal
        view
        returns (ExactInputParams memory inputParams, RouterParams memory routerParams)
    {
        // prepare swap parameters
        inputParams = ExactInputParams({
            tokenIn: address(token0),
            tokenOut: address(token1),
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            recipient: recipient
        });

        // create swap data for mock router
        bytes memory swapData = abi.encodeCall(
            MockRouter.swap,
            (address(token0), token1, amountIn, minAmountOut, address(swapRouter))
        );

        routerParams = RouterParams({
            router: mockRouter,
            approveTarget: mockRouter,
            swapData: swapData
        });
    }

    function _verifySwapResults(
        address recipient,
        uint256 minAmountOut,
        uint256 actualAmountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) internal view {
        // calculate expected fees
        uint256 expectedPosterFee = BasisPoints.calculate(minAmountOut, posterBps);
        uint256 expectedTreasuryFee = BasisPoints.calculate(minAmountOut, treasuryBps);
        uint256 expectedAmountOut = minAmountOut - expectedPosterFee - expectedTreasuryFee;

        // assert balances after swap
        assertEq(token0.balanceOf(recipient), 0, "Incorrect token0 balance");
        assertEq(token1.balanceOf(recipient), expectedAmountOut, "Incorrect token1 balance");
        assertEq(token1.balanceOf(poster), expectedPosterFee, "Incorrect poster fee");
        assertEq(token1.balanceOf(feeRecipient), expectedTreasuryFee, "Incorrect treasury fee");

        // assert returned amount is correct
        assertGe(actualAmountOut, minAmountOut, "Incorrect returned amount");
    }
}
