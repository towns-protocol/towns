// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IRuleEntitlement, IRuleEntitlementV2} from "../../../spaces/entitlements/rule/IRuleEntitlement.sol";
import {IUserEntitlement} from "../../../spaces/entitlements/user/IUserEntitlement.sol";
import {IMembershipBase} from "../../../spaces/facets/membership/IMembership.sol";
import {ISpaceOwner} from "../../../spaces/facets/owner/ISpaceOwner.sol";

interface IArchitectBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STRUCTS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    struct MembershipRequirementsOld {
        bool everyone;
        address[] users;
        bytes ruleData;
    }

    struct MembershipOld {
        IMembershipBase.Membership settings;
        MembershipRequirementsOld requirements;
        string[] permissions;
    }

    struct CreateSpaceOld {
        Metadata metadata;
        MembershipOld membership;
        ChannelInfo channel;
        Prepay prepay;
    }

    struct SpaceInfo {
        string name;
        string uri;
        string shortDescription;
        string longDescription;
        Membership membership;
        ChannelInfo channel;
    }

    struct MembershipRequirements {
        bool everyone;
        address[] users;
        bytes ruleData;
        bool syncEntitlements;
    }

    struct Metadata {
        string name;
        string uri;
        string shortDescription;
        string longDescription;
    }

    struct Membership {
        IMembershipBase.Membership settings;
        MembershipRequirements requirements;
        string[] permissions;
    }

    struct ChannelInfo {
        string metadata;
    }

    struct Prepay {
        uint256 supply;
    }

    struct CreateSpace {
        Metadata metadata;
        Membership membership;
        ChannelInfo channel;
        Prepay prepay;
    }

    /// @notice Options for creating a space
    /// @param to Address that will receive the space NFT (defaults to msg.sender if not specified)
    struct SpaceOptions {
        address to;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event SpaceCreated(address indexed owner, uint256 indexed tokenId, address indexed space);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error Architect__NotContract();
    error Architect__InvalidPricingModule();
    error Architect__UnexpectedETH();
}

interface IArchitect is IArchitectBase {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           REGISTRY                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function getSpaceByTokenId(uint256 tokenId) external view returns (address space);

    function getTokenIdBySpace(address space) external view returns (uint256);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      IMPLEMENTATIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function setSpaceArchitectImplementations(
        ISpaceOwner ownerTokenImplementation,
        IUserEntitlement userEntitlementImplementation,
        IRuleEntitlementV2 ruleEntitlementImplementation,
        IRuleEntitlement legacyRuleEntitlement
    ) external;

    function getSpaceArchitectImplementations()
        external
        view
        returns (
            ISpaceOwner ownerTokenImplementation,
            IUserEntitlement userEntitlementImplementation,
            IRuleEntitlementV2 ruleEntitlementImplementation,
            IRuleEntitlement legacyRuleEntitlement
        );
}
