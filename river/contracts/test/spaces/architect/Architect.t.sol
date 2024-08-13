// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IPausableBase, IPausable} from "contracts/src/diamond/facets/pausable/IPausable.sol";
import {IGuardian} from "contracts/src/spaces/facets/guardian/IGuardian.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {IRuleEntitlement, IRuleEntitlementV2} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {RuleEntitlement} from "contracts/src/spaces/entitlements/rule/RuleEntitlement.sol";
import {IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IWalletLink} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";

// libraries
import {LibString} from "solady/utils/LibString.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";
import {RuleEntitlementUtil} from "contracts/test/crosschain/RuleEntitlementUtil.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";
import {UserEntitlement} from "contracts/src/spaces/entitlements/user/UserEntitlement.sol";
import {WalletLink} from "contracts/src/factory/facets/wallet-link/WalletLink.sol";
import {Factory} from "contracts/src/utils/Factory.sol";

// errors
import {Validator__InvalidStringLength} from "contracts/src/utils/Validator.sol";

contract ArchitectTest is
  BaseSetup,
  IArchitectBase,
  IOwnableBase,
  IPausableBase
{
  Architect public spaceArchitect;

  function setUp() public override {
    super.setUp();
    spaceArchitect = Architect(spaceFactory);
  }

  function test_fuzz_createSpace(
    address founder,
    address user
  ) external assumeEOA(founder) {
    vm.assume(founder != user);

    SpaceInfo memory spaceInfo = _createSpaceInfo("Test");
    spaceInfo.membership.settings.pricingModule = pricingModule;

    vm.prank(founder);
    address spaceAddress = spaceArchitect.createSpace(spaceInfo);

    // expect owner to be founder
    assertTrue(
      IEntitlementsManager(spaceAddress).isEntitledToSpace(
        founder,
        Permissions.Read
      )
    );

    // expect no one to be entitled
    assertFalse(
      IEntitlementsManager(spaceAddress).isEntitledToSpace(
        user,
        Permissions.Read
      )
    );
  }

  function test_fuzz_minterRoleEntitlementExists(
    address founder
  ) external assumeEOA(founder) {
    vm.prank(founder);
    IArchitectBase.SpaceInfo memory spaceInfo = _createGatedSpaceInfo("Test");
    spaceInfo.membership.settings.pricingModule = pricingModule;
    address spaceAddress = spaceArchitect.createSpace(spaceInfo);

    IEntitlementsManager.Entitlement[]
      memory entitlements = IEntitlementsManager(spaceAddress)
        .getEntitlements();

    address ruleEntitlementAddress;
    for (uint256 i; i < entitlements.length; ++i) {
      if (LibString.eq(entitlements[i].moduleType, "RuleEntitlementV2")) {
        ruleEntitlementAddress = entitlements[i].moduleAddress;
        break;
      }
    }

    uint256 minterRoleId = 1;
    // ruleData for minter role
    IRuleEntitlement.RuleDataV2 memory ruleData = IRuleEntitlementV2(
      ruleEntitlementAddress
    ).getRuleDataV2(minterRoleId);

    assertEq(
      abi.encode(ruleData),
      abi.encode(RuleEntitlementUtil.getMockERC721RuleData())
    );
  }

  function test_getImplementations() external view {
    (
      ISpaceOwner spaceTokenAddress,
      IUserEntitlement userEntitlementAddress,
      IRuleEntitlement ruleEntitlementAddress
    ) = spaceArchitect.getSpaceArchitectImplementations();

    assertEq(spaceOwner, address(spaceTokenAddress));
    assertEq(userEntitlement, address(userEntitlementAddress));
    assertEq(ruleEntitlement, address(ruleEntitlementAddress));
  }

  function test_fuzz_setImplementations(address user) external {
    ISpaceOwner newSpaceToken = ISpaceOwner(address(new MockERC721()));
    IUserEntitlement newUserEntitlement = new UserEntitlement();
    IRuleEntitlement newRuleEntitlement = new RuleEntitlement();

    vm.assume(user != deployer);

    vm.prank(user);
    vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, user));
    spaceArchitect.setSpaceArchitectImplementations(
      newSpaceToken,
      newUserEntitlement,
      newRuleEntitlement
    );

    vm.prank(deployer);
    spaceArchitect.setSpaceArchitectImplementations(
      newSpaceToken,
      newUserEntitlement,
      newRuleEntitlement
    );

    (
      ISpaceOwner spaceTokenAddress,
      IUserEntitlement userEntitlementAddress,
      IRuleEntitlement tokenEntitlementAddress
    ) = spaceArchitect.getSpaceArchitectImplementations();

    assertEq(address(newSpaceToken), address(spaceTokenAddress));
    assertEq(address(newUserEntitlement), address(userEntitlementAddress));
    assertEq(address(newRuleEntitlement), address(tokenEntitlementAddress));
  }

  function test_fuzz_transfer_space_ownership(
    string memory spaceName,
    address founder,
    address buyer
  ) external assumeEOA(founder) assumeEOA(buyer) {
    vm.assume(bytes(spaceName).length > 2);
    vm.assume(founder != buyer);

    SpaceInfo memory spaceInfo = _createSpaceInfo(spaceName);
    spaceInfo.membership.settings.pricingModule = pricingModule;

    vm.prank(founder);
    address newSpace = spaceArchitect.createSpace(spaceInfo);

    assertTrue(
      IEntitlementsManager(newSpace).isEntitledToSpace(
        founder,
        Permissions.Read
      )
    );

    (ISpaceOwner spaceOwner, , ) = spaceArchitect
      .getSpaceArchitectImplementations();
    uint256 tokenId = spaceArchitect.getTokenIdBySpace(newSpace);

    vm.prank(founder);
    IGuardian(address(spaceOwner)).disableGuardian();

    vm.warp(IGuardian(address(spaceOwner)).guardianCooldown(founder));

    vm.prank(founder);
    IERC721(address(spaceOwner)).transferFrom(founder, buyer, tokenId);

    assertFalse(
      IEntitlementsManager(newSpace).isEntitledToSpace(
        founder,
        Permissions.Read
      )
    );

    assertTrue(
      IEntitlementsManager(newSpace).isEntitledToSpace(buyer, Permissions.Read)
    );
  }

  function test_fuzz_revertWhen_createSpaceAndPaused(
    string memory spaceName,
    address founder
  ) external assumeEOA(founder) {
    vm.assume(bytes(spaceName).length > 2);

    vm.prank(deployer);
    IPausable(address(spaceArchitect)).pause();

    SpaceInfo memory spaceInfo = _createSpaceInfo(spaceName);
    spaceInfo.membership.settings.pricingModule = pricingModule;

    vm.prank(founder);
    vm.expectRevert(Pausable__Paused.selector);
    spaceArchitect.createSpace(spaceInfo);

    vm.prank(deployer);
    IPausable(address(spaceArchitect)).unpause();

    vm.prank(founder);
    spaceArchitect.createSpace(spaceInfo);
  }

  function test_fuzz_revertIfInvalidSpaceId(
    address founder
  ) external assumeEOA(founder) {
    vm.expectRevert(Validator__InvalidStringLength.selector);

    SpaceInfo memory spaceInfo = _createSpaceInfo("");
    spaceInfo.membership.settings.pricingModule = pricingModule;

    vm.prank(founder);
    spaceArchitect.createSpace(spaceInfo);
  }

  function test_revertIfNotProperReceiver(string memory spaceName) external {
    vm.assume(bytes(spaceName).length > 2);

    SpaceInfo memory spaceInfo = _createSpaceInfo(spaceName);
    spaceInfo.membership.settings.pricingModule = pricingModule;

    vm.expectRevert(Factory.Factory__FailedDeployment.selector);

    vm.prank(address(this));
    spaceArchitect.createSpace(spaceInfo);
  }

  function test_fuzz_createSpace_updateMemberPermissions(
    string memory spaceName,
    address founder,
    address user
  ) external assumeEOA(founder) assumeEOA(user) {
    vm.assume(bytes(spaceName).length > 2);
    vm.assume(founder != user);

    SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo(spaceName);
    spaceInfo.membership.settings.pricingModule = pricingModule;

    vm.prank(founder);
    address spaceInstance = spaceArchitect.createSpace(spaceInfo);

    // have another user join the space
    vm.prank(user);
    IMembership(spaceInstance).joinSpace(user);

    // assert that he cannot modify channels
    assertFalse(
      IEntitlementsManager(spaceInstance).isEntitledToSpace(
        user,
        Permissions.ModifyChannels
      )
    );

    // get the current member role
    IRoles.Role[] memory roles = IRoles(spaceInstance).getRoles();
    IRoles.Role memory memberRole;

    for (uint256 i; i < roles.length; ++i) {
      if (LibString.eq(roles[i].name, "Member")) {
        memberRole = roles[i];
        break;
      }
    }

    // update the permissions of the member role
    // string[] memory permissions = new string[](3);
    // permissions[0] = Permissions.Read;
    // permissions[1] = Permissions.Write;
    // permissions[2] = Permissions.ModifyChannels;
    // IRoles.CreateEntitlement[]
    //   memory entitlements = new IRoles.CreateEntitlement[](0);
    // vm.prank(founder);
    // IRoles(spaceInstance).updateRole(
    //   memberRole.id,
    //   memberRole.name,
    //   permissions,
    //   entitlements
    // );

    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.ModifyChannels;

    vm.prank(founder);
    IRoles(spaceInstance).addPermissionsToRole(memberRole.id, permissions);

    assertTrue(
      IEntitlementsManager(spaceInstance).isEntitledToSpace(
        user,
        Permissions.ModifyChannels
      )
    );
  }
}
