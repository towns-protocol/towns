// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IArchitectBase} from "./IArchitect.sol";
import {IEntitlement} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {IUserEntitlement} from "contracts/src/spaces/entitlements/user/IUserEntitlement.sol";
import {IRuleEntitlement} from "contracts/src/spaces/entitlements/rule/IRuleEntitlement.sol";
import {IRoles, IRolesBase} from "contracts/src/spaces/facets/roles/IRoles.sol";
import {IChannel} from "contracts/src/spaces/facets/channels/IChannel.sol";
import {IEntitlementsManager} from "contracts/src/spaces/facets/entitlements/IEntitlementsManager.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";
import {ITokenOwnableBase} from "contracts/src/diamond/facets/ownable/token/ITokenOwnable.sol";
import {IManagedProxyBase} from "contracts/src/diamond/proxy/managed/IManagedProxy.sol";
import {IMembershipBase} from "contracts/src/spaces/facets/membership/IMembership.sol";
import {IERC721A} from "contracts/src/diamond/facets/token/ERC721A/IERC721A.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";

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

// modules
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

abstract contract ArchitectBase is Factory, IArchitectBase {
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
    ims.spaceToken.mintSpace(spaceInfo.name, spaceInfo.uri, spaceAddress);

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
    IRuleEntitlement ruleEntitlement
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
  }

  function _getImplementations()
    internal
    view
    returns (
      ISpaceOwner spaceToken,
      IUserEntitlement userEntitlementImplementation,
      IRuleEntitlement ruleEntitlementImplementation
    )
  {
    ImplementationStorage.Layout storage ds = ImplementationStorage.layout();

    return (ds.spaceToken, ds.userEntitlement, ds.ruleEntitlement);
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
          module: userEntitlement,
          data: abi.encode(users)
        })
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

    IRolesBase.CreateEntitlement[]
      memory entitlements = new IRolesBase.CreateEntitlement[](1);
    entitlements[0].module = userEntitlement;
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

  function _getSpaceDeploymentInfo(
    uint256 spaceTokenId,
    Membership memory membership
  ) internal view returns (bytes memory initCode, bytes32 salt) {
    ImplementationStorage.Layout storage ds = ImplementationStorage.layout();

    // calculate salt
    salt = keccak256(abi.encode(msg.sender, spaceTokenId, block.timestamp));

    // calculate init code
    initCode = abi.encodePacked(
      type(SpaceProxy).creationCode,
      abi.encode(
        msg.sender,
        IManagedProxyBase.ManagedProxy({
          managerSelector: IProxyManager.getImplementation.selector,
          manager: address(this)
        }),
        ITokenOwnableBase.TokenOwnable({
          collection: address(ds.spaceToken),
          tokenId: spaceTokenId
        }),
        IMembershipBase.Membership({
          name: membership.settings.name,
          symbol: membership.settings.symbol,
          price: membership.settings.price,
          maxSupply: membership.settings.maxSupply,
          duration: membership.settings.duration,
          currency: membership.settings.currency,
          feeRecipient: membership.settings.feeRecipient == address(0)
            ? msg.sender
            : membership.settings.feeRecipient,
          freeAllocation: membership.settings.freeAllocation,
          pricingModule: membership.settings.pricingModule
        })
      )
    );
  }
}
