// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOwnableBase} from "@river-build/diamond/src/facets/ownable/IERC173.sol";

// libraries

// contracts
import {PartnerRegistrySetup} from "contracts/test/factory/partner/PartnerRegistrySetup.sol";

contract PartnerRegistry_removePartner is PartnerRegistrySetup, IOwnableBase {
  function test_removePartner(
    Partner memory partner
  ) external givenPartnerIsRegistered(partner) {
    vm.prank(deployer);
    vm.expectEmit(address(partnerRegistry));
    emit PartnerRemoved(partner.account);
    partnerRegistry.removePartner(partner.account);

    Partner memory partnerInfo = partnerRegistry.partnerInfo(partner.account);

    assertEq(partnerInfo.recipient, address(0));
    assertEq(partnerInfo.fee, 0);
    assertEq(partnerInfo.active, false);
  }

  function test_revertWhen_removePartner_notOwner(
    Partner memory partner,
    address notOwner
  ) external givenPartnerIsRegistered(partner) {
    vm.assume(notOwner != deployer);

    vm.prank(notOwner);
    vm.expectRevert(
      abi.encodeWithSelector(Ownable__NotOwner.selector, notOwner)
    );
    partnerRegistry.removePartner(partner.account);
  }

  function test_revertWhen_removePartner_partnerNotRegistered(
    address nonExistentPartner
  ) external {
    vm.prank(deployer);
    vm.expectRevert(
      abi.encodeWithSelector(
        PartnerRegistry__PartnerNotRegistered.selector,
        nonExistentPartner
      )
    );
    partnerRegistry.removePartner(nonExistentPartner);
  }
}
