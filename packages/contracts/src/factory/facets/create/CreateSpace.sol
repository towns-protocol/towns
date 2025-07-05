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

    /// @inheritdoc ICreateSpace
    function createSpaceV2(
        CreateSpace memory spaceInfo,
        SpaceOptions memory options
    ) external payable nonReentrant whenNotPaused returns (address) {
        return CreateSpaceLib.createSpaceWithPrepay(spaceInfo, options);
    }

    /// @inheritdoc ICreateSpace
    function createSpace(
        SpaceInfo memory spaceInfo
    ) external nonReentrant whenNotPaused returns (address) {
        // Convert SpaceInfo to CreateSpace format (no prepay)
        CreateSpace memory createSpaceInfo = CreateSpace({
            metadata: Metadata({
                name: spaceInfo.name,
                uri: spaceInfo.uri,
                shortDescription: spaceInfo.shortDescription,
                longDescription: spaceInfo.longDescription
            }),
            membership: spaceInfo.membership,
            channel: spaceInfo.channel,
            prepay: Prepay({supply: 0}) // No prepay for basic createSpace
        });
        
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        
        // Route through unified createSpaceV2 entry point
        return createSpaceV2(createSpaceInfo, spaceOptions);
    }

    /// @inheritdoc ICreateSpace
    function createSpaceWithPrepay(
        CreateSpace memory spaceInfo
    ) external payable nonReentrant whenNotPaused returns (address) {
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        
        // Route through unified createSpaceV2 entry point
        return createSpaceV2(spaceInfo, spaceOptions);
    }

    /// @inheritdoc ICreateSpace
    function createSpaceWithPrepay(
        CreateSpaceOld memory spaceInfo
    ) external payable nonReentrant whenNotPaused returns (address) {
        // Convert legacy CreateSpaceOld to new CreateSpace format
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
        CreateSpace memory newSpaceInfo = CreateSpace({
            metadata: spaceInfo.metadata,
            membership: membership,
            channel: spaceInfo.channel,
            prepay: spaceInfo.prepay
        });
        
        SpaceOptions memory spaceOptions = SpaceOptions({to: msg.sender});
        
        // Route through unified createSpaceV2 entry point
        return createSpaceV2(newSpaceInfo, spaceOptions);
    }
}
