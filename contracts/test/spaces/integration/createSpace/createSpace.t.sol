// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IERC173} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IArchitect} from "contracts/src/spaces/facets/architect/IArchitect.sol";
import {IArchitectBase} from "contracts/src/spaces/facets/architect/IArchitect.sol";
import {IMembership} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";
import {RuleEntitlementUtil} from "contracts/src/crosschain/RuleEntitlementUtil.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

import {Architect} from "contracts/src/spaces/facets/architect/Architect.sol";

contract Integration_CreateSpace is BaseSetup, IRolesBase, IArchitectBase {
  Architect public spaceArchitect;

  function setUp() public override {
    super.setUp();
    spaceArchitect = Architect(spaceFactory);
  }

  function test_createSpace_with_default_channel() external {
    string memory spaceId = "Test";

    address founder = _randomAddress();

    vm.prank(founder);
    address newSpace = _createSimpleSpace(spaceId);

    assertEq(founder, IERC173(newSpace).owner());

    IChannel.Channel[] memory channels = IChannel(newSpace).getChannels();

    assertEq(channels.length, 1);
  }

  function test_createSpace_with_separate_channel() external {
    string memory spaceId = "test";

    address founder = _randomAddress();
    address member = _randomAddress();

    // create space with default channel

    vm.prank(founder);
    address newSpace = _createSimpleSpace(spaceId);

    IMembership(newSpace).joinTown(member);

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
    permissions[0] = "Write";

    // create which entitlements have access to this role
    address[] memory users = new address[](1);
    users[0] = member;

    CreateEntitlement[] memory roleEntitlements = new CreateEntitlement[](1);

    // create entitlement adding users and user entitlement
    roleEntitlements[0] = CreateEntitlement({
      module: userEntitlement,
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
        permission: "Write"
      })
    );

    // however they cannot access the channel
    assertFalse(
      IEntitlementsManager(newSpace).isEntitledToChannel({
        channelId: "test2",
        user: member,
        permission: "Write"
      })
    );

    // add role to channel to allow access
    vm.prank(founder);
    IChannel(newSpace).addRoleToChannel({channelId: "test2", roleId: roleId});

    bool isEntitledToChannelAfter = IEntitlementsManager(newSpace)
      .isEntitledToChannel("test2", member, "Write");
    // members can access the channel now
    assertTrue(isEntitledToChannelAfter);
  }

  // =============================================================
  //                           Users
  // =============================================================
  function test_createSpace_with_users() external {
    string memory spaceId = "test";

    address founder = _randomAddress();
    address bob = _randomAddress();

    address[] memory users = new address[](1);
    users[0] = bob;

    SpaceInfo memory spaceInfo = SpaceInfo({
      id: spaceId,
      name: "test",
      uri: "ipfs://test",
      membership: Membership({
        settings: IMembershipBase.Membership({
          name: "Member",
          symbol: "MEM",
          price: 0,
          maxSupply: 0,
          duration: 0,
          currency: address(0),
          feeRecipient: address(0),
          freeAllocation: 0,
          pricingModule: address(0)
        }),
        requirements: MembershipRequirements({
          everyone: false,
          users: users,
          ruleData: RuleEntitlementUtil.getNoopRuleData()
        }),
        permissions: new string[](1)
      }),
      channel: ChannelInfo({metadata: "ipfs://test", id: "test"})
    });

    spaceInfo.membership.permissions[0] = "Read";

    vm.prank(founder);
    address newSpace = IArchitect(spaceFactory).createSpace(spaceInfo);

    assertTrue(
      IEntitlementsManager(newSpace).isEntitledToSpace(
        bob,
        Permissions.JoinSpace
      ),
      "Bob should be entitled to mint membership"
    );

    vm.prank(bob);
    IMembership(newSpace).joinTown(bob);

    assertEq(
      IERC721A(newSpace).balanceOf(bob),
      1,
      "Bob should have 1 membership token"
    );

    assertTrue(
      IEntitlementsManager(newSpace).isEntitledToSpace(bob, Permissions.Read),
      "Bob should be entitled to read"
    );
  }

  // =============================================================
  //                           Helpers
  // =============================================================
  function _createSimpleSpace(
    string memory spaceId
  ) internal returns (address) {
    IArchitectBase.SpaceInfo memory spaceInfo = IArchitectBase.SpaceInfo({
      id: spaceId,
      name: "test",
      uri: "ipfs://test",
      membership: IArchitectBase.Membership({
        settings: IMembershipBase.Membership({
          name: "Member",
          symbol: "MEM",
          price: 0,
          maxSupply: 0,
          duration: 0,
          currency: address(0),
          feeRecipient: address(0),
          freeAllocation: 0,
          pricingModule: address(0)
        }),
        requirements: IArchitectBase.MembershipRequirements({
          everyone: true,
          users: new address[](0),
          ruleData: RuleEntitlementUtil.getNoopRuleData()
        }),
        permissions: new string[](0)
      }),
      channel: IArchitectBase.ChannelInfo({id: "test", metadata: "ipfs://test"})
    });

    return spaceArchitect.createSpace(spaceInfo);
  }
}
