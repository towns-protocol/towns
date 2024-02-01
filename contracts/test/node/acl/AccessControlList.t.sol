// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {IAccessControlListBase} from "contracts/src/node/acl/IAccessControlList.sol";
import {NodeBaseSetup} from "../NodeBaseSetup.sol";

contract AccessControlListSetupTest is NodeBaseSetup, IAccessControlListBase {
  function testDefaultAccessControlStatus() external {
    address operator = _randomAddress();

    assertEq(
      uint256(accessControlListFacet.accessControlStatus(operator)),
      uint256(AccessControlStatus.Unrecognized)
    );
  }

  function testAddToAllowlistSuccess() external {
    address operator = _randomAddress();

    vm.prank(deployer);
    accessControlListFacet.addToAllowlist(operator);

    assertEq(
      uint256(accessControlListFacet.accessControlStatus(operator)),
      uint256(AccessControlStatus.Allowlisted)
    );
  }

  function testRemoveFromAllowlistSuccess() external {
    address operator = _randomAddress();

    vm.startPrank(deployer);
    accessControlListFacet.addToAllowlist(operator);
    accessControlListFacet.removeFromAllowlist(operator);

    assertEq(
      uint256(accessControlListFacet.accessControlStatus(operator)),
      uint256(AccessControlStatus.Unrecognized)
    );
  }

  function testAddToBlocklistSuccessFromUnrecognized() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    accessControlListFacet.addToBlocklist(operator);

    assertEq(
      uint256(accessControlListFacet.accessControlStatus(operator)),
      uint256(AccessControlStatus.Blocklisted)
    );
  }

  function testAddToBlocklistSuccessFromAllowlisted() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    accessControlListFacet.addToAllowlist(operator);

    assertEq(
      uint256(accessControlListFacet.accessControlStatus(operator)),
      uint256(AccessControlStatus.Allowlisted)
    );

    accessControlListFacet.addToBlocklist(operator);

    assertEq(
      uint256(accessControlListFacet.accessControlStatus(operator)),
      uint256(AccessControlStatus.Blocklisted)
    );
  }

  function testAddToBlocklistSuccessFromAllowlistedThenRemoved() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    accessControlListFacet.addToAllowlist(operator);
    assertEq(
      uint256(accessControlListFacet.accessControlStatus(operator)),
      uint256(AccessControlStatus.Allowlisted)
    );

    accessControlListFacet.removeFromAllowlist(operator);
    assertEq(
      uint256(accessControlListFacet.accessControlStatus(operator)),
      uint256(AccessControlStatus.Unrecognized)
    );

    accessControlListFacet.addToBlocklist(operator);
    assertEq(
      uint256(accessControlListFacet.accessControlStatus(operator)),
      uint256(AccessControlStatus.Blocklisted)
    );
  }

  function testAddToAllowlistFailBecauseBlocklisted() external {
    vm.startPrank(deployer);
    address operator = _randomAddress();

    accessControlListFacet.addToBlocklist(operator);
    vm.expectRevert(AccessControlList__NotUnrecognized.selector);
    accessControlListFacet.addToAllowlist(operator);
  }

  function failAddToAllowlistFailBecauseOwnerOnly() external {
    address randomAddress = _randomAddress();
    vm.startPrank(randomAddress);
    address operator = _randomAddress();

    accessControlListFacet.addToAllowlist(operator);
  }
}
