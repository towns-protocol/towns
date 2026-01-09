// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ILegacyArchitectBase} from "./IMockLegacyArchitect.sol";
import {ITokenOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/token/ITokenOwnable.sol";
import {IManagedProxyBase} from "@towns-protocol/diamond/src/proxy/managed/IManagedProxy.sol";
import {IProxyManager} from "@towns-protocol/diamond/src/proxy/manager/IProxyManager.sol";
import {IERC721A} from "src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IEntitlement} from "src/spaces/entitlements/IEntitlement.sol";
import {IRuleEntitlement} from "src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IUserEntitlement} from "src/spaces/entitlements/user/IUserEntitlement.sol";
import {IChannel} from "src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IMembershipBase} from "src/spaces/facets/membership/IMembership.sol";
import {IRoles, IRolesBase} from "src/spaces/facets/roles/IRoles.sol";

// libraries
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ArchitectStorage} from "src/factory/facets/architect/ArchitectStorage.sol";
import {ImplementationStorage} from "src/factory/facets/architect/ImplementationStorage.sol";
import {Permissions} from "src/spaces/facets/Permissions.sol";
import {StringSet} from "src/utils/libraries/StringSet.sol";
import {Validator} from "src/utils/libraries/Validator.sol";

// contracts
import {SpaceProxy} from "src/spaces/facets/proxy/SpaceProxy.sol";
import {SpaceProxyInitializer} from "src/spaces/facets/proxy/SpaceProxyInitializer.sol";
import {Factory} from "src/utils/libraries/Factory.sol";

// modules
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

