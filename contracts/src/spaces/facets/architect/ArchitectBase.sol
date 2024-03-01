// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "./IArchitect.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IUserEntitlement} from "./../../entitlements/user/IUserEntitlement.sol";
import {IRuleEntitlement} from "../../../crosschain/IRuleEntitlement.sol";
import {IRoles, IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";
import {ITokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/ITokenOwnable.sol";
import {IManagedProxyBase} from "contracts/src/diamond/proxy/managed/IManagedProxy.sol";
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {StringSet} from "contracts/src/utils/StringSet.sol";
import {Validator} from "contracts/src/utils/Validator.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ArchitectStorage} from "./ArchitectStorage.sol";
import {Permissions} from "contracts/src/spaces/facets/Permissions.sol";

// contracts
import {Factory} from "contracts/src/utils/Factory.sol";
import {SpaceProxy} from "contracts/src/spaces/facets/proxy/SpaceProxy.sol";

// modules
import {SpaceOwner} from "contracts/src/spaces/facets/owner/SpaceOwner.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

abstract contract ArchitectBase is Factory, IArchitectBase {
  using StringSet for StringSet.Set;
  using EnumerableSet for EnumerableSet.AddressSet;

  address internal constant EVERYONE_ADDRESS = address(1);
  string internal constant MINTER_ROLE = "Minter";

  // =============================================================
  //                           Spaces
  // =============================================================

  function _getSpaceById(
    string memory spaceId
  ) internal view returns (address) {
    return ArchitectStorage.layout().spaceById[spaceId].space;
  }

  function _getTokenIdBySpaceId(
    string memory spaceId
  ) internal view returns (uint256) {
    return ArchitectStorage.layout().spaceById[spaceId].tokenId;
  }

  function _getTokenIdBySpace(address space) internal view returns (uint256) {
    return ArchitectStorage.layout().tokenIdBySpace[space];
  }

  function _createSpace(
    SpaceInfo memory spaceInfo
  ) internal returns (address spaceAddress) {
    // validate id length
    Validator.checkStringLength(spaceInfo.id);

    ArchitectStorage.Layout storage ds = ArchitectStorage.layout();

    // validate the network id isn't already taken
    if (ds.spaceIds.contains(spaceInfo.id))
      revert Architect__InvalidNetworkId();

    // get the token id of the next space
    uint256 tokenId = SpaceOwner(ds.spaceToken).nextTokenId();

    // deploy space
    spaceAddress = _deploySpace(spaceInfo.id, tokenId, spaceInfo.membership);

    // save space info to storage
    ds.spaceIds.add(spaceInfo.id);
    ds.spaces.add(spaceAddress);

    // save to mappings
    ds.spaceById[spaceInfo.id] = ArchitectStorage.Space({
      space: spaceAddress,
      tokenId: tokenId
    });
    ds.tokenIdBySpace[spaceAddress] = tokenId;

    // mint token to and transfer to Architect
    SpaceOwner(ds.spaceToken).mintSpace(
      spaceInfo.name,
      spaceInfo.uri,
      spaceInfo.id,
      spaceAddress
    );

    // deploy user entitlement
    IUserEntitlement userEntitlement = IUserEntitlement(
      _deployEntitlement(
        ArchitectStorage.layout().userEntitlement,
        spaceAddress
      )
    );

    // deploy token entitlement
    IRuleEntitlement ruleEntitlement = IRuleEntitlement(
      _deployEntitlement(
        ArchitectStorage.layout().ruleEntitlement,
        spaceAddress
      )
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

    // create channels
    _createChannel(spaceAddress, memberRoleId, spaceInfo.channel);

    // transfer nft to sender
    SpaceOwner(ds.spaceToken).safeTransferFrom(
      address(this),
      _msgSenderArchitect(),
      tokenId
    );

    // emit event
    emit SpaceCreated(_msgSenderArchitect(), tokenId, spaceAddress);
  }

  // =============================================================
  //                           Implementations
  // =============================================================

  function _setImplementations(
    address spaceToken,
    IUserEntitlement userEntitlement,
    IRuleEntitlement ruleEntitlement
  ) internal {
    if (!Address.isContract(spaceToken)) revert Architect__NotContract();
    if (!Address.isContract(address(userEntitlement)))
      revert Architect__NotContract();
    if (!Address.isContract(address(ruleEntitlement)))
      revert Architect__NotContract();

    ArchitectStorage.Layout storage ds = ArchitectStorage.layout();
    ds.spaceToken = spaceToken;
    ds.userEntitlement = userEntitlement;
    ds.ruleEntitlement = ruleEntitlement;
  }

  function _getImplementations()
    internal
    view
    returns (
      address spaceToken,
      IUserEntitlement userEntitlementImplementation,
      IRuleEntitlement ruleEntitlementImplementation
    )
  {
    return (
      ArchitectStorage.layout().spaceToken,
      ArchitectStorage.layout().userEntitlement,
      ArchitectStorage.layout().ruleEntitlement
    );
  }

  // =============================================================
  //                  Internal Channel Helpers
  // =============================================================

  function _createChannel(
    address space,
    uint256 roleId,
    ChannelInfo memory channelInfo
  ) internal {
    uint256[] memory roleIds = new uint256[](1);
    roleIds[0] = roleId;
    IChannel(space).createChannel(
      channelInfo.id,
      channelInfo.metadata,
      roleIds
    );
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
        IRolesBase.CreateEntitlement({
          module: address(userEntitlement),
          data: abi.encode(users)
        })
      );
    } else if (requirements.users.length != 0) {
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
          module: address(userEntitlement),
          data: abi.encode(requirements.users)
        })
      );

      IRoles(spaceAddress).addRoleToEntitlement(
        roleId,
        IRolesBase.CreateEntitlement({
          module: address(ruleEntitlement),
          data: abi.encode(requirements.ruleData)
        })
      );
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

    IRolesBase.CreateEntitlement[]
      memory entitlements = new IRolesBase.CreateEntitlement[](1);
    entitlements[0].module = address(userEntitlement);
    entitlements[0].data = abi.encode(users);

    roleId = IRoles(spaceAddress).createRole(
      memberName,
      memberPermissions,
      entitlements
    );
  }

  // =============================================================
  //                      Deployment Helpers
  // =============================================================

  function _getSpaceDeploymentAddress(
    string memory spaceId,
    uint256 tokenId,
    Membership memory membership
  ) internal view returns (address space) {
    ArchitectStorage.Layout storage ds = ArchitectStorage.layout();

    // get deployment info
    (bytes memory initCode, bytes32 salt) = _getSpaceDeploymentInfo(
      spaceId,
      ds.spaceToken,
      tokenId,
      membership
    );
    return _calculateDeploymentAddress(keccak256(initCode), salt);
  }

  function _deploySpace(
    string memory spaceId,
    uint256 tokenId,
    Membership memory membership
  ) internal returns (address space) {
    ArchitectStorage.Layout storage ds = ArchitectStorage.layout();

    // get deployment info
    (bytes memory initCode, bytes32 salt) = _getSpaceDeploymentInfo(
      spaceId,
      ds.spaceToken,
      tokenId,
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

  function _getSpaceDeploymentInfo(
    string memory spaceId,
    address townOwnerCollection,
    uint256 tokenId,
    Membership memory membership
  ) internal view returns (bytes memory initCode, bytes32 salt) {
    // calculate salt
    salt = keccak256(abi.encode(spaceId, townOwnerCollection, tokenId));

    // calculate init code
    initCode = abi.encodePacked(
      type(SpaceProxy).creationCode,
      abi.encode(
        IManagedProxyBase.ManagedProxy({
          managerSelector: IProxyManager.getImplementation.selector,
          manager: address(this)
        }),
        ITokenOwnableBase.TokenOwnable({
          collection: townOwnerCollection,
          tokenId: tokenId
        }),
        IMembershipBase.Membership({
          name: membership.settings.name,
          symbol: membership.settings.symbol,
          price: membership.settings.price,
          maxSupply: membership.settings.maxSupply,
          duration: membership.settings.duration,
          currency: membership.settings.currency,
          feeRecipient: membership.settings.feeRecipient == address(0)
            ? _msgSenderArchitect()
            : membership.settings.feeRecipient,
          freeAllocation: membership.settings.freeAllocation,
          pricingModule: membership.settings.pricingModule
        })
      )
    );
  }

  function _getNextTokenId() internal view returns (uint256 tokenId) {
    ArchitectStorage.Layout storage ds = ArchitectStorage.layout();
    tokenId = SpaceOwner(ds.spaceToken).nextTokenId();
  }

  // =============================================================
  //                           Validation
  // =============================================================

  function _isValidSpace(address spaceAddress) internal view returns (bool) {
    ArchitectStorage.Layout storage ds = ArchitectStorage.layout();
    return ds.spaces.contains(spaceAddress);
  }

  // =============================================================
  //                           Overrides
  // =============================================================

  function _msgSenderArchitect() internal view virtual returns (address) {
    return msg.sender;
  }
}
