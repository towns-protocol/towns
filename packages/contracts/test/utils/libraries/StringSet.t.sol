// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {StringSet} from "src/utils/libraries/StringSet.sol";
import {stdError} from "forge-std/StdError.sol";

contract StringSetTest is TestUtils {
    using StringSet for StringSet.Set;

    StringSet.Set private mockSet;
    string private s;

    function test_add() public {
        // Test adding unique strings
        bool added = this.add("value1");
        assertTrue(added, "Expected to add 'value1' successfully");
        assertEq(this.at(0), "value1", "Expected 'value1' to be at index 0 after addition");

        // Test adding duplicate string
        added = this.add("value1");
        assertFalse(added, "Expected not to add duplicate 'value1'");
    }

    function test_remove() public {
        // Add values to the set
        this.add("value1");
        this.add("value2");

        // Test successful removal
        bool removed = this.remove("value1");
        assertTrue(removed, "Expected to remove 'value1' successfully");
        assertEq(this.at(0), "value2", "Expected 'value2' to be at index 0 after removal");

        removed = this.remove("value2");
        assertTrue(removed, "Expected to remove 'value2' successfully");

        // Test removing a non-existent value
        removed = this.remove("value3");
        assertFalse(removed, "Expected not to remove non-existent 'value3'");
    }

    function test_contains() public {
        // Add value and check for its existence
        this.add("value1");
        bool exists = this.contains("value1");
        assertTrue(exists, "'value1' should exist in the set");

        // Check for a non-existent value
        exists = this.contains("value2");
        assertFalse(exists, "'value2' should not exist in the set");
    }

    function test_length() public {
        // Initially, the set should be empty
        uint256 len = this.length();
        assertEq(len, 0, "Expected initial length to be 0");

        // Add some values
        this.add("value1");
        this.add("value2");

        // Length should now be 2
        len = this.length();
        assertEq(len, 2, "Expected length to be 2 after adding two values");

        // Remove a value and check length
        this.remove("value1");
        len = this.length();
        assertEq(len, 1, "Expected length to be 1 after removing one value");
    }

    function test_at() public {
        _addValues();

        // Retrieve values by index
        string memory firstValue = this.at(0);
        assertEq(firstValue, "value1", "Expected the first value to be 'value1'");

        string memory secondValue = this.at(1);
        assertEq(secondValue, "value2", "Expected the second value to be 'value2'");

        string memory thirdValue = this.at(2);
        assertEq(thirdValue, "value3", "Expected the third value to be 'value3'");

        // Test accessing out-of-bounds index
        vm.expectRevert(stdError.indexOOBError);
        this.at(3);
    }

    function test_values() public {
        // Add multiple values
        this.add("value1");
        this.add("value2");

        // Retrieve all values
        string[] memory vals = this.values();

        // Check array length and content
        assertEq(vals.length, 2, "Expected values array length to be 2");
        assertEq(vals[0], "value1", "Expected first value to be 'value1'");
        assertEq(vals[1], "value2", "Expected second value to be 'value2'");
    }

    function test_removeAndSwap() public {
        /* Ensure the removal logic 'swap and pop' is tested */
        _addValues();

        // Remove middle value and test index integrity
        bool removed = this.remove("value2");
        assertTrue(removed, "Expected to remove 'value2' successfully");
        assertFalse(this.contains("value2"), "Expected 'value2' to be removed");

        // Ensure remaining values are consistent
        string memory firstValue = this.at(0);
        assertEq(firstValue, "value1", "Expected the first value to be 'value1'");

        string memory secondValue = this.at(1);
        assertEq(secondValue, "value3", "Expected the second value to be 'value3'");
    }

    function test_removeAll() public {
        _addValues();
        this.remove("value1");
        this.remove("value2");
        this.remove("value3");
        _checkRemovedValues();
    }

    function test_removeAll_reverse() public {
        _addValues();
        this.remove("value3");
        this.remove("value2");
        this.remove("value1");
        _checkRemovedValues();
    }

    function test_clear() public {
        _addValues();
        this.clear();
        _checkRemovedValues();
    }

    function _addValues() private {
        this.add("value1");
        this.add("value2");
        this.add("value3");
    }

    function _checkRemovedValues() private view {
        assertFalse(this.contains("value1"), "Expected 'value1' to be removed");
        assertFalse(this.contains("value2"), "Expected 'value2' to be removed");
        assertFalse(this.contains("value3"), "Expected 'value3' to be removed");
    }

    function add(string memory value) external returns (bool) {
        return mockSet.add(value);
    }

    function remove(string memory value) external returns (bool) {
        return mockSet.remove(value);
    }

    function clear() external {
        mockSet.clear();
    }

    function contains(string memory value) external view returns (bool) {
        return mockSet.contains(value);
    }

    function length() external view returns (uint256) {
        return mockSet.length();
    }

    function at(uint256 index) external view returns (string memory) {
        return mockSet.at(index);
    }

    function values() external view returns (string[] memory) {
        return mockSet.values();
    }
}
