// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";
import {DynamicArrayLib} from "solady/utils/DynamicArrayLib.sol";

// contracts
import {MainnetDelegation} from "src/base/registry/facets/mainnet/MainnetDelegation.sol";

library DeployMainnetDelegation {
    using DynamicArrayLib for DynamicArrayLib.DynamicArray;

    function selectors() internal pure returns (bytes4[] memory res) {
        DynamicArrayLib.DynamicArray memory arr = DynamicArrayLib.p().reserve(12);
        arr.p(MainnetDelegation.setProxyDelegation.selector);
        arr.p(MainnetDelegation.setDelegationDigest.selector);
        arr.p(MainnetDelegation.relayDelegations.selector);
        arr.p(MainnetDelegation.getMainnetDelegators.selector);
        arr.p(MainnetDelegation.getDepositIdByDelegator.selector);
        arr.p(MainnetDelegation.getDelegationByDelegator.selector);
        arr.p(MainnetDelegation.getMainnetDelegationsByOperator.selector);
        arr.p(MainnetDelegation.getDelegatedStakeByOperator.selector);
        arr.p(MainnetDelegation.getAuthorizedClaimer.selector);
        arr.p(MainnetDelegation.getProxyDelegation.selector);
        arr.p(MainnetDelegation.getMessenger.selector);
        arr.p(MainnetDelegation.getDelegatorsByAuthorizedClaimer.selector);

        bytes32[] memory selectors_ = arr.asBytes32Array();
        assembly ("memory-safe") {
            res := selectors_
        }
    }

    function makeInitData(address messenger) internal pure returns (bytes memory) {
        return abi.encodeCall(MainnetDelegation.__MainnetDelegation_init, (messenger));
    }

    function deploy() internal returns (address) {
        return LibDeploy.deployCode("MainnetDelegation.sol", "");
    }
}
