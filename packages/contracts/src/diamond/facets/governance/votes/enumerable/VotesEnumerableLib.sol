// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

library VotesEnumerableLib {
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    struct Layout {
        // Set of all delegators
        EnumerableSetLib.AddressSet delegators;
        // Mapping of delegatee to their delegators
        mapping(address => EnumerableSetLib.AddressSet) delegatorsByDelegatee;
        // Mapping of delegator to their delegation timestamp
        mapping(address => uint256) delegationTimeForDelegator;
    }

    // keccak256(abi.encode(uint256(keccak256("diamond.facets.governance.votes.enumerable.storage"))
    // -
    // 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xed095a1d53cef9e2be0aab14d20856bfa3fbcc76a945321739a0da68a6078e00;

    function setDelegators(
        address account,
        address newDelegatee,
        address currentDelegatee
    ) internal {
        Layout storage ds = layout();

        // If current delegatee is address(0), add account to delegators
        if (currentDelegatee == address(0)) {
            ds.delegators.add(account);
        } else {
            // Remove account from current delegatee's delegators
            ds.delegatorsByDelegatee[currentDelegatee].remove(account);
        }

        if (newDelegatee == address(0)) {
            // Remove account from delegators and reset delegation time
            ds.delegators.remove(account);
            ds.delegationTimeForDelegator[account] = 0;
        } else {
            // Add account to new delegatee's delegators and update timestamp
            ds.delegatorsByDelegatee[newDelegatee].add(account);
            ds.delegationTimeForDelegator[account] = block.timestamp;
        }
    }

    function getDelegators() internal view returns (address[] memory) {
        return layout().delegators.values();
    }

    function getDelegatorsByDelegatee(address account) internal view returns (address[] memory) {
        return layout().delegatorsByDelegatee[account].values();
    }

    function getDelegationTimeForDelegator(address account) internal view returns (uint256) {
        return layout().delegationTimeForDelegator[account];
    }

    function getDelegatorsCount() internal view returns (uint256) {
        return layout().delegators.length();
    }

    function getPaginatedDelegators(
        uint256 cursor,
        uint256 size
    ) internal view returns (address[] memory delegators, uint256 next) {
        Layout storage ds = layout();
        uint256 length = ds.delegators.length();

        // Return empty array if cursor is out of bounds
        if (cursor >= length) {
            return (new address[](0), 0);
        }

        // Calculate actual page size (handle last page case)
        uint256 pageSize = FixedPointMathLib.min(size, length - cursor);

        // Initialize return array
        delegators = new address[](pageSize);

        // Populate return array
        for (uint256 i = 0; i < pageSize; ++i) {
            delegators[i] = ds.delegators.at(cursor + i);
        }

        // Set next cursor
        next = (cursor + pageSize) % length;

        return (delegators, next);
    }

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
