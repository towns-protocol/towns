// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IL2Registry} from "./IL2Registry.sol";

// libraries
import "./L2RegistrarMod.sol" as L2RegistrarMod;

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

contract L2RegistrarFacet is Facet, OwnableBase {
    /// @notice Initializes the registrar with a registry contract
    /// @param registry Address of the L2Registry contract
    function __L2Registrar_init(address registry) external onlyInitializing {
        __L2Registrar_init_unchained(registry);
    }

    function __L2Registrar_init_unchained(address registry) internal {
        L2RegistrarMod.Layout storage $ = L2RegistrarMod.getStorage();
        $.registry = IL2Registry(registry);
        $.coinType = (0x80000000 | block.chainid) >> 0;
    }

    /// @notice Registers a new name
    /// @param label The label to register (e.g. "name" for "name.eth")
    /// @param owner The address that will own the name
    function register(string calldata label, address owner) external onlyOwner {
        L2RegistrarMod.register(label, owner);
    }

    /// @notice Checks if a given label is available for registration
    /// @dev Uses try-catch to handle the ERC721NonexistentToken error
    /// @param label The label to check availability for
    /// @return available True if the label can be registered, false if already taken
    function available(string calldata label) external view returns (bool) {
        return L2RegistrarMod.available(label);
    }
}
