// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IManagedProxyBase {
  struct ManagedProxy {
    bytes4 managerSelector;
    address manager;
  }

  error ManagedProxy__FetchImplementationFailed();
  error ManagedProxy__InvalidManager();
  error ManagedProxy__InvalidManagerSelector();
}

interface IManagedProxy is IManagedProxyBase {
  function getManager() external view returns (address);

  function setManager(address manager) external;
}
