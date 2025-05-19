// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IPausableBase, IPausable} from "@towns-protocol/diamond/src/facets/pausable/IPausable.sol";
import {IPlatformRequirements} from "../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {ISwapRouter} from "../../src/router/ISwapRouter.sol";

// libraries
import {BasisPoints} from "../../src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../src/utils/libraries/CurrencyTransfer.sol";
import {SwapRouterStorage} from "../../src/router/SwapRouterStorage.sol";

// contracts
import {DeployMockERC20, MockERC20} from "../../scripts/deployments/utils/DeployMockERC20.s.sol";
import {MockRouter} from "../mocks/MockRouter.sol";

// helpers
import {DeploySpaceFactory} from "../../scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeploySwapRouter} from "../../scripts/deployments/diamonds/DeploySwapRouter.s.sol";
import {SwapTestBase} from "./SwapTestBase.sol";

contract SwapRouterTest is SwapTestBase, IOwnableBase, IPausableBase {
    address internal spaceFactory;
    ISwapRouter internal swapRouter;
    IPausable internal pausableFacet;
    address internal mockRouter;
    MockERC20 internal token0;
    MockERC20 internal token1;
    address internal deployer = makeAddr("deployer");

    /// @dev Struct to avoid stack too deep errors in permit tests
    struct PermitTestParams {
        uint256 privateKey;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOut;
        uint16 treasuryBps;
        uint16 posterBps;
    }

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
        pausableFacet = IPausable(address(swapRouter));
    }

    function test_storageSlot() external pure {
        bytes32 slot = keccak256(abi.encode(uint256(keccak256("router.swap.storage")) - 1)) &
            ~bytes32(uint256(0xff));
        assertEq(slot, SwapRouterStorage.STORAGE_SLOT, "slot");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     PAUSABLE FUNCTIONS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_pause_revertWhen_notOwner(address notOwner) external {
        vm.assume(notOwner != address(0) && notOwner != deployer);
        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner));
        pausableFacet.pause();
    }

    function test_pause_success() external {
        vm.prank(deployer);
        pausableFacet.pause();

        assertTrue(pausableFacet.paused(), "Router should be paused");
    }

    function test_unpause_revertWhen_notOwner(address notOwner) external {
        vm.assume(notOwner != address(0) && notOwner != deployer);
        // pause the router
        vm.prank(deployer);
        pausableFacet.pause();

        // try to unpause with non-owner
        vm.prank(notOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner));
        pausableFacet.unpause();
    }

    function test_unpause_success() external {
        // pause the router
        vm.prank(deployer);
        pausableFacet.pause();
        assertTrue(pausableFacet.paused(), "Router should be paused");

        // unpause it
        vm.prank(deployer);
        pausableFacet.unpause();
        assertFalse(pausableFacet.paused(), "Router should be unpaused");
    }

    function test_executeSwap_revertWhen_paused() external {
        address caller = address(this);
        uint256 amountIn = 100 ether;
        uint256 amountOut = 95 ether;

        // pause the router
        vm.prank(deployer);
        pausableFacet.pause();

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

        // expect revert when paused
        vm.expectRevert(Pausable__Paused.selector);
        swapRouter.executeSwap(inputParams, routerParams, poster);
    }

    function test_isPaused() external {
        assertFalse(pausableFacet.paused(), "Should not be paused initially");

        vm.prank(deployer);
        pausableFacet.pause();

        assertTrue(pausableFacet.paused(), "Should be paused after pause()");

        vm.prank(deployer);
        pausableFacet.unpause();

        assertFalse(pausableFacet.paused(), "Should not be paused after unpause()");
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

    function test_executeSwap_revertWhen_unexpectedETH() external {
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0), // ERC20 token (not native)
            address(token1),
            100 ether,
            95 ether,
            address(this)
        );

        // send ETH with the transaction even though tokenIn is not native token
        vm.expectRevert(SwapRouter__UnexpectedETH.selector);
        swapRouter.executeSwap{value: 0.1 ether}(inputParams, routerParams, poster);
    }

    function test_executeSwap_gas() public {
        test_executeSwap(
            address(this),
            address(this),
            100 ether,
            95 ether,
            TREASURY_BPS,
            POSTER_BPS
        );
    }

    function test_executeSwap(
        address caller,
        address recipient,
        uint256 amountIn,
        uint256 amountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) public {
        vm.assume(caller != address(0) && caller != address(swapRouter) && caller != mockRouter);
        vm.assume(recipient != address(0) && recipient != feeRecipient && recipient != poster);

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
            recipient
        );

        // mint tokens and approve
        vm.startPrank(caller);
        token0.mint(caller, amountIn);
        token0.approve(address(swapRouter), amountIn);

        (uint256 expectedTreasuryFee, uint256 expectedPosterFee) = _calculateFees(
            amountOut,
            treasuryBps,
            posterBps
        );

        vm.expectEmit(address(swapRouter));
        emit FeeDistribution(
            address(token1),
            feeRecipient,
            poster,
            expectedTreasuryFee,
            expectedPosterFee
        );

        vm.expectEmit(address(swapRouter));
        emit Swap(
            address(mockRouter),
            caller,
            address(token0),
            address(token1),
            amountIn,
            amountOut - expectedTreasuryFee - expectedPosterFee,
            recipient
        );

        // execute swap
        swapRouter.executeSwap(inputParams, routerParams, poster);
        vm.stopPrank();

        _verifySwapResults(
            address(token0),
            address(token1),
            caller,
            recipient,
            amountIn,
            amountOut,
            treasuryBps,
            posterBps
        );
    }

    function test_executeSwap_swapEthToToken_gas() public {
        test_executeSwap_swapEthToToken(
            address(this),
            address(this),
            1 ether,
            0.95 ether,
            TREASURY_BPS,
            POSTER_BPS
        );
    }

    function test_executeSwap_swapEthToToken(
        address caller,
        address recipient,
        uint256 amountIn,
        uint256 amountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) public {
        vm.assume(caller != address(0) && caller != address(swapRouter) && caller != mockRouter);
        vm.assume(recipient != address(0) && recipient != feeRecipient && recipient != poster);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // ensure fee basis points are within reasonable limits (0-10%)
        treasuryBps = uint16(bound(treasuryBps, 0, 1000));
        posterBps = uint16(bound(posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(treasuryBps, posterBps);

        (uint256 amountInAfterFees, , ) = swapRouter.getETHInputFees(amountIn, caller, poster);

        // get swap parameters for ETH to token
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            CurrencyTransfer.NATIVE_TOKEN, // ETH in
            address(token1), // token out
            amountInAfterFees,
            amountOut,
            recipient
        );
        inputParams.amountIn = amountIn;

        // execute swap with ETH
        deal(caller, amountIn);
        vm.prank(caller);
        swapRouter.executeSwap{value: amountIn}(inputParams, routerParams, poster);

        _verifySwapResults(
            CurrencyTransfer.NATIVE_TOKEN,
            address(token1),
            caller,
            recipient,
            amountIn,
            amountOut,
            treasuryBps,
            posterBps
        );
    }

    function test_executeSwap_swapTokenToEth_gas() public {
        test_executeSwap_swapTokenToEth(
            makeAddr("caller"),
            makeAddr("recipient"),
            100 ether,
            0.95 ether,
            TREASURY_BPS,
            POSTER_BPS
        );
    }

    function test_executeSwap_swapTokenToEth(
        address caller,
        address recipient,
        uint256 amountIn,
        uint256 amountOut,
        uint16 treasuryBps,
        uint16 posterBps
    ) public assumeEOA(caller) assumeEOA(recipient) {
        vm.assume(recipient != feeRecipient && recipient != poster);
        vm.assume(recipient.balance == 0);
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
            recipient
        );

        // mint tokens and approve
        vm.startPrank(caller);
        token0.mint(caller, amountIn);
        token0.approve(address(swapRouter), amountIn);

        // fund mockRouter with ETH to swap out
        deal(mockRouter, amountOut * 2);

        // execute swap
        swapRouter.executeSwap(inputParams, routerParams, poster);
        vm.stopPrank();

        _verifySwapResults(
            address(token0),
            CurrencyTransfer.NATIVE_TOKEN,
            caller,
            recipient,
            amountIn,
            amountOut,
            treasuryBps,
            posterBps
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SWAP WITH PERMIT                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    //    function test_executeSwapWithPermit_revertWhen_invalidAmount() public {
    //        uint256 privateKey = 0xabc;
    //        privateKey = boundPrivateKey(privateKey);
    //        address owner = vm.addr(privateKey);
    //        uint256 deadline = block.timestamp + 1 hours;
    //
    //        uint256 amountIn = 100 ether;
    //        uint256 permitValue = 50 ether; // less than amountIn
    //        uint256 amountOut = 95 ether;
    //
    //        // get the permit signature with insufficient value
    //        PermitParams memory permitParams = _createPermitParams(
    //            address(token0),
    //            privateKey,
    //            owner,
    //            address(swapRouter),
    //            permitValue,
    //            deadline
    //        );
    //
    //        // get swap parameters
    //        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
    //            address(swapRouter),
    //            mockRouter,
    //            address(token0),
    //            address(token1),
    //            amountIn,
    //            amountOut,
    //            owner
    //        );
    //
    //        // expect revert with InvalidAmount (permit value < amountIn)
    //        vm.expectRevert(SwapRouter__InvalidAmount.selector);
    //        swapRouter.executeSwapWithPermit(inputParams, routerParams, permitParams, poster);
    //    }
    //
    //    function test_executeSwapWithPermit_gas() public {
    //        PermitTestParams memory params = PermitTestParams({
    //            privateKey: 0xabc,
    //            recipient: makeAddr("recipient"),
    //            deadline: 1 hours,
    //            amountIn: 100 ether,
    //            amountOut: 95 ether,
    //            treasuryBps: TREASURY_BPS,
    //            posterBps: POSTER_BPS
    //        });
    //        test_executeSwapWithPermit(params);
    //    }
    //
    //    function test_executeSwapWithPermit(PermitTestParams memory params) public {
    //        vm.assume(
    //            params.recipient != address(0) &&
    //                params.recipient != feeRecipient &&
    //                params.recipient != poster
    //        );
    //
    //        params.privateKey = boundPrivateKey(params.privateKey);
    //        params.deadline = bound(params.deadline, block.timestamp + 1, type(uint256).max);
    //        address owner = vm.addr(params.privateKey);
    //        vm.assume(owner != feeRecipient && owner != poster);
    //
    //        // ensure amountIn and amountOut are reasonable
    //        params.amountIn = bound(params.amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
    //        params.amountOut = bound(params.amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);
    //
    //        // get the permit signature
    //        PermitParams memory permitParams = _createPermitParams(
    //            address(token0),
    //            params.privateKey,
    //            owner,
    //            address(swapRouter),
    //            params.amountIn,
    //            params.deadline
    //        );
    //
    //        // ensure fee basis points are within reasonable limits (0-10%)
    //        params.treasuryBps = uint16(bound(params.treasuryBps, 0, 1000));
    //        params.posterBps = uint16(bound(params.posterBps, 0, 1000));
    //
    //        // set custom fees for this test
    //        vm.prank(deployer);
    //        IPlatformRequirements(spaceFactory).setSwapFees(params.treasuryBps, params.posterBps);
    //
    //        // get swap parameters
    //        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
    //            address(swapRouter),
    //            mockRouter,
    //            address(token0), // token in
    //            address(token1), // token out
    //            params.amountIn,
    //            params.amountOut,
    //            params.recipient
    //        );
    //
    //        // mint tokens for owner
    //        token0.mint(owner, params.amountIn);
    //
    //        // execute swap with permit
    //        (uint256 actualAmountOut, ) = swapRouter.executeSwapWithPermit(
    //            inputParams,
    //            routerParams,
    //            permitParams,
    //            poster
    //        );
    //
    //        _verifySwapResults(
    //            address(token0),
    //            address(token1),
    //            owner,
    //            params.recipient,
    //            params.amountOut,
    //            actualAmountOut,
    //            params.treasuryBps,
    //            params.posterBps
    //        );
    //    }
    //
    //    function test_executeSwapWithPermit_swapTokenToEth_gas() public {
    //        PermitTestParams memory params = PermitTestParams({
    //            privateKey: 0xabc,
    //            recipient: makeAddr("recipient"),
    //            deadline: block.timestamp + 1 hours,
    //            amountIn: 100 ether,
    //            amountOut: 0.95 ether,
    //            treasuryBps: TREASURY_BPS,
    //            posterBps: POSTER_BPS
    //        });
    //        test_executeSwapWithPermit_swapTokenToEth(params);
    //    }
    //
    //    function test_executeSwapWithPermit_swapTokenToEth(
    //        PermitTestParams memory params
    //    ) public assumeEOA(params.recipient) {
    //        vm.assume(params.recipient != feeRecipient && params.recipient != poster);
    //        vm.assume(params.recipient.balance == 0);
    //
    //        params.privateKey = boundPrivateKey(params.privateKey);
    //        params.deadline = bound(params.deadline, block.timestamp + 1, type(uint256).max);
    //        address owner = vm.addr(params.privateKey);
    //        vm.assume(owner != feeRecipient && owner != poster);
    //
    //        // ensure amountIn and amountOut are reasonable
    //        params.amountIn = bound(params.amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
    //        params.amountOut = bound(params.amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);
    //
    //        // get the permit signature
    //        PermitParams memory permitParams = _createPermitParams(
    //            address(token0),
    //            params.privateKey,
    //            owner,
    //            address(swapRouter),
    //            params.amountIn,
    //            params.deadline
    //        );
    //
    //        // ensure fee basis points are within reasonable limits (0-10%)
    //        params.treasuryBps = uint16(bound(params.treasuryBps, 0, 1000));
    //        params.posterBps = uint16(bound(params.posterBps, 0, 1000));
    //
    //        // set custom fees for this test
    //        vm.prank(deployer);
    //        IPlatformRequirements(spaceFactory).setSwapFees(params.treasuryBps, params.posterBps);
    //
    //        // get swap parameters for token to ETH
    //        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
    //            address(swapRouter),
    //            mockRouter,
    //            address(token0), // token in
    //            CurrencyTransfer.NATIVE_TOKEN, // ETH out
    //            params.amountIn,
    //            params.amountOut,
    //            params.recipient
    //        );
    //
    //        // mint tokens for owner
    //        token0.mint(owner, params.amountIn);
    //
    //        // fund mockRouter with ETH to swap out
    //        deal(mockRouter, params.amountOut * 2);
    //
    //        // execute swap with permit
    //        (uint256 actualAmountOut, ) = swapRouter.executeSwapWithPermit(
    //            inputParams,
    //            routerParams,
    //            permitParams,
    //            poster
    //        );
    //
    //        _verifySwapResults(
    //            address(token0),
    //            CurrencyTransfer.NATIVE_TOKEN,
    //            owner,
    //            params.recipient,
    //            params.amountOut,
    //            actualAmountOut,
    //            params.treasuryBps,
    //            params.posterBps
    //        );
    //    }
}
