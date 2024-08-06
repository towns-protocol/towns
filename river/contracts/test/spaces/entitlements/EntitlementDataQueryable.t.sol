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
import {Vm} from "forge-std/Test.sol";

// contracts

import {MembershipBaseSetup} from "contracts/test/spaces/membership/MembershipBaseSetup.sol";

// mocks
import {MockUserEntitlement} from "contracts/test/mocks/MockUserEntitlement.sol";

contract EntitlementDataQueryableTest is
  MembershipBaseSetup,
  IEntitlementDataQueryableBase,
  IRolesBase
{
  IEntitlementDataQueryable internal entitlements;
  MockUserEntitlement internal mockEntitlement;

  bytes32 internal constant CHECK_REQUESTED =
    keccak256(
      "EntitlementCheckRequested(address,address,bytes32,uint256,address[])"
    );

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

  function test_getEntitlementDataByRole() external view {
    EntitlementData[] memory entitlement = entitlements
      .getEntitlementDataByPermission(Permissions.JoinSpace);

    assertEq(entitlement.length == 1, true);
    assertEq(
      keccak256(abi.encodePacked(entitlement[0].entitlementType)),
      keccak256(abi.encodePacked("UserEntitlement"))
    );
  }

  function test_getChannelEntitlementDataByPermission() external {
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

  function test_getCrossChainEntitlementData() external {
    address alice = _randomAddress();

    vm.recordLogs();

    vm.prank(alice);
    membership.joinSpace(alice);

    Vm.Log[] memory requestLogs = vm.getRecordedLogs(); // Retrieve the recorded logs

    (, bytes32 transactionId, uint256 roleId, ) = _getRequestedEntitlementData(
      requestLogs
    );

    EntitlementData memory data = IEntitlementDataQueryable(userSpace)
      .getCrossChainEntitlementData(transactionId, roleId);

    assertTrue(data.entitlementData.length > 0);
    assertEq(
      keccak256(abi.encodePacked(data.entitlementType)),
      keccak256(abi.encodePacked("RuleEntitlement"))
    );
  }

  function _getRequestedEntitlementData(
    Vm.Log[] memory requestLogs
  )
    internal
    pure
    returns (
      address contractAddress,
      bytes32 transactionId,
      uint256 roleId,
      address[] memory selectedNodes
    )
  {
    for (uint i = 0; i < requestLogs.length; i++) {
      if (
        requestLogs[i].topics.length > 0 &&
        requestLogs[i].topics[0] == CHECK_REQUESTED
      ) {
        (, contractAddress, transactionId, roleId, selectedNodes) = abi.decode(
          requestLogs[i].data,
          (address, address, bytes32, uint256, address[])
        );
      }
    }
  }
}
