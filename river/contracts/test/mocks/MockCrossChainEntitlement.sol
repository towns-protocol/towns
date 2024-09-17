// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ICrossChainEntitlement} from "contracts/src/spaces/entitlements/ICrossChainEntitlement.sol";

contract MockCrossChainEntitlement is ICrossChainEntitlement {
  mapping(bytes32 => bool) public isEntitledByUserAndId;

  function setIsEntitled(uint256 id, address user, bool entitled) external {
    bytes32 hash = keccak256(abi.encode(user, id));
    isEntitledByUserAndId[hash] = entitled;
  }

  function isEntitled(
    address[] calldata users,
    bytes calldata data
  ) external view returns (bool) {
    uint256 id = abi.decode(data, (uint256));
    for (uint256 i = 0; i < users.length; ++i) {
      bytes32 hash = keccak256(abi.encode(users[i], id));
      if (isEntitledByUserAndId[hash]) {
        return true;
      }
    }

    return false;
  }

  function parameters() external pure returns (Parameter[] memory) {
    Parameter[] memory schema = new Parameter[](1);
    schema[0] = Parameter("id", "uint256", "Simple parameter type for testing");
    return schema;
  }
}
