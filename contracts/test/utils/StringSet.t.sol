// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {stdError} from "forge-std/StdError.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {TestUtils} from "./TestUtils.sol";

contract StringSetTest is TestUtils {
  MockStringSet private mockSet = new MockStringSet();
  string private s;

  function test_fuzz_delete(string memory _s) public {
    s = _s;
    // brutalize memory
    assembly ("memory-safe") {
      mstore(0, 0x1234567890abcdef)
    }
    StringSet._delete(s);
    uint256 packed;
    assembly {
      packed := sload(s.slot)
    }
    assertEq(packed, 0, "Expected the length slot to be zero");
    if (bytes(_s).length >= 32) {
      uint256 p;
      assembly ("memory-safe") {
        mstore(0, s.slot)
        p := keccak256(0, 0x20)
      }
      uint256 words = (bytes(_s).length + 31) / 32;
      for (uint256 i; i < words; ++i) {
        uint256 word;
        assembly {
          word := sload(add(p, i))
        }
        assertEq(word, 0, "Expected every word to be zero");
      }
    }
  }

  function test_add() public {
    // Test adding unique strings
    bool added = mockSet.add("value1");
    assertTrue(added, "Expected to add 'value1' successfully");

    // Test adding duplicate string
    added = mockSet.add("value1");
    assertFalse(added, "Expected not to add duplicate 'value1'");
  }

  function test_remove() public {
    // Add values to the set
    mockSet.add("value1");
    mockSet.add("value2");

    // Test successful removal
    bool removed = mockSet.remove("value1");
    assertTrue(removed, "Expected to remove 'value1' successfully");

    // Test removing a non-existent value
    removed = mockSet.remove("value3");
    assertFalse(removed, "Expected not to remove non-existent 'value3'");
  }

  function test_contains() public {
    // Add value and check for its existence
    mockSet.add("value1");
    bool exists = mockSet.contains("value1");
    assertTrue(exists, "'value1' should exist in the set");

    // Check for a non-existent value
    exists = mockSet.contains("value2");
    assertFalse(exists, "'value2' should not exist in the set");
  }

  function test_length() public {
    // Initially, the set should be empty
    uint256 length = mockSet.length();
    assertEq(length, 0, "Expected initial length to be 0");

    // Add some values
    mockSet.add("value1");
    mockSet.add("value2");

    // Length should now be 2
    length = mockSet.length();
    assertEq(length, 2, "Expected length to be 2 after adding two values");

    // Remove a value and check length
    mockSet.remove("value1");
    length = mockSet.length();
    assertEq(length, 1, "Expected length to be 1 after removing one value");
  }

  function test_at() public {
    _addValues();

    // Retrieve values by index
    string memory firstValue = mockSet.at(0);
    assertEq(firstValue, "value1", "Expected the first value to be 'value1'");

    string memory secondValue = mockSet.at(1);
    assertEq(secondValue, "value2", "Expected the second value to be 'value2'");

    string memory thirdValue = mockSet.at(2);
    assertEq(thirdValue, "value3", "Expected the third value to be 'value3'");

    // Test accessing out-of-bounds index
    vm.expectRevert(stdError.indexOOBError);
    mockSet.at(3);
  }

  function test_values() public {
    // Add multiple values
    mockSet.add("value1");
    mockSet.add("value2");

    // Retrieve all values
    string[] memory values = mockSet.values();

    // Check array length and content
    assertEq(values.length, 2, "Expected values array length to be 2");
    assertEq(values[0], "value1", "Expected first value to be 'value1'");
    assertEq(values[1], "value2", "Expected second value to be 'value2'");
  }

  function test_removeAndSwap() public {
    /* Ensure the removal logic 'swap and pop' is tested */
    _addValues();

    // Remove middle value and test index integrity
    bool removed = mockSet.remove("value2");
    assertTrue(removed, "Expected to remove 'value2' successfully");
    assertFalse(mockSet.contains("value2"), "Expected 'value2' to be removed");

    // Ensure remaining values are consistent
    string memory firstValue = mockSet.at(0);
    assertEq(firstValue, "value1", "Expected the first value to be 'value1'");

    string memory secondValue = mockSet.at(1);
    assertEq(secondValue, "value3", "Expected the second value to be 'value3'");
  }

  function test_removeAll() public {
    _addValues();
    mockSet.remove("value1");
    mockSet.remove("value2");
    mockSet.remove("value3");
    _checkRemovedValues();
  }

  function test_removeAll_reverse() public {
    _addValues();
    mockSet.remove("value3");
    mockSet.remove("value2");
    mockSet.remove("value1");
    _checkRemovedValues();
  }

  function test_clear() public {
    _addValues();
    mockSet.clear();
    _checkRemovedValues();
  }

  function _addValues() private {
    mockSet.add("value1");
    mockSet.add("value2");
    mockSet.add("value3");
  }

  function _checkRemovedValues() private view {
    assertFalse(mockSet.contains("value1"), "Expected 'value1' to be removed");
    assertFalse(mockSet.contains("value2"), "Expected 'value2' to be removed");
    assertFalse(mockSet.contains("value3"), "Expected 'value3' to be removed");
  }
}

contract MockStringSet {
  using StringSet for StringSet.Set;

  StringSet.Set private testSet;

  function add(string memory value) external returns (bool) {
    return testSet.add(value);
  }

  function remove(string memory value) external returns (bool) {
    return testSet.remove(value);
  }

  function clear() external {
    testSet.clear();
  }

  function contains(string memory value) external view returns (bool) {
    return testSet.contains(value);
  }

  function length() external view returns (uint256) {
    return testSet.length();
  }

  function at(uint256 index) external view returns (string memory) {
    return testSet.at(index);
  }

  function values() external view returns (string[] memory) {
    return testSet.values();
  }
}
