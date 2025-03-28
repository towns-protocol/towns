// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceApp} from "contracts/src/factory/facets/app/interface/ISpaceApp.sol";

// libraries
import {AppKey} from "contracts/src/factory/facets/app/libraries/AppId.sol";

// contracts

contract MockApp is ISpaceApp {
  bytes public onRegisterData;

  // storage
  mapping(bytes4 => bytes4) public returnValues;

  function name() external pure returns (string memory) {
    return "MockApp";
  }

  function description() external pure returns (string memory) {
    return "MockApp";
  }

  function image() external pure returns (string memory) {
    return "MockApp";
  }

  function version() external pure returns (uint256) {
    return 1;
  }

  function getExecutor() external view returns (address) {
    return address(this);
  }

  function getPermissions() external pure returns (string[] memory) {
    string[] memory currentPermissions = new string[](1);
    currentPermissions[0] = "Read";
    return currentPermissions;
  }

  function onRegister(address, AppKey memory) external returns (bytes4) {
    onRegisterData = new bytes(123);
    bytes4 selector = MockApp.onRegister.selector;
    return
      returnValues[selector] == bytes4(0) ? selector : returnValues[selector];
  }
}
