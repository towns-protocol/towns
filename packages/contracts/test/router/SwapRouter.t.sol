// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ISwapRouterBase} from "../../src/router/ISwapRouter.sol";

// libraries
import {BasisPoints} from "../../src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../src/utils/libraries/CurrencyTransfer.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

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
    using SafeTransferLib for address;

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

        // deploy and initialize SwapRouter
        DeploySwapRouter deploySwapRouter = new DeploySwapRouter();
        deploySwapRouter.setDependencies(spaceFactory);
        swapRouter = SwapRouter(deploySwapRouter.deploy(deployer));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            SWAP                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeSwap_revertWhen_invalidRouter() external {
        address caller = address(this);
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;

        // get swap parameters
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            caller,
            amountIn,
            minAmountOut,
            address(token0),
            address(token1)
        );

        // set to non-whitelisted router
        address invalidRouter = makeAddr("invalidRouter");
        routerParams.router = invalidRouter;

        // expect revert with InvalidRouter
        vm.expectRevert(SwapRouter__InvalidRouter.selector);
        swapRouter.executeSwap(inputParams, routerParams, poster);

        // also test with invalid approveTarget
        routerParams.router = mockRouter;
        routerParams.approveTarget = invalidRouter;

        vm.expectRevert(SwapRouter__InvalidRouter.selector);
        swapRouter.executeSwap(inputParams, routerParams, poster);
    }

    function test_executeSwap_revertWhen_invalidAmount_nativeToken() external {
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(this),
            1 ether,
            0.95 ether,
            CurrencyTransfer.NATIVE_TOKEN, // ETH in
            address(token1) // token out
        );

        // send incorrect ETH amount with the transaction
        uint256 incorrectAmount = 0.5 ether;

        vm.expectRevert(SwapRouter__InvalidAmount.selector);
        swapRouter.executeSwap{value: incorrectAmount}(inputParams, routerParams, poster);
    }

    function test_executeSwap_revertWhen_insufficientOutput() external {
        uint256 amountIn = 100 ether;
        uint256 actualOutAmount = 90 ether;
        uint256 minAmountOut = 95 ether; // higher than what the router will return

        // create custom parameters where minAmountOut > actualOutAmount
        ExactInputParams memory inputParams = ExactInputParams({
            tokenIn: address(token0),
            tokenOut: address(token1),
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            recipient: address(this)
        });

        // create custom swap data returning a lower amount than minAmountOut
        bytes memory swapData = abi.encodeCall(
            MockRouter.swap,
            (address(token0), address(token1), amountIn, actualOutAmount, address(swapRouter))
        );

        RouterParams memory routerParams = RouterParams({
            router: mockRouter,
            approveTarget: mockRouter,
            swapData: swapData
        });

        // mint tokens and approve
        token0.mint(address(this), amountIn);
        token0.approve(address(swapRouter), amountIn);

        vm.expectRevert(SwapRouter__InsufficientOutput.selector);
        swapRouter.executeSwap(inputParams, routerParams, poster);
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
            minAmountOut,
            address(token0), // token in
            address(token1) // token out
        );

        // mint tokens and approve
        vm.startPrank(caller);
        token0.mint(caller, amountIn);
        token0.approve(address(swapRouter), amountIn);

        // execute swap
        uint256 amountOut = swapRouter.executeSwap(inputParams, routerParams, poster);
        vm.stopPrank();

        // verify results
        _verifySwapResults(
            address(token0),
            address(token1),
            caller,
            minAmountOut,
            amountOut,
            treasuryBps,
            posterBps
        );
    }

    function test_executeSwap_swapEthToToken() public {
        test_fuzz_executeSwap_swapEthToToken(
            address(this),
            1 ether,
            0.95 ether,
            TREASURY_BPS,
            POSTER_BPS
        );
    }

    function test_fuzz_executeSwap_swapEthToToken(
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

        // get swap parameters for ETH to token
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            caller,
            amountIn,
            minAmountOut,
            CurrencyTransfer.NATIVE_TOKEN, // ETH in
            address(token1) // token out
        );

        // execute swap with ETH
        deal(caller, amountIn);
        vm.prank(caller);
        uint256 amountOut = swapRouter.executeSwap{value: amountIn}(
            inputParams,
            routerParams,
            poster
        );

        // verify results
        _verifySwapResults(
            CurrencyTransfer.NATIVE_TOKEN,
            address(token1),
            caller,
            minAmountOut,
            amountOut,
            treasuryBps,
            posterBps
        );
    }

    function test_executeSwap_swapTokenToEth() public {
        test_fuzz_executeSwap_swapTokenToEth(
            makeAddr("caller"),
            100 ether,
            0.95 ether,
            TREASURY_BPS,
            POSTER_BPS
        );
    }

    function test_fuzz_executeSwap_swapTokenToEth(
        address caller,
        uint256 amountIn,
        uint256 minAmountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) public assumeEOA(caller) {
        vm.assume(caller != address(0) && caller != feeRecipient && caller != poster);
        deal(caller, 0);

        // ensure amountIn and minAmountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        minAmountOut = bound(minAmountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // ensure fee basis points are within reasonable limits (0-10%)
        treasuryBps = uint16(bound(treasuryBps, 0, 1000));
        posterBps = uint16(bound(posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(treasuryBps, posterBps);

        // get swap parameters for token to ETH
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            caller,
            amountIn,
            minAmountOut,
            address(token0), // token in
            CurrencyTransfer.NATIVE_TOKEN // ETH out
        );

        // mint tokens and approve
        vm.startPrank(caller);
        token0.mint(caller, amountIn);
        token0.approve(address(swapRouter), amountIn);

        // fund mockRouter with ETH to swap out
        deal(mockRouter, minAmountOut * 2);

        // execute swap
        uint256 amountOut = swapRouter.executeSwap(inputParams, routerParams, poster);
        vm.stopPrank();

        // verify results
        _verifySwapResults(
            address(token0),
            CurrencyTransfer.NATIVE_TOKEN,
            caller,
            minAmountOut,
            amountOut,
            treasuryBps,
            posterBps
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SWAP WITH PERMIT                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeSwapWithPermit_revertWhen_invalidAmount() public {
        uint256 privateKey = 0xabc;
        privateKey = boundPrivateKey(privateKey);
        address owner = vm.addr(privateKey);
        uint256 deadline = block.timestamp + 1 hours;

        uint256 amountIn = 100 ether;
        uint256 permitValue = 50 ether; // less than amountIn
        uint256 minAmountOut = 95 ether;

        // get the permit signature with insufficient value
        PermitParams memory permitParams = _createPermitParams(
            address(token0),
            privateKey,
            owner,
            address(swapRouter),
            permitValue,
            deadline
        );

        // get swap parameters
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            owner,
            amountIn,
            minAmountOut,
            address(token0),
            address(token1)
        );

        // expect revert with InvalidAmount (permit value < amountIn)
        vm.expectRevert(SwapRouter__InvalidAmount.selector);
        swapRouter.executeSwapWithPermit(inputParams, routerParams, permitParams, poster);
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
        vm.assume(owner != feeRecipient && owner != poster);

        // ensure amountIn and minAmountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        minAmountOut = bound(minAmountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // get the permit signature
        PermitParams memory permitParams = _createPermitParams(
            address(token0),
            privateKey,
            owner,
            address(swapRouter),
            amountIn,
            deadline
        );

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
            minAmountOut,
            address(token0), // token in
            address(token1) // token out
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
        _verifySwapResults(
            address(token0),
            address(token1),
            owner,
            minAmountOut,
            amountOut,
            treasuryBps,
            posterBps
        );
    }

    function test_executeSwapWithPermit_swapTokenToEth() public {
        test_fuzz_executeSwapWithPermit_swapTokenToEth(
            0xabc,
            block.timestamp + 1 hours,
            100 ether,
            0.95 ether,
            TREASURY_BPS,
            POSTER_BPS
        );
    }

    function test_fuzz_executeSwapWithPermit_swapTokenToEth(
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
        vm.assume(owner != feeRecipient && owner != poster);

        // ensure amountIn and minAmountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        minAmountOut = bound(minAmountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // get the permit signature
        PermitParams memory permitParams = _createPermitParams(
            address(token0),
            privateKey,
            owner,
            address(swapRouter),
            amountIn,
            deadline
        );

        // ensure fee basis points are within reasonable limits (0-10%)
        treasuryBps = uint16(bound(treasuryBps, 0, 1000));
        posterBps = uint16(bound(posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(treasuryBps, posterBps);

        // get swap parameters for token to ETH
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            owner,
            amountIn,
            minAmountOut,
            address(token0), // token in
            CurrencyTransfer.NATIVE_TOKEN // ETH out
        );

        // mint tokens for owner
        token0.mint(owner, amountIn);

        // fund mockRouter with ETH to swap out
        deal(mockRouter, minAmountOut * 2);

        // execute swap with permit
        uint256 amountOut = swapRouter.executeSwapWithPermit(
            inputParams,
            routerParams,
            permitParams,
            poster
        );

        // verify results
        _verifySwapResults(
            address(token0),
            CurrencyTransfer.NATIVE_TOKEN,
            owner,
            minAmountOut,
            amountOut,
            treasuryBps,
            posterBps
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createSwapParams(
        address recipient,
        uint256 amountIn,
        uint256 minAmountOut,
        address tokenIn,
        address tokenOut
    )
        internal
        view
        returns (ExactInputParams memory inputParams, RouterParams memory routerParams)
    {
        // prepare swap parameters
        inputParams = ExactInputParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            recipient: recipient
        });

        // create swap data for mock router
        bytes memory swapData = abi.encodeCall(
            MockRouter.swap,
            (tokenIn, tokenOut, amountIn, minAmountOut, address(swapRouter))
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
            assertEq(tokenIn.balanceOf(recipient), 0, "Incorrect token0 balance");
        } else {
            assertEq(recipient.balance, 0, "Incorrect ETH balance");
        }

        // assert returned amount is correct
        assertGe(actualAmountOut, minAmountOut, "Incorrect returned amount");
    }
}
