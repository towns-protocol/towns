// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

// solhint-disable-next-line

import {PRBTest} from "@prb/test/PRBTest.sol";
import {StdCheats} from "forge-std/StdCheats.sol";

contract TestUtils is PRBTest, StdCheats {
  uint256 private immutable _NONCE;

  address public constant NATIVE_TOKEN =
    address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

  modifier onlyForked() {
    if (block.number > 1e6) {
      _;
    }
  }

  constructor() {
    vm.setEnv("TESTING", "true");

    // solhint-disable
    _NONCE = uint256(
      keccak256(
        abi.encode(
          tx.origin,
          tx.origin.balance,
          block.number,
          block.timestamp,
          block.coinbase,
          gasleft()
        )
      )
    );
    // solhint-enable
  }

  function _bytes32ToString(bytes32 str) internal pure returns (string memory) {
    return string(abi.encodePacked(str));
  }

  function _randomBytes32() internal view returns (bytes32) {
    bytes memory seed = abi.encode(_NONCE, block.timestamp, gasleft());
    return keccak256(seed);
  }

  function _randomUint256() internal view returns (uint256) {
    return uint256(_randomBytes32());
  }

  function _randomAddress() internal view returns (address payable) {
    return payable(address(uint160(_randomUint256())));
  }

  function _randomRange(
    uint256 lo,
    uint256 hi
  ) internal view returns (uint256) {
    return lo + (_randomUint256() % (hi - lo));
  }

  function _toAddressArray(
    address v
  ) internal pure returns (address[] memory arr) {
    arr = new address[](1);
    arr[0] = v;
  }

  function _toUint256Array(
    uint256 v
  ) internal pure returns (uint256[] memory arr) {
    arr = new uint256[](1);
    arr[0] = v;
  }

  function _expectNonIndexedEmit() internal {
    vm.expectEmit(false, false, false, true);
  }

  function _isEqual(
    string memory s1,
    string memory s2
  ) public pure returns (bool) {
    return keccak256(abi.encodePacked(s1)) == keccak256(abi.encodePacked(s2));
  }

  function _isEqual(bytes32 s1, bytes32 s2) public pure returns (bool) {
    return keccak256(abi.encodePacked(s1)) == keccak256(abi.encodePacked(s2));
  }

  function _createAccounts(
    uint256 amount
  ) internal view returns (address[] memory) {
    address[] memory accounts = new address[](amount);

    for (uint256 i = 0; i < amount; i++) {
      accounts[i] = _randomAddress();
    }

    return accounts;
  }
}
