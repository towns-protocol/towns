// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IPlatformRequirements} from "../../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IImplementationRegistry} from "../../../src/factory/facets/registry/IImplementationRegistry.sol";
import {ISwapRouter} from "../../../src/router/ISwapRouter.sol";
import {IEntitlementBase} from "../../../src/spaces/entitlements/IEntitlement.sol";
import {ISwapFacetBase, ISwapFacet} from "../../../src/spaces/facets/swap/ISwapFacet.sol";

// libraries
import {BasisPoints} from "../../../src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../../src/utils/libraries/CurrencyTransfer.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";

// contracts
import {DeployMockERC20, MockERC20} from "../../../scripts/deployments/utils/DeployMockERC20.s.sol";
import {MembershipFacet} from "../../../src/spaces/facets/membership/MembershipFacet.sol";
import {MockRouter} from "../../mocks/MockRouter.sol";

// helpers
import {DeploySwapRouter} from "../../../scripts/deployments/diamonds/DeploySwapRouter.s.sol";
import {BaseSetup} from "../BaseSetup.sol";
import {SwapTestBase} from "../../router/SwapTestBase.sol";

contract SwapFacetTest is BaseSetup, SwapTestBase, ISwapFacetBase, IOwnableBase, IEntitlementBase {
    using SafeTransferLib for address;

    MembershipFacet internal membership;
    MockERC20 internal token0;
    MockERC20 internal token1;
    ISwapRouter internal swapRouter;
    ISwapFacet internal swapFacet;
    address internal mockRouter;
    address internal user = makeAddr("user");

    ExactInputParams internal defaultParams;
    RouterParams internal defaultRouterParams;

    function setUp() public override {
        super.setUp();

        DeployMockERC20 deployERC20 = new DeployMockERC20();
        token0 = MockERC20(deployERC20.deploy(deployer));
        token1 = MockERC20(deployERC20.deploy(deployer));
        membership = MembershipFacet(everyoneSpace);
        swapFacet = ISwapFacet(everyoneSpace);
        feeRecipient = IPlatformRequirements(spaceFactory).getFeeRecipient();
        vm.label(feeRecipient, "FeeRecipient");

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
        swapRouter = ISwapRouter(deploySwapRouter.deploy(deployer));
        vm.label(address(swapRouter), "SwapRouter");

        // add the swap router to the space factory
        vm.prank(deployer);
        implementationRegistry.addImplementation(address(swapRouter));

        (defaultParams, defaultRouterParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            address(token0),
            address(token1),
            1000,
            900,
            user
        );
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
        // Total fee = TREASURY_BPS + posterFeeBps must be <= MAX_FEE_BPS (1%)
        uint16 tooHighPosterFeeBps = MAX_FEE_BPS - TREASURY_BPS + 1;

        vm.prank(founder);
        vm.expectRevert(SwapFacet__TotalFeeTooHigh.selector);
        swapFacet.setSwapFeeConfig(tooHighPosterFeeBps, true);
    }

    function test_setSwapFeeConfig(uint16 newPosterFeeBps, bool collectToSpace) public {
        newPosterFeeBps = uint16(bound(newPosterFeeBps, 0, MAX_FEE_BPS - TREASURY_BPS));

        vm.expectEmit(everyoneSpace);
        emit SwapFeeConfigUpdated(newPosterFeeBps, collectToSpace);

        vm.prank(founder);
        swapFacet.setSwapFeeConfig(newPosterFeeBps, collectToSpace);

        (uint16 treasuryBps, uint16 posterBps, bool collectPosterFeeToSpace) = swapFacet
            .getSwapFees();
        assertEq(treasuryBps, TREASURY_BPS, "Treasury fee should match platform fee");
        // if newPosterFeeBps is 0, it will be set to the platform's default
        assertEq(
            posterBps,
            collectToSpace
                ? newPosterFeeBps
                : newPosterFeeBps == 0
                    ? POSTER_BPS
                    : newPosterFeeBps,
            "Poster fee should be updated"
        );
        assertEq(collectPosterFeeToSpace, collectToSpace, "Collect to space should be updated");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         executeSwap                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_executeSwap_revertIf_notMember(address nonMember) external {
        vm.assume(nonMember != address(0));
        vm.assume(everyoneSpace.balanceOf(nonMember) == 0);

        vm.prank(nonMember);
        vm.expectRevert(Entitlement__NotMember.selector);
        swapFacet.executeSwap(defaultParams, defaultRouterParams, poster);
    }

    function test_executeSwap_revertIf_swapRouterNotSet() external givenMembership(user) {
        vm.mockCall(
            spaceFactory,
            abi.encodeCall(IImplementationRegistry.getLatestImplementation, bytes32("SwapRouter")),
            abi.encode(address(0))
        );

        vm.prank(user);
        vm.expectRevert(SwapFacet__SwapRouterNotSet.selector);
        swapFacet.executeSwap(defaultParams, defaultRouterParams, poster);
    }

    function test_executeSwap_revertIf_swapFailed() external givenMembership(user) {
        vm.startPrank(user);
        deal(address(token0), user, defaultParams.amountIn);
        token0.approve(everyoneSpace, defaultParams.amountIn);

        defaultRouterParams.swapData = "";
        vm.expectRevert(SwapFacet__SwapFailed.selector);
        swapFacet.executeSwap(defaultParams, defaultRouterParams, poster);
        vm.stopPrank();
    }

    function test_executeSwap(
        uint256 amountIn,
        uint256 amountOut,
        address caller,
        address recipient
    ) external givenMembership(caller) {
        vm.assume(caller != founder);
        vm.assume(recipient != address(0) && recipient != poster && recipient != feeRecipient);

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

        (
            uint256 expectedAmountOut,
            uint16 treasuryBps,
            uint16 posterBps
        ) = _calculateExpectedAmountOut(amountOut);

        vm.expectEmit(everyoneSpace);
        emit SwapExecuted(
            recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            expectedAmountOut,
            poster
        );

        vm.prank(caller);
        uint256 actualAmountOut = swapFacet.executeSwap(params, routerParams, poster);

        _verifySwapResults(
            address(token0),
            address(token1),
            caller,
            recipient,
            amountOut,
            actualAmountOut,
            treasuryBps,
            posterBps
        );
    }

    function test_executeSwap_swapEthToToken(
        uint256 amountIn,
        uint256 amountOut,
        address caller,
        address recipient
    ) external givenMembership(caller) {
        vm.assume(caller != founder);
        vm.assume(recipient != address(0) && recipient != poster && recipient != feeRecipient);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1 ether / 100, 10 ether);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        // get swap parameters
        (ExactInputParams memory params, RouterParams memory routerParams) = _createSwapParams(
            address(swapRouter),
            mockRouter,
            CurrencyTransfer.NATIVE_TOKEN,
            address(token1),
            amountIn,
            amountOut,
            recipient
        );

        (
            uint256 expectedAmountOut,
            uint16 treasuryBps,
            uint16 posterBps
        ) = _calculateExpectedAmountOut(amountOut);

        vm.expectEmit(everyoneSpace);
        emit SwapExecuted(
            recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            expectedAmountOut,
            poster
        );

        deal(caller, amountIn);
        vm.prank(caller);
        uint256 actualAmountOut = swapFacet.executeSwap{value: amountIn}(
            params,
            routerParams,
            poster
        );

        _verifySwapResults(
            CurrencyTransfer.NATIVE_TOKEN,
            address(token1),
            caller,
            recipient,
            amountOut,
            actualAmountOut,
            treasuryBps,
            posterBps
        );
    }

    function test_executeSwap_swapTokenToEth(
        uint256 amountIn,
        uint256 amountOut,
        address caller,
        address recipient
    ) external givenMembership(caller) assumeEOA(recipient) {
        vm.assume(caller != founder);
        vm.assume(recipient != poster && recipient != feeRecipient);
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

        (
            uint256 expectedAmountOut,
            uint16 treasuryBps,
            uint16 posterBps
        ) = _calculateExpectedAmountOut(amountOut);

        vm.expectEmit(everyoneSpace);
        emit SwapExecuted(
            recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            expectedAmountOut,
            poster
        );

        vm.prank(caller);
        uint256 actualAmountOut = swapFacet.executeSwap(params, routerParams, poster);

        _verifySwapResults(
            address(token0),
            CurrencyTransfer.NATIVE_TOKEN,
            caller,
            recipient,
            amountOut,
            actualAmountOut,
            treasuryBps,
            posterBps
        );
    }

    function test_executeSwap_collectPosterFeeToSpace(
        uint256 amountIn,
        uint256 amountOut,
        address caller,
        address recipient,
        uint16 posterBps
    ) external givenMembership(caller) {
        vm.assume(caller != founder);
        vm.assume(
            recipient != address(0) &&
                recipient != poster &&
                recipient != feeRecipient &&
                recipient != everyoneSpace
        );
        posterBps = uint16(bound(posterBps, 0, MAX_FEE_BPS - TREASURY_BPS));

        // set fee config to collect to space
        vm.prank(founder);
        swapFacet.setSwapFeeConfig(posterBps, true);

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

        (uint256 posterFee, uint256 treasuryFee) = _calculateFees(
            amountOut,
            TREASURY_BPS,
            posterBps
        );
        uint256 expectedAmountOut = amountOut - posterFee - treasuryFee;

        vm.expectEmit(everyoneSpace);
        emit SwapExecuted(
            recipient,
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            expectedAmountOut,
            poster // original poster still used in event
        );

        vm.prank(caller);
        uint256 actualAmountOut = swapFacet.executeSwap(params, routerParams, poster);

        // poster fee should be sent to space, not poster
        assertEq(
            params.tokenOut.balanceOf(everyoneSpace),
            posterFee,
            "Poster fee should be sent to space"
        );
        assertEq(params.tokenOut.balanceOf(poster), 0, "Poster should not receive fee");
        assertEq(
            params.tokenOut.balanceOf(feeRecipient),
            treasuryFee,
            "Treasury fee should be sent to treasury"
        );
        assertEq(actualAmountOut, expectedAmountOut, "Returned amount should match expected");
        assertEq(token0.balanceOf(caller), 0, "Token0 should be spent");
        assertEq(token1.balanceOf(recipient), actualAmountOut, "Token1 should be received");
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
    ) internal view returns (uint256 expectedAmountOut, uint16 treasuryBps, uint16 posterBps) {
        (treasuryBps, posterBps, ) = swapFacet.getSwapFees();
        (uint256 posterFee, uint256 treasuryFee) = _calculateFees(
            amountOut,
            treasuryBps,
            posterBps
        );
        expectedAmountOut = amountOut - posterFee - treasuryFee;
    }
}
