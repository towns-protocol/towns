// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {DeployEntitlementChecker} from "../deployments/facets/DeployEntitlementChecker.s.sol";
import {DeployMetadata} from "../deployments/facets/DeployMetadata.s.sol";
import {DeployMultiInit} from "../deployments/DeployMultiInit.s.sol";

import {MetadataFacet} from "contracts/src/diamond/facets/metadata/MetadataFacet.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract InteractDiamond is Interaction {
  DeployEntitlementChecker checkerHelper = new DeployEntitlementChecker();
  DeployMetadata metadataHelper = new DeployMetadata();
  DeployMultiInit multiInitHelper = new DeployMultiInit();

  function __interact(address) public view override {
    address baseRegistry = 0x08cC41b782F27d62995056a4EF2fCBAe0d3c266F;
    console.log(_bytes32ToString(MetadataFacet(baseRegistry).contractType()));
  }

  function _bytes32ToString(bytes32 str) internal pure returns (string memory) {
    return string(abi.encodePacked(str));
  }
}
