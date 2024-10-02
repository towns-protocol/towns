// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "./IArchitect.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IRuleEntitlementV2} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IRoles, IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";
import {ITokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/ITokenOwnable.sol";
import {IManagedProxyBase} from "contracts/src/diamond/proxy/managed/IManagedProxy.sol";
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {ISpaceProxyInitializer} from "contracts/src/spaces/facets/proxy/ISpaceProxyInitializer.sol";
import {IPrepay} from "contracts/src/spaces/facets/prepay/IPrepay.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {Validator} from "contracts/src/utils/Validator.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ArchitectStorage} from "./ArchitectStorage.sol";
import {ImplementationStorage} from "./ImplementationStorage.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {Factory} from "contracts/src/utils/Factory.sol";
import {SpaceProxy} from "contracts/src/spaces/facets/proxy/SpaceProxy.sol";
import {PricingModulesBase} from "contracts/src/factory/facets/architect/pricing/PricingModulesBase.sol";
import {SpaceProxyInitializer} from "contracts/src/spaces/facets/proxy/SpaceProxyInitializer.sol";
// modules
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

abstract contract ArchitectBase is
  Factory,
  IArchitectBase,
  IRolesBase,
  PricingModulesBase
{
  using StringSet for StringSet.Set;
  using EnumerableSet for EnumerableSet.AddressSet;

  address internal constant EVERYONE_ADDRESS = address(1);
  string internal constant MINTER_ROLE = "Minter";
  bytes1 internal constant CHANNEL_PREFIX = 0x20;

  // =============================================================
  //                           Spaces
  // =============================================================
  function _getTokenIdBySpace(address space) internal view returns (uint256) {
    return ArchitectStorage.layout().tokenIdBySpace[space];
  }

  function _getSpaceByTokenId(uint256 tokenId) internal view returns (address) {
    return ArchitectStorage.layout().spaceByTokenId[tokenId];
  }

  function _createSpaceWithPrepay(
    CreateSpace memory createSpace
  ) internal returns (address spaceAddress) {
    SpaceInfo memory spaceInfo = SpaceInfo({
      name: createSpace.metadata.name,
      uri: createSpace.metadata.uri,
      shortDescription: createSpace.metadata.shortDescription,
      longDescription: createSpace.metadata.longDescription,
      membership: createSpace.membership,
      channel: createSpace.channel
    });

    spaceAddress = _createSpace(spaceInfo);

    if (createSpace.prepay.supply > 0) {
      IPrepay(spaceAddress).prepayMembership{value: msg.value}(
        createSpace.prepay.supply
      );
    }
  }

  function _createSpace(
    SpaceInfo memory spaceInfo
  ) internal returns (address spaceAddress) {
    ArchitectStorage.Layout storage ds = ArchitectStorage.layout();
    ImplementationStorage.Layout storage ims = ImplementationStorage.layout();

    // get the token id of the next space
    uint256 spaceTokenId = ims.spaceToken.nextTokenId();

    // deploy space
    spaceAddress = _deploySpace(spaceTokenId, spaceInfo.membership);

    // save space info to storage
    ds.spaceCount++;

    // save to mappings
    ds.spaceByTokenId[spaceTokenId] = spaceAddress;
    ds.tokenIdBySpace[spaceAddress] = spaceTokenId;

    // mint token to and transfer to Architect
    ims.spaceToken.mintSpace(
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
    if (spaceInfo.membership.requirements.everyone) {
      _createEveryoneEntitlement(
        spaceAddress,
        MINTER_ROLE,
        joinPermissions,
        userEntitlement
      );
    } else {
      _createEntitlementForRole(
        spaceAddress,
        MINTER_ROLE,
        joinPermissions,
        spaceInfo.membership.requirements,
        userEntitlement,
        ruleEntitlement
      );
    }

    uint256 memberRoleId;

    // if entitlement are synced, create a role with the membership requirements
    if (spaceInfo.membership.requirements.syncEntitlements) {
      memberRoleId = _createEntitlementForRole(
        spaceAddress,
        spaceInfo.membership.settings.name,
        spaceInfo.membership.permissions,
        spaceInfo.membership.requirements,
        userEntitlement,
        ruleEntitlement
      );
    } else {
      // else create a role with the everyone entitlement
      memberRoleId = _createEveryoneEntitlement(
        spaceAddress,
        spaceInfo.membership.settings.name,
        spaceInfo.membership.permissions,
        userEntitlement
      );
    }

    // create default channel
    _createDefaultChannel(spaceAddress, memberRoleId, spaceInfo.channel);

    // transfer nft to sender
    IERC721A(address(ims.spaceToken)).safeTransferFrom(
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

  function _setImplementations(
    ISpaceOwner spaceToken,
    IUserEntitlement userEntitlement,
    IRuleEntitlementV2 ruleEntitlement,
    IRuleEntitlement legacyRuleEntitlement
  ) internal {
    if (address(spaceToken).code.length == 0) revert Architect__NotContract();
    if (address(userEntitlement).code.length == 0)
      revert Architect__NotContract();
    if (address(ruleEntitlement).code.length == 0)
      revert Architect__NotContract();

    ImplementationStorage.Layout storage ds = ImplementationStorage.layout();
    ds.spaceToken = spaceToken;
    ds.userEntitlement = userEntitlement;
    ds.ruleEntitlement = ruleEntitlement;
    ds.legacyRuleEntitlement = legacyRuleEntitlement;
  }

  function _getImplementations()
    internal
    view
    returns (
      ISpaceOwner spaceToken,
      IUserEntitlement userEntitlementImplementation,
      IRuleEntitlementV2 ruleEntitlementImplementation,
      IRuleEntitlement legacyRuleEntitlement
    )
  {
    ImplementationStorage.Layout storage ds = ImplementationStorage.layout();

    return (
      ds.spaceToken,
      ds.userEntitlement,
      ds.ruleEntitlement,
      ds.legacyRuleEntitlement
    );
  }

  // =============================================================
  //                         Proxy Initializer
  // =============================================================
  function _getProxyInitializer()
    internal
    view
    returns (ISpaceProxyInitializer)
  {
    return ImplementationStorage.layout().proxyInitializer;
  }

  function _setProxyInitializer(
    ISpaceProxyInitializer proxyInitializer
  ) internal {
    ImplementationStorage.Layout storage ds = ImplementationStorage.layout();
    ds.proxyInitializer = proxyInitializer;

    emit Architect__ProxyInitializerSet(address(proxyInitializer));
  }

  // =============================================================

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

    bytes32 defaultChannelId = bytes32(
      bytes.concat(CHANNEL_PREFIX, bytes20(space))
    );

    IChannel(space).createChannel(
      defaultChannelId,
      channelInfo.metadata,
      roleIds
    );
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

    if (userReqsLen > 0) {
      ++entitlementCount;
    }

    if (ruleReqsLen > 0) {
      ++entitlementCount;
    }

    CreateEntitlement[] memory entitlements = new CreateEntitlement[](
      entitlementCount
    );

    uint256 entitlementIndex;

    if (userReqsLen != 0) {
      // validate users
      for (uint256 i; i < userReqsLen; ++i) {
        Validator.checkAddress(requirements.users[i]);
      }

      entitlements[entitlementIndex++] = CreateEntitlement({
        module: userEntitlement,
        data: abi.encode(requirements.users)
      });
    }

    if (ruleReqsLen > 0) {
      entitlements[entitlementIndex++] = CreateEntitlement({
        module: ruleEntitlement,
        data: requirements.ruleData
      });
    }

    roleId = _createRoleWithEntitlements(
      spaceAddress,
      roleName,
      permissions,
      entitlements
    );
  }

  function _createEveryoneEntitlement(
    address spaceAddress,
    string memory roleName,
    string[] memory permissions,
    IUserEntitlement userEntitlement
  ) internal returns (uint256 roleId) {
    address[] memory users = new address[](1);
    users[0] = EVERYONE_ADDRESS;

    CreateEntitlement[] memory entitlements = new CreateEntitlement[](1);
    entitlements[0].module = userEntitlement;
    entitlements[0].data = abi.encode(users);

    roleId = _createRoleWithEntitlements(
      spaceAddress,
      roleName,
      permissions,
      entitlements
    );
  }

  function _createRoleWithEntitlements(
    address spaceAddress,
    string memory roleName,
    string[] memory permissions,
    CreateEntitlement[] memory entitlements
  ) internal returns (uint256 roleId) {
    return IRoles(spaceAddress).createRole(roleName, permissions, entitlements);
  }

  // =============================================================
  //                      Deployment Helpers
  // =============================================================

  function _deploySpace(
    uint256 spaceTokenId,
    Membership memory membership
  ) internal returns (address space) {
    // get deployment info
    (bytes memory initCode, bytes32 salt) = _getSpaceDeploymentInfo(
      spaceTokenId,
      membership
    );
    return _deploy(initCode, salt);
  }

  function _deployEntitlement(
    IEntitlement entitlement,
    address spaceAddress
  ) internal returns (address) {
    // calculate init code
    bytes memory initCode = abi.encodePacked(
      type(ERC1967Proxy).creationCode,
      abi.encode(
        entitlement,
        abi.encodeCall(IEntitlement.initialize, (spaceAddress))
      )
    );

    return _deploy(initCode);
  }

  function _verifyPricingModule(address pricingModule) internal view {
    if (pricingModule == address(0) || !_isPricingModule(pricingModule)) {
      revert Architect__InvalidPricingModule();
    }
  }

  function _getSpaceDeploymentInfo(
    uint256 spaceTokenId,
    Membership memory membership
  ) internal view returns (bytes memory initCode, bytes32 salt) {
    _verifyPricingModule(membership.settings.pricingModule);

    address spaceToken = address(ImplementationStorage.layout().spaceToken);

    // calculate salt
    salt = keccak256(abi.encode(msg.sender, spaceTokenId, block.timestamp));

    IMembershipBase.Membership memory membershipSettings = membership.settings;
    if (membershipSettings.feeRecipient == address(0)) {
      membershipSettings.feeRecipient = msg.sender;
    }

    address proxyInitializer = address(
      ImplementationStorage.layout().proxyInitializer
    );

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
              collection: spaceToken,
              tokenId: spaceTokenId
            }),
            membershipSettings
          )
        )
      )
    );
  }
}
