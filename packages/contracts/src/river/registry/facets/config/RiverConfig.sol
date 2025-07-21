// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRiverConfig} from "./IRiverConfig.sol";
import {Setting} from "src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {RiverRegistryErrors} from "src/river/registry/libraries/RegistryErrors.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {RegistryModifiers} from "src/river/registry/libraries/RegistryStorage.sol";

contract RiverConfig is IRiverConfig, RegistryModifiers, OwnableBase, Facet {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using CustomRevert for string;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __RiverConfig_init(address[] calldata configManagers) external onlyInitializing {
        for (uint256 i; i < configManagers.length; ++i) {
            _approveConfigurationManager(configManagers[i]);
        }
    }

    /// @inheritdoc IRiverConfig
    function approveConfigurationManager(address manager) external onlyOwner {
        _approveConfigurationManager(manager);
    }

    /// @inheritdoc IRiverConfig
    function removeConfigurationManager(address manager) external onlyOwner {
        if (manager == address(0)) RiverRegistryErrors.BAD_ARG.revertWith();

        if (!ds.configurationManagers.remove(manager)) {
            RiverRegistryErrors.NOT_FOUND.revertWith();
        }

        emit ConfigurationManagerRemoved(manager);
    }

    /// @inheritdoc IRiverConfig
    function setConfiguration(
        bytes32 key,
        uint64 blockNumber,
        bytes calldata value
    ) external onlyConfigurationManager(msg.sender) {
        if (blockNumber == type(uint64).max) {
            RiverRegistryErrors.BAD_ARG.revertWith();
        }
        if (value.length == 0) RiverRegistryErrors.BAD_ARG.revertWith();

        if (!ds.configurationKeys.contains(key)) {
            ds.configurationKeys.add(key);
        }

        // if there is already a setting on the given block override it
        Setting[] storage configs = ds.configuration[key];
        uint256 configurationLen = configs.length;
        for (uint256 i; i < configurationLen; ++i) {
            Setting storage config = configs[i];
            if (config.blockNumber == blockNumber) {
                config.value = value;
                emit ConfigurationChanged(key, blockNumber, value, false);
                return;
            }
        }

        configs.push(Setting(key, blockNumber, value));
        emit ConfigurationChanged(key, blockNumber, value, false);
    }

    /// @inheritdoc IRiverConfig
    function deleteConfiguration(
        bytes32 key
    ) external onlyConfigurationManager(msg.sender) configKeyExists(key) {
        delete ds.configuration[key];

        ds.configurationKeys.remove(key);

        emit ConfigurationChanged(key, type(uint64).max, "", true);
    }

    /// @inheritdoc IRiverConfig
    function deleteConfigurationOnBlock(
        bytes32 key,
        uint64 blockNumber
    ) external onlyConfigurationManager(msg.sender) {
        bool found = false;
        Setting[] storage configs = ds.configuration[key];
        uint256 configurationLen = configs.length;
        for (uint256 i; i < configurationLen; ++i) {
            if (configs[i].blockNumber == blockNumber) {
                configs[i] = configs[configurationLen - 1];
                configs.pop();
                found = true;
                break;
            }
        }

        if (!found) RiverRegistryErrors.NOT_FOUND.revertWith();

        emit ConfigurationChanged(key, blockNumber, "", true);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IRiverConfig
    function configurationExists(bytes32 key) external view returns (bool) {
        return ds.configurationKeys.contains(key);
    }

    /// @inheritdoc IRiverConfig
    function getConfiguration(
        bytes32 key
    ) external view configKeyExists(key) returns (Setting[] memory) {
        return ds.configuration[key];
    }

    /// @inheritdoc IRiverConfig
    function getAllConfiguration() external view returns (Setting[] memory settings) {
        uint256 settingCount = 0;

        uint256 configurationLen = ds.configurationKeys.length();
        for (uint256 i; i < configurationLen; ++i) {
            bytes32 key = ds.configurationKeys.at(i);
            settingCount += ds.configuration[key].length;
        }

        settings = new Setting[](settingCount);

        uint256 keysLen = ds.configurationKeys.length();
        uint256 c = 0;
        for (uint256 i; i < keysLen; ++i) {
            bytes32 key = ds.configurationKeys.at(i);
            Setting[] storage configs = ds.configuration[key];
            uint256 configsLen = configs.length;
            for (uint256 j; j < configsLen; ++j) {
                settings[c++] = configs[j];
            }
        }
    }

    /// @inheritdoc IRiverConfig
    function isConfigurationManager(address manager) external view returns (bool) {
        return ds.configurationManagers.contains(manager);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @dev Internal function to approve a configuration manager, doesn't do any
    /// validation
    function _approveConfigurationManager(address manager) internal {
        if (manager == address(0)) RiverRegistryErrors.BAD_ARG.revertWith();

        if (!ds.configurationManagers.add(manager)) {
            RiverRegistryErrors.ALREADY_EXISTS.revertWith();
        }

        emit ConfigurationManagerAdded(manager);
    }
}
