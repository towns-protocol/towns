// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/ITokenOwnable.sol";
import {IManagedProxyBase} from "@towns-protocol/diamond/src/proxy/managed/IManagedProxy.sol";
import {IProxyManager} from "@towns-protocol/diamond/src/proxy/manager/IProxyManager.sol";
import {IERC721A} from "../../../diamond/facets/token/ERC721A/IERC721A.sol";
import {IEntitlement} from "../../../spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlement} from "../../../spaces/entitlements/rule/IRuleEntitlement.sol";
import {IUserEntitlement} from "../../../spaces/entitlements/user/IUserEntitlement.sol";
import {IChannel} from "../../../spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "../../../spaces/facets/entitlements/IEntitlementsManager.sol";
import {IMembershipBase} from "../../../spaces/facets/membership/IMembership.sol";
import {IRoles, IRolesBase} from "../../../spaces/facets/roles/IRoles.sol";
import {IArchitectBase} from "../architect/IArchitect.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Permissions} from "../../../spaces/facets/Permissions.sol";
import {Factory} from "../../../utils/libraries/Factory.sol";
import {StringSet} from "../../../utils/libraries/StringSet.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";
import {PricingModulesBase} from "../architect/pricing/PricingModulesBase.sol";
import {ArchitectStorage} from "../architect/ArchitectStorage.sol";
import {ImplementationStorage} from "../architect/ImplementationStorage.sol";

// contracts
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {SpaceProxy} from "../../../spaces/facets/proxy/SpaceProxy.sol";
import {SpaceProxyInitializer} from "../../../spaces/facets/proxy/SpaceProxyInitializer.sol";

