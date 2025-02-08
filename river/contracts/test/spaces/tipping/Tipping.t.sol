// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ITippingBase} from "contracts/src/spaces/facets/tipping/ITipping.sol";
import {IERC721AQueryable} from "contracts/src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {ITownsPoints, ITownsPointsBase} from "contracts/src/airdrop/points/ITownsPoints.sol";
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";

// libraries
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

// contracts
import {TippingFacet} from "contracts/src/spaces/facets/tipping/TippingFacet.sol";
import {IntrospectionFacet} from "@river-build/diamond/src/facets/introspection/IntrospectionFacet.sol";
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";

import {DeployMockERC20, MockERC20} from "contracts/scripts/deployments/utils/DeployMockERC20.s.sol";

// helpers
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

contract TippingTest is BaseSetup, ITippingBase, IERC721ABase {
  DeployMockERC20 internal deployERC20 = new DeployMockERC20();

  TippingFacet internal tipping;
  IntrospectionFacet internal introspection;
  MembershipFacet internal membership;
  IERC721AQueryable internal token;
  MockERC20 internal mockERC20;
  ITownsPoints internal points;

  address internal platformRecipient;

  function setUp() public override {
    super.setUp();

    tipping = TippingFacet(everyoneSpace);
    introspection = IntrospectionFacet(everyoneSpace);
    membership = MembershipFacet(everyoneSpace);
    token = IERC721AQueryable(everyoneSpace);
    mockERC20 = MockERC20(deployERC20.deploy(deployer));
    points = ITownsPoints(riverAirdrop);
    platformRecipient = IPlatformRequirements(spaceFactory).getFeeRecipient();
  }

  modifier givenUsersAreMembers(address sender, address receiver) {
    assumeNotPrecompile(sender);
    assumeNotPrecompile(receiver);
    assumeNotForgeAddress(receiver);

    vm.assume(sender != receiver);
    vm.assume(sender != address(0) && sender.code.length == 0);
    vm.assume(receiver != address(0) && receiver.code.length == 0);

    vm.prank(sender);
    membership.joinSpace(sender);

    vm.prank(receiver);
    membership.joinSpace(receiver);
    _;
  }

  function test_tipEth(
    address sender,
    address receiver,
    uint256 amount,
    bytes32 messageId,
    bytes32 channelId
  ) external givenUsersAreMembers(sender, receiver) {
    vm.assume(sender != platformRecipient);
    vm.assume(receiver != platformRecipient);
    amount = bound(amount, 0.0003 ether, 1 ether);

    uint256 initialBalance = receiver.balance;
    uint256 initialPointBalance = IERC20(address(points)).balanceOf(sender);
    uint256 tokenId = token.tokensOfOwner(receiver)[0];

    uint256 protocolFee = BasisPoints.calculate(amount, 50); // 0.5%
    uint256 tipAmount = amount - protocolFee;

    hoax(sender, amount);
    vm.expectEmit(address(tipping));
    emit Tip(
      tokenId,
      CurrencyTransfer.NATIVE_TOKEN,
      sender,
      receiver,
      amount,
      messageId,
      channelId
    );
    vm.startSnapshotGas("tipEth");
    tipping.tip{value: amount}(
      TipRequest({
        receiver: receiver,
        tokenId: tokenId,
        currency: CurrencyTransfer.NATIVE_TOKEN,
        amount: amount,
        messageId: messageId,
        channelId: channelId
      })
    );

    assertLt(vm.stopSnapshotGas(), 400_000);
    assertEq(receiver.balance - initialBalance, tipAmount, "receiver balance");
    assertEq(platformRecipient.balance, protocolFee, "protocol fee");
    assertEq(sender.balance, 0, "sender balance");
    assertEq(
      IERC20(address(points)).balanceOf(sender) - initialPointBalance,
      (protocolFee * 10_000) / 3,
      "points minted"
    );
    assertEq(
      tipping.tipsByCurrencyAndTokenId(tokenId, CurrencyTransfer.NATIVE_TOKEN),
      tipAmount
    );
    assertEq(tipping.totalTipsByCurrency(CurrencyTransfer.NATIVE_TOKEN), 1);
    assertEq(
      tipping.tipAmountByCurrency(CurrencyTransfer.NATIVE_TOKEN),
      tipAmount
    );
    assertContains(tipping.tippingCurrencies(), CurrencyTransfer.NATIVE_TOKEN);
  }

  function test_tipERC20(
    address sender,
    address receiver,
    uint256 amount,
    bytes32 messageId,
    bytes32 channelId
  ) external givenUsersAreMembers(sender, receiver) {
    amount = bound(amount, 0.01 ether, 1 ether);

    uint256[] memory tokens = token.tokensOfOwner(receiver);
    uint256 tokenId = tokens[0];

    mockERC20.mint(sender, amount);

    vm.startPrank(sender);
    mockERC20.approve(address(tipping), amount);
    vm.expectEmit(address(tipping));
    emit Tip(
      tokenId,
      address(mockERC20),
      sender,
      receiver,
      amount,
      messageId,
      channelId
    );
    vm.startSnapshotGas("tipERC20");
    tipping.tip(
      TipRequest({
        receiver: receiver,
        tokenId: tokenId,
        currency: address(mockERC20),
        amount: amount,
        messageId: messageId,
        channelId: channelId
      })
    );
    uint256 gasUsed = vm.stopSnapshotGas();
    vm.stopPrank();

    assertLt(gasUsed, 300_000);
    assertEq(mockERC20.balanceOf(sender), 0);
    assertEq(mockERC20.balanceOf(receiver), amount);
    assertEq(
      tipping.tipsByCurrencyAndTokenId(tokenId, address(mockERC20)),
      amount
    );
    assertEq(tipping.totalTipsByCurrency(address(mockERC20)), 1);
    assertEq(tipping.tipAmountByCurrency(address(mockERC20)), amount);
    assertContains(tipping.tippingCurrencies(), address(mockERC20));
  }

  function test_revertWhenCurrencyIsZero(
    address sender,
    address receiver,
    uint256 amount,
    bytes32 messageId,
    bytes32 channelId
  ) external givenUsersAreMembers(sender, receiver) {
    uint256 tokenId = token.tokensOfOwner(receiver)[0];

    vm.expectRevert(CurrencyIsZero.selector);
    tipping.tip(
      TipRequest({
        receiver: receiver,
        tokenId: tokenId,
        currency: address(0),
        amount: amount,
        messageId: messageId,
        channelId: channelId
      })
    );
  }

  function test_revertCannotTipSelf(
    address sender,
    address receiver,
    uint256 amount,
    bytes32 messageId,
    bytes32 channelId
  ) external givenUsersAreMembers(sender, receiver) {
    uint256 tokenId = token.tokensOfOwner(sender)[0];

    vm.prank(sender);
    vm.expectRevert(CannotTipSelf.selector);
    tipping.tip(
      TipRequest({
        receiver: sender,
        tokenId: tokenId,
        currency: CurrencyTransfer.NATIVE_TOKEN,
        amount: amount,
        messageId: messageId,
        channelId: channelId
      })
    );
  }

  function test_revertWhenAmountIsZero(
    address sender,
    address receiver,
    bytes32 messageId,
    bytes32 channelId
  ) external givenUsersAreMembers(sender, receiver) {
    uint256 tokenId = token.tokensOfOwner(receiver)[0];

    vm.expectRevert(AmountIsZero.selector);
    vm.prank(sender);
    tipping.tip(
      TipRequest({
        receiver: receiver,
        tokenId: tokenId,
        currency: CurrencyTransfer.NATIVE_TOKEN,
        amount: 0,
        messageId: messageId,
        channelId: channelId
      })
    );
  }
}
