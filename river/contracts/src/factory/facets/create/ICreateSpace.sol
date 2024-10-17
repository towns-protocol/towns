// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";

// libraries

// contracts

interface ICreateSpace is IArchitectBase {
  /// @notice Creates a new space
  /// @param SpaceInfo Space information
  function createSpace(SpaceInfo memory SpaceInfo) external returns (address);

  /// @notice Creates a new space with a prepayment
  /// @param createSpace Space information
  function createSpaceWithPrepay(
    CreateSpace memory createSpace
  ) external payable returns (address);

  // backwards compatibility
  function createSpaceWithPrepay(
    CreateSpaceOld memory spaceInfo
  ) external payable returns (address);
}
