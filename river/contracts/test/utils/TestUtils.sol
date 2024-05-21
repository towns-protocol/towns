// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// solhint-disable-next-line

import "@prb/test/Helpers.sol" as Helpers;
import {Test} from "forge-std/Test.sol";

contract TestUtils is Test {
  event LogNamedArray(string key, address[] value);
  event LogNamedArray(string key, bool[] value);
  event LogNamedArray(string key, bytes32[] value);
  event LogNamedArray(string key, int256[] value);
  event LogNamedArray(string key, string[] value);
  event LogNamedArray(string key, uint256[] value);

  uint256 private immutable _NONCE;

  address public constant NATIVE_TOKEN =
    address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

  modifier onlyForked() {
    if (block.number > 1e6) {
      _;
    }
  }

  constructor() {
    vm.setEnv("IN_TESTING", "true");
    vm.setEnv(
      "LOCAL_PRIVATE_KEY",
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    );

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

  function isAnvil() internal view returns (bool) {
    return block.chainid == 31337 || block.chainid == 31338;
  }

  function isTesting() internal view returns (bool) {
    return vm.envOr("IN_TESTING", false);
  }

  function getDeployer() internal view returns (address) {
    return vm.addr(vm.envUint("LOCAL_PRIVATE_KEY"));
  }

  /*//////////////////////////////////////////////////////////////////////////
                                CONTAINMENT ASSERTIONS
    //////////////////////////////////////////////////////////////////////////*/

  /// @dev Tests that `a` contains `b`. If it does not, the test fails.
  function assertContains(address[] memory a, address b) internal virtual {
    if (!Helpers.contains(a, b)) {
      emit log("Error: a does not contain b [address[]]");
      emit log_named_array("  Array a", a);
      emit log_named_address("   Item b", b);
      fail();
    }
  }

  /// @dev Tests that `a` contains `b`. If it does not, the test fails with the error message `err`.
  function assertContains(
    address[] memory a,
    address b,
    string memory err
  ) internal virtual {
    if (!Helpers.contains(a, b)) {
      emit log_named_string("Error", err);
      assertContains(a, b);
    }
  }

  /// @dev Tests that `a` contains `b`. If it does not, the test fails.
  function assertContains(bytes32[] memory a, bytes32 b) internal virtual {
    if (!Helpers.contains(a, b)) {
      emit log("Error: a does not contain b [bytes32[]]");
      emit LogNamedArray("  Array a", a);
      emit log_named_bytes32("   Item b", b);
      fail();
    }
  }

  /// @dev Tests that `a` contains `b`. If it does not, the test fails with the error message `err`.
  function assertContains(
    bytes32[] memory a,
    bytes32 b,
    string memory err
  ) internal virtual {
    if (!Helpers.contains(a, b)) {
      emit log_named_string("Error", err);
      assertContains(a, b);
    }
  }

  /// @dev Tests that `a` contains `b`. If it does not, the test fails.
  function assertContains(int256[] memory a, int256 b) internal virtual {
    if (!Helpers.contains(a, b)) {
      emit log("Error: a does not contain b [int256[]]");
      emit LogNamedArray("  Array a", a);
      emit log_named_int("   Item b", b);
      fail();
    }
  }

  /// @dev Tests that `a` contains `b`. If it does not, the test fails with the error message `err`.
  function assertContains(
    int256[] memory a,
    int256 b,
    string memory err
  ) internal virtual {
    if (!Helpers.contains(a, b)) {
      emit log_named_string("Error", err);
      assertContains(a, b);
    }
  }

  /// @dev Tests that `a` contains `b`. If it does not, the test fails.
  function assertContains(string[] memory a, string memory b) internal virtual {
    if (!Helpers.contains(a, b)) {
      emit log("Error: a does not contain b [string[]]");
      emit LogNamedArray("  Array a", a);
      emit log_named_string("   Item b", b);
      fail();
    }
  }

  /// @dev Tests that `a` contains `b`. If it does not, the test fails with the error message `err`.
  function assertContains(
    string[] memory a,
    string memory b,
    string memory err
  ) internal virtual {
    if (!Helpers.contains(a, b)) {
      emit log_named_string("Error", err);
      assertContains(a, b);
    }
  }

  /// @dev Tests that `a` contains `b`. If it does not, the test fails.
  function assertContains(uint256[] memory a, uint256 b) internal virtual {
    if (!Helpers.contains(a, b)) {
      emit log("Error: a does not contain b [uint256[]]");
      emit LogNamedArray("  Array a", a);
      emit log_named_uint("   Item b", b);
      fail();
    }
  }

  /// @dev Tests that `a` contains `b`. If it does not, the test fails with the error message `err`.
  function assertContains(
    uint256[] memory a,
    uint256 b,
    string memory err
  ) internal virtual {
    if (!Helpers.contains(a, b)) {
      emit log_named_string("Error", err);
      assertContains(a, b);
    }
  }
}
