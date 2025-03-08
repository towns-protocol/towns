// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IImplementationRegistry} from "contracts/src/factory/facets/registry/IImplementationRegistry.sol";

// libraries

// contracts
import {MembershipStorage} from "contracts/src/spaces/facets/membership/MembershipStorage.sol";
/// @title Implementations
/// @notice Library for retrieving implementation addresses from the registry
/// @dev Uses the space factory to access the implementation registry
library Implementations {
  /// @notice Identifier for the app registry implementation
  bytes32 internal constant APP_REGISTRY = bytes32("AppRegistry");

  /// @notice Gets the latest app registry implementation address
  /// @return address The address of the latest app registry implementation
  function appRegistry() internal view returns (address) {
    return
      IImplementationRegistry(MembershipStorage.layout().spaceFactory)
        .getLatestImplementation(APP_REGISTRY);
  }
}
