// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {ITownArchitect, ITownArchitectBase} from "./ITownArchitect.sol";
import {IEntitlement} from "contracts/src/towns/entitlements/IEntitlement.sol";
import {IRoles, IRolesBase} from "contracts/src/towns/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/towns/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/towns/facets/entitlements/IEntitlementsManager.sol";

import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";

// libraries
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {Validator} from "contracts/src/utils/Validator.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {TownArchitectStorage} from "./TownArchitectStorage.sol";

// contracts
import {Factory} from "contracts/src/utils/Factory.sol";
import {TownProxy} from "contracts/src/towns/facets/proxy/TownProxy.sol";

// modules

import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

abstract contract TownArchitectBase is Factory, ITownArchitectBase {
  using StringSet for StringSet.Set;

  address internal constant EVERYONE_ADDRESS = address(1);

  function _getTownById(string memory townId) internal view returns (address) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    return ds.townById[townId];
  }

  function _getTokenIdByTownId(
    string memory townId
  ) internal view returns (uint256) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    return ds.tokenIdByTownId[townId];
  }

  function _setImplementations(
    address townToken,
    address userEntitlement,
    address tokenEntitlement
  ) internal {
    if (!Address.isContract(townToken)) revert TownArchitect__NotContract();
    if (!Address.isContract(userEntitlement))
      revert TownArchitect__NotContract();
    if (!Address.isContract(tokenEntitlement))
      revert TownArchitect__NotContract();

    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    ds.townToken = townToken;
    ds.userEntitlement = userEntitlement;
    ds.tokenEntitlement = tokenEntitlement;
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
    Validator.checkStringLength(townInfo.id);

    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();

    // validate the network id isn't already taken
    if (ds.townIds.contains(townInfo.id))
      revert TownArchitect__InvalidNetworkId();

    // mint the town owner token
    uint256 tokenId = TownOwner(ds.townToken).nextTokenId();

    // deploy town
    townAddress = _deployTown(townInfo.id, tokenId);

    // save town info to storage
    ds.townIds.add(townInfo.id);
    ds.tokenIdByTownId[townInfo.id] = tokenId;
    ds.townById[townInfo.id] = townAddress;

    // mint token to TownArchitect
    TownOwner(ds.townToken).mintTown(
      townInfo.name,
      townInfo.uri,
      townInfo.id,
      townAddress
    );

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
    IEntitlementsManager(townAddress).addImmutableEntitlements(entitlements);

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

    // transfer nft to msg.sender
    TownOwner(ds.townToken).safeTransferFrom(
      address(this),
      msg.sender,
      tokenId
    );

    // emit event
    emit TownCreated(msg.sender, tokenId, townAddress);
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
        Validator.checkAddress(member.users[i]);
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
    users[0] = EVERYONE_ADDRESS;

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
        tokenCollection,
        tokenId
      )
    );
  }

  function _getNextTokenId() internal view returns (uint256 tokenId) {
    TownArchitectStorage.Layout storage ds = TownArchitectStorage.layout();
    tokenId = TownOwner(ds.townToken).nextTokenId();
  }
}
