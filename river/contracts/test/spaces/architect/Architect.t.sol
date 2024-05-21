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
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {RuleEntitlement} from "contracts/src/spaces/entitlements/rule/RuleEntitlement.sol";
import {IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IWalletLink} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";

// libraries
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

  function test_createSpace() external {
    string memory name = "Test";
    address founder = _randomAddress();

    SpaceInfo memory spaceInfo = _createSpaceInfo(name);
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
        _randomAddress(),
        Permissions.Read
      )
    );
  }

  function test_minter_role_entitlments() external {
    string memory name = "Test";

    address founder = _randomAddress();

    vm.prank(founder);
    IArchitectBase.SpaceInfo memory spaceInfo = _createGatedSpaceInfo(name);
    spaceInfo.membership.settings.pricingModule = pricingModule;
    address spaceAddress = spaceArchitect.createSpace(spaceInfo);

    IEntitlementsManager.Entitlement[]
      memory entitlements = IEntitlementsManager(spaceAddress)
        .getEntitlements();

    address ruleEntitlementAddress;

    for (uint256 i = 0; i < entitlements.length; i++) {
      if (
        keccak256(abi.encodePacked(entitlements[i].moduleType)) ==
        keccak256(abi.encodePacked("RuleEntitlement"))
      ) {
        ruleEntitlementAddress = entitlements[i].moduleAddress;
        break;
      }
    }

    uint256 minterRoleId = 1;
    // ruleData for minter role
    IRuleEntitlement.RuleData memory ruleData = IRuleEntitlement(
      ruleEntitlementAddress
    ).getRuleData(minterRoleId);

    assertEq(
      ruleData.checkOperations[0].contractAddress,
      RuleEntitlementUtil
        .getMockERC721RuleData()
        .checkOperations[0]
        .contractAddress
    );
  }

  function test_getImplementations() external {
    (
      ISpaceOwner spaceTokenAddress,
      IUserEntitlement userEntitlementAddress,
      IRuleEntitlement ruleEntitlementAddress
    ) = spaceArchitect.getSpaceArchitectImplementations();

    assertEq(spaceOwner, address(spaceTokenAddress));
    assertEq(userEntitlement, address(userEntitlementAddress));
    assertEq(ruleEntitlement, address(ruleEntitlementAddress));
  }

  function test_setImplementations() external {
    ISpaceOwner newSpaceToken = ISpaceOwner(address(new MockERC721()));
    IUserEntitlement newUserEntitlement = new UserEntitlement();
    IRuleEntitlement newRuleEntitlement = new RuleEntitlement();

    address user = _randomAddress();

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

  function test_transfer_space_ownership(string memory spaceName) external {
    vm.assume(bytes(spaceName).length > 2);

    address founder = _randomAddress();
    address buyer = _randomAddress();

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

  function test_revertWhen_createSpaceAndPaused(
    string memory spaceName
  ) external {
    vm.assume(bytes(spaceName).length > 2);

    vm.prank(deployer);
    IPausable(address(spaceArchitect)).pause();

    address founder = _randomAddress();

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

  function test_revertIfInvalidSpaceId() external {
    address founder = _randomAddress();

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

  function test_createSpace_updateMemberPermissions(
    string memory spaceName
  ) external {
    vm.assume(bytes(spaceName).length > 2);

    address founder = _randomAddress();
    address user = _randomAddress();

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

    for (uint256 i = 0; i < roles.length; i++) {
      if (keccak256(abi.encodePacked(roles[i].name)) == keccak256("Member")) {
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
