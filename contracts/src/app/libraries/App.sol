// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppRegistryBase} from "contracts/src/app/interfaces/IAppRegistry.sol";
import {IAppHooks} from "contracts/src/app/interfaces/IAppHooks.sol";

// libraries
import {Validator} from "contracts/src/utils/Validator.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";

// contracts

library App {
  using StringSet for StringSet.Set;

  struct Config {
    uint256 tokenId;
    address appAddress;
    address owner;
    bool disabled;
    string uri;
    string name;
    string symbol;
    StringSet.Set permissions;
    IAppHooks hooks;
  }

  function initialize(
    Config storage self,
    uint256 tokenId,
    IAppRegistryBase.Registration calldata registration
  ) internal {
    Validator.checkAddress(registration.appAddress);
    Validator.checkAddress(registration.owner);
    Validator.checkLength(registration.uri, 1);
    Validator.checkLength(registration.name, 1);
    Validator.checkLength(registration.symbol, 1);

    self.tokenId = tokenId;
    self.appAddress = registration.appAddress;
    self.owner = registration.owner;
    self.uri = registration.uri;
    self.name = registration.name;
    self.symbol = registration.symbol;
    self.hooks = registration.hooks;

    for (uint256 i; i < registration.permissions.length; ++i) {
      self.permissions.add(registration.permissions[i]);
    }
  }

  function exists(Config storage self) internal view returns (bool) {
    return self.owner != address(0);
  }

  function getPermissions(
    Config storage self
  ) internal view returns (string[] memory) {
    return self.permissions.values();
  }

  function update(
    Config storage self,
    IAppRegistryBase.UpdateRegistration calldata registration
  ) internal {
    self.uri = registration.uri;
    self.hooks = registration.hooks;
    self.disabled = registration.disabled;

    uint256 currentPermissionsLen = self.permissions.length();
    uint256 permissionsLen = registration.permissions.length;
    if (permissionsLen > 0) {
      string[] memory valuesToRemove = new string[](currentPermissionsLen);

      unchecked {
        for (uint256 i; i < currentPermissionsLen; ++i) {
          valuesToRemove[i] = self.permissions.at(i);
        }

        for (uint256 i; i < currentPermissionsLen; ++i) {
          self.permissions.remove(valuesToRemove[i]);
        }

        for (uint256 i; i < permissionsLen; ++i) {
          self.permissions.add(registration.permissions[i]);
        }
      }
    }
  }
}
