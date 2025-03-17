// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library FeatureSettings {
  struct Layout {
    mapping(bytes32 => bytes32) settings;
  }

  function setSetting(
    Layout storage self,
    bytes32 key,
    bytes32 value
  ) internal {
    self.settings[key] = value;
  }

  function getSetting(
    Layout storage self,
    bytes32 key
  ) internal view returns (bytes32) {
    return self.settings[key];
  }
}
