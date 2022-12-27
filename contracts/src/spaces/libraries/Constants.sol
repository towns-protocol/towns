// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library Constants {
  uint8 internal constant MIN_NAME_LENGTH = 2;
  string internal constant DEFAULT_TOKEN_ENTITLEMENT_TAG =
    "zion-default-token-entitlement";
  uint8 internal constant MAX_NAME_LENGTH = 32;
  address internal constant EVERYONE_ADDRESS =
    0x0000000000000000000000000000000000000001;
  string internal constant OWNER_ROLE_NAME = "Owner";
}
