// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISwapRouterBase} from "contracts/src/spaces/facets/swap/ISwapRouter.sol";
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";

// libraries
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

// contracts
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";
import {SwapRouter} from "contracts/src/spaces/facets/swap/SwapRouter.sol";
import {DeployMockERC20, MockERC20} from "contracts/scripts/deployments/utils/DeployMockERC20.s.sol";

// helpers
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

contract SwapRouterTest is BaseSetup, ISwapRouterBase {
  MembershipFacet internal membership;
  MockERC20 internal token0;
  MockERC20 internal token1;
  address internal platformRecipient;
  SwapRouter internal swapRouter;
  address internal mockRouter;
  address internal poster;
  uint16 internal constant TREASURY_BPS = 100; // 1%
  uint16 internal constant POSTER_BPS = 50; // 0.5%

  function setUp() public override {
    super.setUp();

    DeployMockERC20 deployERC20 = new DeployMockERC20();
    token0 = MockERC20(deployERC20.deploy(deployer));
    token1 = MockERC20(deployERC20.deploy(deployer));
    membership = MembershipFacet(everyoneSpace);
    platformRecipient = IPlatformRequirements(spaceFactory).getFeeRecipient();

    // Deploy mock router and whitelist it
    mockRouter = address(new MockRouter());
    vm.prank(deployer);
    IPlatformRequirements(spaceFactory).setRouterWhitelisted(mockRouter, true);

    // Set up poster
    poster = makeAddr("poster");

    // Set swap fees
    vm.prank(deployer);
    IPlatformRequirements(spaceFactory).setSwapFees(TREASURY_BPS, POSTER_BPS);

    // Deploy SwapRouter
    swapRouter = SwapRouter(everyoneSpace);
  }

  // =============================================================
  //                        Success Cases
  // =============================================================

  function test_executeSwap_withERC20() public {
    address user = makeAddr("user");
    uint256 amountIn = 1000;
    uint256 minAmountOut = 900;
    bytes memory swapData = abi.encodeWithSignature(
      "swap(address,address,uint256)",
      address(token0),
      address(token1),
      amountIn
    );

    // Setup token balances and approvals
    token0.mint(user, amountIn);
    vm.startPrank(user);
    token0.approve(address(swapRouter), amountIn);

    // Execute swap
    swapRouter.executeSwap(
      mockRouter,
      mockRouter,
      address(token0),
      address(token1),
      amountIn,
      minAmountOut,
      poster,
      swapData
    );

    vm.stopPrank();

    // Verify balances and fees
    assertEq(token0.balanceOf(user), 0, "User should have no token0 left");
    assertTrue(
      token1.balanceOf(user) > minAmountOut,
      "User should have received at least minAmountOut"
    );
    assertTrue(token1.balanceOf(poster) > 0, "Poster should have received fee");
    assertTrue(
      token1.balanceOf(platformRecipient) > 0,
      "Platform should have received fee"
    );
  }

  function test_executeSwap_withNativeToken() public {
    address user = makeAddr("user");
    uint256 amountIn = 1 ether;
    uint256 minAmountOut = 0.9 ether;
    bytes memory swapData = abi.encodeWithSignature(
      "swap(address,address,uint256)",
      CurrencyTransfer.NATIVE_TOKEN,
      address(token1),
      amountIn
    );

    // Fund user with ETH
    vm.deal(user, amountIn);

    // Execute swap
    vm.prank(user);
    swapRouter.executeSwap{value: amountIn}(
      mockRouter,
      mockRouter,
      CurrencyTransfer.NATIVE_TOKEN,
      address(token1),
      amountIn,
      minAmountOut,
      poster,
      swapData
    );

    // Verify balances and fees
    assertEq(user.balance, 0, "User should have no ETH left");
    assertTrue(
      token1.balanceOf(user) > minAmountOut,
      "User should have received at least minAmountOut"
    );
    assertTrue(token1.balanceOf(poster) > 0, "Poster should have received fee");
    assertTrue(
      token1.balanceOf(platformRecipient) > 0,
      "Platform should have received fee"
    );
  }

  function test_executeSwap_withExactFees() public {
    address user = makeAddr("user");
    uint256 amountIn = 10000;
    uint256 minAmountOut = 9000;
    bytes memory swapData = abi.encodeWithSignature(
      "swap(address,address,uint256)",
      address(token0),
      address(token1),
      amountIn
    );

    // Setup token balances and approvals
    token0.mint(user, amountIn);
    vm.startPrank(user);
    token0.approve(address(swapRouter), amountIn);

    // Execute swap
    swapRouter.executeSwap(
      mockRouter,
      mockRouter,
      address(token0),
      address(token1),
      amountIn,
      minAmountOut,
      poster,
      swapData
    );

    vm.stopPrank();

    // Calculate expected fees
    uint256 amountOut = (amountIn * 95) / 100; // Mock router returns 95%
    uint256 expectedPosterFee = (amountOut * POSTER_BPS) / 10000;
    uint256 expectedTreasuryFee = (amountOut * TREASURY_BPS) / 10000;
    uint256 expectedUserAmount = amountOut -
      expectedPosterFee -
      expectedTreasuryFee;

    // Verify exact fee amounts
    assertEq(
      token1.balanceOf(poster),
      expectedPosterFee,
      "Incorrect poster fee"
    );
    assertEq(
      token1.balanceOf(platformRecipient),
      expectedTreasuryFee,
      "Incorrect treasury fee"
    );
    assertEq(
      token1.balanceOf(user),
      expectedUserAmount,
      "Incorrect user amount"
    );
  }

  function test_executeSwap_withZeroFees() public {
    // Set fees to zero
    vm.startPrank(deployer);
    IPlatformRequirements(spaceFactory).setSwapFees(0, 0);
    vm.stopPrank();

    address user = makeAddr("user");
    uint256 amountIn = 1000;
    uint256 minAmountOut = 900;
    bytes memory swapData = abi.encodeWithSignature(
      "swap(address,address,uint256)",
      address(token0),
      address(token1),
      amountIn
    );

    // Setup token balances and approvals
    token0.mint(user, amountIn);
    vm.startPrank(user);
    token0.approve(address(swapRouter), amountIn);

    // Execute swap
    swapRouter.executeSwap(
      mockRouter,
      mockRouter,
      address(token0),
      address(token1),
      amountIn,
      minAmountOut,
      poster,
      swapData
    );

    vm.stopPrank();

    // Verify no fees were taken
    assertEq(token1.balanceOf(poster), 0, "Poster should not receive fees");
    assertEq(
      token1.balanceOf(platformRecipient),
      0,
      "Platform should not receive fees"
    );
    assertEq(
      token1.balanceOf(user),
      (amountIn * 95) / 100,
      "User should receive full amount"
    );
  }

  function test_executeSwap_withMaxFees() public {
    // Set maximum possible fees (50% each)
    vm.startPrank(deployer);
    IPlatformRequirements(spaceFactory).setSwapFees(5000, 5000);
    vm.stopPrank();

    address user = makeAddr("user");
    uint256 amountIn = 1000;
    uint256 minAmountOut = 100; // Set very low to allow for high fees
    bytes memory swapData = abi.encodeWithSignature(
      "swap(address,address,uint256)",
      address(token0),
      address(token1),
      amountIn
    );

    // Setup token balances and approvals
    token0.mint(user, amountIn);
    vm.startPrank(user);
    token0.approve(address(swapRouter), amountIn);

    // Execute swap
    swapRouter.executeSwap(
      mockRouter,
      mockRouter,
      address(token0),
      address(token1),
      amountIn,
      minAmountOut,
      poster,
      swapData
    );

    vm.stopPrank();

    uint256 amountOut = (amountIn * 95) / 100;
    assertEq(
      token1.balanceOf(poster),
      (amountOut * 5000) / 10000,
      "Incorrect poster fee"
    );
    assertEq(
      token1.balanceOf(platformRecipient),
      (amountOut * 5000) / 10000,
      "Incorrect treasury fee"
    );
  }

  function test_executeSwap_withFailedSwap() public {
    address user = makeAddr("user");
    uint256 amountIn = 1000;

    // Create failing swap data
    bytes memory failingSwapData = abi.encodeWithSignature(
      "nonexistentFunction()",
      address(token0),
      address(token1),
      amountIn
    );

    // Setup token balances and approvals
    token0.mint(user, amountIn);
    vm.startPrank(user);
    token0.approve(address(swapRouter), amountIn);

    vm.expectRevert(SwapRouter__SwapFailed.selector);
    swapRouter.executeSwap(
      mockRouter,
      mockRouter,
      address(token0),
      address(token1),
      amountIn,
      0,
      poster,
      failingSwapData
    );

    vm.stopPrank();
  }

  function test_executeSwap_approvalReset() public {
    address user = makeAddr("user");
    uint256 amountIn = 1000;
    bytes memory swapData = abi.encodeWithSignature(
      "swap(address,address,uint256)",
      address(token0),
      address(token1),
      amountIn
    );

    // Setup token balances and approvals
    token0.mint(user, amountIn);
    vm.startPrank(user);
    token0.approve(address(swapRouter), amountIn);

    // Execute swap
    swapRouter.executeSwap(
      mockRouter,
      mockRouter,
      address(token0),
      address(token1),
      amountIn,
      0,
      poster,
      swapData
    );

    vm.stopPrank();

    // Verify approval was reset
    assertEq(
      token0.allowance(address(swapRouter), mockRouter),
      0,
      "Router approval should be reset after swap"
    );
  }

  // =============================================================
  //                        Failure Cases
  // =============================================================

  function test_revert_executeSwap_whenRouterNotWhitelisted() public {
    address nonWhitelistedRouter = makeAddr("nonWhitelistedRouter");

    vm.expectRevert(SwapRouter__InvalidRouter.selector);
    swapRouter.executeSwap(
      nonWhitelistedRouter,
      nonWhitelistedRouter,
      address(token0),
      address(token1),
      1000,
      900,
      poster,
      ""
    );
  }

  function test_revert_executeSwap_whenAmountInZero() public {
    vm.expectRevert(SwapRouter__InvalidAmount.selector);
    swapRouter.executeSwap(
      mockRouter,
      mockRouter,
      address(token0),
      address(token1),
      0,
      0,
      poster,
      ""
    );
  }

  function test_revert_executeSwap_whenInsufficientOutput() public {
    address user = makeAddr("user");
    uint256 amountIn = 1000;
    uint256 minAmountOut = 2000; // Set higher than what mock router returns
    bytes memory swapData = abi.encodeWithSignature(
      "swap(address,address,uint256)",
      address(token0),
      address(token1),
      amountIn
    );

    // Setup token balances and approvals
    token0.mint(user, amountIn);
    vm.startPrank(user);
    token0.approve(address(swapRouter), amountIn);

    vm.expectRevert(SwapRouter__InsufficientOutput.selector);
    swapRouter.executeSwap(
      mockRouter,
      mockRouter,
      address(token0),
      address(token1),
      amountIn,
      minAmountOut,
      poster,
      swapData
    );
    vm.stopPrank();
  }

  function test_revert_executeSwap_whenNativeValueMismatch() public {
    vm.expectRevert(SwapRouter__InvalidAmount.selector);
    swapRouter.executeSwap{value: 1 ether}(
      mockRouter,
      mockRouter,
      CurrencyTransfer.NATIVE_TOKEN,
      address(token1),
      2 ether, // Different from msg.value
      0,
      poster,
      ""
    );
  }
}

// =============================================================
//                        Helper Contracts
// =============================================================

contract MockRouter {
  function swap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) external payable returns (uint256) {
    // Mock swap logic - return 95% of input amount as output
    uint256 amountOut = (amountIn * 95) / 100;

    if (tokenIn == CurrencyTransfer.NATIVE_TOKEN) {
      MockERC20(tokenOut).mint(address(this), amountOut);
    } else {
      // Transfer input tokens from sender
      IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
      // Mint output tokens
      MockERC20(tokenOut).mint(address(this), amountOut);
    }

    // Transfer output tokens to SwapRouter
    MockERC20(tokenOut).transfer(msg.sender, amountOut);

    return amountOut;
  }
}
