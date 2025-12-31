// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IL2Registrar} from "./IL2Registrar.sol";

// libraries
import {L2RegistrarMod} from "./L2RegistrarMod.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";

/// @title L2RegistrarFacet
/// @notice Handles subdomain registration for Towns domains
/// @dev Owner-controlled registrar that validates labels and creates subdomains
contract L2RegistrarFacet is IL2Registrar, OwnableBase, Facet {
    /// @notice Initializes the registrar with a registry contract
    /// @param registry Address of the L2Registry diamond contract
    function __L2Registrar_init(address registry) external onlyInitializing {
        _addInterface(type(IL2Registrar).interfaceId);
        __L2Registrar_init_unchained(registry);
    }

    function __L2Registrar_init_unchained(address registry) internal {
        L2RegistrarMod.Layout storage $ = L2RegistrarMod.getStorage();
        $.registry = registry;
        // ENSIP-11: coinType = 0x80000000 | chainId for EVM chains
        $.coinType = 0x80000000 | block.chainid;
    }

    /// @inheritdoc IL2Registrar
    function register(string calldata label, address owner) external onlyOwner {
        L2RegistrarMod.register(L2RegistrarMod.getStorage(), label, owner);
    }

    /// @inheritdoc IL2Registrar
    function available(string calldata label) external view returns (bool) {
        return L2RegistrarMod.available(L2RegistrarMod.getStorage(), label);
    }

    /// @inheritdoc IL2Registrar
    function isValidLabel(string calldata label) external pure returns (bool) {
        return L2RegistrarMod.isValidLabel(label);
    }

    /// @inheritdoc IL2Registrar
    function getRegistry() external view returns (address) {
        return L2RegistrarMod.getStorage().registry;
    }

    /// @inheritdoc IL2Registrar
    function getCoinType() external view returns (uint256) {
        return L2RegistrarMod.getStorage().coinType;
    }
}
