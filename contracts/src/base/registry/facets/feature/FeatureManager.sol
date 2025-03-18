// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFeatureManagerFacetBase} from "./IFeatureManagerFacet.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

// libraries
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

library FeatureManager {
  // keccak256(abi.encode(uint256(keccak256("towns.storage.FeatureManager")) - 1)) & ~bytes32(uint256(0xff))
  bytes32 constant STORAGE_SLOT =
    0xbf0291a9764d4152828d672b8fee3b84a943cf12027e2908bad1a29d55a8f400;

  /// @notice Condition struct for feature conditions
  /// @param token The token to be used to check the threshold
  /// @param threshold The amount of tokens needed
  /// @param active If this feature is currently active
  /// @param extraData Additional parameters for specific features
  struct Condition {
    address token;
    uint256 threshold;
    bool active;
    bytes extraData;
  }

  /// @custom:storage-location erc7201:towns.storage.FeatureManager
  struct Layout {
    // Feature ID => Condition
    mapping(bytes32 => Condition) conditions;
  }

  function setFeatureCondition(
    Layout storage self,
    bytes32 featureId,
    Condition memory condition
  ) internal {
    uint256 totalSupply = IERC20(condition.token).totalSupply();

    if (condition.token == address(0))
      CustomRevert.revertWith(IFeatureManagerFacetBase.InvalidToken.selector);

    if (!IERC165(condition.token).supportsInterface(type(IVotes).interfaceId))
      CustomRevert.revertWith(IFeatureManagerFacetBase.InvalidToken.selector);

    if (totalSupply == 0)
      CustomRevert.revertWith(
        IFeatureManagerFacetBase.InvalidTotalSupply.selector
      );

    if (condition.threshold > totalSupply)
      CustomRevert.revertWith(
        IFeatureManagerFacetBase.InvalidThreshold.selector
      );

    self.conditions[featureId] = condition;
  }

  function getFeatureCondition(
    Layout storage self,
    bytes32 featureId
  ) internal view returns (Condition memory) {
    return self.conditions[featureId];
  }

  function disableFeatureCondition(
    Layout storage self,
    bytes32 featureId
  ) internal {
    self.conditions[featureId].active = false;
  }

  function meetsThreshold(
    Layout storage self,
    bytes32 featureId,
    address space
  ) internal view returns (bool) {
    Condition memory condition = self.conditions[featureId];
    if (!condition.active) return false;
    if (condition.threshold == 0) return true;
    return IVotes(condition.token).getVotes(space) >= condition.threshold;
  }

  /// @notice Returns the layout for the FeatureManager
  /// @return self The layout storage pointer
  function getLayout() internal pure returns (Layout storage self) {
    assembly {
      self.slot := STORAGE_SLOT
    }
  }
}
