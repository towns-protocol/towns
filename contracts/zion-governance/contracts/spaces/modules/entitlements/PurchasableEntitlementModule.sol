//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ISpaceManager} from "../../interfaces/ISpaceManager.sol";
import {DataTypes} from "../../libraries/DataTypes.sol";
import {EntitlementModuleBase} from "../EntitlementModuleBase.sol";
import {IERC20} from "openzeppelin-contracts/contracts/interfaces/IERC20.sol";
import {IERC721} from "openzeppelin-contracts/contracts/interfaces/IERC721.sol";
import {ERC165} from "openzeppelin-contracts/contracts/utils/introspection/ERC165.sol";

contract PurchasableEntitlementModule is EntitlementModuleBase {
  mapping(uint256 => SpacePurchasableEntitlements) purchasableEntitlementsBySpaceId;

  struct SpacePurchasableEntitlements {
    mapping(string => PurchasableEntitlement) entitlementsByTag;
  }

  struct PurchasableEntitlement {
    string description;
    uint256 price;
    uint256 roleId;
    bool isActive;
    //length of time?
  }

  ///@notice Used for storing the actual purchases by Space
  mapping(uint256 => PurchasedSpaceEntitlements) purchasedEntitlementsBySpaceId;

  ///@notice Maps the actual user that made the purchase
  struct PurchasedSpaceEntitlements {
    mapping(address => string[]) userPurchasedEntitlements;
  }

  mapping(uint256 => uint256) valueBySpaceId;

  constructor(
    string memory name_,
    string memory description_,
    address spaceManager_
  ) EntitlementModuleBase(name_, description_, spaceManager_) {}

  function setEntitlement(
    string calldata spaceId,
    string calldata,
    uint256 roleId,
    bytes calldata entitlementData
  ) external override onlySpaceManager {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(spaceId);

    (string memory _description, uint256 value, string memory tag) = abi.decode(
      entitlementData,
      (string, uint256, string)
    );

    require(
      ownerAddress == msg.sender || msg.sender == _spaceManager,
      "Only the owner can update entitlements"
    );

    if (value == 0) {
      revert("No value provided");
    }

    if (
      purchasableEntitlementsBySpaceId[_spaceId].entitlementsByTag[tag].price !=
      0
    ) {
      revert("Entitlement tag already exists");
    }

    SpacePurchasableEntitlements
      storage spacePurchasableEntitlements = purchasableEntitlementsBySpaceId[
        _spaceId
      ];
    spacePurchasableEntitlements.entitlementsByTag[
      tag
    ] = PurchasableEntitlement(_description, value, roleId, true);
  }

  function disablePurchasableEntitlement(
    string calldata spaceId,
    string calldata tag
  ) public {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(spaceId);

    require(
      ownerAddress == msg.sender || msg.sender == _spaceManager,
      "Only the owner can update entitlements"
    );

    SpacePurchasableEntitlements
      storage spacePurchasableEntitlements = purchasableEntitlementsBySpaceId[
        _spaceId
      ];

    spacePurchasableEntitlements.entitlementsByTag[tag].isActive = false;
  }

  function removeEntitlement(
    string calldata spaceId,
    string calldata,
    uint256[] calldata,
    bytes calldata
  ) external view override onlySpaceManager {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(spaceId);

    require(
      ownerAddress == msg.sender || msg.sender == _spaceManager,
      "Only the owner can update entitlements"
    );
  }

  function purchaseEntitlement(uint256 spaceId, string calldata tag)
    public
    payable
  {
    SpacePurchasableEntitlements
      storage spacePurchasableEntitlements = purchasableEntitlementsBySpaceId[
        spaceId
      ];
    PurchasableEntitlement
      memory purchasableEntitlement = spacePurchasableEntitlements
        .entitlementsByTag[tag];

    require(purchasableEntitlement.price == msg.value, "Wrong value sent");

    PurchasedSpaceEntitlements
      storage purchasedSpaceEntitlements = purchasedEntitlementsBySpaceId[
        spaceId
      ];
    purchasedSpaceEntitlements.userPurchasedEntitlements[msg.sender].push(tag);

    valueBySpaceId[spaceId] += msg.value;
  }

  function isEntitled(
    string calldata spaceId,
    string calldata channelId,
    address user,
    DataTypes.Permission memory permission
  ) public view override returns (bool) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);

    string[] memory purchasedEntitlements = purchasedEntitlementsBySpaceId[
      _spaceId
    ].userPurchasedEntitlements[user];

    if (bytes(channelId).length > 0) {
      return false;
    }

    for (uint256 i = 0; i < purchasedEntitlements.length; i++) {
      string memory entitlementTag = purchasedEntitlements[i];
      PurchasableEntitlement
        memory purchasableEntitlement = purchasableEntitlementsBySpaceId[
          _spaceId
        ].entitlementsByTag[entitlementTag];
      if (purchasableEntitlement.isActive) {
        DataTypes.Permission[] memory permissions = spaceManager
          .getPermissionsBySpaceIdByRoleId(
            spaceId,
            purchasableEntitlement.roleId
          );

        for (uint256 k = 0; k < permissions.length; k++) {
          if (
            keccak256(abi.encodePacked(permissions[k].name)) ==
            keccak256(abi.encodePacked(permission.name))
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function isTransitivelyEntitled(
    uint256 spaceId,
    uint256 channelId,
    address userAddress,
    uint256 roleId
  ) public view returns (bool) {
    string[] memory purchasedEntitlements = purchasedEntitlementsBySpaceId[
      spaceId
    ].userPurchasedEntitlements[userAddress];
    if (channelId > 0) {
      return false;
    }

    for (uint256 i = 0; i < purchasedEntitlements.length; i++) {
      string memory entitlementTag = purchasedEntitlements[i];
      PurchasableEntitlement
        memory purchasableEntitlement = purchasableEntitlementsBySpaceId[
          spaceId
        ].entitlementsByTag[entitlementTag];
      if (purchasableEntitlement.isActive) {
        if (purchasableEntitlement.roleId == roleId) {
          return true;
        }
      }
    }

    return false;
  }

  function getUserRoles(
    string calldata spaceId,
    string calldata,
    address user
  ) public view returns (DataTypes.Role[] memory) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);

    string[] memory purchasedEntitlements = purchasedEntitlementsBySpaceId[
      _spaceId
    ].userPurchasedEntitlements[user];
    DataTypes.Role[] memory roles = new DataTypes.Role[](
      purchasedEntitlements.length
    );
    //This is buggy atm because we store an array of role Ids per purchase and that makes it hard to know the total size
    for (uint256 i = 0; i < purchasedEntitlements.length; i++) {
      string memory entitlementTag = purchasedEntitlements[i];
      PurchasableEntitlement
        memory purchasableEntitlement = purchasableEntitlementsBySpaceId[
          _spaceId
        ].entitlementsByTag[entitlementTag];
      if (purchasableEntitlement.isActive) {
        DataTypes.Role memory role = ISpaceManager(_spaceManager)
          .getRoleBySpaceIdByRoleId(spaceId, purchasableEntitlement.roleId);
        //Here is the bug it will get overwritten
        roles[0] = role;
      }
    }

    return roles;
  }

  function withdrawValue(string calldata spaceId) public returns (uint256) {
    ISpaceManager spaceManager = ISpaceManager(_spaceManager);

    uint256 _spaceId = spaceManager.getSpaceIdByNetworkId(spaceId);
    address ownerAddress = spaceManager.getSpaceOwnerBySpaceId(spaceId);

    require(
      ownerAddress == msg.sender || msg.sender == _spaceManager,
      "Only the owner can update entitlements"
    );

    require(valueBySpaceId[_spaceId] > 0, "No value to withdraw");

    uint256 balance = valueBySpaceId[_spaceId];
    valueBySpaceId[_spaceId] = 0;

    address payable receiver = payable(msg.sender);
    (bool transferTx, ) = receiver.call{value: balance}("");
    if (!transferTx) {
      revert("Could not transfer value");
    }
    return balance;
  }
}
