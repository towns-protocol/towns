// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ICreateSpace} from "./ICreateSpace.sol";

// libraries

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {PausableBase} from "@towns-protocol/diamond/src/facets/pausable/PausableBase.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {CreateSpaceBase} from "./CreateSpaceBase.sol";

/// @title CreateSpaceFacet
/// @notice Facet for creating new spaces with various configurations
/// @dev Inherits from:
/// - ICreateSpace: Interface defining space creation methods
/// - PausableBase: Allows pausing of space creation functionality
/// - ReentrancyGuard: Prevents reentrancy attacks during space creation
/// - Facet: Base contract for diamond facets
contract CreateSpaceFacet is ICreateSpace, PausableBase, ReentrancyGuard, CreateSpaceBase, Facet {
    function __CreateSpace_init() external onlyInitializing {
        _addInterface(type(ICreateSpace).interfaceId);
    }

    function createSpace(
        Action action,
        bytes calldata data
    ) external payable nonReentrant whenNotPaused returns (address) {
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        if (action == Action.CreateBasic) {
            // equivalent: abi.decode(data, (SpaceInfo))
            SpaceInfo calldata spaceInfo;
            assembly {
                // this is a variable length struct, so data.offset contains
                // the offset from data.offset at which the struct begins
                spaceInfo := add(data.offset, calldataload(data.offset))
            }
            return _createSpace(spaceInfo, spaceOptions);
        } else if (action == Action.CreateWithPrepay) {
            // equivalent: abi.decode(data, (CreateSpace))
            CreateSpace calldata spaceInfo;
            assembly {
                spaceInfo := add(data.offset, calldataload(data.offset))
            }
            return _createSpaceWithPrepay(spaceInfo, spaceOptions);
        } else if (action == Action.CreateWithOptions) {
            // equivalent: abi.decode(data, (CreateSpace, SpaceOptions))
            CreateSpace calldata spaceInfo;
            SpaceOptions calldata _spaceOptions;
            assembly {
                // data.offset contains the offset of spaceInfo
                // SpaceOptions is fixed length and starts at add(data.offset, 0x20)
                spaceInfo := add(data.offset, calldataload(data.offset))
                _spaceOptions := add(data.offset, 0x20)
            }
            return _createSpaceWithPrepay(spaceInfo, _spaceOptions);
        } else if (action == Action.CreateLegacy) {
            // equivalent: abi.decode(data, (CreateSpaceOld))
            CreateSpaceOld calldata spaceInfo;
            assembly {
                spaceInfo := add(data.offset, calldataload(data.offset))
            }
            return _createSpaceWithPrepayFromLegacy(spaceInfo, spaceOptions);
        } else {
            revert CreateSpaceFacet__InvalidAction();
        }
    }

    /// @inheritdoc ICreateSpace
    function createSpace(
        SpaceInfo calldata spaceInfo
    ) external nonReentrant whenNotPaused returns (address) {
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        return _createSpace(spaceInfo, spaceOptions);
    }

    /// @inheritdoc ICreateSpace
    function createSpaceV2(
        CreateSpace calldata spaceInfo,
        SpaceOptions calldata options
    ) external payable nonReentrant whenNotPaused returns (address) {
        return _createSpaceWithPrepay(spaceInfo, options);
    }

    /// @inheritdoc ICreateSpace
    function createSpaceWithPrepay(
        CreateSpace calldata spaceInfo
    ) external payable nonReentrant whenNotPaused returns (address) {
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        return _createSpaceWithPrepay(spaceInfo, spaceOptions);
    }

    /// @inheritdoc ICreateSpace
    function createSpaceWithPrepay(
        CreateSpaceOld calldata spaceInfo
    ) external payable nonReentrant whenNotPaused returns (address) {
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        return _createSpaceWithPrepayFromLegacy(spaceInfo, spaceOptions);
    }

    /// @inheritdoc ICreateSpace
    function getProxyInitializer() external view returns (address) {
        return _getProxyInitializer();
    }
}
