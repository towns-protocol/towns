// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@prb/test/Helpers.sol" as Helpers;
import {Test} from "forge-std/Test.sol";
import {LibString} from "solady/utils/LibString.sol";

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

  bytes4 private constant RANDOM_ADDRESS_SIG =
    bytes4(keccak256("randomAddress()"));
  bytes4 private constant RANDOM_UINT_SIG_0 = bytes4(keccak256("randomUint()"));
  bytes4 private constant RANDOM_UINT_SIG_2 =
    bytes4(keccak256("randomUint(uint256,uint256)"));

  modifier onlyForked() {
    if (block.number > 1e6) {
      _;
    }
  }

  modifier assumeEOA(address account) {
    vm.assume(account != address(0) && account.code.length == 0);
    _;
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

  function getMappingValueSlot(
    uint256 mappingSlot,
    uint256 key
  ) internal pure returns (bytes32) {
    return keccak256(abi.encode(key, mappingSlot));
  }

  function _bytes32ToString(bytes32 str) internal pure returns (string memory) {
    return string(abi.encodePacked(str));
  }

  function _randomBytes32() internal pure returns (bytes32) {
    return bytes32(_randomUint256());
  }

  function _randomUint256() internal pure returns (uint256) {
    return
      abi.decode(_callVm(abi.encodeWithSelector(RANDOM_UINT_SIG_0)), (uint256));
  }

  function _randomAddress() internal pure returns (address payable) {
    return
      payable(
        abi.decode(
          _callVm(abi.encodeWithSelector(RANDOM_ADDRESS_SIG)),
          (address)
        )
      );
  }

  function _randomRange(
    uint256 lo,
    uint256 hi
  ) internal pure returns (uint256) {
    return
      abi.decode(
        _callVm(abi.encodeWithSelector(RANDOM_UINT_SIG_2, lo, hi)),
        (uint256)
      );
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
    return LibString.eq(s1, s2);
  }

  function _isEqual(bytes32 s1, bytes32 s2) public pure returns (bool) {
    return s1 == s2;
  }

  function _createAccounts(
    uint256 count
  ) internal pure returns (address[] memory accounts) {
    accounts = new address[](count);
    for (uint256 i; i < count; ++i) {
      accounts[i] = _randomAddress();
    }
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

  /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
  /*                       COMPILER TRICK                       */
  /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

  function _callVm(bytes memory payload) internal pure returns (bytes memory) {
    return _castVmPayloadToPure(_sendVmPayload)(payload);
  }

  function _castVmPayloadToPure(
    function(bytes memory) internal returns (bytes memory) fnIn
  )
    internal
    pure
    returns (function(bytes memory) internal pure returns (bytes memory) fnOut)
  {
    assembly {
      fnOut := fnIn
    }
  }

  function _sendVmPayload(
    bytes memory payload
  ) private returns (bytes memory res) {
    address vmAddress = address(VM_ADDRESS);
    /// @solidity memory-safe-assembly
    assembly {
      let payloadLength := mload(payload)
      let payloadStart := add(payload, 32)
      if iszero(call(gas(), vmAddress, 0, payloadStart, payloadLength, 0, 0)) {
        returndatacopy(0, 0, returndatasize())
        revert(0, returndatasize())
      }
      res := mload(0x40)
      mstore(0x40, and(add(add(res, returndatasize()), 0x3f), not(0x1f)))
      mstore(res, returndatasize())
      returndatacopy(add(res, 0x20), 0, returndatasize())
    }
  }
}
