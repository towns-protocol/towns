// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
// interfaces
import {IDiamondLoupe} from "contracts/src/diamond/extensions/loupe/IDiamondLoupe.sol";

// libraries

// contracts
import {Diamond} from "packages/contracts/src/diamond/Diamond.sol";
import {MockDiamond} from "./MockDiamond.sol";

contract MockDiamondRegistry is Diamond {
  address internal implementation;

  constructor(address implementation_) {
    implementation = implementation_;
  }

  function getImplementation(bytes4 selector) external view returns (address) {
    address facet = IDiamondLoupe(implementation).facetAddress(selector);
    if (facet == address(0)) return implementation;
    return facet;
  }
}
