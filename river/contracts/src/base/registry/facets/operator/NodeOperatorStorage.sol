// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

enum NodeOperatorStatus {
  Exiting,
  Standby,
  Approved,
  Active
}

library NodeOperatorStorage {
  // keccak256(abi.encode(uint256(keccak256("factory.facets.operator.storage")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 internal constant STORAGE_SLOT =
    0x988e8266be98e92aff755bdd688f8f4a2421e26daa6089c7e2668053a3bf5500;

  struct Layout {
    EnumerableSet.AddressSet operators;
    mapping(address => NodeOperatorStatus) statusByOperator;
    mapping(address => uint256) commissionByOperator;
    mapping(address => address) claimerByOperator;
    mapping(address => EnumerableSet.AddressSet) operatorsByClaimer;
    mapping(address operator => uint256 approvalTime) approvalTimeByOperator;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
