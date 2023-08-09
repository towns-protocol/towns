// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC173, IOwnableBase} from "contracts/src/diamond/facets/ownable/IERC173.sol";
import {IPrimarySaleBase} from "contracts/src/towns/facets/membership/sale/IPrimarySale.sol";

// libraries

// contracts
import {PrimarySaleSetup} from "./PrimarySaleSetup.sol";

contract PrimarySaleTest is IOwnableBase, IPrimarySaleBase, PrimarySaleSetup {
  function test_getPrimarySaleRecipient() external {
    assertEq(primarySaleFacet.primarySaleRecipient(), recipient);
  }

  function test_owner_isFounder() external {
    assertEq(IERC173(diamond).owner(), founder);
  }

  function test_setPrimarySaleRecipient() external {
    address newRecipient = _randomAddress();

    vm.prank(founder);
    primarySaleFacet.setPrimarySaleRecipient(newRecipient);
    assertEq(primarySaleFacet.primarySaleRecipient(), newRecipient);
  }

  function test_revert_setPrimarySaleRecipient_notOwner() external {
    address randomUser = _randomAddress();
    address newRecipient = _randomAddress();

    vm.prank(randomUser);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, randomUser)
    );
    primarySaleFacet.setPrimarySaleRecipient(newRecipient);
  }

  function test_revert_setPrimarySaleRecipient_invalidAddress() external {
    vm.prank(founder);
    vm.expectRevert(PrimarySaleRecipient__InvalidAddress.selector);
    primarySaleFacet.setPrimarySaleRecipient(address(0));
  }
}
