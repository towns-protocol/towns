// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {AttestationRegistry} from "contracts/src/factory/facets/app/AttestationRegistry.sol";
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";

contract DeployAttestationRegistry is FacetHelper, Deployer {
  constructor() {
    addSelector(AttestationRegistry.attest.selector);
    addSelector(AttestationRegistry.revoke.selector);
    addSelector(AttestationRegistry.getAttestation.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return AttestationRegistry.__AttestationRegistry_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "facets/attestationRegistryFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    AttestationRegistry attestationRegistry = new AttestationRegistry();
    vm.stopBroadcast();
    return address(attestationRegistry);
  }
}
