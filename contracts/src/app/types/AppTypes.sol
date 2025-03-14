// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

/**
 * @title Inputs
 * @notice Library containing input structs
 * @dev These structs are used as parameters for app diamond functions
 */
library Inputs {
  /**
   * @notice Input structure for creating a new app
   * @dev Contains all necessary information to register an app in the system
   * @param app Address of the app contract
   * @param owner Address of the app owner
   * @param status Initial status of the app (Pending, Active, Disabled)
   * @param metadata App metadata including URI, name, and symbol
   * @param permissions Array of permission strings granted to the app
   */
  struct CreateApp {
    address app;
    address owner;
    Registry.Status status;
    Registry.Metadata metadata;
    string[] permissions;
  }

  /**
   * @notice Input structure for updating an existing app
   * @dev Contains fields that can be modified after app creation
   * @param status New status for the app (subject to valid state transitions)
   * @param metadata Updated metadata including URI, name, and symbol
   * @param permissions New array of permission strings (replaces existing permissions)
   */
  struct UpdateApp {
    Registry.Metadata metadata;
    string[] permissions;
  }
}

/**
 * @title Registry
 * @notice Library containing core data structures for the app registry
 * @dev Defines the data models used for storing app information
 */
library Registry {
  /**
   * @notice Enum representing possible app statuses
   * @dev Controls the lifecycle state of an app
   * @param Pending Initial state or under review
   * @param Approved App is approved and operational
   * @param Disabled App is no longer active or has been rejected
   */
  enum Status {
    Pending,
    Approved,
    Disabled
  }

  /**
   * @notice Structure containing app metadata
   * @dev Stores descriptive information about the app
   * @param uri URI pointing to additional off-chain metadata (JSON)
   * @param name Human-readable name of the app
   * @param symbol Short identifier for the app
   */
  struct Metadata {
    string uri;
    string name;
    string symbol;
  }

  /**
   * @notice Complete configuration for a registered app
   * @dev Core storage structure for app information
   * @param app Address of the app contract
   * @param status Current status of the app
   * @param owner Address of the app owner
   * @param tokenId Unique identifier token associated with this app
   * @param metadata App metadata including URI, name, and symbol
   */
  struct Config {
    address app;
    Status status;
    address owner;
    uint256 tokenId;
    Metadata metadata;
  }
}
