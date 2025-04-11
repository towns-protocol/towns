// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library StringSet {
    struct Set {
        // Storage of set values
        string[] _values;
        // Position of the value in the `values` array, plus 1 because index 0
        // means a value is not in the set.
        mapping(string => uint256) _indexes;
    }

    /**
     * @dev A reference to a uint256 value in storage.
     *
     * Basically `*uint256 storage` in C++ terms.
     */
    struct Uint256Ref {
        uint256 value;
    }

    /**
     * @dev A reference to a string value in storage to allow assignment and deletion.
     */
    struct StringWrapper {
        string inner;
    }

    /**
     * @dev Returns the storage reference for the length of the values array.
     */
    function _valuesLengthRef(Set storage set) private pure returns (Uint256Ref storage ref) {
        assembly ("memory-safe") {
            ref.slot := set.slot
        }
    }

    /**
     * @dev Returns the storage reference at position `index` in the set without bounds check.
     */
    function _at(Set storage set, uint256 index) private pure returns (StringWrapper storage ref) {
        assembly ("memory-safe") {
            mstore(0, set.slot)
            ref.slot := add(keccak256(0, 0x20), index)
        }
    }

    /**
     * @dev Returns the storage reference for the index of a value in the set.
     */
    function _indexRef(
        Set storage set,
        string memory value
    ) private pure returns (Uint256Ref storage ref) {
        // https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html#mappings-and-dynamic-arrays
        assembly ("memory-safe") {
            let key_len := add(mload(value), 0x20)
            let end := add(value, key_len)
            let cache := mload(end)
            // concat the string and mapping slot
            mstore(end, add(set.slot, 1))
            ref.slot := keccak256(add(value, 0x20), key_len)
            mstore(end, cache)
        }
    }

    /**
     * @dev Add a value to a set. O(1).
     *
     * Returns true if the value was added to the set, that is if it was not
     * already present.
     */
    function add(Set storage set, string memory value) internal returns (bool added) {
        Uint256Ref storage indexRef = _indexRef(set, value);
        added = indexRef.value == 0;
        if (added) {
            Uint256Ref storage lengthRef = _valuesLengthRef(set);
            uint256 len = lengthRef.value;
            uint256 newLen;
            unchecked {
                newLen = len + 1;
            }
            // equivalent: set._values.push(value);
            lengthRef.value = newLen;
            _at(set, len).inner = value;
            // The value is stored at length-1, but we add 1 to all indexes
            // and use 0 as a sentinel value
            // equivalent: set._indexes[value] = set._values.length;
            indexRef.value = newLen;
        }
    }

    /**
     * @dev Removes a value from a set. O(1).
     *
     * Returns true if the value was removed from the set, that is if it was
     * present.
     */
    function remove(Set storage set, string memory value) internal returns (bool removed) {
        // We read and store the value's index to prevent multiple reads from the same storage slot
        Uint256Ref storage indexRef = _indexRef(set, value);
        uint256 valueIndex = indexRef.value;
        removed = valueIndex != 0;
        if (removed) {
            // Equivalent to contains(set, value)
            // To delete an element from the _values array in O(1), we swap the element to delete
            // with the
            // last one in
            // the array, and then remove the last element (sometimes called as 'swap and pop').
            // This modifies the order of the array, as noted in {at}.

            Uint256Ref storage lengthRef = _valuesLengthRef(set);
            uint256 len = lengthRef.value;
            uint256 lastIndex;
            unchecked {
                lastIndex = len - 1;
            }

            StringWrapper storage lastRef = _at(set, lastIndex);
            if (len != valueIndex) {
                string memory lastValue = lastRef.inner;
                unchecked {
                    // Move the last value to the index where the value to delete is
                    _at(set, valueIndex - 1).inner = lastValue;
                }
                // Update the index for the moved value
                _indexRef(set, lastValue).value = valueIndex;
            }

            // Delete the slot where the moved value was stored
            // equivalent: set._values.pop();
            delete lastRef.inner;
            lengthRef.value = lastIndex;

            // Delete the index for the deleted slot
            indexRef.value = 0;
        }
    }

    /**
     * @dev Removes all values from a set. O(n).
     */
    function clear(Set storage set) internal {
        Uint256Ref storage lengthRef = _valuesLengthRef(set);
        uint256 len = lengthRef.value;
        for (uint256 i; i < len; ++i) {
            StringWrapper storage valueRef = _at(set, i);
            _indexRef(set, valueRef.inner).value = 0;
            delete valueRef.inner;
        }
        lengthRef.value = 0;
    }

    /**
     * @dev Returns true if the value is in the set. O(1).
     */
    function contains(Set storage set, string memory value) internal view returns (bool) {
        // equivalent: return set._indexes[value] != 0;
        return _indexRef(set, value).value != 0;
    }

    /**
     * @dev Returns the number of values in the set. O(1).
     */
    function length(Set storage set) internal view returns (uint256) {
        return set._values.length;
    }

    /**
     * @dev Returns the value stored at position `index` in the set. O(1).
     *
     * Note that there are no guarantees on the ordering of values inside the
     * array, and it may change when more values are added or removed.
     *
     * Requirements:
     *
     * - `index` must be strictly less than {length}.
     */
    function at(Set storage set, uint256 index) internal view returns (string memory) {
        return set._values[index];
    }

    /**
     * @dev Return the entire set in an array
     *
     * WARNING: This operation will copy the entire storage to memory, which can be quite expensive.
     * This is designed
     * to mostly be used by view accessors that are queried without any gas fees. Developers should
     * keep in mind that
     * this function has an unbounded cost, and using it as part of a state-changing function may
     * render the function
     * uncallable if the set grows to a point where copying to memory consumes too much gas to fit
     * in
     * a block.
     */
    function values(Set storage set) internal view returns (string[] memory) {
        return set._values;
    }
}
