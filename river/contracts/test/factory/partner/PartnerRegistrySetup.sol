// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPartnerRegistryBase} from "contracts/src/factory/facets/partner/IPartnerRegistry.sol";
import {PartnerRegistry} from "contracts/src/factory/facets/partner/PartnerRegistry.sol";

// libraries
import {Vm} from "forge-std/Test.sol";

// contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";

contract PartnerRegistrySetup is IPartnerRegistryBase, BaseSetup {
  PartnerRegistry internal partnerRegistry;

  uint256 constant REGISTRY_FEE = 0.1 ether;
  uint256 constant MAX_PARTNER_FEE = 1000; // 10% in basis points

  function setUp() public override {
    super.setUp();

    partnerRegistry = PartnerRegistry(spaceFactory);

    vm.startPrank(deployer);
    partnerRegistry.setMaxPartnerFee(MAX_PARTNER_FEE);
    partnerRegistry.setRegistryFee(REGISTRY_FEE);
    vm.stopPrank();
  }

  modifier givenPartnerIsRegistered(Partner memory partner) {
    partner.fee = bound(partner.fee, 0, MAX_PARTNER_FEE);
    vm.assume(partner.recipient != address(0));
    vm.deal(partner.account, REGISTRY_FEE);

    vm.prank(partner.account);
    vm.expectEmit(address(partnerRegistry));
    emit PartnerRegistered(partner.account);
    partnerRegistry.registerPartner{value: REGISTRY_FEE}(partner);
    _;
  }

  // =============================================================
  // Admin
  // =============================================================

  function test_setMaxPartnerFee(uint256 newMaxFee) external {
    vm.prank(deployer);
    vm.expectEmit(address(partnerRegistry));
    emit MaxPartnerFeeSet(newMaxFee);
    partnerRegistry.setMaxPartnerFee(newMaxFee);

    assertEq(partnerRegistry.maxPartnerFee(), newMaxFee);
  }

  function test_setRegistryFee(uint256 newRegistryFee) external {
    vm.prank(deployer);
    vm.expectEmit(address(partnerRegistry));
    emit RegistryFeeSet(newRegistryFee);
    partnerRegistry.setRegistryFee(newRegistryFee);

    assertEq(partnerRegistry.registryFee(), newRegistryFee);
  }
}
