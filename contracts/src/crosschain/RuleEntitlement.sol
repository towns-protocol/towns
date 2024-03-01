// SPDX-License-Identifier: MIT

/**
 * @title EntitlementRule
 * @dev This contract manages entitlement rules based on blockchain operations.
 * The contract maintains a tree-like data structure to combine various types of operations.
 * The tree is implemented as a dynamic array of 'Operation' structs, and is built in post-order fashion.
 *
 * Post-order Tree Structure:
 * In a post-order binary tree, children nodes must be added before their respective parent nodes.
 * The 'LogicalOperation' nodes refer to their child nodes via indices in the 'operations' array.
 * As new LogicalOperation nodes are added, they can only reference existing nodes in the 'operations' array,
 * ensuring a valid post-order tree structure.
 */
pragma solidity ^0.8.0;

// contracts
import {Initializable} from "openzeppelin-contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "openzeppelin-contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ContextUpgradeable} from "openzeppelin-contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// interfaces
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlement} from "./IRuleEntitlement.sol";

contract RuleEntitlement is
  Initializable,
  ERC165Upgradeable,
  ContextUpgradeable,
  UUPSUpgradeable,
  IRuleEntitlement
{
  using EnumerableSet for EnumerableSet.Bytes32Set;

  struct Entitlement {
    uint256 roleId;
    address grantedBy;
    uint256 grantedTime;
    RuleData data;
  }

  mapping(uint256 => Entitlement) internal entitlementIdsByRoleId;

  address public SPACE_ADDRESS;

  string public constant name = "Rule Entitlement";
  string public constant description = "Entitlement for crosschain rules";
  string public constant moduleType = "RuleEntitlement";

  // Separate storage arrays for CheckOperation and LogicalOperation
  //CheckOperation[] private checkOperations;
  //LogicalOperation[] private logicalOperations;

  // Dynamic array to store Operation instances
  //Operation[] private operations;

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address _space) public initializer {
    __UUPSUpgradeable_init();
    __ERC165_init();
    __Context_init();

    SPACE_ADDRESS = _space;
  }

  modifier onlyTown() {
    if (_msgSender() != SPACE_ADDRESS) {
      revert Entitlement__NotAllowed();
    }
    _;
  }

  /// @notice allow the contract to be upgraded while retaining state
  /// @param newImplementation address of the new implementation
  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlyTown {}

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return
      interfaceId == type(IEntitlement).interfaceId ||
      super.supportsInterface(interfaceId);
  }

  // @inheritdoc IEntitlement
  function isCrosschain() external pure override returns (bool) {
    // TODO possible optimization: return false if no crosschain operations
    return true;
  }

  // @inheritdoc IEntitlement
  function isEntitled(
    string calldata, //channelId,
    address[] memory, //user,
    bytes32 //permission
  ) external pure returns (bool) {
    // TODO possible optimization: if there are no crosschain operations, evaluate locally
    return false;
  }

  // @inheritdoc IEntitlement
  function setEntitlement(
    uint256 roleId,
    bytes calldata entitlementData
  ) external onlyTown {
    if (entitlementData.length == 0) {
      return;
    }
    // Decode the data
    RuleData memory data = abi.decode(entitlementData, (RuleData));

    // Step 1: Validate Operation against CheckOperation and LogicalOperation
    for (uint256 i = 0; i < data.operations.length; i++) {
      if (data.operations[i].opType == CombinedOperationType.CHECK) {
        if (data.operations[i].index >= data.checkOperations.length) {
          revert InvalidCheckOperationIndex(
            data.operations[i].index,
            uint8(data.checkOperations.length)
          );
        }
      } else if (data.operations[i].opType == CombinedOperationType.LOGICAL) {
        // Use custom error in revert statement
        if (data.operations[i].index >= data.logicalOperations.length) {
          revert InvalidLogicalOperationIndex(
            data.operations[i].index,
            uint8(data.logicalOperations.length)
          );
        }
        // Verify the logical operations make a DAG
        uint8 leftOperationIndex = data
          .logicalOperations[data.operations[i].index]
          .leftOperationIndex;
        uint8 rightOperationIndex = data
          .logicalOperations[data.operations[i].index]
          .rightOperationIndex;

        // Use custom errors in revert statements
        if (leftOperationIndex >= i) {
          revert InvalidLeftOperationIndex(leftOperationIndex, uint8(i));
        }
        if (rightOperationIndex >= i) {
          revert InvalidRightOperationIndex(rightOperationIndex, uint8(i));
        }
      } else if (data.operations[i].opType == CombinedOperationType.NONE) {
        // Intentionally left blank
      } else {
        revert InvalidOperationType(data.operations[i].opType);
      }
    }

    Entitlement storage entitlement = entitlementIdsByRoleId[roleId];

    entitlement.grantedBy = _msgSender();
    entitlement.grantedTime = block.timestamp;
    entitlement.roleId = roleId;

    if (data.operations.length == 0) {
      return;
    }

    // All checks passed; initialize state variables
    // Manually copy _checkOperations to checkOperations
    for (uint256 i = 0; i < data.checkOperations.length; i++) {
      entitlementIdsByRoleId[roleId].data.checkOperations.push(
        data.checkOperations[i]
      );
    }

    for (uint256 i = 0; i < data.logicalOperations.length; i++) {
      entitlementIdsByRoleId[roleId].data.logicalOperations.push(
        data.logicalOperations[i]
      );
    }

    for (uint256 i = 0; i < data.operations.length; i++) {
      entitlementIdsByRoleId[roleId].data.operations.push(data.operations[i]);
    }
  }

  // @inheritdoc IEntitlement
  function removeEntitlement(uint256 roleId) external {
    Entitlement memory entitlement = entitlementIdsByRoleId[roleId];
    if (entitlement.grantedBy == address(0)) {
      revert Entitlement__InvalidValue();
    }

    if (entitlement.roleId == 0) {
      revert Entitlement__InvalidValue();
    }

    delete entitlementIdsByRoleId[entitlement.roleId];
  }

  // @inheritdoc IEntitlement
  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes memory) {
    Entitlement storage entitlement = entitlementIdsByRoleId[roleId];
    return abi.encode(entitlement.data);
  }

  function setRuleData(
    RuleData calldata data
  ) external pure returns (bytes memory) {
    return abi.encode(data);
  }

  function getRuleData(
    uint256 roleId
  ) external view returns (RuleData memory data) {
    return entitlementIdsByRoleId[roleId].data;
  }

  function getOperations(
    uint256 roleId
  ) external view returns (Operation[] memory) {
    return entitlementIdsByRoleId[roleId].data.operations;
  }

  function getLogicalOperations(
    uint256 roleId
  ) external view returns (LogicalOperation[] memory) {
    return entitlementIdsByRoleId[roleId].data.logicalOperations;
  }

  function getCheckOperations(
    uint256 roleId
  ) external view returns (CheckOperation[] memory) {
    return entitlementIdsByRoleId[roleId].data.checkOperations;
  }
}
