// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IArchitect} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IRuleEntitlementBase} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IPlatformRequirements} from "contracts/src/factory/facets/platform/requirements/IPlatformRequirements.sol";
import {IPrepay} from "contracts/src/spaces/facets/prepay/IPrepay.sol";
// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";

// mocks
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";
import {CreateSpaceFacet} from "contracts/src/factory/facets/create/CreateSpace.sol";

contract IntegrationCreateSpace is
  BaseSetup,
  IRolesBase,
  IArchitectBase,
  IRuleEntitlementBase
{
  Architect public spaceArchitect;
  CreateSpaceFacet public createSpaceFacet;

  function setUp() public override {
    super.setUp();
    spaceArchitect = Architect(spaceFactory);
    createSpaceFacet = CreateSpaceFacet(spaceFactory);
  }

  function test_fuzz_createEveryoneSpace(
    string memory spaceId,
    address founder,
    address user
  ) external assumeEOA(founder) {
    vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);

    SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo(spaceId);
    spaceInfo.membership.settings.pricingModule = pricingModule;

    vm.prank(founder);
    address newSpace = createSpaceFacet.createSpace(spaceInfo);

    // assert everyone can join
    assertTrue(
      IEntitlementsManager(newSpace).isEntitledToSpace(
        user,
        Permissions.JoinSpace
      )
    );
  }

  function test_fuzz_createUserGatedSpace(
    string memory spaceId,
    address founder,
    address user
  ) external assumeEOA(founder) assumeEOA(user) {
    vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);

    address[] memory users = new address[](1);
    users[0] = user;

    SpaceInfo memory spaceInfo = _createUserSpaceInfo(spaceId, users);
    spaceInfo.membership.settings.pricingModule = pricingModule;
    spaceInfo.membership.settings.freeAllocation = FREE_ALLOCATION;
    spaceInfo.membership.permissions = new string[](1);
    spaceInfo.membership.permissions[0] = Permissions.Read;

    vm.prank(founder);
    address newSpace = createSpaceFacet.createSpace(spaceInfo);

    assertTrue(
      IEntitlementsManager(newSpace).isEntitledToSpace(
        user,
        Permissions.JoinSpace
      ),
      "Bob should be entitled to mint a membership"
    );

    vm.prank(user);
    IMembership(newSpace).joinSpace(user);

    assertTrue(
      IEntitlementsManager(newSpace).isEntitledToSpace(user, Permissions.Read),
      "Bob should be entitled to read"
    );
  }

  function test_fuzz_createTokenGatedSpace(
    string memory spaceId,
    address founder,
    address user
  ) external assumeEOA(founder) assumeEOA(user) {
    vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);

    address mock = address(new MockERC721());

    // We first define how many operations we want to have
    Operation[] memory operations = new Operation[](1);
    operations[0] = Operation({opType: CombinedOperationType.CHECK, index: 0});

    // We then define the type of operations we want to have
    CheckOperationV2[] memory checkOperations = new CheckOperationV2[](1);
    checkOperations[0] = CheckOperationV2({
      opType: CheckOperationType.ERC721,
      chainId: block.chainid,
      contractAddress: mock,
      params: abi.encode(uint256(1))
    });

    // We then define the logical operations we want to have
    LogicalOperation[] memory logicalOperations = new LogicalOperation[](0);

    // We then define the rule data
    RuleDataV2 memory ruleData = RuleDataV2({
      operations: operations,
      checkOperations: checkOperations,
      logicalOperations: logicalOperations
    });

    SpaceInfo memory spaceInfo = _createSpaceInfo(spaceId);
    spaceInfo.membership.requirements.ruleData = abi.encode(ruleData);
    spaceInfo.membership.settings.pricingModule = pricingModule;

    vm.prank(founder);
    createSpaceFacet.createSpace(spaceInfo);

    MockERC721(mock).mint(user, 1);
  }

  // =============================================================
  //                           Channels
  // =============================================================

  function test_fuzz_createEveryoneSpace_with_separate_channels(
    string memory spaceId,
    address founder,
    address member
  ) external assumeEOA(founder) assumeEOA(member) {
    vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);
    vm.assume(founder != member);

    // create space with default channel
    SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo(spaceId);
    spaceInfo.membership.settings.pricingModule = pricingModule;
    spaceInfo.membership.settings.freeAllocation = FREE_ALLOCATION;

    vm.prank(founder);
    address newSpace = createSpaceFacet.createSpace(spaceInfo);

    vm.prank(member);
    IMembership(newSpace).joinSpace(member);

    // look for user entitlement
    IEntitlementsManager.Entitlement[]
      memory entitlements = IEntitlementsManager(newSpace).getEntitlements();

    address userEntitlement;

    for (uint256 i = 0; i < entitlements.length; i++) {
      if (
        keccak256(abi.encodePacked(entitlements[i].moduleType)) ==
        keccak256(abi.encodePacked("UserEntitlement"))
      ) {
        userEntitlement = entitlements[i].moduleAddress;
        break;
      }
    }

    if (userEntitlement == address(0)) {
      revert("User entitlement not found");
    }

    // create permissions for entitlement
    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Write;

    // create which entitlements have access to this role
    address[] memory users = new address[](1);
    users[0] = member;

    CreateEntitlement[] memory roleEntitlements = new CreateEntitlement[](1);

    // create entitlement adding users and user entitlement
    roleEntitlements[0] = CreateEntitlement({
      module: IEntitlement(userEntitlement),
      data: abi.encode(users)
    });

    // create role with permissions and entitlements attached to it
    vm.prank(founder);
    uint256 roleId = IRoles(newSpace).createRole({
      roleName: "Member",
      permissions: permissions,
      entitlements: roleEntitlements
    });

    // create channel with no roles attached to it
    vm.prank(founder);
    IChannel(newSpace).createChannel({
      channelId: "test2",
      metadata: "test2",
      roleIds: new uint256[](0)
    });

    // members can access the space
    assertTrue(
      IEntitlementsManager(newSpace).isEntitledToSpace({
        user: member,
        permission: Permissions.Write
      }),
      "Member should be able to access the space"
    );

    // however they cannot access the channel
    assertFalse(
      IEntitlementsManager(newSpace).isEntitledToChannel({
        channelId: "test2",
        user: member,
        permission: Permissions.Write
      }),
      "Member should not be able to access the channel"
    );

    // add role to channel to allow access
    vm.prank(founder);
    IChannel(newSpace).addRoleToChannel({channelId: "test2", roleId: roleId});

    bool isEntitledToChannelAfter = IEntitlementsManager(newSpace)
      .isEntitledToChannel("test2", member, Permissions.Write);
    // members can access the channel now
    assertTrue(
      isEntitledToChannelAfter,
      "Member should be able to access the channel"
    );
  }

  function test_fuzz_createSpaceWithPrepay(
    string memory spaceId,
    address founder,
    address member
  ) external assumeEOA(founder) assumeEOA(member) {
    vm.assume(bytes(spaceId).length > 2 && bytes(spaceId).length < 100);
    vm.assume(founder != member);

    // create space with default channel
    CreateSpace memory spaceInfo = _createSpaceWithPrepayInfo(spaceId);
    spaceInfo.membership.settings.pricingModule = pricingModule;
    spaceInfo.prepay.supply = 100;
    spaceInfo.membership.requirements.everyone = true;

    uint256 cost = spaceInfo.prepay.supply *
      IPlatformRequirements(spaceFactory).getMembershipFee();

    vm.deal(founder, cost);
    vm.prank(founder);
    address newSpace = createSpaceFacet.createSpaceWithPrepay{value: cost}(
      spaceInfo
    );

    uint256 prepaidSupply = IPrepay(newSpace).prepaidMembershipSupply();

    assertTrue(
      IEntitlementsManager(newSpace).isEntitledToSpace(
        member,
        Permissions.JoinSpace
      )
    );

    assertTrue(
      prepaidSupply == spaceInfo.prepay.supply,
      "Prepaid supply should be equal to the supply"
    );
  }
}
