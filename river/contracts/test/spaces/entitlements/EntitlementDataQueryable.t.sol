// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementDataQueryable, IEntitlementDataQueryableBase} from "contracts/src/spaces/facets/entitlements/extensions/IEntitlementDataQueryable.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IRolesBase, IRoles} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";

// libraries
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

// mocks
import {MockUserEntitlement} from "contracts/test/mocks/MockUserEntitlement.sol";

contract EntitlementDataQueryableTest is
  BaseSetup,
  IEntitlementDataQueryableBase,
  IRolesBase
{
  IEntitlementDataQueryable internal entitlements;
  MockUserEntitlement internal mockEntitlement;

  function setUp() public override {
    super.setUp();

    entitlements = IEntitlementDataQueryable(everyoneSpace);
    mockEntitlement = new MockUserEntitlement();
    mockEntitlement.initialize(everyoneSpace);

    vm.prank(founder);
    IEntitlementsManager(everyoneSpace).addEntitlementModule(
      address(mockEntitlement)
    );
  }

  function test_getEntitlementDataByRole() external {
    EntitlementData[] memory entitlement = entitlements
      .getEntitlementDataByPermission(Permissions.JoinSpace);

    assertEq(entitlement.length == 1, true);
    assertEq(
      keccak256(abi.encodePacked(entitlement[0].entitlementType)),
      keccak256(abi.encodePacked("UserEntitlement"))
    );
  }

  function test_GetChannelEntitlementDataByPermission() external {
    string[] memory permissions = new string[](1);
    permissions[0] = Permissions.Read;

    address[] memory users = new address[](1);
    users[0] = _randomAddress();

    CreateEntitlement[] memory createEntitlements = new CreateEntitlement[](1);
    createEntitlements[0] = CreateEntitlement({
      module: IEntitlement(mockEntitlement),
      data: abi.encode(users)
    });

    vm.prank(founder);
    uint256 roleId = IRoles(everyoneSpace).createRole(
      "test-channel-member",
      permissions,
      createEntitlements
    );

    uint256[] memory roles = new uint256[](1);
    roles[0] = roleId;
    bytes32 channelId = "test-channel";

    vm.prank(founder);
    IChannel(everyoneSpace).createChannel(channelId, "Metadata", roles);

    EntitlementData[] memory channelEntitlements = entitlements
      .getChannelEntitlementDataByPermission(channelId, Permissions.Read);

    assertEq(channelEntitlements.length == 1, true);
    assertEq(
      keccak256(abi.encodePacked(channelEntitlements[0].entitlementType)),
      keccak256(abi.encodePacked("MockUserEntitlement"))
    );
    assertEq(
      keccak256(abi.encodePacked(channelEntitlements[0].entitlementData)),
      keccak256(abi.encode(users))
    );
  }
}
