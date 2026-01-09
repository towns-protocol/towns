// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IL2Registrar} from "./IL2Registrar.sol";

// libraries
import {L2RegistrarMod} from "./L2RegistrarMod.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {ReentrancyGuardTransient} from "solady/utils/ReentrancyGuardTransient.sol";

/// @title L2RegistrarFacet
/// @notice Handles subdomain registration for Towns domains
/// @dev Registrar that validates callers are Towns smart accounts, charges fees, and creates subdomains
contract L2RegistrarFacet is IL2Registrar, OwnableBase, ReentrancyGuardTransient, Facet {
    using CustomRevert for bytes4;
    using L2RegistrarMod for L2RegistrarMod.Layout;

    /// @notice Initializes the registrar with a registry contract and space factory
    /// @param registry Address of the L2Registry diamond contract
    /// @param spaceFactory Address of the SpaceFactory diamond (contains FeeManager facet)
    /// @param currency Address of the ERC20 token used for fee payments
    function __L2Registrar_init(
        address registry,
        address spaceFactory,
        address currency
    ) external onlyInitializing {
        _addInterface(type(IL2Registrar).interfaceId);
        __L2Registrar_init_unchained(registry, spaceFactory, currency);
    }

    /// @notice Internal initialization without interface registration
    /// @dev Sets storage values for registry, factory, currency, and coinType
    /// @param registry Address of the L2Registry diamond contract
    /// @param spaceFactory Address of the SpaceFactory diamond (contains FeeManager facet)
    /// @param currency Address of the ERC20 token used for fee payments
    function __L2Registrar_init_unchained(
        address registry,
        address spaceFactory,
        address currency
    ) internal {
        Validator.checkAddress(registry);
        Validator.checkAddress(spaceFactory);
        Validator.checkAddress(currency);
        L2RegistrarMod.Layout storage $ = L2RegistrarMod.getStorage();
        $.registry = registry;
        $.spaceFactory = spaceFactory;
        $.currency = currency;
        $.coinType = 0x80000000 | block.chainid; // ENSIP-11:
    }

    /// @inheritdoc IL2Registrar
    function register(string calldata label, address owner) external nonReentrant {
        // 1. Verify caller is a Towns smart account
        L2RegistrarMod.onlySmartAccount();

        // 2. Validate label format
        L2RegistrarMod.validateLabel(label);

        L2RegistrarMod.Layout storage $ = L2RegistrarMod.getStorage();

        // 3. Charge fee via FeeManager (hook handles first-free + tiers)
        $.chargeFee(label);

        // 4. Register domain (existing logic, minus duplicate label validation)
        $.register(label, owner);
    }

    /// @inheritdoc IL2Registrar
    function setSpaceFactory(address spaceFactory) external onlyOwner {
        Validator.checkAddress(spaceFactory);
        L2RegistrarMod.getStorage().spaceFactory = spaceFactory;
        emit L2RegistrarMod.SpaceFactorySet(spaceFactory);
    }

    /// @inheritdoc IL2Registrar
    function setRegistry(address registry) external onlyOwner {
        Validator.checkAddress(registry);
        L2RegistrarMod.getStorage().registry = registry;
        emit L2RegistrarMod.RegistrySet(registry);
    }

    /// @inheritdoc IL2Registrar
    function setCurrency(address currency) external onlyOwner {
        Validator.checkAddress(currency);
        L2RegistrarMod.getStorage().currency = currency;
        emit L2RegistrarMod.CurrencySet(currency);
    }

    /// @inheritdoc IL2Registrar
    function available(string calldata label) external view returns (bool) {
        return L2RegistrarMod.getStorage().available(label);
    }

    /// @inheritdoc IL2Registrar
    function getRegistry() external view returns (address) {
        return L2RegistrarMod.getStorage().registry;
    }

    /// @inheritdoc IL2Registrar
    function getCurrency() external view returns (address) {
        return L2RegistrarMod.getStorage().currency;
    }

    /// @inheritdoc IL2Registrar
    function getCoinType() external view returns (uint256) {
        return L2RegistrarMod.getStorage().coinType;
    }

    /// @inheritdoc IL2Registrar
    function getSpaceFactory() external view returns (address) {
        return L2RegistrarMod.getStorage().spaceFactory;
    }

    /// @inheritdoc IL2Registrar
    function isValidLabel(string calldata label) external pure returns (bool) {
        return L2RegistrarMod.isValidLabel(label);
    }
}
