// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IPausableBase, IPausable} from "@towns-protocol/diamond/src/facets/pausable/IPausable.sol";
import {IPlatformRequirements} from "../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";

// libraries
import {SignatureVerification} from "@uniswap/permit2/src/libraries/SignatureVerification.sol";
import {BasisPoints} from "../../src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../src/utils/libraries/CurrencyTransfer.sol";
import {SwapRouterStorage} from "../../src/router/SwapRouterStorage.sol";

// contracts
import {DeploySpaceFactory} from "../../scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {SwapTestBase} from "./SwapTestBase.sol";

contract SwapRouterTest is SwapTestBase, IOwnableBase, IPausableBase {
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

    /// @dev Types of parameter tampering for front-running tests
    enum TamperType {
        RECIPIENT,
        POSTER,
        AMOUNT_IN,
        AMOUNT_OUT,
        TOKEN_IN,
        TOKEN_OUT,
        ROUTER
    }

    /// @dev Parameters for front-running tests to avoid stack too deep
    struct FrontRunningParams {
        uint256 privateKey;
        uint256 amountIn;
        uint256 amountOut;
        address legitimateRecipient;
        address legitimatePoster;
        TamperType tamperType;
        address maliciousAddress;
        uint256 maliciousAmount;
    }

    address internal immutable deployer = makeAddr("deployer");
    address internal spaceFactory;
    IPausable internal pausableFacet;

    function setUp() public override {
        DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
        spaceFactory = deploySpaceFactory.deploy(deployer);
        _spaceFactory = spaceFactory;
        _deployer = deployer;

        super.setUp();

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
        // pause the router
        vm.prank(deployer);
        pausableFacet.pause();

        // get swap parameters
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0),
            address(token1),
            DEFAULT_AMOUNT_IN,
            DEFAULT_AMOUNT_OUT,
            address(this)
        );

        // expect revert when paused
        vm.expectRevert(Pausable__Paused.selector);
        swapRouter.executeSwap(inputParams, routerParams, POSTER);
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
        // test with invalid router
        RouterParams memory routerParams = defaultRouterParams;
        routerParams.router = makeAddr("invalidRouter");

        vm.expectRevert(SwapRouter__InvalidRouter.selector);
        swapRouter.executeSwap(defaultInputParams, routerParams, POSTER);

        // test with invalid approveTarget
        routerParams.router = mockRouter;
        routerParams.approveTarget = makeAddr("invalidRouter");

        vm.expectRevert(SwapRouter__InvalidRouter.selector);
        swapRouter.executeSwap(defaultInputParams, routerParams, POSTER);
    }

    function test_executeSwap_revertWhen_recipientRequired() public {
        // modify default params to have invalid recipient
        ExactInputParams memory inputParams = defaultInputParams;
        inputParams.recipient = address(0);

        vm.expectRevert(SwapRouter__RecipientRequired.selector);
        swapRouter.executeSwap(inputParams, defaultRouterParams, POSTER);
    }

    function test_executeSwap_revertWhen_invalidAmount_nativeToken() external {
        // modify default params for ETH input
        ExactInputParams memory inputParams = defaultInputParams;
        inputParams.tokenIn = CurrencyTransfer.NATIVE_TOKEN;
        inputParams.amountIn = 1 ether;

        // send incorrect ETH amount with the transaction
        uint256 incorrectAmount = 0.5 ether;

        vm.expectRevert(SwapRouter__InvalidAmount.selector);
        swapRouter.executeSwap{value: incorrectAmount}(inputParams, defaultRouterParams, POSTER);
    }

    function test_executeSwap_revertWhen_invalidBps() public {
        // set invalid fees that exceed MAX_BPS (exceeding 100%)
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(5001, 5001); // 50.01% each

        // mint tokens and approve
        token0.mint(address(this), DEFAULT_AMOUNT_IN);
        token0.approve(address(swapRouter), DEFAULT_AMOUNT_IN);

        vm.expectRevert(SwapRouter__InvalidBps.selector);
        swapRouter.executeSwap(defaultInputParams, defaultRouterParams, POSTER);
    }

    function test_executeSwap_revertWhen_insufficientOutput() external {
        uint256 actualOutAmount = 90 ether;
        uint256 minAmountOut = 95 ether; // higher than what the router will return

        // modify default params to set high minAmountOut
        ExactInputParams memory inputParams = defaultInputParams;
        inputParams.minAmountOut = minAmountOut;

        RouterParams memory routerParams = defaultRouterParams;
        routerParams.swapData = _encodeSwapData(
            address(token0),
            address(token1),
            DEFAULT_AMOUNT_IN,
            actualOutAmount, // lower than minAmountOut
            address(swapRouter)
        );

        // mint tokens and approve
        token0.mint(address(this), DEFAULT_AMOUNT_IN);
        token0.approve(address(swapRouter), DEFAULT_AMOUNT_IN);

        vm.expectRevert(SwapRouter__InsufficientOutput.selector);
        swapRouter.executeSwap(inputParams, routerParams, POSTER);
    }

    function test_executeSwap_revertWhen_unexpectedETH() external {
        // send ETH with the transaction even though tokenIn is not native token
        vm.expectRevert(SwapRouter__UnexpectedETH.selector);
        swapRouter.executeSwap{value: 0.1 ether}(defaultInputParams, defaultRouterParams, POSTER);
    }

    function test_executeSwap_gas() public {
        test_executeSwap(
            address(this),
            address(this),
            DEFAULT_AMOUNT_IN,
            DEFAULT_AMOUNT_OUT,
            PROTOCOL_BPS,
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
        vm.assume(recipient != address(0) && recipient != feeRecipient && recipient != POSTER);

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
            POSTER,
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
        swapRouter.executeSwap(inputParams, routerParams, POSTER);
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
            PROTOCOL_BPS,
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
        vm.assume(
            caller != address(0) &&
                caller != address(swapRouter) &&
                caller != mockRouter &&
                caller != feeRecipient &&
                caller != POSTER
        );
        vm.assume(recipient != address(0) && recipient != feeRecipient && recipient != POSTER);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // ensure fee basis points are within reasonable limits (0-10%)
        treasuryBps = uint16(bound(treasuryBps, 0, 1000));
        posterBps = uint16(bound(posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(treasuryBps, posterBps);

        (uint256 amountInAfterFees, , ) = swapRouter.getETHInputFees(amountIn, caller, POSTER);

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
        swapRouter.executeSwap{value: amountIn}(inputParams, routerParams, POSTER);

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
            DEFAULT_AMOUNT_IN,
            DEFAULT_AMOUNT_OUT,
            PROTOCOL_BPS,
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
        vm.assume(recipient != feeRecipient && recipient != POSTER);
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
        swapRouter.executeSwap(inputParams, routerParams, POSTER);
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

    function test_executeSwap_zeroPosterFee() public {
        address recipient = makeAddr("recipient");

        // set fees with zero poster fee
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(PROTOCOL_BPS, 0);

        // modify default params to use custom recipient
        ExactInputParams memory inputParams = defaultInputParams;
        inputParams.recipient = recipient;

        // mint tokens and approve
        token0.mint(address(this), DEFAULT_AMOUNT_IN);
        token0.approve(address(swapRouter), DEFAULT_AMOUNT_IN);

        uint256 expectedProtocolFee = BasisPoints.calculate(DEFAULT_AMOUNT_OUT, PROTOCOL_BPS);

        vm.expectEmit(address(swapRouter));
        emit FeeDistribution(
            address(token1),
            feeRecipient,
            address(0), // zero poster
            expectedProtocolFee,
            0 // zero poster fee
        );

        swapRouter.executeSwap(inputParams, defaultRouterParams, address(0)); // zero poster

        // verify balances
        assertEq(token0.balanceOf(address(this)), 0, "Caller should have no tokens left");
        assertEq(
            token1.balanceOf(feeRecipient),
            expectedProtocolFee,
            "Fee recipient should get protocol fee"
        );
        assertEq(token1.balanceOf(address(0)), 0, "Zero address should have no tokens");
        assertEq(
            token1.balanceOf(recipient),
            DEFAULT_AMOUNT_OUT - expectedProtocolFee,
            "Recipient should get remaining tokens"
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      SWAP WITH PERMIT                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeSwapWithPermit_revertWhen_unexpectedETH() public {
        // Send ETH with the transaction (not allowed for permit flows)
        vm.expectRevert(SwapRouter__UnexpectedETH.selector);
        swapRouter.executeSwapWithPermit{value: 0.1 ether}(
            defaultInputParams,
            defaultRouterParams,
            defaultEmptyPermit,
            POSTER
        );
    }

    function test_executeSwapWithPermit_revertWhen_invalidAmount(uint256 permitAmount) public {
        // create permit with insufficient amount
        Permit2Params memory permitParams = defaultEmptyPermit;
        permitParams.token = address(token0);
        permitParams.amount = bound(permitAmount, 0, DEFAULT_AMOUNT_IN - 1);

        // expect revert with InvalidAmount (permit amount < amountIn)
        vm.expectRevert(SwapRouter__InvalidAmount.selector);
        swapRouter.executeSwapWithPermit(
            defaultInputParams,
            defaultRouterParams,
            permitParams,
            POSTER
        );
    }

    function test_executeSwapWithPermit_revertWhen_permitTokenMismatch() public {
        // create permit for wrong token
        Permit2Params memory permitParams = defaultEmptyPermit;
        permitParams.token = address(token1); // wrong token - should be token0

        vm.expectRevert(SwapRouter__PermitTokenMismatch.selector);
        swapRouter.executeSwapWithPermit(
            defaultInputParams,
            defaultRouterParams,
            permitParams,
            POSTER
        );
    }

    function test_executeSwapWithPermit_revertWhen_nativeTokenNotSupported() public {
        // create params with native token as input (not supported with permit)
        ExactInputParams memory inputParams = defaultInputParams;
        inputParams.tokenIn = CurrencyTransfer.NATIVE_TOKEN;

        vm.expectRevert(SwapRouter__NativeTokenNotSupportedWithPermit.selector);
        swapRouter.executeSwapWithPermit(
            inputParams,
            defaultRouterParams,
            defaultEmptyPermit,
            POSTER
        );
    }

    function test_executeSwapWithPermit_revertWhen_recipientRequired() public {
        // create params with invalid recipient - no need for valid permit since validation happens early
        ExactInputParams memory inputParams = defaultInputParams;
        inputParams.recipient = address(0);

        vm.expectRevert(SwapRouter__RecipientRequired.selector);
        swapRouter.executeSwapWithPermit(
            inputParams,
            defaultRouterParams,
            defaultEmptyPermit,
            POSTER
        );
    }

    function test_executeSwapWithPermit_revertWhen_differentRecipient(
        uint256 privateKey,
        address recipient
    ) public {
        test_executeSwapWithPermit_frontRunning(
            FrontRunningParams({
                privateKey: privateKey,
                amountIn: DEFAULT_AMOUNT_IN,
                amountOut: DEFAULT_AMOUNT_OUT,
                legitimateRecipient: makeAddr("legitimate"),
                legitimatePoster: POSTER,
                tamperType: TamperType.RECIPIENT,
                maliciousAddress: recipient,
                maliciousAmount: 0
            })
        );
    }

    function test_executeSwapWithPermit_revertWhen_differentPoster(
        uint256 privateKey,
        address poster
    ) public {
        test_executeSwapWithPermit_frontRunning(
            FrontRunningParams({
                privateKey: privateKey,
                amountIn: DEFAULT_AMOUNT_IN,
                amountOut: DEFAULT_AMOUNT_OUT,
                legitimateRecipient: makeAddr("recipient"),
                legitimatePoster: makeAddr("legitimatePoster"),
                tamperType: TamperType.POSTER,
                maliciousAddress: poster,
                maliciousAmount: 0
            })
        );
    }

    /// @notice Generic test for permit front-running attacks
    /// @dev Tests that modifying swap parameters after permit signature should fail
    function test_executeSwapWithPermit_frontRunning(FrontRunningParams memory params) internal {
        // Bound inputs
        params.privateKey = boundPrivateKey(params.privateKey);
        params.amountIn = bound(params.amountIn, 1, type(uint128).max);
        params.amountOut = bound(params.amountOut, 1, type(uint128).max);
        params.maliciousAmount = bound(params.maliciousAmount, 1, type(uint128).max);

        // Ensure addresses are valid and different
        vm.assume(
            params.legitimateRecipient != address(0) && params.legitimatePoster != address(0)
        );
        vm.assume(
            params.maliciousAddress != address(0) &&
                params.maliciousAddress != params.legitimateRecipient
        );
        vm.assume(
            params.legitimateRecipient != feeRecipient &&
                params.legitimateRecipient != params.legitimatePoster
        );
        vm.assume(
            params.maliciousAddress != feeRecipient &&
                params.maliciousAddress != params.legitimatePoster
        );

        address owner = vm.addr(params.privateKey);
        vm.assume(
            owner != feeRecipient &&
                owner != params.legitimatePoster &&
                owner != params.legitimateRecipient
        );

        // Create original swap parameters
        (
            ExactInputParams memory originalParams,
            RouterParams memory originalRouterParams
        ) = _createSwapParams(
                address(swapRouter),
                mockRouter,
                address(token0),
                address(token1),
                params.amountIn,
                params.amountOut,
                params.legitimateRecipient
            );

        // Create permit based on original parameters
        Permit2Params memory originalPermit = _createPermitParams(
            params.privateKey,
            owner,
            address(token0),
            params.amountIn,
            address(swapRouter),
            0,
            block.timestamp + 1 hours,
            originalParams,
            originalRouterParams,
            params.legitimatePoster
        );

        // Create tampered parameters
        (
            ExactInputParams memory tamperedParams,
            RouterParams memory tamperedRouterParams,
            address tamperedPoster
        ) = _createTamperedParams(params, originalParams, originalRouterParams);

        // Setup tokens
        token0.mint(owner, params.amountIn);
        vm.prank(owner);
        token0.approve(PERMIT2, params.amountIn);

        // Attempt swap with tampered parameters - should fail signature verification
        vm.expectRevert(SignatureVerification.InvalidSigner.selector);
        swapRouter.executeSwapWithPermit(
            tamperedParams,
            tamperedRouterParams,
            originalPermit,
            tamperedPoster
        );
    }

    function test_executeSwapWithPermit_gas() public {
        PermitTestParams memory params = PermitTestParams({
            privateKey: 0xabc,
            recipient: makeAddr("recipient"),
            deadline: 1 hours,
            amountIn: DEFAULT_AMOUNT_IN,
            amountOut: DEFAULT_AMOUNT_OUT,
            treasuryBps: PROTOCOL_BPS,
            posterBps: POSTER_BPS
        });
        test_executeSwapWithPermit(params);
    }

    function test_executeSwapWithPermit(PermitTestParams memory params) public {
        vm.assume(
            params.recipient != address(0) &&
                params.recipient != feeRecipient &&
                params.recipient != POSTER
        );

        params.privateKey = boundPrivateKey(params.privateKey);
        params.deadline = bound(params.deadline, block.timestamp + 1, type(uint256).max);
        address owner = vm.addr(params.privateKey);
        vm.assume(owner != feeRecipient && owner != POSTER);

        // ensure amountIn and amountOut are reasonable
        params.amountIn = bound(params.amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        params.amountOut = bound(params.amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // ensure fee basis points are within reasonable limits (0-10%)
        params.treasuryBps = uint16(bound(params.treasuryBps, 0, 1000));
        params.posterBps = uint16(bound(params.posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(params.treasuryBps, params.posterBps);

        // get swap parameters
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0), // token in
            address(token1), // token out
            params.amountIn,
            params.amountOut,
            params.recipient
        );

        // get the permit signature
        Permit2Params memory permitParams = _createPermitParams(
            params.privateKey,
            owner,
            address(token0),
            params.amountIn,
            address(swapRouter),
            0, // nonce
            params.deadline,
            inputParams,
            routerParams,
            POSTER
        );

        // mint tokens for owner and approve Permit2
        token0.mint(owner, params.amountIn);
        vm.prank(owner);
        token0.approve(PERMIT2, params.amountIn);

        // execute swap with permit
        swapRouter.executeSwapWithPermit(inputParams, routerParams, permitParams, POSTER);

        _verifySwapResults(
            address(token0),
            address(token1),
            owner,
            params.recipient,
            params.amountIn,
            params.amountOut,
            params.treasuryBps,
            params.posterBps
        );
    }

    function test_executeSwapWithPermit_swapTokenToEth_gas() public {
        PermitTestParams memory params = PermitTestParams({
            privateKey: 0xabc,
            recipient: makeAddr("recipient"),
            deadline: block.timestamp + 1 hours,
            amountIn: DEFAULT_AMOUNT_IN,
            amountOut: DEFAULT_AMOUNT_OUT,
            treasuryBps: PROTOCOL_BPS,
            posterBps: POSTER_BPS
        });
        test_executeSwapWithPermit_swapTokenToEth(params);
    }

    function test_executeSwapWithPermit_swapTokenToEth(
        PermitTestParams memory params
    ) public assumeEOA(params.recipient) {
        vm.assume(params.recipient != feeRecipient && params.recipient != POSTER);
        vm.assume(params.recipient.balance == 0);

        params.privateKey = boundPrivateKey(params.privateKey);
        params.deadline = bound(params.deadline, block.timestamp + 1, type(uint256).max);
        address owner = vm.addr(params.privateKey);
        vm.assume(owner != feeRecipient && owner != POSTER);

        // ensure amountIn and amountOut are reasonable
        params.amountIn = bound(params.amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        params.amountOut = bound(params.amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // ensure fee basis points are within reasonable limits (0-10%)
        params.treasuryBps = uint16(bound(params.treasuryBps, 0, 1000));
        params.posterBps = uint16(bound(params.posterBps, 0, 1000));

        // set custom fees for this test
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(params.treasuryBps, params.posterBps);

        // get swap parameters for token to ETH
        (ExactInputParams memory inputParams, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0), // token in
            CurrencyTransfer.NATIVE_TOKEN, // ETH out
            params.amountIn,
            params.amountOut,
            params.recipient
        );

        // get the permit signature
        Permit2Params memory permitParams = _createPermitParams(
            params.privateKey,
            owner,
            address(token0),
            params.amountIn,
            address(swapRouter),
            0, // nonce
            params.deadline,
            inputParams,
            routerParams,
            POSTER
        );

        // mint tokens for owner and approve Permit2
        token0.mint(owner, params.amountIn);
        vm.prank(owner);
        token0.approve(PERMIT2, params.amountIn);

        // fund mockRouter with ETH to swap out
        deal(mockRouter, params.amountOut * 2);

        // execute swap with permit
        swapRouter.executeSwapWithPermit(inputParams, routerParams, permitParams, POSTER);

        _verifySwapResults(
            address(token0),
            CurrencyTransfer.NATIVE_TOKEN,
            owner,
            params.recipient,
            params.amountIn,
            params.amountOut,
            params.treasuryBps,
            params.posterBps
        );
    }

    function test_getETHInputFees() public {
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(100, 50); // 1% protocol, 0.5% poster

        (uint256 amountInAfterFees, uint256 protocolFee, uint256 posterFee) = swapRouter
            .getETHInputFees(1 ether, makeAddr("caller"), makeAddr("poster"));

        assertEq(protocolFee, 0.01 ether, "Protocol fee should be 1%");
        assertEq(posterFee, 0.005 ether, "Poster fee should be 0.5%");
        assertEq(amountInAfterFees, 0.985 ether, "Amount after fees should be correct");

        // test with zero poster
        (uint256 amountInAfterFees2, uint256 protocolFee2, uint256 posterFee2) = swapRouter
            .getETHInputFees(1 ether, makeAddr("caller"), address(0));

        assertEq(protocolFee2, 0.01 ether, "Protocol fee should be same with zero poster");
        assertEq(posterFee2, 0, "Poster fee should be zero with zero poster");
        assertEq(amountInAfterFees2, 0.99 ether, "Amount should exclude poster fee");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            UTILS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createTamperedParams(
        FrontRunningParams memory params,
        ExactInputParams memory originalParams,
        RouterParams memory originalRouterParams
    )
        internal
        pure
        returns (
            ExactInputParams memory tamperedParams,
            RouterParams memory tamperedRouterParams,
            address tamperedPoster
        )
    {
        tamperedParams = originalParams;
        tamperedRouterParams = originalRouterParams;
        tamperedPoster = params.legitimatePoster;

        if (params.tamperType == TamperType.RECIPIENT) {
            tamperedParams.recipient = params.maliciousAddress;
        } else if (params.tamperType == TamperType.POSTER) {
            tamperedPoster = params.maliciousAddress;
        } else if (params.tamperType == TamperType.AMOUNT_IN) {
            tamperedParams.amountIn = params.maliciousAmount;
        } else if (params.tamperType == TamperType.AMOUNT_OUT) {
            tamperedParams.minAmountOut = params.maliciousAmount;
        } else if (params.tamperType == TamperType.TOKEN_IN) {
            tamperedParams.tokenIn = params.maliciousAddress;
        } else if (params.tamperType == TamperType.TOKEN_OUT) {
            tamperedParams.tokenOut = params.maliciousAddress;
        } else if (params.tamperType == TamperType.ROUTER) {
            tamperedRouterParams.router = params.maliciousAddress;
        }
    }
}