abstract contract CreateSpaceBase is IArchitectBase {
    using StringSet for StringSet.Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    address internal constant EVERYONE_ADDRESS = address(1);
    string internal constant MINTER_ROLE = "Minter";
    bytes1 internal constant CHANNEL_PREFIX = 0x20;

    function _createSpaceWithPrepay(
        CreateSpace calldata space,
        SpaceOptions memory spaceOptions
    ) internal returns (address spaceAddress) {
        if (msg.value > 0) revert Architect__UnexpectedETH();
        Validator.checkAddress(space.membership.settings.pricingModule);
        Validator.checkAddress(spaceOptions.to);

        spaceAddress = _createSpaceCore(
            space.metadata,
            space.membership.settings,
            space.membership.permissions,
            space.membership.requirements,
            space.channel,
            spaceOptions
        );
    }

    /// @dev Converts legacy CreateSpaceOld format and creates space
    function _createSpaceWithPrepayFromLegacy(
        CreateSpaceOld calldata space,
        SpaceOptions memory spaceOptions
    ) internal returns (address spaceAddress) {
        if (msg.value > 0) revert Architect__UnexpectedETH();
        Validator.checkAddress(space.membership.settings.pricingModule);
        Validator.checkAddress(spaceOptions.to);

        // Convert legacy format to new format (syncEntitlements = false for legacy)
        MembershipRequirements memory requirements = MembershipRequirements({
            everyone: space.membership.requirements.everyone,
            users: space.membership.requirements.users,
            ruleData: space.membership.requirements.ruleData,
            syncEntitlements: false
        });

        spaceAddress = _createSpaceCore(
            space.metadata,
            space.membership.settings,
            space.membership.permissions,
            requirements,
            space.channel,
            spaceOptions
        );
    }

    function _createSpace(
        SpaceInfo calldata spaceInfo,
        SpaceOptions memory spaceOptions
    ) internal returns (address) {
        Metadata calldata metadata;
        assembly {
            metadata := spaceInfo
        }

        return
            _createSpaceCore(
                metadata,
                spaceInfo.membership.settings,
                spaceInfo.membership.permissions,
                spaceInfo.membership.requirements,
                spaceInfo.channel,
                spaceOptions
            );
    }

    // =============================================================
    //                  Internal Channel Helpers
    // =============================================================

    function _createDefaultChannel(
        address space,
        uint256 roleId,
        ChannelInfo calldata channelInfo
    ) internal {
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = roleId;

        bytes32 defaultChannelId = bytes32(bytes.concat(CHANNEL_PREFIX, bytes20(space)));

        IChannel(space).createChannel(defaultChannelId, channelInfo.metadata, roleIds);
    }

    // =============================================================
    //                  Internal Entitlement Helpers
    // =============================================================

    function _createEntitlementForRole(
        address spaceAddress,
        string memory roleName,
        string[] memory permissions,
        MembershipRequirements memory requirements,
        IUserEntitlement userEntitlement,
        IRuleEntitlement ruleEntitlement
    ) internal returns (uint256 roleId) {
        uint256 entitlementCount = 0;
        uint256 userReqsLen = requirements.users.length;
        uint256 ruleReqsLen = requirements.ruleData.length;

        if (userReqsLen > 0) ++entitlementCount;

        if (ruleReqsLen > 0) ++entitlementCount;

        IRolesBase.CreateEntitlement[] memory entitlements = new IRolesBase.CreateEntitlement[](
            entitlementCount
        );

        uint256 entitlementIndex;

        if (userReqsLen != 0) {
            // validate users
            for (uint256 i; i < userReqsLen; ++i) {
                Validator.checkAddress(requirements.users[i]);
            }

            entitlements[entitlementIndex++] = IRolesBase.CreateEntitlement({
                module: userEntitlement,
                data: abi.encode(requirements.users)
            });
        }

        if (ruleReqsLen > 0) {
            entitlements[entitlementIndex++] = IRolesBase.CreateEntitlement({
                module: ruleEntitlement,
                data: requirements.ruleData
            });
        }

        roleId = _createRoleWithEntitlements(spaceAddress, roleName, permissions, entitlements);
    }

    function _createEveryoneEntitlement(
        address spaceAddress,
        string memory roleName,
        string[] memory permissions,
        IUserEntitlement userEntitlement
    ) internal returns (uint256 roleId) {
        address[] memory users = new address[](1);
        users[0] = EVERYONE_ADDRESS;

        IRolesBase.CreateEntitlement[] memory entitlements = new IRolesBase.CreateEntitlement[](1);
        entitlements[0].module = userEntitlement;
        entitlements[0].data = abi.encode(users);

        roleId = _createRoleWithEntitlements(spaceAddress, roleName, permissions, entitlements);
    }

    function _createRoleWithEntitlements(
        address spaceAddress,
        string memory roleName,
        string[] memory permissions,
        IRolesBase.CreateEntitlement[] memory entitlements
    ) internal returns (uint256 roleId) {
        return IRoles(spaceAddress).createRole(roleName, permissions, entitlements);
    }

    // =============================================================
    //                      Deployment Helpers
    // =============================================================

    function _deploySpace(
        uint256 spaceTokenId,
        Metadata calldata metadata,
        IMembershipBase.Membership calldata membershipSettings,
        SpaceOptions memory spaceOptions
    ) internal returns (address spaceAddress) {
        {
            // get deployment info
            (bytes memory initCode, bytes32 salt) = _getSpaceDeploymentInfo(
                spaceTokenId,
                membershipSettings,
                spaceOptions
            );
            spaceAddress = Factory.deploy(initCode, salt);
        }
        {
            ArchitectStorage.Layout storage ds = ArchitectStorage.layout();
            // save space info to storage
            unchecked {
                ++ds.spaceCount;
            }

            // save to mappings
            ds.spaceByTokenId[spaceTokenId] = spaceAddress;
            ds.tokenIdBySpace[spaceAddress] = spaceTokenId;
        }
        // mint token to and transfer to Architect
        ImplementationStorage.Layout storage ims = ImplementationStorage.layout();
        ims.spaceOwnerToken.mintSpace(
            metadata.name,
            metadata.uri,
            spaceAddress,
            metadata.shortDescription,
            metadata.longDescription
        );
    }

    function _deployEntitlement(
        IEntitlement entitlement,
        address spaceAddress
    ) internal returns (address) {
        // calculate init code
        bytes memory initCode = bytes.concat(
            type(ERC1967Proxy).creationCode,
            abi.encode(entitlement, abi.encodeCall(IEntitlement.initialize, (spaceAddress)))
        );

        return Factory.deploy(initCode);
    }

    function _verifyPricingModule(address pricingModule) internal view {
        if (pricingModule == address(0) || !PricingModulesBase.isPricingModule(pricingModule)) {
            revert Architect__InvalidPricingModule();
        }
    }

    function _getSpaceDeploymentInfo(
        uint256 spaceTokenId,
        IMembershipBase.Membership calldata membershipSettings,
        SpaceOptions memory spaceOptions
    ) internal view returns (bytes memory initCode, bytes32 salt) {
        _verifyPricingModule(membershipSettings.pricingModule);

        address spaceOwnerNFT = address(ImplementationStorage.layout().spaceOwnerToken);

        // calculate salt
        salt = keccak256(abi.encode(spaceTokenId, block.timestamp, block.number, spaceOwnerNFT));

        address proxyInitializer = address(ImplementationStorage.layout().proxyInitializer);

        // calculate init code
        initCode = bytes.concat(
            type(SpaceProxy).creationCode,
            abi.encode(
                IManagedProxyBase.ManagedProxy({
                    managerSelector: IProxyManager.getImplementation.selector,
                    manager: address(this)
                }),
                proxyInitializer,
                abi.encodeCall(
                    SpaceProxyInitializer.initialize,
                    (
                        spaceOptions.to,
                        address(this),
                        ITokenOwnableBase.TokenOwnable({
                            collection: spaceOwnerNFT,
                            tokenId: spaceTokenId
                        }),
                        membershipSettings
                    )
                )
            )
        );
    }

    // =============================================================
    //                      Private Helpers
    // =============================================================

    function _createSpaceCore(
        Metadata calldata metadata,
        IMembershipBase.Membership calldata settings,
        string[] calldata permissions,
        MembershipRequirements memory requirements,
        ChannelInfo calldata channel,
        SpaceOptions memory spaceOptions
    ) private returns (address spaceAddress) {
        ImplementationStorage.Layout storage ims = ImplementationStorage.layout();

        // get the token id of the next space
        uint256 spaceTokenId = ims.spaceOwnerToken.nextTokenId();

        // deploy space
        spaceAddress = _deploySpace(spaceTokenId, metadata, settings, spaceOptions);

        // deploy user entitlement
        IUserEntitlement userEntitlement = IUserEntitlement(
            _deployEntitlement(ims.userEntitlement, spaceAddress)
        );

        // deploy token entitlement
        IRuleEntitlement ruleEntitlement = IRuleEntitlement(
            _deployEntitlement(ims.ruleEntitlement, spaceAddress)
        );

        address[] memory entitlements = new address[](2);
        entitlements[0] = address(userEntitlement);
        entitlements[1] = address(ruleEntitlement);

        // set entitlements as immutable
        IEntitlementsManager(spaceAddress).addImmutableEntitlements(entitlements);

        // create minter role with requirements
        string[] memory joinPermissions = new string[](1);
        joinPermissions[0] = Permissions.JoinSpace;
        if (requirements.everyone) {
            _createEveryoneEntitlement(spaceAddress, MINTER_ROLE, joinPermissions, userEntitlement);
        } else {
            _createEntitlementForRole(
                spaceAddress,
                MINTER_ROLE,
                joinPermissions,
                requirements,
                userEntitlement,
                ruleEntitlement
            );
        }

        uint256 memberRoleId;

        // if entitlement are synced, create a role with the membership requirements
        if (requirements.syncEntitlements) {
            memberRoleId = _createEntitlementForRole(
                spaceAddress,
                settings.name,
                permissions,
                requirements,
                userEntitlement,
                ruleEntitlement
            );
        } else {
            // else create a role with the everyone entitlement
            memberRoleId = _createEveryoneEntitlement(
                spaceAddress,
                settings.name,
                permissions,
                userEntitlement
            );
        }

        // create default channel
        _createDefaultChannel(spaceAddress, memberRoleId, channel);

        // transfer nft to sender
        IERC721A(address(ims.spaceOwnerToken)).safeTransferFrom(
            address(this),
            spaceOptions.to,
            spaceTokenId
        );

        // emit event
        emit SpaceCreated(spaceOptions.to, spaceTokenId, spaceAddress);
    }
}