abstract contract LegacyArchitectBase is ILegacyArchitectBase {
    using StringSet for StringSet.Set;
    using EnumerableSet for EnumerableSet.AddressSet;

    address internal constant EVERYONE_ADDRESS = address(1);
    string internal constant MINTER_ROLE = "Minter";
    bytes1 internal constant CHANNEL_PREFIX = 0x20;

    bytes32 private constant PROXY_INITIALIZER_INIT_CODE_HASH =
        keccak256(type(SpaceProxyInitializer).creationCode);
    bytes32 private constant PROXY_INITIALIZER_SALT = 0;

    /// @dev Deploys SpaceProxyInitializer via CREATE2 if not already deployed
    function _getOrDeployProxyInitializer() internal returns (address) {
        address computed = Factory.calculateDeploymentAddress(
            PROXY_INITIALIZER_INIT_CODE_HASH,
            PROXY_INITIALIZER_SALT
        );

        if (computed.code.length > 0) {
            return computed;
        }

        return Factory.deploy(type(SpaceProxyInitializer).creationCode, PROXY_INITIALIZER_SALT);
    }

    // =============================================================
    //                           Spaces
    // =============================================================
    function _getTokenIdBySpace(address space) internal view returns (uint256) {
        return ArchitectStorage.layout().tokenIdBySpace[space];
    }

    function _getSpaceByTokenId(uint256 tokenId) internal view returns (address) {
        return ArchitectStorage.layout().spaceByTokenId[tokenId];
    }

    function _createSpace(SpaceInfo memory spaceInfo) internal returns (address spaceAddress) {
        ArchitectStorage.Layout storage ds = ArchitectStorage.layout();
        ImplementationStorage.Layout storage ims = ImplementationStorage.getStorage();

        // get the token id of the next space
        uint256 spaceTokenId = ims.spaceOwnerToken.nextTokenId();

        // deploy space
        spaceAddress = _deploySpace(spaceTokenId, spaceInfo.membership);

        // save space info to storage
        ds.spaceCount++;

        // save to mappings
        ds.spaceByTokenId[spaceTokenId] = spaceAddress;
        ds.tokenIdBySpace[spaceAddress] = spaceTokenId;

        // mint token to and transfer to Architect
        ims.spaceOwnerToken.mintSpace(
            spaceInfo.name,
            spaceInfo.uri,
            spaceAddress,
            spaceInfo.shortDescription,
            spaceInfo.longDescription
        );

        // deploy user entitlement
        IUserEntitlement userEntitlement = IUserEntitlement(
            _deployEntitlement(ims.userEntitlement, spaceAddress)
        );

        // deploy token entitlement
        IRuleEntitlement ruleEntitlement = IRuleEntitlement(
            _deployEntitlement(ims.legacyRuleEntitlement, spaceAddress)
        );

        address[] memory entitlements = new address[](2);
        entitlements[0] = address(userEntitlement);
        entitlements[1] = address(ruleEntitlement);

        // set entitlements as immutable
        IEntitlementsManager(spaceAddress).addImmutableEntitlements(entitlements);

        // create minter role with requirements
        _createMinterEntitlement(
            spaceAddress,
            userEntitlement,
            ruleEntitlement,
            spaceInfo.membership.requirements
        );

        // create member role with membership as the requirement
        uint256 memberRoleId = _createMemberEntitlement(
            spaceAddress,
            spaceInfo.membership.settings.name,
            spaceInfo.membership.permissions,
            userEntitlement
        );

        // create default channel
        _createDefaultChannel(spaceAddress, memberRoleId, spaceInfo.channel);

        // transfer nft to sender
        IERC721A(address(ims.spaceOwnerToken)).safeTransferFrom(
            address(this),
            msg.sender,
            spaceTokenId
        );

        // emit event
        emit SpaceCreated(msg.sender, spaceTokenId, spaceAddress);
    }

    // =============================================================
    //                           Implementations
    // =============================================================

    function _setLegacyRuleEntitlement(IRuleEntitlement entitlement) internal {
        ImplementationStorage.Layout storage ds = ImplementationStorage.getStorage();
        ds.legacyRuleEntitlement = entitlement;
    }

    // =============================================================
    //                  Internal Channel Helpers
    // =============================================================

    function _createDefaultChannel(
        address space,
        uint256 roleId,
        ChannelInfo memory channelInfo
    ) internal {
        uint256[] memory roleIds = new uint256[](1);
        roleIds[0] = roleId;

        bytes32 defaultChannelId = bytes32(bytes.concat(CHANNEL_PREFIX, bytes20(space)));

        IChannel(space).createChannel(defaultChannelId, channelInfo.metadata, roleIds);
    }

    // =============================================================
    //                  Internal Entitlement Helpers
    // =============================================================

    function _createMinterEntitlement(
        address spaceAddress,
        IUserEntitlement userEntitlement,
        IRuleEntitlement ruleEntitlement,
        MembershipRequirements memory requirements
    ) internal returns (uint256 roleId) {
        string[] memory joinPermissions = new string[](1);
        joinPermissions[0] = Permissions.JoinSpace;

        roleId = IRoles(spaceAddress).createRole(
            MINTER_ROLE,
            joinPermissions,
            new IRolesBase.CreateEntitlement[](0)
        );

        if (requirements.everyone) {
            address[] memory users = new address[](1);
            users[0] = EVERYONE_ADDRESS;

            IRoles(spaceAddress).addRoleToEntitlement(
                roleId,
                IRolesBase.CreateEntitlement({module: userEntitlement, data: abi.encode(users)})
            );
        } else {
            if (requirements.users.length != 0) {
                // validate users
                for (uint256 i = 0; i < requirements.users.length; ) {
                    Validator.checkAddress(requirements.users[i]);
                    unchecked {
                        i++;
                    }
                }

                IRoles(spaceAddress).addRoleToEntitlement(
                    roleId,
                    IRolesBase.CreateEntitlement({
                        module: userEntitlement,
                        data: abi.encode(requirements.users)
                    })
                );
            }

            if (requirements.ruleData.operations.length > 0) {
                IRoles(spaceAddress).addRoleToEntitlement(
                    roleId,
                    IRolesBase.CreateEntitlement({
                        module: ruleEntitlement,
                        data: abi.encode(requirements.ruleData)
                    })
                );
            }
        }
        return roleId;
    }

    function _createMemberEntitlement(
        address spaceAddress,
        string memory memberName,
        string[] memory memberPermissions,
        IUserEntitlement userEntitlement
    ) internal returns (uint256 roleId) {
        address[] memory users = new address[](1);
        users[0] = EVERYONE_ADDRESS;

        IRolesBase.CreateEntitlement[] memory entitlements = new IRolesBase.CreateEntitlement[](1);
        entitlements[0].module = userEntitlement;
        entitlements[0].data = abi.encode(users);

        roleId = IRoles(spaceAddress).createRole(memberName, memberPermissions, entitlements);
    }

    // =============================================================
    //                      Deployment Helpers
    // =============================================================

    function _deploySpace(
        uint256 spaceTokenId,
        Membership memory membership
    ) internal returns (address space) {
        // get deployment info
        (bytes memory initCode, bytes32 salt) = _getSpaceDeploymentInfo(spaceTokenId, membership);
        return Factory.deploy(initCode, salt);
    }

    function _deployEntitlement(
        IEntitlement entitlement,
        address spaceAddress
    ) internal returns (address) {
        // calculate init code
        bytes memory initCode = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(entitlement, abi.encodeCall(IEntitlement.initialize, (spaceAddress)))
        );

        return Factory.deploy(initCode);
    }

    function _getSpaceDeploymentInfo(
        uint256 spaceTokenId,
        Membership memory membership
    ) internal returns (bytes memory initCode, bytes32 salt) {
        ImplementationStorage.Layout storage ds = ImplementationStorage.getStorage();

        // calculate salt
        salt = keccak256(abi.encode(msg.sender, spaceTokenId, block.timestamp));

        IMembershipBase.Membership memory membershipSettings = membership.settings;
        if (membershipSettings.feeRecipient == address(0)) {
            membershipSettings.feeRecipient = msg.sender;
        }

        address proxyInitializer = _getOrDeployProxyInitializer();

        // calculate init code
        initCode = abi.encodePacked(
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
                        msg.sender,
                        address(this),
                        ITokenOwnableBase.TokenOwnable({
                            collection: address(ds.spaceOwnerToken),
                            tokenId: spaceTokenId
                        }),
                        membershipSettings
                    )
                )
            )
        );
    }
}
