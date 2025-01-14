// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {PartnerRegistrySetup} from "contracts/test/factory/partner/PartnerRegistrySetup.sol";

contract PartnerRegistry_updatePartner is PartnerRegistrySetup {
  function test_updatePartner(
    Partner memory partner,
    Partner memory updatedPartner
  ) external givenPartnerIsRegistered(partner) {
    vm.assume(updatedPartner.recipient != address(0));
    updatedPartner.fee = bound(
      updatedPartner.fee,
      0,
      partnerRegistry.maxPartnerFee()
    );

    updatedPartner.account = partner.account;

    vm.prank(updatedPartner.account);
    vm.expectEmit(address(partnerRegistry));
    emit PartnerUpdated(updatedPartner.account);
    partnerRegistry.updatePartner(updatedPartner);

    Partner memory partnerInfo = partnerRegistry.partnerInfo(
      updatedPartner.account
    );

    assertEq(partnerInfo.recipient, updatedPartner.recipient);
    assertEq(partnerInfo.fee, updatedPartner.fee);
    assertEq(partnerInfo.active, updatedPartner.active);
  }

  function test_revertWhen_updatePartner_notPartnerAccount(
    Partner memory partner,
    address nonPartnerAccount
  ) external givenPartnerIsRegistered(partner) {
    vm.assume(nonPartnerAccount != partner.account);

    vm.prank(nonPartnerAccount);
    vm.expectRevert(
      abi.encodeWithSelector(
        PartnerRegistry__NotPartnerAccount.selector,
        nonPartnerAccount
      )
    );
    partnerRegistry.updatePartner(partner);
  }

  function test_revertWhen_updatePartner_invalidRecipient(
    Partner memory partner
  ) external givenPartnerIsRegistered(partner) {
    partner.recipient = address(0);

    vm.prank(partner.account);
    vm.expectRevert(PartnerRegistry__InvalidRecipient.selector);
    partnerRegistry.updatePartner(partner);
  }

  function test_revertWhen_updatePartner_partnerNotRegistered(
    Partner memory unregisteredPartner
  ) external {
    vm.assume(unregisteredPartner.recipient != address(0));
    unregisteredPartner.fee = bound(
      unregisteredPartner.fee,
      0,
      partnerRegistry.maxPartnerFee()
    );

    vm.prank(unregisteredPartner.account);
    vm.expectRevert(
      abi.encodeWithSelector(
        PartnerRegistry__PartnerNotRegistered.selector,
        unregisteredPartner.account
      )
    );
    partnerRegistry.updatePartner(unregisteredPartner);
  }

  function test_revertWhen_updatePartner_invalidPartnerFee(
    Partner memory partner
  ) external givenPartnerIsRegistered(partner) {
    partner.fee = partnerRegistry.maxPartnerFee() + 1;

    vm.prank(partner.account);
    vm.expectRevert(
      abi.encodeWithSelector(
        PartnerRegistry__InvalidPartnerFee.selector,
        partner.fee
      )
    );
    partnerRegistry.updatePartner(partner);
  }
}
