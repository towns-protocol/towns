// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts

interface IProxyManager {
  function getImplementation(bytes4 selector) external view returns (address);

  function setImplementation(address implementation) external;
}
