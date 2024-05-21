// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// libraries
import {Setting} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

interface IRiverConfigBase {
  // =============================================================
  //                           Events
  // =============================================================

  /**
   * @notice Emitted when a setting is changed
   * @param key The setting key that is changed
   * @param block The block number on which the setting becomes active
   * @param value The new setting value
   * @param deleted True if the setting is deleted (value is empty in this case)
   */
  event ConfigurationChanged(
    bytes32 key,
    uint64 block,
    bytes value,
    bool deleted
  );

  /**
   * @notice Emitted when a configuration manager is added
   * @param manager The configuration manager address
   */
  event ConfigurationManagerAdded(address indexed manager);

  /**
   * @notice Emitted when a configuration manager is removed
   * @param manager The configuration manager address
   */
  event ConfigurationManagerRemoved(address indexed manager);
}

/**
 * @title IRiverConfig
 * @notice The interface for the RiverConfig facet
 */
interface IRiverConfig is IRiverConfigBase {
  /**
   * @notice Indication if one or more settings exists for the given key
   * @param key The setting key
   * @return True if the setting exists
   */
  function configurationExists(bytes32 key) external view returns (bool);

  /**
   * @notice Set a bytes setting for the given key
   * @param key The setting key
   * @param blockNumber The block number on which the setting becomes active
   * @param value The setting value (value must be its ABI representation)
   */
  function setConfiguration(
    bytes32 key,
    uint64 blockNumber,
    bytes calldata value
  ) external;

  /**
   * @notice Deletes the setting for the given key on all blocks
   * @param key The setting key
   */
  function deleteConfiguration(bytes32 key) external;

  /**
   * @notice Deletes the setting for the given key at the given block
   * @param key The setting key
   * @param blockNumber The block number on which the setting becomes active
   */
  function deleteConfigurationOnBlock(bytes32 key, uint64 blockNumber) external;

  /**
   * @notice Get settings for the given key
   * @dev Note that the returned list isn't ordered by block number
   * @param key The setting key
   * @return The setting value
   */
  function getConfiguration(
    bytes32 key
  ) external view returns (Setting[] memory);

  /**
   * @notice Get all settings store in the registry
   * @dev Note that the returned list is ordered on key but NOT on block number
   * @return List will all stored settings
   */
  function getAllConfiguration() external view returns (Setting[] memory);

  /**
   * @notice Check if the given address is a configuration manager
   * @param manager The address to check
   * @return True if the address is a configuration manager
   */
  function isConfigurationManager(address manager) external view returns (bool);

  /**
   * @notice Add a configuration manager
   * @param manager The address to add
   */
  function approveConfigurationManager(address manager) external;

  /**
   * @notice Remove a configuration manager
   * @param manager The address to remove
   */
  function removeConfigurationManager(address manager) external;
}
