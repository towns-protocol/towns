// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ITownsPoints, ITownsPointsBase} from "../../../src/airdrop/points/ITownsPoints.sol";
import {IPlatformRequirements} from "../../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IImplementationRegistry} from "../../../src/factory/facets/registry/IImplementationRegistry.sol";
import {IEntitlementBase} from "../../../src/spaces/entitlements/IEntitlement.sol";
import {ISwapFacetBase, ISwapFacet} from "../../../src/spaces/facets/swap/ISwapFacet.sol";

// libraries
import {BasisPoints} from "../../../src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../../src/utils/libraries/CurrencyTransfer.sol";
import {SwapFacetStorage} from "../../../src/spaces/facets/swap/SwapFacetStorage.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {MembershipFacet} from "../../../src/spaces/facets/membership/MembershipFacet.sol";

// helpers
import {SwapTestBase} from "../../router/SwapTestBase.sol";
import {BaseSetup} from "../BaseSetup.sol";

contract SwapFacetTest is BaseSetup, SwapTestBase, ISwapFacetBase, IOwnableBase, IEntitlementBase {
    using SafeTransferLib for address;

    MembershipFacet internal membership;
    ISwapFacet internal swapFacet;
    address internal immutable user = makeAddr("user");

    function setUp() public override(BaseSetup, SwapTestBase) {
        BaseSetup.setUp();

        _spaceFactory = spaceFactory;
        _deployer = deployer;
        SwapTestBase.setUp();

        membership = MembershipFacet(everyoneSpace);
        swapFacet = ISwapFacet(everyoneSpace);

        // set swap fees
        vm.prank(deployer);
        IPlatformRequirements(spaceFactory).setSwapFees(PROTOCOL_BPS, POSTER_BPS);

        // add the swap router to the space factory
        vm.prank(deployer);
        implementationRegistry.addImplementation(address(swapRouter));

        // configure poster fee to go to poster (old behavior) for existing tests
        vm.prank(founder);
        swapFacet.setSwapFeeConfig(POSTER_BPS, true);
    }

    function test_storageSlot() external pure {
        bytes32 slot = keccak256(abi.encode(uint256(keccak256("spaces.facets.swap.storage")) - 1)) &
            ~bytes32(uint256(0xff));
        assertEq(slot, SwapFacetStorage.STORAGE_SLOT, "slot");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      setSwapFeeConfig                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setSwapFeeConfig_revertIf_notOwner(address caller) external {
        vm.assume(caller != founder);
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, caller));
        swapFacet.setSwapFeeConfig(30, true);
    }

    function test_setSwapFeeConfig_revertIf_totalFeeTooHigh() external {
        // Total fee = TREASURY_BPS + posterFeeBps must be <= MAX_FEE_BPS (2%)
        uint16 tooHighPosterFeeBps = MAX_FEE_BPS - PROTOCOL_BPS + 1;

        vm.prank(founder);
        vm.expectRevert(SwapFacet__TotalFeeTooHigh.selector);
        swapFacet.setSwapFeeConfig(tooHighPosterFeeBps, true);
    }

    function test_setSwapFeeConfig(uint16 newPosterFeeBps, bool forwardPosterFee) public {
        newPosterFeeBps = uint16(bound(newPosterFeeBps, 0, MAX_FEE_BPS - PROTOCOL_BPS));

        vm.expectEmit(everyoneSpace);
        emit SwapFeeConfigUpdated(newPosterFeeBps, forwardPosterFee);

        vm.prank(founder);
        swapFacet.setSwapFeeConfig(newPosterFeeBps, forwardPosterFee);

        (uint16 protocolBps, uint16 posterBps, bool returnedForwardPosterFee) = swapFacet
            .getSwapFees();
        assertEq(protocolBps, PROTOCOL_BPS, "Treasury fee should match platform fee");
        // Current logic: if forwardPosterFee=true OR newPosterFeeBps!=0, use newPosterFeeBps
        assertEq(
            posterBps,
            (forwardPosterFee || newPosterFeeBps != 0) ? newPosterFeeBps : POSTER_BPS,
            "Poster fee should be updated"
        );
        assertEq(
            returnedForwardPosterFee,
            forwardPosterFee,
            "Forward poster fee flag should be updated"
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         executeSwap                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeSwap_revertIf_notMember(address nonMember) external {
        vm.assume(nonMember != address(0));
        vm.assume(everyoneSpace.balanceOf(nonMember) == 0);

        vm.prank(nonMember);
        vm.expectRevert(Entitlement__NotMember.selector);
        swapFacet.executeSwap(defaultInputParams, defaultRouterParams, POSTER);
    }

    function test_executeSwap_revertIf_swapRouterNotSet() external givenMembership(user) {
        vm.mockCall(
            spaceFactory,
            abi.encodeCall(IImplementationRegistry.getLatestImplementation, bytes32("SwapRouter")),
            abi.encode(address(0))
        );

        vm.prank(user);
        vm.expectRevert(SwapFacet__SwapRouterNotSet.selector);
        swapFacet.executeSwap(defaultInputParams, defaultRouterParams, POSTER);
    }

    function test_executeSwap_revertIf_swapFailed() external givenMembership(user) {
        vm.startPrank(user);
        deal(address(token0), user, defaultInputParams.amountIn);
        token0.approve(everyoneSpace, defaultInputParams.amountIn);

        defaultRouterParams.swapData = "";
        // With empty calldata, the call to MockRouter will fail at the low level
        // since MockRouter doesn't have a fallback function
        vm.expectRevert();
        swapFacet.executeSwap(defaultInputParams, defaultRouterParams, POSTER);
        vm.stopPrank();
    }

    function test_executeSwap(
        uint256 amountIn,
        uint256 amountOut,
        address caller,
        address recipient
    ) external givenMembership(caller) {
        vm.assume(caller != founder);
        vm.assume(recipient != address(0) && recipient != POSTER && recipient != feeRecipient);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // mint tokens and approve
        deal(address(token0), caller, amountIn);
        vm.prank(caller);
        token0.approve(everyoneSpace, amountIn);

        // get swap parameters
        (ExactInputParams memory params, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0),
            address(token1),
            amountIn,
            amountOut,
            recipient
        );

        uint256 expectedAmountOut = _calculateExpectedAmountOut(amountOut);

        vm.expectEmit(everyoneSpace);
        emit SwapExecuted(
            recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            expectedAmountOut,
            POSTER
        );

        vm.prank(caller);
        swapFacet.executeSwap(params, routerParams, POSTER);

        _verifySwapResults(
            address(token0),
            address(token1),
            caller,
            recipient,
            amountIn,
            amountOut,
            PROTOCOL_BPS,
            POSTER_BPS
        );

        // verify no leftover tokens in SwapFacet
        assertEq(token0.balanceOf(everyoneSpace), 0, "No token0 should remain in SwapFacet");
    }

    function test_executeSwap_swapEthToToken(
        uint256 amountIn,
        uint256 amountOut,
        address caller,
        address recipient
    ) external givenMembership(caller) {
        vm.assume(caller != founder && caller != POSTER && caller != feeRecipient);
        vm.assume(recipient != address(0) && recipient != POSTER && recipient != feeRecipient);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1 ether / 100, 10 ether);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        (uint256 amountInAfterFees, uint256 protocolFee, ) = swapRouter.getETHInputFees(
            amountIn,
            address(swapFacet),
            POSTER
        );

        // calculate expected points for ETH input
        uint256 expectedPoints = _getPoints(protocolFee);

        // get swap parameters
        (ExactInputParams memory params, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            CurrencyTransfer.NATIVE_TOKEN,
            address(token1),
            amountInAfterFees,
            amountOut,
            recipient
        );
        params.amountIn = amountIn;

        vm.expectEmit(address(riverAirdrop));
        emit IERC20.Transfer(address(0), caller, expectedPoints);

        vm.expectEmit(everyoneSpace);
        emit SwapExecuted(
            recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            amountOut,
            POSTER
        );

        deal(caller, amountIn);
        vm.prank(caller);
        swapFacet.executeSwap{value: amountIn}(params, routerParams, POSTER);

        _verifySwapResults(
            CurrencyTransfer.NATIVE_TOKEN,
            address(token1),
            caller,
            recipient,
            amountIn,
            amountOut,
            PROTOCOL_BPS,
            POSTER_BPS
        );

        // verify points were minted correctly
        assertEq(
            riverAirdrop.balanceOf(caller),
            expectedPoints,
            "ETH input swap should mint correct points"
        );

        // verify no leftover ETH in SwapFacet
        assertEq(everyoneSpace.balance, 0, "No ETH should remain in SwapFacet");
    }

    function test_executeSwap_swapTokenToEth(
        uint256 amountIn,
        uint256 amountOut,
        address caller,
        address recipient
    ) external givenMembership(caller) assumeEOA(recipient) {
        vm.assume(caller != founder);
        vm.assume(recipient != POSTER && recipient != feeRecipient);
        vm.assume(recipient.balance == 0);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // mint tokens and approve
        deal(address(token0), caller, amountIn);
        vm.prank(caller);
        token0.approve(everyoneSpace, amountIn);

        // get swap parameters for token to ETH
        (ExactInputParams memory params, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0),
            CurrencyTransfer.NATIVE_TOKEN,
            amountIn,
            amountOut,
            recipient
        );

        // fund mockRouter with ETH to swap out
        deal(mockRouter, amountOut * 2);

        uint256 expectedAmountOut = _calculateExpectedAmountOut(amountOut);

        // calculate protocol fee and expected points
        uint256 protocolFee = BasisPoints.calculate(amountOut, PROTOCOL_BPS);
        uint256 expectedPoints = _getPoints(protocolFee);

        vm.expectEmit(address(riverAirdrop));
        emit IERC20.Transfer(address(0), caller, expectedPoints);

        vm.expectEmit(everyoneSpace);
        emit SwapExecuted(
            recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            expectedAmountOut,
            POSTER
        );

        vm.prank(caller);
        swapFacet.executeSwap(params, routerParams, POSTER);

        _verifySwapResults(
            address(token0),
            CurrencyTransfer.NATIVE_TOKEN,
            caller,
            recipient,
            amountIn,
            amountOut,
            PROTOCOL_BPS,
            POSTER_BPS
        );

        // verify points were minted correctly
        assertEq(
            riverAirdrop.balanceOf(caller),
            expectedPoints,
            "ETH output swap should mint correct points"
        );

        // verify no leftover tokens in SwapFacet
        assertEq(token0.balanceOf(everyoneSpace), 0, "No token0 should remain in SwapFacet");
    }

    function test_executeSwap_posterFeeHandling(
        uint256 amountIn,
        uint256 amountOut,
        address caller,
        address recipient,
        address poster_,
        uint16 posterBps,
        bool forwardPosterFee
    ) external givenMembership(caller) {
        vm.assume(caller != founder);
        vm.assume(
            recipient != address(0) &&
                recipient != poster_ &&
                recipient != feeRecipient &&
                recipient != everyoneSpace
        );
        vm.assume(poster_ != feeRecipient && poster_ != everyoneSpace);
        posterBps = uint16(bound(posterBps, 0, MAX_FEE_BPS - PROTOCOL_BPS));

        // set fee config
        vm.prank(founder);
        swapFacet.setSwapFeeConfig(posterBps, forwardPosterFee);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // get swap parameters
        (ExactInputParams memory params, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0),
            address(token1),
            amountIn,
            amountOut,
            recipient
        );

        // mint tokens and approve
        deal(address(token0), caller, amountIn);
        vm.prank(caller);
        token0.approve(everyoneSpace, amountIn);

        // calculate expected fees and amounts based on configuration
        uint256 protocolFee = BasisPoints.calculate(amountOut, PROTOCOL_BPS);
        uint256 posterFee;

        // determine poster fee based on configuration
        if (!forwardPosterFee) {
            // if posterBps is 0, SwapFacet falls back to platform default
            uint16 actualPosterBps = posterBps == 0 ? POSTER_BPS : posterBps;
            posterFee = BasisPoints.calculate(amountOut, actualPosterBps);
        } else if (poster_ != address(0)) {
            posterFee = BasisPoints.calculate(amountOut, posterBps);
        }
        // else: poster_ == address(0), so no poster fee (posterFee remains 0)

        uint256 expectedAmountOut = amountOut - protocolFee - posterFee;

        vm.expectEmit(everyoneSpace);
        emit SwapExecuted(
            recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            expectedAmountOut,
            poster_ // original poster used in event
        );

        vm.prank(caller);
        uint256 actualAmountOut = swapFacet.executeSwap(params, routerParams, poster_);

        // verify fee distribution based on configuration
        if (!forwardPosterFee) {
            assertEq(
                params.tokenOut.balanceOf(everyoneSpace),
                posterFee,
                "Space should receive poster fee"
            );
            if (poster_ != address(0)) {
                assertEq(params.tokenOut.balanceOf(poster_), 0, "Poster should not receive fee");
            }
        } else {
            assertEq(
                params.tokenOut.balanceOf(everyoneSpace),
                0,
                "Space should not receive poster fee"
            );
            if (poster_ != address(0)) {
                assertEq(
                    params.tokenOut.balanceOf(poster_),
                    posterFee,
                    "Poster should receive fee"
                );
            }
        }

        assertEq(
            params.tokenOut.balanceOf(feeRecipient),
            protocolFee,
            "Protocol fee should always be sent to fee recipient"
        );
        assertEq(actualAmountOut, expectedAmountOut, "Returned amount should match expected");
        assertEq(token0.balanceOf(caller), 0, "Token0 should be spent");
        assertEq(token1.balanceOf(recipient), actualAmountOut, "Token1 should be received");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      PARTIAL SWAP REFUNDS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeSwap_partialSwapERC20WithRefund(
        uint256 initialBalance,
        uint256 maxAmountIn,
        uint256 actualAmountIn,
        uint256 amountOut,
        address caller
    ) external givenMembership(caller) {
        vm.assume(caller != founder && caller != POSTER && caller != feeRecipient);

        // Bound initial balance to reasonable range
        initialBalance = bound(initialBalance, 0, type(uint256).max >> 1);

        // Bound inputs for reasonable ranges, accounting for initial balance
        maxAmountIn = bound(
            maxAmountIn,
            2,
            FixedPointMathLib.min(
                type(uint256).max - initialBalance,
                type(uint256).max / BasisPoints.MAX_BPS
            )
        );
        actualAmountIn = bound(actualAmountIn, 1, maxAmountIn - 1); // ensure partial consumption
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // Use _createPartialSwapParams to create proper partial swap scenario
        (
            ExactInputParams memory params,
            RouterParams memory routerParams
        ) = _createPartialSwapParams(
                address(token0),
                address(token1),
                maxAmountIn,
                actualAmountIn,
                amountOut,
                caller
            );

        // Give SwapFacet an initial balance to test refund logic with pre-existing tokens
        deal(address(token0), everyoneSpace, initialBalance);

        // Setup and execute swap
        deal(address(token0), caller, maxAmountIn);
        vm.prank(caller);
        token0.approve(everyoneSpace, maxAmountIn);

        deal(address(token1), mockRouter, amountOut);

        uint256 userBalanceBefore = token0.balanceOf(caller);

        vm.prank(caller);
        swapFacet.executeSwap(params, routerParams, POSTER);

        // Verify refund: user should get back (maxAmountIn - actualAmountIn)
        uint256 expectedRefund = maxAmountIn - actualAmountIn;
        assertEq(
            token0.balanceOf(caller),
            userBalanceBefore - maxAmountIn + expectedRefund,
            "User should receive refund of unconsumed tokens"
        );

        // Verify initial balance remains in SwapFacet
        assertEq(
            token0.balanceOf(everyoneSpace),
            initialBalance,
            "Initial balance should remain in SwapFacet"
        );
    }

    function test_executeSwap_partialSwapETHWithRefund(
        uint256 initialETHBalance,
        uint256 maxAmountIn,
        uint256 actualAmountIn,
        uint256 amountOut,
        address caller
    ) external assumeEOA(caller) givenMembership(caller) {
        vm.assume(caller != founder && caller != POSTER && caller != feeRecipient);

        // Bound initial ETH balance to reasonable range
        initialETHBalance = bound(initialETHBalance, 0, type(uint256).max >> 1);

        // Bound inputs for reasonable ETH ranges, accounting for initial balance
        maxAmountIn = bound(
            maxAmountIn,
            1 gwei,
            FixedPointMathLib.min(
                type(uint256).max - initialETHBalance,
                type(uint256).max / BasisPoints.MAX_BPS
            )
        );
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // Calculate fees first
        (uint256 amountInAfterFees, , ) = swapRouter.getETHInputFees(
            maxAmountIn,
            address(swapFacet),
            POSTER
        );

        // actualAmountIn must be less than amountInAfterFees (what goes to router)
        actualAmountIn = bound(actualAmountIn, 1, amountInAfterFees - 1);

        // Use _createPartialSwapParams for ETH
        (
            ExactInputParams memory params,
            RouterParams memory routerParams
        ) = _createPartialSwapParams(
                CurrencyTransfer.NATIVE_TOKEN,
                address(token1),
                amountInAfterFees,
                actualAmountIn,
                amountOut,
                caller
            );
        params.amountIn = maxAmountIn; // Set original amount for fee calculation

        // Give SwapFacet an initial ETH balance to test refund logic with pre-existing ETH
        deal(everyoneSpace, initialETHBalance);

        // Setup and execute swap
        deal(caller, maxAmountIn);
        deal(address(token1), mockRouter, amountOut);

        uint256 userBalanceBefore = caller.balance;

        vm.prank(caller);
        swapFacet.executeSwap{value: maxAmountIn}(params, routerParams, POSTER);

        // Verify refund: user should get back unconsumed ETH
        uint256 expectedRefund = amountInAfterFees - actualAmountIn;
        assertEq(
            caller.balance,
            userBalanceBefore - maxAmountIn + expectedRefund,
            "User should receive refund of unconsumed ETH"
        );

        // Verify initial ETH balance remains in SwapFacet
        assertEq(
            everyoneSpace.balance,
            initialETHBalance,
            "Initial ETH balance should remain in SwapFacet"
        );
    }

    function test_executeSwap_partialSwapETHWithPosterFeeToSpace(
        uint256 initialETHBalance,
        uint256 maxAmountIn,
        uint256 actualAmountIn,
        uint256 amountOut,
        address caller
    ) external assumeEOA(caller) givenMembership(caller) {
        vm.assume(caller != founder && caller != POSTER && caller != feeRecipient);

        // Set poster fee to be collected to space (default behavior, forwardPosterFee=false)
        vm.prank(founder);
        swapFacet.setSwapFeeConfig(50, false); // 0.5% poster fee to space

        // Bound initial ETH balance to reasonable range
        initialETHBalance = bound(initialETHBalance, 0, type(uint256).max >> 1);

        // Bound inputs for reasonable ETH ranges
        maxAmountIn = bound(
            maxAmountIn,
            1 gwei,
            FixedPointMathLib.min(
                type(uint256).max - initialETHBalance,
                type(uint256).max / BasisPoints.MAX_BPS
            )
        );
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // Calculate fees
        (uint256 amountInAfterFees, , uint256 posterFee) = swapRouter.getETHInputFees(
            maxAmountIn,
            address(swapFacet),
            POSTER
        );

        // actualAmountIn must be less than amountInAfterFees (what goes to router)
        actualAmountIn = bound(actualAmountIn, 1, amountInAfterFees - 1);

        // Use _createPartialSwapParams for ETH
        (
            ExactInputParams memory params,
            RouterParams memory routerParams
        ) = _createPartialSwapParams(
                CurrencyTransfer.NATIVE_TOKEN,
                address(token1),
                amountInAfterFees,
                actualAmountIn,
                amountOut,
                caller
            );
        params.amountIn = maxAmountIn; // Set original amount for fee calculation

        // Give SwapFacet an initial ETH balance to test refund logic with pre-existing ETH
        deal(everyoneSpace, initialETHBalance);

        // Setup and execute swap
        deal(caller, maxAmountIn);
        deal(address(token1), mockRouter, amountOut);

        uint256 userBalanceBefore = caller.balance;

        vm.prank(caller);
        swapFacet.executeSwap{value: maxAmountIn}(params, routerParams, POSTER);

        // Verify refund: user should get back unconsumed ETH but not poster fee
        uint256 expectedRefund = amountInAfterFees - actualAmountIn;
        assertEq(
            caller.balance,
            userBalanceBefore - maxAmountIn + expectedRefund,
            "User should receive refund but not poster fee"
        );

        // Verify space retained initial balance plus the poster fee
        assertEq(
            everyoneSpace.balance,
            initialETHBalance + posterFee,
            "Space should retain initial balance plus poster fee"
        );
    }

    function test_executeSwapWithPermit_partialSwapWithRefund(
        uint256 privateKey,
        uint256 initialBalance,
        uint256 maxAmountIn,
        uint256 actualAmountIn,
        uint256 amountOut,
        address recipient
    ) external givenMembership(user) {
        vm.assume(recipient != address(0) && recipient != POSTER && recipient != feeRecipient);

        privateKey = boundPrivateKey(privateKey);
        address owner = vm.addr(privateKey);
        vm.assume(owner != feeRecipient && owner != POSTER);

        // Bound initial balance to reasonable range
        initialBalance = bound(initialBalance, 0, type(uint256).max >> 1);

        // Bound inputs for reasonable ranges, accounting for initial balance
        maxAmountIn = bound(
            maxAmountIn,
            2,
            FixedPointMathLib.min(
                type(uint256).max - initialBalance,
                type(uint256).max / BasisPoints.MAX_BPS
            )
        );
        actualAmountIn = bound(actualAmountIn, 1, maxAmountIn - 1); // ensure partial consumption
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // Use _createPartialSwapParams for Permit2
        (
            ExactInputParams memory params,
            RouterParams memory routerParams
        ) = _createPartialSwapParams(
                address(token0),
                address(token1),
                maxAmountIn,
                actualAmountIn,
                amountOut,
                recipient
            );

        // Create permit signature
        Permit2Params memory permitParams = _createPermitParams(
            privateKey,
            owner,
            address(swapRouter),
            0,
            block.timestamp + 1 hours,
            params,
            routerParams,
            POSTER
        );

        // Give SwapFacet an initial balance to test refund logic with pre-existing tokens
        deal(address(token0), everyoneSpace, initialBalance);

        // Setup and execute
        token0.mint(owner, maxAmountIn);
        vm.prank(owner);
        token0.approve(PERMIT2, maxAmountIn);

        deal(address(token1), mockRouter, amountOut);

        uint256 ownerBalanceBefore = token0.balanceOf(owner);

        vm.prank(user);
        swapFacet.executeSwapWithPermit(params, routerParams, permitParams, POSTER);

        // Verify refund to permit owner
        uint256 expectedRefund = maxAmountIn - actualAmountIn;
        assertEq(
            token0.balanceOf(owner),
            ownerBalanceBefore - maxAmountIn + expectedRefund,
            "Owner should receive refund of unconsumed tokens"
        );

        // Verify initial balance remains in SwapFacet
        assertEq(
            token0.balanceOf(everyoneSpace),
            initialBalance,
            "Initial balance should remain in SwapFacet"
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    executeSwapWithPermit                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeSwapWithPermit_revertIf_unexpectedETH() external givenMembership(user) {
        deal(user, 1 ether); // Give user enough ETH
        vm.prank(user);
        vm.expectRevert(SwapFacet__UnexpectedETH.selector);
        swapFacet.executeSwapWithPermit{value: 0.1 ether}(
            defaultInputParams,
            defaultRouterParams,
            defaultEmptyPermit,
            POSTER
        );
    }

    function test_executeSwapWithPermit_revertIf_notMember(address nonMember) external {
        vm.assume(nonMember != address(0));
        vm.assume(everyoneSpace.balanceOf(nonMember) == 0);

        vm.prank(nonMember);
        vm.expectRevert(Entitlement__NotMember.selector);
        swapFacet.executeSwapWithPermit(
            defaultInputParams,
            defaultRouterParams,
            defaultEmptyPermit,
            POSTER
        );
    }

    function test_executeSwapWithPermit_revertIf_swapRouterNotSet() external givenMembership(user) {
        vm.mockCall(
            spaceFactory,
            abi.encodeCall(IImplementationRegistry.getLatestImplementation, bytes32("SwapRouter")),
            abi.encode(address(0))
        );

        vm.prank(user);
        vm.expectRevert(SwapFacet__SwapRouterNotSet.selector);
        swapFacet.executeSwapWithPermit(
            defaultInputParams,
            defaultRouterParams,
            defaultEmptyPermit,
            POSTER
        );
    }

    function test_executeSwapWithPermit(
        uint256 privateKey,
        address recipient,
        uint256 amountIn,
        uint256 amountOut
    ) external givenMembership(user) {
        vm.assume(recipient != address(0) && recipient != POSTER && recipient != feeRecipient);

        privateKey = boundPrivateKey(privateKey);
        address owner = vm.addr(privateKey);
        vm.assume(owner != feeRecipient && owner != POSTER);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // get swap parameters
        (ExactInputParams memory params, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0),
            address(token1),
            amountIn,
            amountOut,
            recipient
        );

        // get the permit signature
        Permit2Params memory permitParams = _createPermitParams(
            privateKey,
            owner,
            address(swapRouter),
            0, // nonce
            block.timestamp + 1 hours,
            params,
            routerParams,
            POSTER
        );

        // mint tokens for owner and approve Permit2
        token0.mint(owner, amountIn);
        vm.prank(owner);
        token0.approve(PERMIT2, amountIn);

        uint256 expectedAmountOut = _calculateExpectedAmountOut(amountOut);

        vm.expectEmit(everyoneSpace);
        emit SwapExecuted(
            recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            expectedAmountOut,
            POSTER
        );

        vm.prank(user);
        uint256 actualAmountOut = swapFacet.executeSwapWithPermit(
            params,
            routerParams,
            permitParams,
            POSTER
        );

        assertEq(actualAmountOut, expectedAmountOut, "Returned amount should match expected");
        _verifySwapResults(
            address(token0),
            address(token1),
            owner, // owner is the one whose tokens were used
            recipient,
            amountIn,
            amountOut,
            PROTOCOL_BPS,
            POSTER_BPS
        );

        // verify no leftover tokens in SwapFacet
        assertEq(token0.balanceOf(everyoneSpace), 0, "No token0 should remain in SwapFacet");
    }

    function test_executeSwapWithPermit_swapTokenToEth(
        uint256 privateKey,
        address recipient,
        uint256 amountIn,
        uint256 amountOut
    ) external givenMembership(user) assumeEOA(recipient) {
        vm.assume(recipient != POSTER && recipient != feeRecipient);
        vm.assume(recipient.balance == 0);

        privateKey = boundPrivateKey(privateKey);
        address owner = vm.addr(privateKey);
        vm.assume(owner != feeRecipient && owner != POSTER);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1, type(uint256).max / BasisPoints.MAX_BPS);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // get swap parameters for token to ETH
        (ExactInputParams memory params, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0),
            CurrencyTransfer.NATIVE_TOKEN,
            amountIn,
            amountOut,
            recipient
        );

        // get the permit signature
        Permit2Params memory permitParams = _createPermitParams(
            privateKey,
            owner,
            address(swapRouter),
            0, // nonce
            block.timestamp + 1 hours,
            params,
            routerParams,
            POSTER
        );

        // mint tokens for owner and approve Permit2
        token0.mint(owner, amountIn);
        vm.prank(owner);
        token0.approve(PERMIT2, amountIn);

        // fund mockRouter with ETH to swap out
        deal(mockRouter, amountOut * 2);

        uint256 expectedAmountOut = _calculateExpectedAmountOut(amountOut);

        // calculate protocol fee and expected points
        uint256 protocolFee = BasisPoints.calculate(amountOut, PROTOCOL_BPS);
        uint256 expectedPoints = _getPoints(protocolFee);

        vm.expectEmit(address(riverAirdrop));
        emit IERC20.Transfer(address(0), user, expectedPoints); // user is the one calling the function

        vm.expectEmit(everyoneSpace);
        emit SwapExecuted(
            recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            expectedAmountOut,
            POSTER
        );

        vm.prank(user);
        swapFacet.executeSwapWithPermit(params, routerParams, permitParams, POSTER);

        _verifySwapResults(
            address(token0),
            CurrencyTransfer.NATIVE_TOKEN,
            owner, // owner is the one whose tokens were used
            recipient,
            amountIn,
            amountOut,
            PROTOCOL_BPS,
            POSTER_BPS
        );

        // verify points were minted correctly to the caller (user)
        assertEq(
            riverAirdrop.balanceOf(user),
            expectedPoints,
            "ETH output swap should mint correct points to caller"
        );

        // verify no leftover tokens in SwapFacet
        assertEq(token0.balanceOf(everyoneSpace), 0, "No token0 should remain in SwapFacet");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier givenMembership(address caller) {
        assumeUnusedAddress(caller);
        vm.prank(caller);
        membership.joinSpace(caller);
        _;
    }

    function _calculateExpectedAmountOut(
        uint256 amountOut
    ) internal view returns (uint256 expectedAmountOut) {
        (uint16 protocolBps, uint16 posterBps, ) = swapFacet.getSwapFees();
        (uint256 protocolFee, uint256 posterFee) = _calculateFees(
            amountOut,
            protocolBps,
            posterBps
        );
        expectedAmountOut = amountOut - posterFee - protocolFee;
    }

    function _getPoints(uint256 protocolFee) internal view returns (uint256) {
        return
            ITownsPoints(riverAirdrop).getPoints(
                ITownsPointsBase.Action.Swap,
                abi.encode(protocolFee)
            );
    }
}
