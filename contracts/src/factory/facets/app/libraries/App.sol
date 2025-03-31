// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceApp} from "../interface/ISpaceApp.sol";

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts

// structs

library App {
  using App for State;
  using EnumerableSetLib for EnumerableSetLib.Bytes32Set;
  using EnumerableSetLib for EnumerableSetLib.AddressSet;
  error AppAlreadyInitialized();

  enum Status {
    Pending,
    Requested,
    Approved,
    Disabled
  }

  struct Permission {
    bytes32 currentHash;
    uint8 count;
  }

  struct Targets {
    EnumerableSetLib.AddressSet targets;
    mapping(bytes32 selector => address target) targetBySelector;
    mapping(address target => EnumerableSetLib.Bytes32Set selectors) selectorsByTarget;
  }

  struct State {
    address space;
    address app;
    Status status;
  }

  function initialize(
    State storage self,
    ISpaceApp app,
    address space
  ) internal {
    if (self.space != address(0)) revert AppAlreadyInitialized();
    self.app = address(app);
    self.space = space;
    self.status = Status.Pending;
  }
}
