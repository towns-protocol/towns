// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDelegateRegistry} from "src/factory/facets/wallet-link/interfaces/IDelegateRegistry.sol";

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts

contract MockDelegationRegistry is IDelegateRegistry {
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    mapping(address to => EnumerableSetLib.AddressSet) internal _delegations;

    function delegateAll(address to) external {
        _delegations[to].add(msg.sender);
    }

    function checkDelegateForAll(address, address, bytes32) external pure returns (bool) {
        return true;
    }

    function getIncomingDelegations(
        address to
    ) external view returns (Delegation[] memory delegations) {
        EnumerableSetLib.AddressSet storage incomingDelegations = _delegations[to];

        uint256 count = incomingDelegations.length();

        if (count == 0) {
            return new Delegation[](0);
        }

        delegations = new Delegation[](count);

        for (uint256 i; i < count; i++) {
            address from = incomingDelegations.at(i);
            delegations[i] = Delegation({
                type_: IDelegateRegistry.DelegationType.ALL,
                to: to,
                from: from,
                rights: bytes32(0),
                contract_: address(0),
                tokenId: 0,
                amount: 0
            });
        }
    }
}
