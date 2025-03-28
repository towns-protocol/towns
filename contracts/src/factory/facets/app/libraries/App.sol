// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

// structs

library App {
  using App for State;

  error AppAlreadyInitialized();

  enum Status {
    Pending,
    Approved,
    Disabled
  }

  struct Permission {
    bytes32 currentHash;
    uint8 count;
  }

  struct State {
    address space;
    Status status;
    Permission permission;
  }

  function initialize(
    State storage self,
    address space,
    string[] memory permissions
  ) internal {
    if (self.space != address(0)) revert AppAlreadyInitialized();

    self.space = space;
    self.status = Status.Pending;
    self.permission.currentHash = keccak256(abi.encode(permissions));
    self.permission.count = uint8(permissions.length);
  }
}
