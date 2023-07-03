// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// utils
import {FacetTest} from "contracts/test/diamond/Facet.t.sol";

//interfaces
import {IEntitlement} from "contracts/src/towns/entitlements/IEntitlement.sol";

//libraries

//contracts
import {UserEntitlement} from "contracts/src/towns/entitlements/user/UserEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract UserEntitlementTest is FacetTest {
  UserEntitlement internal implementation;
  UserEntitlement internal userEntitlement;

  address internal entitlement;

  function setUp() public override {
    super.setUp();

    implementation = new UserEntitlement();
    entitlement = address(
      new ERC1967Proxy(
        address(implementation),
        abi.encodeCall(UserEntitlement.initialize, (diamond))
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

    vm.startPrank(diamond);
    userEntitlement.setEntitlement(roleId, abi.encode(users));
    vm.stopPrank();

    bytes[] memory data = userEntitlement.getEntitlementDataByRoleId(roleId);

    uint256 possibleLength;

    for (uint256 i = 0; i < data.length; i++) {
      address[] memory decodedAddresses = abi.decode(data[i], (address[]));
      possibleLength += decodedAddresses.length;
    }

    address[] memory allAddresses = new address[](possibleLength);

    for (uint256 i = 0; i < data.length; i++) {
      address[] memory decodedAddresses = abi.decode(data[i], (address[]));
      for (uint256 j = 0; j < decodedAddresses.length; j++) {
        allAddresses[j] = decodedAddresses[j];
      }
    }

    console.log(allAddresses.length);
  }

  function test_setEntitlement_revert_empty_users(uint256 roleId) external {
    address[] memory users = new address[](0);

    vm.prank(diamond);
    vm.expectRevert(IEntitlement.Entitlement__InvalidValue.selector);
    userEntitlement.setEntitlement(roleId, abi.encode(users));
  }

  function test_setEntitlement_revert_invalid_user(uint256 roleId) external {
    address[] memory users = new address[](1);
    users[0] = address(0);

    vm.prank(diamond);
    vm.expectRevert(IEntitlement.Entitlement__InvalidValue.selector);
    userEntitlement.setEntitlement(roleId, abi.encode(users));
  }

  function test_removeEntitlement(uint256 roleId) external {
    vm.assume(roleId != 0);

    address user = _randomAddress();

    address[] memory users = new address[](1);
    users[0] = user;

    vm.startPrank(diamond);
    userEntitlement.setEntitlement(roleId, abi.encode(users));
    userEntitlement.removeEntitlement(roleId, abi.encode(users));
    vm.stopPrank();
  }

  function test_removeEntitlement_revert_invalid_value(
    uint256 roleId
  ) external {
    vm.assume(roleId != 0);

    address user = _randomAddress();

    address[] memory users = new address[](1);
    users[0] = user;

    vm.startPrank(diamond);
    userEntitlement.setEntitlement(roleId, abi.encode(users));

    users[0] = address(0);

    vm.expectRevert(IEntitlement.Entitlement__InvalidValue.selector);
    userEntitlement.removeEntitlement(roleId, abi.encode(users));
    vm.stopPrank();
  }
}
