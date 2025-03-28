// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {AppKey} from "../libraries/AppId.sol";

// contracts

interface ISpaceApp {
  // Metadata
  function name() external view returns (string memory);
  function description() external view returns (string memory);
  function image() external view returns (string memory);
  function version() external view returns (uint256);

  // App
  function getExecutor() external view returns (address);
  function getPermissions() external view returns (string[] memory);

  // Hooks
  function onRegister(
    address sender,
    AppKey memory key
  ) external returns (bytes4);
}
