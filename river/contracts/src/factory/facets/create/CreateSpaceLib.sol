// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IRoles, IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IProxyManager} from "@river-build/diamond/src/proxy/manager/IProxyManager.sol";
import {ITokenOwnableBase} from "@river-build/diamond/src/facets/ownable/token/ITokenOwnable.sol";
import {IManagedProxyBase} from "@river-build/diamond/src/proxy/managed/IManagedProxy.sol";
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IPrepay} from "contracts/src/spaces/facets/prepay/IPrepay.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";

// libraries
import {Validator} from "contracts/src/utils/Validator.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ArchitectStorage} from "contracts/src/factory/facets/architect/ArchitectStorage.sol";
import {ImplementationStorage} from "contracts/src/factory/facets/architect/ImplementationStorage.sol";

// contracts
import {SpaceProxy} from "contracts/src/spaces/facets/proxy/SpaceProxy.sol";
import {PricingModulesBase} from "contracts/src/factory/facets/architect/pricing/PricingModulesBase.sol";
import {SpaceProxyInitializer} from "contracts/src/spaces/facets/proxy/SpaceProxyInitializer.sol";
import {Factory} from "contracts/src/utils/Factory.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

library CreateSpaceLib {
  using StringSet for StringSet.Set;
  using EnumerableSet for EnumerableSet.AddressSet;

  address internal constant EVERYONE_ADDRESS = address(1);
  string internal constant MINTER_ROLE = "Minter";
  bytes1 internal constant CHANNEL_PREFIX = 0x20;

  function createSpaceWithPrepay(
    IArchitectBase.CreateSpace memory space,
    IArchitectBase.SpaceOptions memory spaceOptions
  ) internal returns (address spaceAddress) {
    Validator.checkAddress(space.membership.settings.pricingModule);
    Validator.checkAddress(spaceOptions.to);

    IArchitectBase.SpaceInfo memory spaceInfo = IArchitectBase.SpaceInfo({
      name: space.metadata.name,
      uri: space.metadata.uri,
      shortDescription: space.metadata.shortDescription,
      longDescription: space.metadata.longDescription,
      membership: space.membership,
      channel: space.channel
    });

    spaceAddress = createSpace(spaceInfo, spaceOptions);

    if (space.prepay.supply > 0) {
      IPrepay(spaceAddress).prepayMembership{value: msg.value}(
        space.prepay.supply
      );
    }
  }

  function createSpace(
    IArchitectBase.SpaceInfo memory spaceInfo,
    IArchitectBase.SpaceOptions memory spaceOptions
  ) internal returns (address spaceAddress) {
    ArchitectStorage.Layout storage ds = ArchitectStorage.layout();
    ImplementationStorage.Layout storage ims = ImplementationStorage.layout();

    // get the token id of the next space
    uint256 spaceTokenId = ims.spaceOwnerToken.nextTokenId();

    // deploy space
    spaceAddress = deploySpace(spaceTokenId, spaceInfo.membership);

    // save space info to storage
    unchecked {
      ds.spaceCount++;
    }

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
      deployEntitlement(ims.userEntitlement, spaceAddress)
    );

    // deploy token entitlement
    IRuleEntitlement ruleEntitlement = IRuleEntitlement(
      deployEntitlement(ims.ruleEntitlement, spaceAddress)
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
      createEveryoneEntitlement(
        spaceAddress,
        MINTER_ROLE,
        joinPermissions,
        userEntitlement
      );
    } else {
      createEntitlementForRole(
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
      memberRoleId = createEntitlementForRole(
        spaceAddress,
        spaceInfo.membership.settings.name,
        spaceInfo.membership.permissions,
        spaceInfo.membership.requirements,
        userEntitlement,
        ruleEntitlement
      );
    } else {
      // else create a role with the everyone entitlement
      memberRoleId = createEveryoneEntitlement(
        spaceAddress,
        spaceInfo.membership.settings.name,
        spaceInfo.membership.permissions,
        userEntitlement
      );
    }

    // create default channel
    createDefaultChannel(spaceAddress, memberRoleId, spaceInfo.channel);

    // transfer nft to sender
    IERC721A(address(ims.spaceOwnerToken)).safeTransferFrom(
      address(this),
      spaceOptions.to,
      spaceTokenId
    );

    // emit event
    emit IArchitectBase.SpaceCreated(
      spaceOptions.to,
      spaceTokenId,
      spaceAddress
    );
  }
  // =============================================================
  //                  Internal Channel Helpers
  // =============================================================

  function createDefaultChannel(
    address space,
    uint256 roleId,
    IArchitectBase.ChannelInfo memory channelInfo
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
  function createEntitlementForRole(
    address spaceAddress,
    string memory roleName,
    string[] memory permissions,
    IArchitectBase.MembershipRequirements memory requirements,
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

    IRolesBase.CreateEntitlement[]
      memory entitlements = new IRolesBase.CreateEntitlement[](
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

    roleId = createRoleWithEntitlements(
      spaceAddress,
      roleName,
      permissions,
      entitlements
    );
  }

  function createEveryoneEntitlement(
    address spaceAddress,
    string memory roleName,
    string[] memory permissions,
    IUserEntitlement userEntitlement
  ) internal returns (uint256 roleId) {
    address[] memory users = new address[](1);
    users[0] = EVERYONE_ADDRESS;

    IRolesBase.CreateEntitlement[]
      memory entitlements = new IRolesBase.CreateEntitlement[](1);
    entitlements[0].module = userEntitlement;
    entitlements[0].data = abi.encode(users);

    roleId = createRoleWithEntitlements(
      spaceAddress,
      roleName,
      permissions,
      entitlements
    );
  }

  function createRoleWithEntitlements(
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

  function deploySpace(
    uint256 spaceTokenId,
    IArchitectBase.Membership memory membership
  ) internal returns (address space) {
    // get deployment info
    (bytes memory initCode, bytes32 salt) = getSpaceDeploymentInfo(
      spaceTokenId,
      membership
    );
    return Factory.deploy(initCode, salt);
  }

  function deployEntitlement(
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

    return Factory.deploy(initCode);
  }

  function verifyPricingModule(address pricingModule) internal view {
    if (
      pricingModule == address(0) ||
      !PricingModulesBase.isPricingModule(pricingModule)
    ) {
      revert IArchitectBase.Architect__InvalidPricingModule();
    }
  }

  function getSpaceDeploymentInfo(
    uint256 spaceTokenId,
    IArchitectBase.Membership memory membership
  ) internal view returns (bytes memory initCode, bytes32 salt) {
    verifyPricingModule(membership.settings.pricingModule);

    address spaceOwnerNFT = address(
      ImplementationStorage.layout().spaceOwnerToken
    );

    // calculate salt
    salt = keccak256(
      abi.encode(spaceTokenId, block.timestamp, block.number, spaceOwnerNFT)
    );

    IMembershipBase.Membership memory membershipSettings = membership.settings;

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
              collection: spaceOwnerNFT,
              tokenId: spaceTokenId
            }),
            membershipSettings
          )
        )
      )
    );
  }
}
