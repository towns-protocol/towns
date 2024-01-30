// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {AccessControlListSetup} from "./AccessControlListSetup.sol";
import {AccessControlStatus} from "contracts/src/node-network/acl/IAccessControlList.sol";
import {Errors} from "contracts/src/node-network/acl/Errors.sol";
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";

contract AccessControlListSetupTest is AccessControlListSetup {
  function testDefaultAccessControlStatus() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    assertEq(
      uint256(accessControlList.accessControlStatus(operator)),
      uint256(AccessControlStatus.Unrecognized)
    );
  }

  function testAddToAllowlistSuccess() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    accessControlList.addToAllowlist(operator);

    assertEq(
      uint256(accessControlList.accessControlStatus(operator)),
      uint256(AccessControlStatus.Allowlisted)
    );
  }

  function testRemoveFromAllowlistSuccess() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    accessControlList.addToAllowlist(operator);
    accessControlList.removeFromAllowlist(operator);

    assertEq(
      uint256(accessControlList.accessControlStatus(operator)),
      uint256(AccessControlStatus.Unrecognized)
    );
  }

  function testAddToBlocklistSuccessFromUnrecognized() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    accessControlList.addToBlocklist(operator);

    assertEq(
      uint256(accessControlList.accessControlStatus(operator)),
      uint256(AccessControlStatus.Blocklisted)
    );
  }

  function testAddToBlocklistSuccessFromAllowlisted() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    accessControlList.addToAllowlist(operator);

    assertEq(
      uint256(accessControlList.accessControlStatus(operator)),
      uint256(AccessControlStatus.Allowlisted)
    );

    accessControlList.addToBlocklist(operator);

    assertEq(
      uint256(accessControlList.accessControlStatus(operator)),
      uint256(AccessControlStatus.Blocklisted)
    );
  }

  function testAddToBlocklistSuccessFromAllowlistedThenRemoved() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    accessControlList.addToAllowlist(operator);
    assertEq(
      uint256(accessControlList.accessControlStatus(operator)),
      uint256(AccessControlStatus.Allowlisted)
    );

    accessControlList.removeFromAllowlist(operator);
    assertEq(
      uint256(accessControlList.accessControlStatus(operator)),
      uint256(AccessControlStatus.Unrecognized)
    );

    accessControlList.addToBlocklist(operator);
    assertEq(
      uint256(accessControlList.accessControlStatus(operator)),
      uint256(AccessControlStatus.Blocklisted)
    );
  }

  function testAddToAllowlistFailBecauseBlocklisted() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    accessControlList.addToBlocklist(operator);
    vm.expectRevert(Errors.NotUnrecognized.selector);
    accessControlList.addToAllowlist(operator);
  }

  function failAddToAllowlistFailBecauseOwnerOnly() external {
    address randomAddress = _randomAddress();
    vm.startPrank(randomAddress);
    address operator = _randomAddress();

    accessControlList.addToAllowlist(operator);
  }
}
