// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceApp} from "contracts/src/factory/facets/app/interface/ISpaceApp.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// libraries
import {AppKey} from "contracts/src/factory/facets/app/libraries/AppId.sol";

// contracts

contract MockApp is ISpaceApp, IERC165 {
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

  function execute(address dest, uint256 value, bytes calldata func) external {
    (bool success, bytes memory result) = dest.call{value: value}(func);
    if (!success) {
      assembly {
        revert(add(result, 32), mload(result))
      }
    }
  }

  function getPermissions() external pure returns (string[] memory) {
    string[] memory currentPermissions = new string[](1);
    currentPermissions[0] = "Read";
    return currentPermissions;
  }

  function getTargetsWithSelectors()
    external
    view
    returns (TargetWithSelectors[] memory)
  {
    TargetWithSelectors[] memory targets = new TargetWithSelectors[](1);
    targets[0] = TargetWithSelectors({
      target: address(this),
      selectors: new bytes4[](1)
    });
    targets[0].selectors[0] = MockApp.onRegister.selector;
    return targets;
  }

  function onRegister(address, AppKey memory) external returns (bytes4) {
    onRegisterData = new bytes(123);
    bytes4 selector = MockApp.onRegister.selector;
    return
      returnValues[selector] == bytes4(0) ? selector : returnValues[selector];
  }

  function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
    return interfaceId == type(ISpaceApp).interfaceId;
  }
}
