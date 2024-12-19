// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Facet} from "@river-build/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@river-build/diamond/src/facets/ownable/OwnableBase.sol";

abstract contract UpgradeableBeaconBase {
  /// @dev The new implementation is not a deployed contract.
  error NewImplementationHasNoCode();

  /// @dev Emitted when the proxy's implementation is upgraded.
  event Upgraded(address indexed implementation);

  /// @dev `keccak256(bytes("Upgraded(address)"))`.
  uint256 private constant _UPGRADED_EVENT_SIGNATURE =
    0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b;

  /// @dev The storage slot for the implementation address.
  /// `uint72(bytes9(keccak256("_UPGRADEABLE_BEACON_IMPLEMENTATION_SLOT")))`.
  uint256 internal constant _UPGRADEABLE_BEACON_IMPLEMENTATION_SLOT =
    0x911c5a209f08d5ec5e;

  function __UpgradeableBeacon_init_unchained(
    address initialImplementation
  ) internal {
    _setImplementation(initialImplementation);
  }

  /// @dev Sets the implementation directly without authorization guard.
  function _setImplementation(address newImplementation) internal virtual {
    /// @solidity memory-safe-assembly
    assembly {
      newImplementation := shr(96, shl(96, newImplementation)) // Clean the upper 96 bits.
      if iszero(extcodesize(newImplementation)) {
        mstore(0x00, 0x6d3e283b) // `NewImplementationHasNoCode()`.
        revert(0x1c, 0x04)
      }
      sstore(_UPGRADEABLE_BEACON_IMPLEMENTATION_SLOT, newImplementation) // Store the implementation.
      // Emit the {Upgraded} event.
      log2(codesize(), 0x00, _UPGRADED_EVENT_SIGNATURE, newImplementation)
    }
  }
}

/// @notice Upgradeable beacon for ERC1967 beacon proxies.
/// @author Modified from Solady (https://github.com/vectorized/solady/blob/main/src/utils/UpgradeableBeacon.sol)
contract UpgradeableBeacon is UpgradeableBeaconBase, OwnableBase, Facet {
  function __UpgradeableBeacon_init(
    address initialImplementation
  ) external onlyInitializing {
    __UpgradeableBeacon_init_unchained(initialImplementation);
  }

  /// @dev Allows the owner to upgrade the implementation.
  function upgradeTo(address newImplementation) public virtual onlyOwner {
    _setImplementation(newImplementation);
  }

  /// @dev Returns the implementation stored in the beacon.
  /// See: https://eips.ethereum.org/EIPS/eip-1967#beacon-contract-address
  function implementation() public view returns (address result) {
    /// @solidity memory-safe-assembly
    assembly {
      result := sload(_UPGRADEABLE_BEACON_IMPLEMENTATION_SLOT)
    }
  }
}
