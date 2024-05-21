// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";

//libraries

//contracts
import {UserEntitlement} from "contracts/src/spaces/entitlements/user/UserEntitlement.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract UserEntitlementTest is TestUtils, IEntitlementBase {
  UserEntitlement internal implementation;
  UserEntitlement internal userEntitlement;

  address internal entitlement;
  address internal space;
  address internal deployer;

  function setUp() public {
    deployer = _randomAddress();
    space = _randomAddress();

    vm.startPrank(deployer);
    implementation = new UserEntitlement();
    entitlement = address(
      new ERC1967Proxy(
        address(implementation),
        abi.encodeCall(UserEntitlement.initialize, (space))
      )
    );

    userEntitlement = UserEntitlement(entitlement);
    vm.stopPrank();
  }

  function test_getEntitlementDataByRoleId() external {
    uint256 roleId = 1;

    address user = _randomAddress();

    address[] memory users = new address[](1);
    users[0] = user;

    vm.startPrank(space);
    userEntitlement.setEntitlement(roleId, abi.encode(users));
    vm.stopPrank();

    bytes memory data = userEntitlement.getEntitlementDataByRoleId(roleId);

    address[] memory decodedAddresses = abi.decode(data, (address[]));
    for (uint256 j = 0; j < decodedAddresses.length; j++) {
      users[j] = decodedAddresses[j];
    }

    assertEq(decodedAddresses[0], user);
  }

  function test_setEntitlement_replace_with_empty_users(
    uint256 roleId
  ) external {
    address[] memory users = new address[](1);
    users[0] = _randomAddress();
    vm.prank(space);
    userEntitlement.setEntitlement(roleId, abi.encode(users));
    bytes memory data = userEntitlement.getEntitlementDataByRoleId(roleId);
    address[] memory decodedAddresses = abi.decode(data, (address[]));

    assertEq(decodedAddresses.length, users.length);
    for (uint256 i = 0; i < users.length; i++) {
      assertEq(users[i], decodedAddresses[i]);
    }

    address[] memory newUsers = new address[](2);
    newUsers[0] = _randomAddress();
    newUsers[1] = _randomAddress();
    vm.prank(space);
    userEntitlement.setEntitlement(roleId, abi.encode(newUsers));
    address[] memory newDecodedUsers = abi.decode(
      userEntitlement.getEntitlementDataByRoleId(roleId),
      (address[])
    );
    assertEq(newDecodedUsers.length, newUsers.length);
    for (uint256 i = 0; i < newUsers.length; i++) {
      assertEq(newUsers[i], newDecodedUsers[i]);
    }
  }

  function test_setEntitlement_revert_invalid_user(uint256 roleId) external {
    address[] memory users = new address[](1);
    users[0] = address(0);

    vm.prank(space);
    vm.expectRevert(Entitlement__InvalidValue.selector);
    userEntitlement.setEntitlement(roleId, abi.encode(users));
  }

  function test_removeEntitlement(uint256 roleId) external {
    vm.assume(roleId != 0);

    address user = _randomAddress();

    address[] memory users = new address[](1);
    users[0] = user;

    vm.startPrank(space);
    userEntitlement.setEntitlement(roleId, abi.encode(users));
    userEntitlement.removeEntitlement(roleId);
    vm.stopPrank();
  }

  function test_removeEntitlement_revert_invalid_value(
    uint256 roleId,
    uint256 invalidRoleId
  ) external {
    vm.assume(roleId != 0);
    vm.assume(invalidRoleId != roleId);

    address user = _randomAddress();

    address[] memory users = new address[](1);
    users[0] = user;

    vm.startPrank(space);
    userEntitlement.setEntitlement(roleId, abi.encode(users));

    vm.expectRevert(Entitlement__InvalidValue.selector);
    userEntitlement.removeEntitlement(invalidRoleId);
    vm.stopPrank();
  }
}
