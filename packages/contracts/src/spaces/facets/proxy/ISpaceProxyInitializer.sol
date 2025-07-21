// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {ITokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/ITokenOwnable.sol";
import {IManagedProxyBase} from "@towns-protocol/diamond/src/proxy/managed/IManagedProxy.sol";
import {IMembershipBase} from "src/spaces/facets/membership/IMembership.sol";

// libraries

// contracts

interface ISpaceProxyInitializer is ITokenOwnableBase, IMembershipBase, IManagedProxyBase {
    function initialize(
        address owner,
        address manager,
        TokenOwnable memory tokenOwnable,
        Membership memory membership
    ) external;
}
