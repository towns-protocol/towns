// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

import {Initializable} from "contracts/src/diamond/facets/initializable/Initializable.sol";
import {IntrospectionBase} from "contracts/src/diamond/facets/introspection/IntrospectionBase.sol";

abstract contract Facet is Initializable, IntrospectionBase {
  constructor() {
    _disableInitializers();
  }
}
