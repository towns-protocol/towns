// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRiverConfig} from "./IRiverConfig.sol";
import {Setting} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {RiverRegistryErrors} from "contracts/src/river/registry/libraries/RegistryErrors.sol";

// contracts
import {RegistryModifiers} from "contracts/src/river/registry/libraries/RegistryStorage.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

contract RiverConfig is IRiverConfig, RegistryModifiers, OwnableBase, Facet {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.Bytes32Set;

  // =============================================================
  //                         Initialization
  // =============================================================
  function __RiverConfig_init(
    address[] calldata configManagers
  ) external onlyInitializing {
    for (uint256 i = 0; i < configManagers.length; ++i) {
      _approveConfigurationManager(configManagers[i]);
    }
  }

  // =============================================================
  //                         Settings
  // =============================================================

  /// Indication if there is a setting for the given key
  /// @inheritdoc IRiverConfig
  function configurationExists(bytes32 key) external view returns (bool) {
    return ds.configurationKeys.contains(key);
  }

  /// Set a bytes setting for the given key
  /// @inheritdoc IRiverConfig
  function setConfiguration(
    bytes32 key,
    uint64 blockNumber,
    bytes calldata value
  ) external onlyConfigurationManager(msg.sender) {
    if (value.length == 0) revert(RiverRegistryErrors.BAD_ARG);

    if (!ds.configurationKeys.contains(key)) {
      ds.configurationKeys.add(key);
    }

    // if there is already a setting on the given block override it
    uint256 configurationLen = ds.configuration[key].length;
    for (uint256 i = 0; i < configurationLen; ++i) {
      if (ds.configuration[key][i].blockNumber == blockNumber) {
        ds.configuration[key][i].value = value;
        emit ConfigurationChanged(key, blockNumber, value, false);
        return;
      }
    }

    ds.configuration[key].push(Setting(key, blockNumber, value));
    emit ConfigurationChanged(key, blockNumber, value, false);
  }

  /// Deletes the setting for the given key on all blocks
  /// @inheritdoc IRiverConfig
  function deleteConfiguration(
    bytes32 key
  ) external onlyConfigurationManager(msg.sender) configKeyExists(key) {
    while (ds.configuration[key].length != 0) {
      ds.configuration[key].pop();
    }
    delete (ds.configuration[key]);

    ds.configurationKeys.remove(key);

    emit ConfigurationChanged(key, 0, "", true);
  }

  /// Deletes the setting for the given key at the given block
  /// @inheritdoc IRiverConfig
  function deleteConfigurationOnBlock(
    bytes32 key,
    uint64 blockNumber
  ) external onlyConfigurationManager(msg.sender) {
    bool found = false;
    for (uint256 i = 0; i < ds.configuration[key].length; ++i) {
      if (ds.configuration[key][i].blockNumber == blockNumber) {
        ds.configuration[key][i] = ds.configuration[key][
          ds.configuration[key].length - 1
        ];
        ds.configuration[key].pop();
        found = true;
      }
    }

    if (!found) revert(RiverRegistryErrors.NOT_FOUND);

    emit ConfigurationChanged(key, blockNumber, "", true);
  }

  /// Get settings for the given key
  /// @inheritdoc IRiverConfig
  function getConfiguration(
    bytes32 key
  ) external view configKeyExists(key) returns (Setting[] memory) {
    return ds.configuration[key];
  }

  /// Get all settings store in the registry
  /// @inheritdoc IRiverConfig
  function getAllConfiguration() external view returns (Setting[] memory) {
    uint256 settingCount = 0;

    uint256 configurationLen = ds.configurationKeys.length();
    for (uint256 i = 0; i < configurationLen; ++i) {
      bytes32 key = ds.configurationKeys.at(i);
      settingCount += ds.configuration[key].length;
    }

    Setting[] memory settings = new Setting[](settingCount);

    uint256 length = ds.configurationKeys.length();
    uint256 c = 0;
    for (uint256 i = 0; i < length; ++i) {
      bytes32 key = ds.configurationKeys.at(i);
      Setting[] memory keySettings = ds.configuration[key];
      for (uint256 j = 0; j < keySettings.length; ++j) {
        settings[c++] = keySettings[j];
      }
    }

    return settings;
  }

  // =============================================================
  //                    Configuration manager
  // =============================================================

  /// Check if the given address is a configuration manager
  /// @inheritdoc IRiverConfig
  function isConfigurationManager(
    address manager
  ) external view returns (bool) {
    return ds.configurationManagers.contains(manager);
  }

  /// Add a configuration manager
  /// @inheritdoc IRiverConfig
  function approveConfigurationManager(address manager) external onlyOwner {
    _approveConfigurationManager(manager);
  }

  /// Remove a configuration manager
  /// @inheritdoc IRiverConfig
  function removeConfigurationManager(address manager) external onlyOwner {
    if (manager == address(0)) revert(RiverRegistryErrors.BAD_ARG);

    if (!ds.configurationManagers.remove(manager))
      revert(RiverRegistryErrors.NOT_FOUND);

    emit ConfigurationManagerRemoved(manager);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  /// Internal function to approve a configuration manager, doesn't do any
  /// validation
  function _approveConfigurationManager(address manager) internal {
    if (manager == address(0)) revert(RiverRegistryErrors.BAD_ARG);

    if (!ds.configurationManagers.add(manager))
      revert(RiverRegistryErrors.ALREADY_EXISTS);

    emit ConfigurationManagerAdded(manager);
  }
}
