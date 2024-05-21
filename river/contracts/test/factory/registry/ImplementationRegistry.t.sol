// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils

//interfaces
import {IImplementationRegistryBase} from "contracts/src/factory/facets/registry/IImplementationRegistry.sol";

//libraries

//contracts
import {BaseSetup} from "contracts/test/spaces/BaseSetup.sol";
import {MetadataFacet} from "contracts/src/diamond/facets/metadata/MetadataFacet.sol";

contract ImplementationRegistryTest is IImplementationRegistryBase, BaseSetup {
  address mockImplementation;

  function setUp() public override {
    super.setUp();

    mockImplementation = address(new MockImplementation());
  }

  modifier givenImplementationIsRegistered() {
    vm.prank(deployer);
    vm.expectEmit(address(implementationRegistry));
    emit ImplementationAdded(mockImplementation, "MockImplementation", 1);
    implementationRegistry.addImplementation(mockImplementation);
    _;
  }

  function test_addImplementation() external givenImplementationIsRegistered {
    address implementation = implementationRegistry.getLatestImplementation(
      "MockImplementation"
    );
    assertEq(
      implementation,
      mockImplementation,
      "Implementation should be registered"
    );
  }
}

contract MockImplementation is MetadataFacet {
  constructor() {
    __MetadataFacet_init_unchained("MockImplementation", "");
  }

  function contractVersion() external pure override returns (uint32) {
    return 1;
  }
}
