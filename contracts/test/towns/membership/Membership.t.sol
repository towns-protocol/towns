// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IMembershipBase} from "contracts/src/towns/facets/membership/IMembership.sol";
import {IEntitlementBase} from "contracts/src/towns/entitlements/IEntitlement.sol";
import {IPlatformRequirements} from "contracts/src/towns/facets/platform/requirements/IPlatformRequirements.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IMembershipPricing} from "contracts/src/towns/facets/membership/pricing/IMembershipPricing.sol";
import {IMembershipReferral} from "contracts/src/towns/facets/membership/referral/IMembershipReferral.sol";

// libraries
import {CurrencyTransfer} from "contracts/src/utils/libraries/CurrencyTransfer.sol";
import {BasisPoints} from "contracts/src/utils/libraries/BasisPoints.sol";

// contracts
import {MembershipSetup} from "./MembershipSetup.sol";
import {MockAggregatorV3} from "contracts/test/mocks/MockAggregatorV3.sol";
import {TieredLogPricingOracle} from "contracts/src/towns/facets/membership/pricing/TieredLogPricingOracle.sol";

contract MembershipTest is
  IMembershipBase,
  IEntitlementBase,
  IERC721ABase,
  MembershipSetup
{
  int256 public constant EXCHANGE_RATE = 222616000000;
  uint256 public constant REFERRAL_CODE = 1;
  uint256 public constant MAX_BPS = 10000;

  // =============================================================
  //                           Join Town
  // =============================================================
  function test_joinTown() external {
    address alice = _randomAddress();

    vm.prank(founder);
    membership.joinTown(alice);

    assertEq(membership.balanceOf(alice), 1);
  }

  function test_joinTown_revert_NotAllowed() external {
    address alice = _randomAddress();

    vm.prank(alice);
    vm.expectRevert(Entitlement__NotAllowed.selector);
    membership.joinTown(alice);
  }

  function test_joinTown_revert_AlreadyMember() external {
    address alice = _randomAddress();

    vm.prank(founder);
    membership.joinTown(alice);

    vm.prank(founder);
    vm.expectRevert(Membership__AlreadyMember.selector);
    membership.joinTown(alice);
  }

  function test_joinTown_revert_LimitReached() external {
    vm.prank(founder);
    membership.setMembershipLimit(1);

    assertTrue(membership.getMembershipPrice() == 0);
    assertTrue(membership.getMembershipLimit() == 1);

    address alice = _randomAddress();

    vm.prank(founder);
    membership.joinTown(_randomAddress());

    vm.prank(founder);
    vm.expectRevert(Membership__MaxSupplyReached.selector);
    membership.joinTown(alice);
  }

  function test_joinTown_revert_when_updating_maxSupply() external {
    vm.prank(founder);
    membership.setMembershipLimit(2);

    assertTrue(membership.getMembershipPrice() == 0);
    assertTrue(membership.getMembershipLimit() == 2);

    vm.prank(founder);
    membership.joinTown(_randomAddress());

    vm.prank(founder);
    membership.joinTown(_randomAddress());

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidMaxSupply.selector);
    membership.setMembershipLimit(1);
  }

  // =============================================================
  //                       Join Town Referral
  // =============================================================

  function test_joinTownWithReferral() external {
    address alice = _randomAddress();
    address bob = _randomAddress();
    uint256 referralCode = 1;

    vm.prank(founder);
    membership.joinTownWithReferral(alice, bob, referralCode);

    assertEq(membership.balanceOf(alice), 1);
  }

  function test_joinTownWithReferral_with_price() external {
    address alice = _randomAddress();
    address bob = _randomAddress();
    uint256 referralCode = 1;
    uint256 membershipPrice = 10 ether;
    vm.deal(founder, membershipPrice);

    vm.startPrank(founder);
    membership.setMembershipCurrency(CurrencyTransfer.NATIVE_TOKEN);
    membership.setMembershipPrice(membershipPrice);
    vm.stopPrank();

    vm.prank(founder);
    membership.joinTownWithReferral{value: membershipPrice}(
      alice,
      bob,
      referralCode
    );

    IPlatformRequirements platformReqs = IPlatformRequirements(townFactory);

    address protocol = platformReqs.getFeeRecipient();
    uint16 bpsFee = platformReqs.getMembershipBps();

    uint256 protocolFee = BasisPoints.calculate(membershipPrice, bpsFee);

    // assert that alice receives a membership token
    assertEq(membership.balanceOf(alice), 1);

    // assert the protocol got its fee 10 ether - protocolFee
    assertEq(protocol.balance, protocolFee);

    // new fee is 10 ether - protocolFee
    uint256 netMembershipPrice = membershipPrice - protocolFee;

    // 10% for the referrer
    uint16 referralBps = IMembershipReferral(address(membership))
      .referralCodeBps(referralCode);
    uint256 referralFee = BasisPoints.calculate(
      netMembershipPrice,
      referralBps
    );

    // assert the referrer got their fee
    assertEq(bob.balance, referralFee);

    // assert the founder's DAO got its fee
    assertEq(founderDAO.balance, netMembershipPrice - referralFee);

    // assert the minter's eth got taken
    assertEq(founder.balance, 0 ether);
  }

  // =============================================================
  //                        Pricing Module
  // =============================================================
  function test_joinTown_pricingModule() external {
    MockAggregatorV3 oracle = _setupOracle();
    IMembershipPricing pricingModule = IMembershipPricing(
      address(new TieredLogPricingOracle(address(oracle)))
    );

    vm.prank(founder);
    membership.setMembershipPricingModule(address(pricingModule));

    uint256 membershipPrice = membership.getMembershipPrice();

    vm.deal(founder, 2 ether);
    address alice = _randomAddress();

    vm.prank(founder);
    membership.joinTown{value: membershipPrice}(alice);
    assertEq(membership.balanceOf(alice), 1);
  }

  function test_pricingModule() external {
    MockAggregatorV3 oracle = _setupOracle();
    IMembershipPricing pricingModule = IMembershipPricing(
      address(new TieredLogPricingOracle(address(oracle)))
    );

    // tier 0 < 1000
    uint256 price0 = pricingModule.getPrice({
      freeAllocation: 0,
      totalMinted: 0
    });
    assertEq(_getCentsFromWei(price0), 100); // $1 USD

    uint256 price1 = pricingModule.getPrice({
      freeAllocation: 0,
      totalMinted: 2
    });
    assertEq(_getCentsFromWei(price1), 115); // $1.15 USD

    // tier 1 > 1000
    uint256 price1000 = pricingModule.getPrice({
      freeAllocation: 0,
      totalMinted: 1000
    });
    assertEq(_getCentsFromWei(price1000), 985); // $9.85 USD

    // tier 2 > 10000
    uint256 price10000 = pricingModule.getPrice({
      freeAllocation: 0,
      totalMinted: 10000
    });
    assertEq(_getCentsFromWei(price10000), 9690); // $96.90 USD
  }

  function test_joinTown_collectMembershipFee() external {
    uint256 membershipPrice = 10 ether;

    vm.startPrank(founder);
    membership.setMembershipCurrency(CurrencyTransfer.NATIVE_TOKEN);
    membership.setMembershipPrice(membershipPrice);
    vm.stopPrank();

    address alice = _randomAddress();

    vm.prank(founder);
    vm.deal(founder, membershipPrice);
    uint256 tokenId = membership.joinTown{value: membershipPrice}(alice);

    assertEq(membership.balanceOf(alice), 1);
    assertEq(founder.balance, 0 ether);

    address protocolRecipient = IPlatformRequirements(townFactory)
      .getFeeRecipient();
    uint16 bpsFee = IPlatformRequirements(townFactory).getMembershipBps();

    uint256 potentialFee = BasisPoints.calculate(membershipPrice, bpsFee);

    assertEq(protocolRecipient.balance, potentialFee);
    assertEq(founderDAO.balance, membershipPrice - potentialFee);

    uint64 membershipDuration = IPlatformRequirements(townFactory)
      .getMembershipDuration();

    assertEq(
      membership.expiresAt(tokenId),
      block.timestamp + membershipDuration
    );
  }

  // =============================================================
  //                           Renew Membership
  // =============================================================
  function test_renewMembership() external {
    address alice = _randomAddress();

    uint64 membershipDuration = IPlatformRequirements(townFactory)
      .getMembershipDuration();
    uint256 membershipExpirationDate = block.timestamp + membershipDuration;

    vm.prank(founder);
    uint256 tokenId = membership.joinTown(alice);

    assertEq(membership.balanceOf(alice), 1);

    assertEq(
      membership.expiresAt(tokenId),
      block.timestamp + membershipDuration
    );

    vm.warp(membershipExpirationDate);

    assertEq(membership.balanceOf(alice), 0);

    vm.prank(alice);
    membership.renewMembership(alice);

    assertEq(
      membership.expiresAt(tokenId),
      membershipExpirationDate + membershipDuration
    );
  }

  function test_renewMembership_revert_InvalidAddress() external {
    vm.prank(founder);
    vm.expectRevert(Membership__InvalidAddress.selector);
    membership.renewMembership(address(0));
  }

  // =============================================================
  //                       Cancel Membership
  // =============================================================
  function test_cancelMembership() external {
    address alice = _randomAddress();

    vm.prank(founder);
    uint256 tokenId = membership.joinTown(alice);

    assertEq(membership.balanceOf(alice), 1);

    vm.prank(alice);
    membership.cancelMembership(tokenId);

    assertEq(membership.balanceOf(alice), 0);
  }

  function test_cancelMembership_revert_NotApprovedOrOwner() external {
    address alice = _randomAddress();

    vm.prank(founder);
    uint256 tokenId = membership.joinTown(alice);

    vm.prank(_randomAddress());
    vm.expectRevert(ApprovalCallerNotOwnerNorApproved.selector);
    membership.cancelMembership(tokenId);
  }

  // =============================================================
  //                           Duration
  // =============================================================
  function test_setMembershipDuration() external {
    uint64 newDuration = 5 days;

    vm.prank(founder);
    membership.setMembershipDuration(newDuration);

    assertEq(membership.getMembershipDuration(), newDuration);
  }

  function test_getMembershipDuration() external {
    assertEq(
      membership.getMembershipDuration(),
      IPlatformRequirements(townFactory).getMembershipDuration()
    );
  }

  function test_setMembershipDuration_revert_invalidDuration() external {
    uint64 duration = IPlatformRequirements(townFactory)
      .getMembershipDuration();

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidDuration.selector);
    membership.setMembershipDuration(duration + 1);
  }

  // =============================================================
  //                           Allocation
  // =============================================================
  function test_setMembershipAllocation() external {
    uint256 newAllocation = 100;

    vm.prank(founder);
    membership.setMembershipFreeAllocation(newAllocation);

    assertEq(membership.getMembershipFreeAllocation(), newAllocation);
  }

  function test_setMembershipFreeAllocation_revert_when_adding_more_than_mint_limit()
    external
  {
    uint256 maxFreeAllocation = IPlatformRequirements(townFactory)
      .getMembershipMintLimit();

    uint256 newAllocation = maxFreeAllocation + 1;

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidFreeAllocation.selector);
    membership.setMembershipFreeAllocation(newAllocation);
  }

  function test_setMembershipFreeAllocation_revert_when_addingMoreThanMaxSupply()
    external
  {
    vm.prank(founder);
    membership.setMembershipLimit(10);

    vm.prank(founder);
    vm.expectRevert(Membership__InvalidFreeAllocation.selector);
    membership.setMembershipFreeAllocation(11);
  }

  // =============================================================
  //                           Helpers
  // =============================================================
  function _getCentsFromWei(uint256 weiAmount) private pure returns (uint256) {
    uint256 exchangeRate = uint256(EXCHANGE_RATE); // chainlink oracle returns this value
    uint256 exchangeRateDecimals = 10 ** 8; // chainlink oracle returns this value

    uint256 ethToUsdExchangeRateCents = (exchangeRate * 100) /
      exchangeRateDecimals;
    uint256 weiPerCent = 1e18 / ethToUsdExchangeRateCents;

    return weiAmount / weiPerCent;
  }

  function _setupOracle() internal returns (MockAggregatorV3 oracle) {
    oracle = new MockAggregatorV3({
      _decimals: 8,
      _description: "ETH/USD",
      _version: 1
    });
    oracle.setRoundData({
      _roundId: 1,
      _answer: EXCHANGE_RATE,
      _startedAt: 0,
      _updatedAt: 0,
      _answeredInRound: 0
    });
  }
}
