// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC6900ExtensionRegistry} from "./interfaces/IERC6900ExtensionRegistry.sol";

// libraries
import {TrustedLib} from "./libraries/TrustedLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

contract TrustedRegistry is IERC6900ExtensionRegistry, Facet {
    function __TrustedRegistry_init() external onlyInitializing {}

    /// @inheritdoc IERC6900ExtensionRegistry
    function trustAttesters(uint8 threshold, address[] calldata attesters) external {
        TrustedLib.trustAttesters(threshold, attesters);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function check(address module) external view {
        TrustedLib.check(msg.sender, module);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function checkForAccount(address account, address module) external view {
        TrustedLib.check(account, module);
    }

    /// @inheritdoc IERC6900ExtensionRegistry
    function check(address module, address[] calldata attesters, uint256 threshold) external view {
        TrustedLib.check(module, attesters, threshold);
    }
}
