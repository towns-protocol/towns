// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {ModuleLib} from "./libraries/ModuleLib.sol";

// contracts

import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract ModuleRegistry is OwnableBase, Facet {
    using ModuleLib for ModuleLib.Layout;

    function registerModule(
        address module,
        address client,
        address owner,
        bytes32[] calldata permissions
    )
        external
        onlyOwner
    {
        ModuleLib.registerModule(module, client, owner, permissions);
    }
}
