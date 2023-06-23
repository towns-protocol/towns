// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

// interfaces

// libraries

// contracts

abstract contract Self {
  address internal immutable _self = address(this);
}
