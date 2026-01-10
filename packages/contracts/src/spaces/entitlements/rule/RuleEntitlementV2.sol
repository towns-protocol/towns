// SPDX-License-Identifier: MIT

/**
 * @title RuleEntitlementV2
 * @dev This contract manages entitlement rules based on blockchain operations.
 * The contract maintains a tree-like data structure to combine various types of operations.
 * The tree is implemented as a dynamic array of 'Operation' structs, and is built in post-order
 * fashion.
 *
 * Post-order Tree Structure:
 * In a post-order binary tree, children nodes must be added before their respective parent nodes.
 * The 'LogicalOperation' nodes refer to their child nodes via indices in the 'operations' array.
 * As new LogicalOperation nodes are added, they can only reference existing nodes in the
 * 'operations' array,
 * ensuring a valid post-order tree structure.
 */
pragma solidity ^0.8.0;

// interfaces
import {IEntitlement} from "../IEntitlement.sol";
import {IRuleEntitlementV2} from "./IRuleEntitlement.sol";

// contracts
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

contract RuleEntitlementV2 is
    Initializable,
    ERC165Upgradeable,
    ContextUpgradeable,
    UUPSUpgradeable,
    IRuleEntitlementV2
{
    // @custom:storage-location erc7201:spaces.entitlements.rule.storage
    struct Layout {
        mapping(uint256 => EntitlementV2) entitlementsByRoleIdV2;
    }

    // TODO: abstract to a base contract
    // keccak256(abi.encode(uint256(keccak256("spaces.entitlements.rule.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 private constant STORAGE_SLOT =
        0xa7ba26993e5aed586ba0b4d511980a49b23ea33e13d5f0920b7e42ae1a27cc00;

    string public constant name = "Rule Entitlement V2";
    string public constant description = "Entitlement for crosschain rules";
    string public constant moduleType = "RuleEntitlementV2";
    bool public constant isCrosschain = true;

    mapping(uint256 => Entitlement) internal entitlementsByRoleId;
    address public SPACE_ADDRESS;

    modifier onlySpace() {
        if (_msgSender() != SPACE_ADDRESS) {
            revert Entitlement__NotAllowed();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // =============================================================
    //                           External
    // =============================================================

    // @inheritdoc IEntitlement
    function setEntitlement(uint256 roleId, bytes calldata entitlementData) external onlySpace {
        _removeRuleDataV1(roleId);

        // We should never allow the setting of empty rule datas because it can cause the xchain
        // architecture to be invoked when by default a user is not entitled.
        if (entitlementData.length == 0) {
            revert Entitlement__InvalidValue();
        }

        // equivalent: abi.decode(entitlementData, (RuleDataV2))
        RuleDataV2 calldata data;
        assembly {
            // this is a variable length struct, so entitlementData.offset contains
            // the offset from entitlementData.offset at which the struct begins
            data := add(entitlementData.offset, calldataload(entitlementData.offset))
        }

        // We should never allow the setting of empty rule datas because it can cause the xchain
        // architecture to be invoked when by default a user is not entitled.
        if (data.operations.length == 0) {
            revert Entitlement__InvalidValue();
        }

        // Cache lengths of operations arrays to reduce state access cost
        uint256 operationsLength = data.operations.length;
        uint256 checkOperationsLength = data.checkOperations.length;
        uint256 logicalOperationsLength = data.logicalOperations.length;

        // Step 1: Validate Operation against CheckOperation and LogicalOperation
        for (uint256 i; i < operationsLength; ++i) {
            CombinedOperationType opType = data.operations[i].opType; // cache the operation type
            uint8 index = data.operations[i].index; // cache the operation index

            if (opType == CombinedOperationType.CHECK) {
                if (index >= checkOperationsLength) {
                    revert InvalidCheckOperationIndex(index, uint8(checkOperationsLength));
                }
            } else if (opType == CombinedOperationType.LOGICAL) {
                // Use custom error in revert statement
                if (index >= logicalOperationsLength) {
                    revert InvalidLogicalOperationIndex(index, uint8(logicalOperationsLength));
                }

                // Verify the logical operations make a DAG
                LogicalOperation calldata logicalOp = data.logicalOperations[index];
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

        EntitlementV2 storage entitlement = layout().entitlementsByRoleIdV2[roleId];
        entitlement.grantedBy = _msgSender();
        entitlement.grantedTime = block.timestamp;
        entitlement.data = entitlementData;
    }

    // @inheritdoc IEntitlement
    function removeEntitlement(uint256 roleId) external onlySpace {
        Layout storage ds = layout();
        EntitlementV2 storage entitlement = ds.entitlementsByRoleIdV2[roleId];

        if (entitlement.grantedBy == address(0)) {
            revert Entitlement__InvalidValue();
        }

        delete ds.entitlementsByRoleIdV2[roleId];
    }

    // @inheritdoc IEntitlement
    function getEntitlementDataByRoleId(uint256 roleId) external view returns (bytes memory) {
        EntitlementV2 storage entitlement = layout().entitlementsByRoleIdV2[roleId];
        return entitlement.data;
    }

    function getRuleData(uint256 roleId) external view returns (RuleData memory data) {
        return entitlementsByRoleId[roleId].data;
    }

    function getRuleDataV2(uint256 roleId) external view returns (RuleDataV2 memory data) {
        bytes storage ruleData = layout().entitlementsByRoleIdV2[roleId].data;

        if (ruleData.length == 0) return data;

        return abi.decode(ruleData, (RuleDataV2));
    }

    // @inheritdoc IEntitlement
    function isEntitled(bytes32, address[] memory, bytes32) external pure returns (bool) {
        return false;
    }

    function encodeRuleData(RuleDataV2 calldata data) external pure returns (bytes memory) {
        return abi.encode(data);
    }

    function initialize(address _space) public initializer {
        __UUPSUpgradeable_init();
        __ERC165_init();
        __Context_init();
        SPACE_ADDRESS = _space;
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return
            interfaceId == type(IEntitlement).interfaceId ||
            interfaceId == type(IRuleEntitlementV2).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // =============================================================
    //                           Internal
    // =============================================================

    /// @notice allow the contract to be upgraded while retaining state
    /// @param newImplementation address of the new implementation
    function _authorizeUpgrade(address newImplementation) internal override onlySpace {}

    function _removeRuleDataV1(uint256 roleId) internal {
        if (entitlementsByRoleId[roleId].grantedBy != address(0)) {
            delete entitlementsByRoleId[roleId];
        }
    }

    /// @notice get the storage slot for the contract
    /// @return ds storage slot
    function layout() internal pure returns (Layout storage ds) {
        assembly {
            ds.slot := STORAGE_SLOT
        }
    }
}
