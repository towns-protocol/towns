// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {PartnerRegistrySetup} from "contracts/test/factory/partner/PartnerRegistrySetup.sol";

contract PartnerRegistry_registerPartner is PartnerRegistrySetup {
  function test_registerPartner(
    Partner memory partner
  ) external givenPartnerIsRegistered(partner) {
    Partner memory registeredPartner = partnerRegistry.partnerInfo(
      partner.account
    );
    assertEq(registeredPartner.account, partner.account);
    assertEq(registeredPartner.recipient, partner.recipient);
    assertEq(registeredPartner.fee, partner.fee);
    assertEq(registeredPartner.active, partner.active);
  }

  function test_revertWhen_registerPartner_registryFeeNotPaid(
    Partner memory partner
  ) external {
    partner.fee = bound(partner.fee, 0, MAX_PARTNER_FEE);
    vm.deal(partner.account, REGISTRY_FEE);

    vm.prank(partner.account);
    vm.expectRevert(
      abi.encodeWithSelector(
        PartnerRegistry__RegistryFeeNotPaid.selector,
        REGISTRY_FEE
      )
    );
    partnerRegistry.registerPartner{value: REGISTRY_FEE - 1}(partner);
  }

  function test_revertWhen_registerPartner_invalidPartnerFee(
    Partner memory partner
  ) external {
    partner.fee = bound(partner.fee, MAX_PARTNER_FEE + 1, type(uint256).max);

    vm.deal(partner.account, REGISTRY_FEE);
    vm.prank(partner.account);
    vm.expectRevert(
      abi.encodeWithSelector(
        PartnerRegistry__InvalidPartnerFee.selector,
        partner.fee
      )
    );
    partnerRegistry.registerPartner{value: REGISTRY_FEE}(partner);
  }

  function test_revertWhen_registerPartner_partnerAlreadyRegistered(
    Partner memory partner
  ) external givenPartnerIsRegistered(partner) {
    vm.deal(partner.account, REGISTRY_FEE);

    vm.prank(partner.account);
    vm.expectRevert(
      abi.encodeWithSelector(
        PartnerRegistry__PartnerAlreadyRegistered.selector,
        partner.account
      )
    );
    partnerRegistry.registerPartner{value: REGISTRY_FEE}(partner);
  }
}
