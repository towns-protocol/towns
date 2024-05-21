// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library RiverRegistryErrors {
  // =============================================================
  //                         Errors
  // =============================================================
  string internal constant ALREADY_EXISTS = "ALREADY_EXISTS";
  string internal constant OPERATOR_NOT_FOUND = "OPERATOR_NOT_FOUND";
  string internal constant NODE_NOT_FOUND = "NODE_NOT_FOUND";
  string internal constant NOT_FOUND = "NOT_FOUND";
  string internal constant OUT_OF_BOUNDS = "OUT_OF_BOUNDS";
  string internal constant BAD_ARG = "BAD_ARG";
  string internal constant BAD_AUTH = "BAD_AUTH";
  string internal constant INVALID_STREAM_ID = "INVALID_STREAM_ID";
  string internal constant STREAM_SEALED = "STREAM_SEALED";
  string internal constant NODE_STATE_NOT_ALLOWED = "NODE_STATE_NOT_ALLOWED";
}
