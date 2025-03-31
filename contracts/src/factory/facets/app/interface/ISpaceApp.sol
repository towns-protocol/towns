// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {AppKey} from "../libraries/AppId.sol";

// contracts

interface ISpaceApp {
  struct TargetWithSelectors {
    address target;
    bytes4[] selectors;
  }

  // Metadata
  function name() external view returns (string memory);
  function description() external view returns (string memory);
  function image() external view returns (string memory);
  function version() external view returns (uint256);

  // App
  function getPermissions() external view returns (string[] memory);
  function getTargetsWithSelectors()
    external
    view
    returns (TargetWithSelectors[] memory);

  // Hooks
  function onRegister(
    address sender,
    AppKey memory key
  ) external returns (bytes4);
}
