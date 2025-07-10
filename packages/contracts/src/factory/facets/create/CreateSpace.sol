// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ICreateSpace} from "src/factory/facets/create/ICreateSpace.sol";

// libraries
import {CreateSpaceLib} from "src/factory/facets/create/CreateSpaceLib.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {PausableBase} from "@towns-protocol/diamond/src/facets/pausable/PausableBase.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";

/// @title CreateSpaceFacet
/// @notice Facet for creating new spaces with various configurations
/// @dev Inherits from:
/// - ICreateSpace: Interface defining space creation methods
/// - PausableBase: Allows pausing of space creation functionality
/// - ReentrancyGuard: Prevents reentrancy attacks during space creation
/// - Facet: Base contract for diamond facets
contract CreateSpaceFacet is ICreateSpace, PausableBase, ReentrancyGuard, Facet {
    function __CreateSpace_init() external onlyInitializing {
        _addInterface(type(ICreateSpace).interfaceId);
    }

    function createSpace(
        Action action,
        bytes calldata data
    ) external payable nonReentrant whenNotPaused returns (address) {
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        if (action == Action.CreateBasic) {
            SpaceInfo memory spaceInfo = abi.decode(data, (SpaceInfo));
            return CreateSpaceLib.createSpace(spaceInfo, spaceOptions);
        } else if (action == Action.CreateWithPrepay) {
            CreateSpace memory spaceInfo = abi.decode(data, (CreateSpace));
            return CreateSpaceLib.createSpaceWithPrepay(spaceInfo, spaceOptions);
        } else if (action == Action.CreateWithOptions) {
            CreateSpace memory spaceInfo;
            (spaceInfo, spaceOptions) = abi.decode(data, (CreateSpace, SpaceOptions));
            return CreateSpaceLib.createSpaceWithPrepay(spaceInfo, spaceOptions);
        } else if (action == Action.CreateLegacy) {
            CreateSpaceOld memory spaceInfo = abi.decode(data, (CreateSpaceOld));
            CreateSpace memory newSpaceInfo = _convertLegacySpace(spaceInfo);
            return CreateSpaceLib.createSpaceWithPrepay(newSpaceInfo, spaceOptions);
        } else {
            revert CreateSpaceFacet__InvalidAction();
        }
    }

    /// @inheritdoc ICreateSpace
    function createSpace(
        SpaceInfo memory spaceInfo
    ) external nonReentrant whenNotPaused returns (address) {
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        return CreateSpaceLib.createSpace(spaceInfo, spaceOptions);
    }

    /// @inheritdoc ICreateSpace
    function createSpaceV2(
        CreateSpace memory spaceInfo,
        SpaceOptions memory options
    ) external payable nonReentrant whenNotPaused returns (address) {
        return CreateSpaceLib.createSpaceWithPrepay(spaceInfo, options);
    }

    /// @inheritdoc ICreateSpace
    function createSpaceWithPrepay(
        CreateSpace memory spaceInfo
    ) external payable nonReentrant whenNotPaused returns (address) {
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        return CreateSpaceLib.createSpaceWithPrepay(spaceInfo, spaceOptions);
    }

    /// @inheritdoc ICreateSpace
    function createSpaceWithPrepay(
        CreateSpaceOld memory spaceInfo
    ) external payable nonReentrant whenNotPaused returns (address) {
        CreateSpace memory newSpaceInfo = _convertLegacySpace(spaceInfo);
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        return CreateSpaceLib.createSpaceWithPrepay(newSpaceInfo, spaceOptions);
    }

    /// @dev Converts CreateSpaceOld format to CreateSpace format
    function _convertLegacySpace(
        CreateSpaceOld memory spaceInfo
    ) private pure returns (CreateSpace memory) {
        MembershipRequirements memory requirements = MembershipRequirements({
            everyone: spaceInfo.membership.requirements.everyone,
            users: spaceInfo.membership.requirements.users,
            ruleData: spaceInfo.membership.requirements.ruleData,
            syncEntitlements: false
        });
        Membership memory membership = Membership({
            settings: spaceInfo.membership.settings,
            requirements: requirements,
            permissions: spaceInfo.membership.permissions
        });
        return
            CreateSpace({
                metadata: spaceInfo.metadata,
                membership: membership,
                channel: spaceInfo.channel,
                prepay: spaceInfo.prepay
            });
    }
}
