// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPlatformRequirements} from "../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ISwapRouter} from "../../src/router/ISwapRouter.sol";

// libraries
import {BasisPoints} from "../../src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../src/utils/libraries/CurrencyTransfer.sol";

// contracts
import {DeployMockERC20, MockERC20} from "../../scripts/deployments/utils/DeployMockERC20.s.sol";
import {MockRouter} from "../mocks/MockRouter.sol";

// helpers
import {DeploySpaceFactory} from "../../scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeploySwapRouter} from "../../scripts/deployments/diamonds/DeploySwapRouter.s.sol";
import {SwapTestBase} from "./SwapTestBase.sol";

contract SwapRouterTest is SwapTestBase {
    address internal spaceFactory;
    ISwapRouter internal swapRouter;
    address internal mockRouter;
    MockERC20 internal token0;
    MockERC20 internal token1;
    address internal deployer = makeAddr("deployer");

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
        swapRouter = ISwapRouter(deploySwapRouter.deploy(deployer));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            SWAP                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeSwap_revertWhen_invalidRouter() external {
        address caller = address(this);
        uint256 amountIn = 100 ether;
        uint256 amountOut = 95 ether;

        // get swap parameters
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0),
            address(token1),
            amountIn,
            amountOut,
            caller
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
            address(swapRouter),
            mockRouter,
            CurrencyTransfer.NATIVE_TOKEN, // ETH in
            address(token1), // token out
            1 ether,
            0.95 ether,
            address(this)
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
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0), // token in
            address(token1), // token out
            amountIn,
            actualOutAmount,
            address(this)
        );
        inputParams.minAmountOut = minAmountOut;

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
        uint256 amountOut,
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

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // ensure fee basis points are within reasonable limits (0-10%)
        treasuryBps = uint16(bound(treasuryBps, 0, 1000));
        posterBps = uint16(bound(posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(treasuryBps, posterBps);

        // get swap parameters
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0), // token in
            address(token1), // token out
            amountIn,
            amountOut,
            caller
        );

        // mint tokens and approve
        vm.startPrank(caller);
        token0.mint(caller, amountIn);
        token0.approve(address(swapRouter), amountIn);

        // execute swap
        uint256 actualAmountOut = swapRouter.executeSwap(inputParams, routerParams, poster);
        vm.stopPrank();

        // verify results
        _verifySwapResults(
            address(token0),
            address(token1),
            caller,
            amountOut,
            actualAmountOut,
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
        uint256 amountOut,
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

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // ensure fee basis points are within reasonable limits (0-10%)
        treasuryBps = uint16(bound(treasuryBps, 0, 1000));
        posterBps = uint16(bound(posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(treasuryBps, posterBps);

        // get swap parameters for ETH to token
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            CurrencyTransfer.NATIVE_TOKEN, // ETH in
            address(token1), // token out
            amountIn,
            amountOut,
            caller
        );

        // execute swap with ETH
        deal(caller, amountIn);
        vm.prank(caller);
        uint256 actualAmountOut = swapRouter.executeSwap{value: amountIn}(
            inputParams,
            routerParams,
            poster
        );

        // verify results
        _verifySwapResults(
            CurrencyTransfer.NATIVE_TOKEN,
            address(token1),
            caller,
            amountOut,
            actualAmountOut,
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
        uint256 amountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) public assumeEOA(caller) {
        vm.assume(caller != address(0) && caller != feeRecipient && caller != poster);
        deal(caller, 0);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // ensure fee basis points are within reasonable limits (0-10%)
        treasuryBps = uint16(bound(treasuryBps, 0, 1000));
        posterBps = uint16(bound(posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(treasuryBps, posterBps);

        // get swap parameters for token to ETH
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0), // token in
            CurrencyTransfer.NATIVE_TOKEN, // ETH out
            amountIn,
            amountOut,
            caller
        );

        // mint tokens and approve
        vm.startPrank(caller);
        token0.mint(caller, amountIn);
        token0.approve(address(swapRouter), amountIn);

        // fund mockRouter with ETH to swap out
        deal(mockRouter, amountOut * 2);

        // execute swap
        uint256 actualAmountOut = swapRouter.executeSwap(inputParams, routerParams, poster);
        vm.stopPrank();

        // verify results
        _verifySwapResults(
            address(token0),
            CurrencyTransfer.NATIVE_TOKEN,
            caller,
            amountOut,
            actualAmountOut,
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
        uint256 amountOut = 95 ether;

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
            address(swapRouter),
            mockRouter,
            address(token0),
            address(token1),
            amountIn,
            amountOut,
            owner
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
        uint256 amountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) public {
        privateKey = boundPrivateKey(privateKey);
        deadline = bound(deadline, block.timestamp + 1, type(uint256).max);
        address owner = vm.addr(privateKey);
        vm.assume(owner != feeRecipient && owner != poster);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

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
            address(swapRouter),
            mockRouter,
            address(token0), // token in
            address(token1), // token out
            amountIn,
            amountOut,
            owner
        );

        // mint tokens for owner
        token0.mint(owner, amountIn);

        // execute swap with permit
        uint256 actualAmountOut = swapRouter.executeSwapWithPermit(
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
            amountOut,
            actualAmountOut,
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
        uint256 amountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) public {
        privateKey = boundPrivateKey(privateKey);
        deadline = bound(deadline, block.timestamp + 1, type(uint256).max);
        address owner = vm.addr(privateKey);
        vm.assume(owner != feeRecipient && owner != poster);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

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
            address(swapRouter),
            mockRouter,
            address(token0), // token in
            CurrencyTransfer.NATIVE_TOKEN, // ETH out
            amountIn,
            amountOut,
            owner
        );

        // mint tokens for owner
        token0.mint(owner, amountIn);

        // fund mockRouter with ETH to swap out
        deal(mockRouter, amountOut * 2);

        // execute swap with permit
        uint256 actualAmountOut = swapRouter.executeSwapWithPermit(
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
            amountOut,
            actualAmountOut,
            treasuryBps,
            posterBps
        );
    }
}
