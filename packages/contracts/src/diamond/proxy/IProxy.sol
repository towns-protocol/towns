// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface IProxy {
  error Proxy__ImplementationIsNotContract();

  fallback() external payable;
}
