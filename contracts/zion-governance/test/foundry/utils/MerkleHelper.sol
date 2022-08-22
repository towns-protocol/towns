// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";

abstract contract MerkleHelper {
  using Strings for uint256;

  // constants
  address internal allowlist1 = address(1);
  address internal allowlist2 = address(2);
  address internal waitlist1 = address(3);
  address internal waitlist2 = address(4);
  address internal waitlist3 = address(5);

  mapping(address => uint) internal userAllowanceMap;
  mapping (address=>uint) internal userPositionMap;

  /// initialze some constans for test users
  function _initPositionsAllowances() internal {
    userAllowanceMap[allowlist1] = 1;
    userAllowanceMap[allowlist2] = 1;
    userAllowanceMap[waitlist1] = 0;
    userAllowanceMap[waitlist2] = 0;
    userAllowanceMap[waitlist3] = 0;

    userPositionMap[allowlist1] = 0;
    userPositionMap[allowlist2] = 1;
    userPositionMap[waitlist1] = 2;
    userPositionMap[waitlist2] = 3;
    userPositionMap[waitlist3] = 4;
  }

  /// Generates some data for a merkle proof to be used for the allowlist
  function _generateAllowlistData()
  internal
  view
  returns(bytes32[] memory) {
    bytes32[] memory data = new bytes32[](5);

    for (uint256 i = 0; i < 5; i++) {
      address testAddress = address(uint160(uint256(i+1)));

      data[userPositionMap[testAddress]] = keccak256(
        abi.encodePacked(
          testAddress,
          userAllowanceMap[testAddress]
        )
      );
    }

    return data;
  }
}
