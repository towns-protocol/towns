// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

// libraries

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";
import {MembershipReferralFacet} from "contracts/src/spaces/facets/membership/referral/MembershipReferralFacet.sol";

contract MembershipBaseSetup is
  IMembershipBase,
  IEntitlementBase,
  IERC721ABase,
  IOwnableBase,
  BaseSetup
{
  int256 internal constant EXCHANGE_RATE = 222616000000;
  uint256 internal constant MAX_BPS = 10000;
  uint256 constant REFERRAL_CODE = 999;
  uint16 constant REFERRAL_BPS = 1000;
  uint256 constant MEMBERSHIP_PRICE = 1 ether;

  MembershipFacet internal membership;
  MembershipReferralFacet internal referrals;
  IPlatformRequirements internal platformReqs;

  // entitled user
  address internal alice;
  address internal charlie;

  // non-entitled user
  address internal bob;

  // receiver of protocol fees
  address internal feeRecipient;

  function setUp() public override {
    super.setUp();

    alice = _randomAddress();
    bob = _randomAddress();
    charlie = _randomAddress();
    feeRecipient = founder;

    address[] memory allowedUsers = new address[](2);
    allowedUsers[0] = alice;
    allowedUsers[1] = charlie;

    IArchitectBase.SpaceInfo memory userSpaceInfo = _createUserSpaceInfo(
      "MembershipSpace",
      allowedUsers
    );
    userSpaceInfo.membership.settings.pricingModule = fixedPricingModule;

    vm.startPrank(founder);
    address userSpace = Architect(spaceFactory).createSpace(userSpaceInfo);
    vm.stopPrank();

    membership = MembershipFacet(userSpace);
    referrals = MembershipReferralFacet(userSpace);
    platformReqs = IPlatformRequirements(spaceFactory);
  }

  modifier givenMembershipHasPrice() {
    vm.startPrank(founder);
    membership.setMembershipFreeAllocation(1);
    membership.setMembershipPrice(MEMBERSHIP_PRICE);
    vm.stopPrank();
    _;
  }

  modifier givenAliceHasPaidMembership() {
    vm.startPrank(alice);
    vm.deal(alice, MEMBERSHIP_PRICE);
    membership.joinSpace{value: MEMBERSHIP_PRICE}(alice);
    vm.stopPrank();
    _;
  }

  modifier givenAliceHasMintedMembership() {
    vm.startPrank(alice);
    membership.joinSpace(alice);
    vm.stopPrank();
    _;
  }

  modifier givenFounderIsCaller() {
    vm.startPrank(founder);
    _;
  }

  modifier givenReferralCodeHasBeenCreated() {
    vm.prank(founder);
    referrals.createReferralCode(REFERRAL_CODE, REFERRAL_BPS);
    _;
  }

  modifier givenAliceHasMintedReferralMembership() {
    vm.prank(alice);
    membership.joinSpaceWithReferral(alice, bob, REFERRAL_CODE);
    _;
  }

  modifier givenAliceHasPaidReferralMembership() {
    vm.prank(alice);
    vm.deal(alice, MEMBERSHIP_PRICE);
    membership.joinSpaceWithReferral{value: MEMBERSHIP_PRICE}(
      alice,
      bob,
      REFERRAL_CODE
    );
    _;
  }
}
