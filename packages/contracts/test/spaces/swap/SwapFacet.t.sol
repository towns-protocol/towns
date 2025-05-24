// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ITownsPoints, ITownsPointsBase} from "../../../src/airdrop/points/ITownsPoints.sol";
import {IPlatformRequirements} from "../../../src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IImplementationRegistry} from "../../../src/factory/facets/registry/IImplementationRegistry.sol";
import {ISwapRouter} from "../../../src/router/ISwapRouter.sol";
import {IEntitlementBase} from "../../../src/spaces/entitlements/IEntitlement.sol";
import {ISwapFacetBase, ISwapFacet} from "../../../src/spaces/facets/swap/ISwapFacet.sol";

// libraries
import {BasisPoints} from "../../../src/utils/libraries/BasisPoints.sol";
import {CurrencyTransfer} from "../../../src/utils/libraries/CurrencyTransfer.sol";
import {SwapFacetStorage} from "../../../src/spaces/facets/swap/SwapFacetStorage.sol";
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
        IPlatformRequirements(spaceFactory).setSwapFees(PROTOCOL_BPS, POSTER_BPS);

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

    function test_setSwapFeeConfig(uint16 newPosterFeeBps, bool collectToSpace) public {
        newPosterFeeBps = uint16(bound(newPosterFeeBps, 0, MAX_FEE_BPS - PROTOCOL_BPS));

        vm.expectEmit(everyoneSpace);
        emit SwapFeeConfigUpdated(newPosterFeeBps, collectToSpace);

        vm.prank(founder);
        swapFacet.setSwapFeeConfig(newPosterFeeBps, collectToSpace);

        (uint16 protocolBps, uint16 posterBps, bool collectPosterFeeToSpace) = swapFacet
            .getSwapFees();
        assertEq(protocolBps, PROTOCOL_BPS, "Treasury fee should match platform fee");
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

        uint256 expectedAmountOut = _calculateExpectedAmountOut(amountOut);

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
        swapFacet.executeSwap(params, routerParams, poster);

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
    }

    function test_executeSwap_swapEthToToken(
        uint256 amountIn,
        uint256 amountOut,
        address caller,
        address recipient
    ) external givenMembership(caller) {
        vm.assume(caller != founder && caller != poster && caller != feeRecipient);
        vm.assume(recipient != address(0) && recipient != poster && recipient != feeRecipient);

        // ensure amountIn and amountOut are reasonable
        amountIn = bound(amountIn, 1 ether / 100, 10 ether);
        amountOut = bound(amountOut, 1, type(uint256).max / BasisPoints.MAX_BPS);

        (uint256 amountInAfterFees, uint256 protocolFee, ) = swapRouter.getETHInputFees(
            amountIn,
            caller,
            poster
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
            poster
        );

        deal(caller, amountIn);
        vm.prank(caller);
        swapFacet.executeSwap{value: amountIn}(params, routerParams, poster);

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
            poster
        );

        vm.prank(caller);
        swapFacet.executeSwap(params, routerParams, poster);

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
        posterBps = uint16(bound(posterBps, 0, MAX_FEE_BPS - PROTOCOL_BPS));

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

        (uint256 protocolFee, uint256 posterFee) = _calculateFees(
            amountOut,
            PROTOCOL_BPS,
            posterBps
        );
        uint256 expectedAmountOut = amountOut - posterFee - protocolFee;

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
            protocolFee,
            "Treasury fee should be sent to protocol"
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
