// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {ITownArchitect, ITownArchitectBase} from "./ITownArchitect.sol";
import {IEntitlement} from "contracts/src/towns/entitlements/IEntitlement.sol";
import {IRoles, IRolesBase} from "contracts/src/towns/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IEntitlements} from "contracts/src/towns/facets/entitlements/IEntitlements.sol";

import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";

// libraries
import {TownArchitectStorage} from "./TownArchitectStorage.sol";
import {TownArchitectService} from "./TownArchitectService.sol";

// contracts

import {Factory} from "contracts/src/utils/Factory.sol";
import {TownProxy} from "contracts/src/towns/facets/proxy/TownProxy.sol";

// modules

import {TownOwner} from "contracts/src/tokens/TownOwner.sol";
import {UserEntitlement} from "contracts/src/towns/entitlements/user/UserEntitlement.sol";
import {TokenEntitlement} from "contracts/src/towns/entitlements/token/TokenEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

abstract contract TownArchitectBase is Factory, ITownArchitectBase {
  function _getTownById(string memory townId) internal view returns (address) {
    return TownArchitectService.getTownById(townId);
  }

  function _getTokenIdByTownId(
    string memory townId
  ) internal view returns (uint256) {
    return TownArchitectService.getTokenIdByTownId(townId);
  }

  function _setImplementations(
    address townToken,
    address userEntitlementImplementation,
    address tokenEntitlementImplementation
  ) internal {
    TownArchitectService.setImplementations(
      townToken,
      userEntitlementImplementation,
      tokenEntitlementImplementation
    );
  }

  function _getImplementations()
    internal
    view
    returns (
      address townToken,
      address userEntitlementImplementation,
      address tokenEntitlementImplementation
    )
  {
    return (
      TownArchitectStorage.layout().townToken,
      TownArchitectStorage.layout().userEntitlement,
      TownArchitectStorage.layout().tokenEntitlement
    );
  }

  function _createTown(
    TownInfo memory townInfo
  ) internal returns (address townAddress) {
    // validate id length
    TownArchitectService.checkStringLength(townInfo.id);

    // validate the network id isn't already taken
    TownArchitectService.checkNetworkIdAvailability(townInfo.id);

    // mint the town owner token
    uint256 tokenId = _getNextTokenId();

    // save the town owner token id by network id hash
    townAddress = _getTownDeploymentAddress(townInfo.id, tokenId);

    // save town info to storage
    TownArchitectService.setTown(townInfo.id, tokenId, townAddress);

    // mint token to TownArchitect
    _mintTown(townInfo.metadata);

    // deploy town
    townAddress = _deployTown(townInfo.id, tokenId);

    // deploy user entitlement
    address userEntitlement = _deployEntitlement(
      TownArchitectStorage.layout().userEntitlement,
      townAddress
    );

    // deploy token entitlement
    address tokenEntitlement = _deployEntitlement(
      TownArchitectStorage.layout().tokenEntitlement,
      townAddress
    );

    address[] memory entitlements = new address[](2);
    entitlements[0] = userEntitlement;
    entitlements[1] = tokenEntitlement;

    // set entitlements as immutable
    IEntitlements(townAddress).addImmutableEntitlements(entitlements);

    // create everyone role with permissions
    uint256 everyoneRoleId = _createEveryoneEntitlement(
      townAddress,
      userEntitlement,
      townInfo.everyoneEntitlement
    );

    uint256 memberRoleId;

    // create member role with permissions
    if (
      townInfo.memberEntitlement.users.length > 0 ||
      townInfo.memberEntitlement.tokens.length > 0
    ) {
      memberRoleId = _createMemberEntitlement(
        townAddress,
        userEntitlement,
        tokenEntitlement,
        townInfo.memberEntitlement
      );
    }

    // create channels
    _createChannel(
      townAddress,
      memberRoleId != 0 ? memberRoleId : everyoneRoleId,
      townInfo.channel
    );

    // transfer nft
    _transferTown(tokenId, msg.sender);

    // emit event
    emit TownCreated(townAddress);
  }

  // =============================================================
  //                       Channel Helpers
  // =============================================================

  function _createChannel(
    address town,
    uint256 roleId,
    ChannelInfo memory channelInfo
  ) internal {
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;
    IChannel(town).createChannel(channelInfo.id, channelInfo.metadata, roleIds);
  }

  // =============================================================
  //                     Entitlement Helpers
  // =============================================================

  function _createMemberEntitlement(
    address town,
    address userEntitlement,
    address tokenEntitlement,
    MemberEntitlement memory member
  ) internal returns (uint256 roleId) {
    // create role with no entitlements
    roleId = IRoles(town).createRole(
      member.role.name,
      member.role.permissions,
      new IRolesBase.CreateEntitlement[](0)
    );

    if (member.users.length != 0) {
      // validate users
      for (uint256 i = 0; i < member.users.length; i++) {
        TownArchitectService.checkAddress(member.users[i]);
      }

      IRoles(town).addRoleToEntitlement(
        roleId,
        IRolesBase.CreateEntitlement({
          module: userEntitlement,
          data: abi.encode(member.users)
        })
      );
    }

    if (member.tokens.length == 0) return roleId;

    IRoles(town).addRoleToEntitlement(
      roleId,
      IRolesBase.CreateEntitlement({
        module: tokenEntitlement,
        data: abi.encode(member.tokens)
      })
    );
  }

  function _createEveryoneEntitlement(
    address town,
    address userEntitlement,
    RoleInfo memory everyone
  ) internal returns (uint256 roleId) {
    IRolesBase.CreateEntitlement[]
      memory entitlements = new IRolesBase.CreateEntitlement[](1);

    address[] memory users = new address[](1);
    users[0] = TownArchitectService.EVERYONE_ADDRESS;

    entitlements[0] = IRolesBase.CreateEntitlement({
      module: userEntitlement,
      data: abi.encode(users)
    });

    roleId = IRoles(town).createRole(
      everyone.name,
      everyone.permissions,
      entitlements
    );
  }

  // =============================================================
  //                      Deployment Helpers
  // =============================================================

  function _getTownDeploymentAddress(
    string memory townId,
    uint256 tokenId
  ) internal view returns (address town) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();

    // get deployment info
    (bytes memory initCode, bytes32 salt) = _getTownDeploymentInfo(
      townId,
      ds.townToken,
      tokenId
    );
    return _calculateDeploymentAddress(keccak256(initCode), salt);
  }

  function _deployTown(
    string memory townId,
    uint256 tokenId
  ) internal returns (address town) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();

    // get deployment info
    (bytes memory initCode, bytes32 salt) = _getTownDeploymentInfo(
      townId,
      ds.townToken,
      tokenId
    );
    return _deploy(initCode, salt);
  }

  function _deployEntitlement(
    address entitlement,
    address townAddress
  ) internal returns (address) {
    // calculate init code
    bytes memory initCode = abi.encodePacked(
      type(ERC1967Proxy).creationCode,
      abi.encode(
        entitlement,
        abi.encodeCall(IEntitlement.initialize, (townAddress))
      )
    );

    return _deploy(initCode);
  }

  function _getTownDeploymentInfo(
    string memory townId,
    address tokenCollection,
    uint256 tokenId
  ) internal view returns (bytes memory initCode, bytes32 salt) {
    // calculate salt
    salt = keccak256(abi.encode(townId, tokenCollection, tokenId));

    // calculate init code
    initCode = abi.encodePacked(
      type(TownProxy).creationCode,
      abi.encode(
        IProxyManager.getImplementation.selector,
        address(this),
        townId,
        tokenCollection,
        tokenId
      )
    );
  }

  // =============================================================
  //                         NFT Minting
  // =============================================================

  function _getNextTokenId() internal view returns (uint256 tokenId) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    tokenId = TownOwner(ds.townToken).nextTokenId();
  }

  function _mintTown(string memory metadata) internal {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    TownOwner(ds.townToken).mintTo(address(this), metadata);
  }

  function _transferTown(uint256 tokenId, address to) internal {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    TownOwner(ds.townToken).transferFrom(address(this), to, tokenId);
  }
}
