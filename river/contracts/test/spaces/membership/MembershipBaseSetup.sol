// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IERC721ABase} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IEntitlementsManager, IEntitlementsManagerBase} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IRoles, IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";
import {RuleEntitlementUtil} from "contracts/test/crosschain/RuleEntitlementUtil.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

import {Vm} from "forge-std/Test.sol";

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
  Vm.Wallet aliceWallet;
  Vm.Wallet charlieWallet;

  address internal alice;
  address internal charlie;

  // non-entitled user
  Vm.Wallet bobWallet;
  address internal bob;

  // receiver of protocol fees
  address internal feeRecipient;

  address internal userSpace;

  function setUp() public override {
    super.setUp();

    aliceWallet = vm.createWallet("alice");
    charlieWallet = vm.createWallet("charlie");
    bobWallet = vm.createWallet("bob");

    alice = aliceWallet.addr;
    bob = bobWallet.addr;
    charlie = charlieWallet.addr;
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
    userSpace = Architect(spaceFactory).createSpace(userSpaceInfo);
    vm.stopPrank();

    membership = MembershipFacet(userSpace);
    referrals = MembershipReferralFacet(userSpace);
    platformReqs = IPlatformRequirements(spaceFactory);

    _registerOperators();
    _registerNodes();
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
    assertEq(membership.balanceOf(alice), 1);
    vm.stopPrank();
    _;
  }

  modifier givenAliceHasMintedMembership() {
    vm.startPrank(alice);
    membership.joinSpace(alice);
    vm.stopPrank();
    _;
  }

  modifier givenJoinspaceHasAdditionalCrosschainEntitlements() {
    vm.startPrank(founder);
    IEntitlementsManagerBase.Entitlement[]
      memory entitlements = IEntitlementsManager(userSpace).getEntitlements();
    IEntitlement ruleEntitlement = IEntitlement(entitlements[1].moduleAddress);

    // IRuleEntitlements only allow one entitlement per role, so create 2 roles to add 2 rule entitlements that need to
    // be checked for the joinSpace permission.
    IRolesBase.CreateEntitlement[]
      memory createEntitlements1 = new IRolesBase.CreateEntitlement[](1);
    IRolesBase.CreateEntitlement[]
      memory createEntitlements2 = new IRolesBase.CreateEntitlement[](1);

    createEntitlements1[0] = IRolesBase.CreateEntitlement({
      module: ruleEntitlement,
      data: abi.encode(RuleEntitlementUtil.getMockERC20RuleData())
    });
    createEntitlements2[0] = IRolesBase.CreateEntitlement({
      module: ruleEntitlement,
      data: abi.encode(RuleEntitlementUtil.getMockERC1155RuleData())
    });

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.JoinSpace;

    IRoles(userSpace).createRole(
      "joinspace-crosschain-multi-entitlement-1",
      permissions,
      createEntitlements1
    );
    IRoles(userSpace).createRole(
      "joinspace-crosschain-multi-entitlement-2",
      permissions,
      createEntitlements2
    );
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
