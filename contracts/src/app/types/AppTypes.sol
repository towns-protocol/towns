// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITownsApp} from "../interfaces/ITownsApp.sol";

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
    ITownsApp app;
    address owner;
    address space;
    bytes signature;
  }
}
