// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMainnetDelegationBase} from "./IMainnetDelegation.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

library MainnetDelegationStorage {
    struct Layout {
        mapping(address operator => EnumerableSet.AddressSet) delegatorsByOperator;
        mapping(address delegator => IMainnetDelegationBase.Delegation delegation) delegationByDelegator;
        mapping(address delegator => address claimer) claimerByDelegator;
        address deprecatedProxyDelegation; // Do not use this, use proxyDelegation
        address messenger;
        mapping(address claimer => EnumerableSet.AddressSet delegators) delegatorsByAuthorizedClaimer;
        address proxyDelegation;
        EnumerableSet.AddressSet delegators;
        mapping(address delegator => uint256 depositId) depositIdByDelegator;
        bytes32 delegationDigest;
    }

    // keccak256(abi.encode(uint256(keccak256("tokens.river.base.delegation.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x264df150e9e008a39dd109254e3af3cdadbfbd33261903d1163f43eaee68e700;

    function layout() internal pure returns (Layout storage s) {
        assembly {
            s.slot := STORAGE_SLOT
        }
    }
}
