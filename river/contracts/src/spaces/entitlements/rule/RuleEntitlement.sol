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
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

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
    address grantedBy;
    uint256 grantedTime;
    RuleData data;
  }

  mapping(uint256 => Entitlement) internal entitlementsByRoleId;

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

  modifier onlySpace() {
    if (_msgSender() != SPACE_ADDRESS) {
      revert Entitlement__NotAllowed();
    }
    _;
  }

  /// @notice allow the contract to be upgraded while retaining state
  /// @param newImplementation address of the new implementation
  function _authorizeUpgrade(
    address newImplementation
  ) internal override onlySpace {}

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
    bytes32, //channelId,
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
  ) external onlySpace {
    // Decode the data
    RuleData memory data = abi.decode(entitlementData, (RuleData));

    if (entitlementData.length == 0 || data.operations.length == 0) {
      return;
    }

    // Cache sender and currentTime
    address sender = _msgSender();
    uint256 currentTime = block.timestamp;

    // Cache lengths of operations arrays to reduce state access cost
    uint256 operationsLength = data.operations.length;
    uint256 checkOperationsLength = data.checkOperations.length;
    uint256 logicalOperationsLength = data.logicalOperations.length;

    // Step 1: Validate Operation against CheckOperation and LogicalOperation
    for (uint256 i = 0; i < operationsLength; i++) {
      CombinedOperationType opType = data.operations[i].opType; // cache the operation type
      uint8 index = data.operations[i].index; // cache the operation index

      if (opType == CombinedOperationType.CHECK) {
        if (index >= checkOperationsLength) {
          revert InvalidCheckOperationIndex(
            index,
            uint8(checkOperationsLength)
          );
        }
      } else if (opType == CombinedOperationType.LOGICAL) {
        // Use custom error in revert statement
        if (index >= logicalOperationsLength) {
          revert InvalidLogicalOperationIndex(
            index,
            uint8(logicalOperationsLength)
          );
        }

        // Verify the logical operations make a DAG
        LogicalOperation memory logicalOp = data.logicalOperations[index];
        uint8 leftOperationIndex = logicalOp.leftOperationIndex;
        uint8 rightOperationIndex = logicalOp.rightOperationIndex;

        // Use custom errors in revert statements
        if (leftOperationIndex >= i) {
          revert InvalidLeftOperationIndex(leftOperationIndex, uint8(i));
        }

        if (rightOperationIndex >= i) {
          revert InvalidRightOperationIndex(rightOperationIndex, uint8(i));
        }
      }
    }

    Entitlement storage entitlement = entitlementsByRoleId[roleId];

    entitlement.grantedBy = sender;
    entitlement.grantedTime = currentTime;

    // All checks passed; initialize state variables
    // Manually copy _checkOperations to checkOperations
    for (uint256 i = 0; i < checkOperationsLength; i++) {
      entitlement.data.checkOperations.push(data.checkOperations[i]);
    }

    for (uint256 i = 0; i < logicalOperationsLength; i++) {
      entitlement.data.logicalOperations.push(data.logicalOperations[i]);
    }

    for (uint256 i = 0; i < operationsLength; i++) {
      entitlement.data.operations.push(data.operations[i]);
    }
  }

  // @inheritdoc IEntitlement
  function removeEntitlement(uint256 roleId) external onlySpace {
    Entitlement memory entitlement = entitlementsByRoleId[roleId];
    if (entitlement.grantedBy == address(0)) {
      revert Entitlement__InvalidValue();
    }

    delete entitlementsByRoleId[roleId];
  }

  // @inheritdoc IEntitlement
  function getEntitlementDataByRoleId(
    uint256 roleId
  ) external view returns (bytes memory) {
    Entitlement storage entitlement = entitlementsByRoleId[roleId];
    return abi.encode(entitlement.data);
  }

  function encodeRuleData(
    RuleData calldata data
  ) external pure returns (bytes memory) {
    return abi.encode(data);
  }

  function getRuleData(
    uint256 roleId
  ) external view returns (RuleData memory data) {
    return entitlementsByRoleId[roleId].data;
  }

  function getOperations(
    uint256 roleId
  ) external view returns (Operation[] memory) {
    return entitlementsByRoleId[roleId].data.operations;
  }

  function getLogicalOperations(
    uint256 roleId
  ) external view returns (LogicalOperation[] memory) {
    return entitlementsByRoleId[roleId].data.logicalOperations;
  }

  function getCheckOperations(
    uint256 roleId
  ) external view returns (CheckOperation[] memory) {
    return entitlementsByRoleId[roleId].data.checkOperations;
  }
}
