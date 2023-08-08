// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IEntitlementsBase} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";

// libraries

// contracts
import {EntitlementsSetup} from "./EntitlementsSetup.sol";

// mocks
import {MockUserEntitlement} from "contracts/test/mocks/MockUserEntitlement.sol";

// errors

// solhint-disable-next-line max-line-length
import {EntitlementsService__InvalidEntitlementAddress, EntitlementsService__InvalidEntitlementInterface, EntitlementsService__ImmutableEntitlement, EntitlementsService__EntitlementDoesNotExist, EntitlementsService__EntitlementAlreadyExists} from "contracts/src/towns/facets/entitlements/EntitlementsService.sol";

contract EntitlementsTest is EntitlementsSetup, IEntitlementsBase {
  function test_addImmutableEntitlements() external {
    vm.prank(founder);
    entitlements.addImmutableEntitlements(immutableEntitlements);
  }

  function test_addImmutableEntitlements_revert_when_not_owner() external {
    address user = _randomAddress();

    vm.prank(user);
    vm.expectRevert(
      abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, user)
    );
    entitlements.addImmutableEntitlements(immutableEntitlements);
  }

  function test_addImmutableEntitlements_revert_when_invalid_entitlement_address()
    external
  {
    address[] memory invalidEntitlements = new address[](1);
    invalidEntitlements[0] = address(0);

    vm.prank(founder);
    vm.expectRevert(EntitlementsService__InvalidEntitlementAddress.selector);
    entitlements.addImmutableEntitlements(invalidEntitlements);
  }

  function test_addImmutableEntitlements_revert_when_invalid_entitlement_interface()
    external
  {
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__InvalidEntitlementAddress.selector);
    entitlements.addImmutableEntitlements(new address[](1));
  }

  function test_addImmutableEntitlements_revert_when_already_exists() external {
    vm.startPrank(founder);
    entitlements.addImmutableEntitlements(immutableEntitlements);
    vm.stopPrank();

    vm.prank(founder);
    vm.expectRevert(EntitlementsService__EntitlementAlreadyExists.selector);
    entitlements.addImmutableEntitlements(immutableEntitlements);
  }

  // =============================================================
  //                      Add Entitlements
  // =============================================================

  function test_addEntitlement() external {
    vm.prank(founder);
    entitlements.addEntitlement(address(mockEntitlement));
  }

  function test_addEntitlement_revert_when_not_owner() external {
    address user = _randomAddress();

    vm.prank(user);
    vm.expectRevert(
      abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, user)
    );
    entitlements.addEntitlement(address(mockEntitlement));
  }

  function test_addEntitlement_revert_when_invalid_entitlement_address()
    external
  {
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__InvalidEntitlementAddress.selector);
    entitlements.addEntitlement(address(0));
  }

  function test_addEntitlement_revert_when_invalid_entitlement_interface()
    external
  {
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__InvalidEntitlementInterface.selector);
    entitlements.addEntitlement(address(this));
  }

  function test_addEntitlement_revert_when_already_exists() external {
    vm.startPrank(founder);
    entitlements.addEntitlement(address(mockEntitlement));

    vm.expectRevert(EntitlementsService__EntitlementAlreadyExists.selector);
    entitlements.addEntitlement(address(mockEntitlement));
    vm.stopPrank();
  }

  function _arrangeInitialEntitlements() internal {
    vm.startPrank(founder);
    entitlements.addImmutableEntitlements(immutableEntitlements);
    entitlements.addEntitlement(address(mockEntitlement));
    vm.stopPrank();
  }

  // =============================================================
  //                      Remove Entitlements
  // =============================================================

  function test_removeEntitlement() external {
    _arrangeInitialEntitlements();

    vm.prank(founder);
    entitlements.removeEntitlement(address(mockEntitlement));
  }

  function test_removeEntitlement_revert_when_not_owner() external {
    _arrangeInitialEntitlements();

    address user = _randomAddress();

    vm.prank(user);
    vm.expectRevert(
      abi.encodeWithSelector(IOwnableBase.Ownable__NotOwner.selector, user)
    );
    entitlements.removeEntitlement(address(mockEntitlement));
  }

  function test_removeEntitlement_revert_when_invalid_entitlement_address()
    external
  {
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__InvalidEntitlementAddress.selector);
    entitlements.removeEntitlement(address(0));
  }

  function test_removeEntitlement_revert_when_invalid_entitlement_interface()
    external
  {
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__InvalidEntitlementInterface.selector);
    entitlements.removeEntitlement(address(this));
  }

  function test_removeEntitlement_revert_when_does_not_exist() external {
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__EntitlementDoesNotExist.selector);
    entitlements.removeEntitlement(address(mockEntitlement));
  }

  function test_removeEntitlement_revert_when_removing_immutable_entitlement()
    external
  {
    _arrangeInitialEntitlements();

    vm.prank(founder);
    vm.expectRevert(EntitlementsService__ImmutableEntitlement.selector);
    entitlements.removeEntitlement(address(mockImmutableEntitlement));
  }

  // =============================================================
  //                      Get Entitlements
  // =============================================================
  function test_getEntitlements() external {
    _arrangeInitialEntitlements();

    Entitlement[] memory allEntitlements = entitlements.getEntitlements();
    assertEq(allEntitlements.length, 2);
  }

  function test_getEntitlements_with_no_entitlements() external {
    Entitlement[] memory allEntitlements = entitlements.getEntitlements();
    assertEq(allEntitlements.length, 0);
  }

  // =============================================================
  //                      Get Entitlement
  // =============================================================

  function test_getEntitlement() external {
    _arrangeInitialEntitlements();

    Entitlement memory entitlement = entitlements.getEntitlement(
      address(mockEntitlement)
    );

    assertEq(address(entitlement.moduleAddress), address(mockEntitlement));
  }

  function test_getEntitlement_revert_when_invalid_entitlement_address()
    external
  {
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__InvalidEntitlementAddress.selector);
    entitlements.getEntitlement(address(0));
  }

  function test_getEntitlement_revert_when_does_not_exist() external {
    vm.prank(founder);
    vm.expectRevert(EntitlementsService__EntitlementDoesNotExist.selector);
    entitlements.getEntitlement(address(mockEntitlement));
  }
}
