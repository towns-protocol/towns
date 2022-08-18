//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./ISpaceEntitlementModule.sol";
import "../ISpaceManager.sol";
import "../SpaceStructs.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract TokenEntitlementModule is ISpaceEntitlementModule {
    address zionSpaceManagerAddress;

    mapping(uint256 => SpaceTokenEntitlements) spaceTokenEntitlements;
    struct SpaceTokenEntitlements {
        mapping(string => TokenEntitlement) tokenEntitlements;
        mapping(SpaceStructs.EntitlementType => string[]) entitlementTypeTagMap;
        mapping(uint256 => RoomTokenEntitlements) roomTokenEntitlements;
    }

    struct RoomTokenEntitlements {
        mapping(string => TokenEntitlement) tokenEntitlements;
    }

    //a contract entitlement is composed of 1 or more external contracts all of which need to be satisfied for the list of entitlements
    struct TokenEntitlement {
        ExternalToken[] externalTokens;
        SpaceStructs.Entitlement[] entitlements;
    }

    struct ExternalToken {
        address contractAddress;
        uint256 quantity;
    }

    constructor(address _zionSpaceManagerAddress) {
        zionSpaceManagerAddress = _zionSpaceManagerAddress;
    }

    function addTokenEntitlements(
        uint256 spaceId,
        uint256 roomId,
        string calldata description,
        address[] calldata tokenAddresses,
        uint256[] calldata quantities,
        SpaceStructs.EntitlementType[] calldata entitlementTypes
    ) public {
        ISpaceManager zionSpaceManager = ISpaceManager(zionSpaceManagerAddress);

        address ownerAddress = zionSpaceManager.getSpaceOwner(spaceId);

        console.log("ownerAddress", ownerAddress);
        console.log("MsgSEnder", msg.sender);

        require(tokenAddresses.length > 0, "No token addresses provided");
        require(
            tokenAddresses.length == quantities.length,
            "Must have a quantity for every token address"
        );

        //need the second check to add user entitlements during space creation (otherwise could do a separate call to addUserEntitlements)
        require(
            ownerAddress == msg.sender || msg.sender == zionSpaceManagerAddress,
            "Only the owner can update the entitlements"
        );

        if (roomId > 0) {
            TokenEntitlement storage tokenEntitlement = spaceTokenEntitlements[
                spaceId
            ].roomTokenEntitlements[roomId].tokenEntitlements[description];

            for (uint256 i = 0; i < tokenAddresses.length; i++) {
                ExternalToken memory externalToken = ExternalToken({
                    contractAddress: tokenAddresses[i],
                    quantity: quantities[i]
                });
                tokenEntitlement.externalTokens.push(externalToken);
            }

            for (uint256 i = 0; i < entitlementTypes.length; i++) {
                SpaceStructs.Entitlement memory entitlement = SpaceStructs
                    .Entitlement({
                        grantedBy: msg.sender,
                        grantedTime: block.timestamp,
                        entitlementType: entitlementTypes[i]
                    });
                tokenEntitlement.entitlements.push(entitlement);
            }
        } else {
            TokenEntitlement storage tokenEntitlement = spaceTokenEntitlements[
                spaceId
            ].tokenEntitlements[description];

            for (uint256 i = 0; i < tokenAddresses.length; i++) {
                tokenEntitlement.externalTokens.push(
                    ExternalToken({
                        contractAddress: tokenAddresses[i],
                        quantity: quantities[i]
                    })
                );
            }

            for (uint256 i = 0; i < entitlementTypes.length; i++) {
                tokenEntitlement.entitlements.push(
                    SpaceStructs.Entitlement({
                        grantedBy: msg.sender,
                        grantedTime: block.timestamp,
                        entitlementType: entitlementTypes[0]
                    })
                );
            }
            for (uint256 i = 0; i < entitlementTypes.length; i++) {
                spaceTokenEntitlements[spaceId]
                    .entitlementTypeTagMap[entitlementTypes[i]]
                    .push(description);
            }
        }
    }

    // function generateEntitlements(
    //     SpaceStructs.EntitlementType[] calldata entitlementTypes
    // ) public returns (SpaceStructs.Entitlement[] memory) {
    //     SpaceStructs.Entitlement[]
    //         memory entitlements = new SpaceStructs.Entitlement[](
    //             entitlementTypes.length
    //         );
    //     for (uint256 i = 0; i < entitlementTypes.length; i++) {
    //         entitlements[i] = SpaceStructs.Entitlement({
    //             grantedBy: msg.sender,
    //             grantedTime: block.timestamp,
    //             entitlementType: entitlementTypes[i]
    //         });
    //     }
    //     return entitlements;
    // }

    function removeTokenEntitlements(
        uint256 spaceId,
        uint256 roomId,
        string calldata description
    ) public {
        ISpaceManager zionSpaceManager = ISpaceManager(zionSpaceManagerAddress);

        address ownerAddress = zionSpaceManager.getSpaceOwner(spaceId);

        require(
            ownerAddress == msg.sender,
            "Only the owner can update the entitlements"
        );

        if (roomId > 0) {
            delete spaceTokenEntitlements[spaceId]
                .roomTokenEntitlements[roomId]
                .tokenEntitlements[description];
        } else {
            delete spaceTokenEntitlements[spaceId].tokenEntitlements[
                description
            ];
        }

        //todo remove from elementtypetagmap?
    }

    function isEntitled(
        uint256 spaceId,
        uint256 roomId,
        address userAddress,
        SpaceStructs.EntitlementType entitlementType
    ) public view returns (bool) {
        console.log("into token entitlement module isEntitled", userAddress);
        string[] memory tags = spaceTokenEntitlements[spaceId]
            .entitlementTypeTagMap[entitlementType];
        for (uint256 i = 0; i < tags.length; i++) {
            console.log("checking for tag ", tags[i]);
            if (isTokenEntitled(spaceId, roomId, userAddress, tags[i])) {
                return true;
            }
        }

        return false;
    }

    function isTokenEntitled(
        uint256 spaceId,
        uint256 roomId,
        address userAddress,
        string memory tag
    ) public view returns (bool) {
        ExternalToken[] memory externalTokens = spaceTokenEntitlements[spaceId]
            .tokenEntitlements[tag]
            .externalTokens;
        for (uint256 i = 0; i < externalTokens.length; i++) {
            uint256 quantity = externalTokens[i].quantity;
            console.log("istokenentitled checking", i);
            if (quantity > 0) {
                address tokenAddress = externalTokens[i].contractAddress;
                console.log("istokenentitled tokenAddress", tokenAddress);
                console.log("istokenentitled quantity", quantity);
                uint256 balanceOf = IERC20(tokenAddress).balanceOf(userAddress);

                console.log("istokenentitled balanceOf", balanceOf);
                if (
                    IERC721(tokenAddress).balanceOf(userAddress) >= quantity ||
                    IERC20(tokenAddress).balanceOf(userAddress) >= quantity
                ) {
                    return true;
                }
            }
        }

        return false;
    }
}
