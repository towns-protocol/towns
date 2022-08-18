//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./ISpaceManager.sol";
import "./entitlement_modules/ISpaceEntitlementModule.sol";
import "./entitlement_modules/UserGrantedEntitlementModule.sol";

//transitivity
//expirations
//super admins
//admins separate from owners
contract ZionSpaceManager is ISpaceManager {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    uint256 private totalSpaces = 1;

    mapping(string => bool) public registeredSpaceNames;
    mapping(uint256 => SpaceStructs.Space) public spaces;

    /// @notice maps the network space id to the contract space id for easy retrieval
    mapping(uint256 => uint256) public networkSpaceIdToSpaceId;

    /// @notice Event fired when a new space is created
    /// @param owner - the address that owns the space.
    /// @param spaceName - the spaceName that was registered.
    event CreateSpace(address indexed owner, string indexed spaceName);

    constructor() {}

    //TODO ownable
    // function setDefaultEntitlementManager(address _defaultEntitlementManagerAddress) public {
    //     defaultEntitlementManagerAddress = _defaultEntitlementManagerAddress;
    // }

    function createSpace(
        string calldata spaceName,
        address[] calldata entitlementModuleAddresses
    ) external {
        require(
            (bytes(spaceName)).length > 2,
            "Space name must be at least 3 characters"
        );
        require(
            _isAllowedAsciiString(bytes(spaceName)) == true,
            "Space name must be lowercase alphanumeric"
        );
        require(
            registeredSpaceNames[spaceName] == false,
            "Space name already exists"
        );

        registeredSpaceNames[spaceName] = true;

        //mint nft, nft id == spaceId
        //send nft to msg.sender
        //set owner as nftId

        //set initial user entitlements
        // SpaceStructs.Entitlement memory adminEntitlement = SpaceStructs
        //     .Entitlement();

        // SpaceStructs.Entitlement[]
        //     memory entitlements = new SpaceStructs.Entitlement[](1);
        // entitlements[0] = adminEntitlement;

        // //set initial contract entitlements
        // SpaceStructs.ContractEntitlement[]
        //     memory contractEntitlements = new SpaceStructs.ContractEntitlement[](
        //         0
        //     );

        uint256 spaceId = totalSpaces;

        console.log("Total spaces are ", totalSpaces);

        SpaceStructs.Space storage space = spaces[spaceId];
        space.spaceId = spaceId;
        space.createdAt = block.timestamp;
        space.name = spaceName;
        space.creatorAddress = msg.sender;
        space.ownerAddress = msg.sender;
        space.entitlementModuleTags = ["usergranted"];
        space.entitlementModuleAddresses[
            "usergranted"
        ] = entitlementModuleAddresses[0];

        UserGrantedEntitlementModule userGrantedEntitlementModule = UserGrantedEntitlementModule(
                entitlementModuleAddresses[0]
            );

        SpaceStructs.EntitlementType[]
            memory entitlementTypes = new SpaceStructs.EntitlementType[](1);
        entitlementTypes[0] = SpaceStructs.EntitlementType.Administrator;

        userGrantedEntitlementModule.addUserEntitlements(
            spaceId,
            0,
            msg.sender,
            entitlementTypes
        );
        totalSpaces += 1;

        console.log("Space create with space name ", spaceName);
        console.log("Space create with space name ", spaceName);

        emit CreateSpace(msg.sender, spaceName);
    }

    function addEntitlementModuleAddress(
        uint256 spaceId,
        address _entitlementModuleAddress,
        string memory tag
    ) external {
        SpaceStructs.Space storage space = spaces[spaceId];
        require(
            space.ownerAddress == msg.sender,
            "Only the owner can update the entitlement module address"
        );
        //only add if not already added
        if (space.entitlementModuleAddresses[tag] == address(0)) {
            space.entitlementModuleAddresses[tag] = _entitlementModuleAddress;
            space.entitlementModuleTags.push(tag);
        }
    }

    /// @notice Connects the node network space id to a space
    function setNetworkSpaceId(uint256 spaceId, uint256 networkSpaceId)
        external
    {
        SpaceStructs.Space storage space = spaces[spaceId];
        require(
            space.ownerAddress == msg.sender,
            "Only the owner can update the network space id"
        );
        space.networkSpaceId = networkSpaceId;
        networkSpaceIdToSpaceId[networkSpaceId] = spaceId;
    }

    function getSpaceIdFromNetworkSpaceId(uint256 networkSpaceId)
        external
        view
        returns (uint256)
    {
        return networkSpaceIdToSpaceId[networkSpaceId];
    }

    function isEntitled(
        uint256 spaceId,
        uint256 roomId,
        SpaceStructs.EntitlementType entitlementType,
        address userAddress
    ) public view returns (bool) {
        string[] storage entitlementModuleTags = spaces[spaceId]
            .entitlementModuleTags;
        for (uint256 i = 0; i < entitlementModuleTags.length; i++) {
            address entitlementModuleAddress = spaces[spaceId]
                .entitlementModuleAddresses[entitlementModuleTags[i]];
            if (entitlementModuleAddress != address(0)) {
                ISpaceEntitlementModule entitlementModule = ISpaceEntitlementModule(
                        entitlementModuleAddress
                    );
                if (
                    entitlementModule.isEntitled(
                        spaceId,
                        roomId,
                        userAddress,
                        entitlementType
                    )
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    function getSpaceValues(uint256 _spaceId)
        external
        view
        returns (
            uint256 spaceId,
            uint256 createdAt,
            string memory name,
            address creatorAddress,
            address ownerAddress
        )
    {
        SpaceStructs.Space storage space = spaces[_spaceId];
        string memory spaceName = space.name;
        return (
            space.spaceId,
            space.createdAt,
            spaceName,
            space.creatorAddress,
            space.ownerAddress
        );
    }

    function getSpaceEntitlementModuleAddresses(uint256 _spaceId)
        external
        view
        returns (address[] memory entitlementModuleAddresses)
    {
        SpaceStructs.Space storage space = spaces[_spaceId];
        string[] memory spaceEntitlementModuleTags = space
            .entitlementModuleTags;

        address[] memory spaceEntitlementModuleAddresses = new address[](
            spaceEntitlementModuleTags.length
        );
        for (uint256 i = 0; i < spaceEntitlementModuleTags.length; i++) {
            spaceEntitlementModuleAddresses[i] = space
                .entitlementModuleAddresses[spaceEntitlementModuleTags[i]];
        }

        return spaceEntitlementModuleAddresses;
    }

    struct SpaceNameID {
        string name;
        uint256 id;
    }

    function getSpaceNames()
        external
        view
        returns (SpaceNameID[] memory spaceNames)
    {
        console.log("Total spaces are ", totalSpaces);
        require(totalSpaces > 0, "No spaces exist");
        SpaceNameID[] memory spaceNameIds = new SpaceNameID[](totalSpaces - 1);

        for (uint256 i = 1; i < totalSpaces; i++) {
            spaceNameIds[i - 1] = SpaceNameID(
                spaces[i].name,
                spaces[i].spaceId
            );
        }
        return spaceNameIds;
    }

    function getSpaceOwner(uint256 _spaceId)
        external
        view
        returns (address ownerAddress)
    {
        SpaceStructs.Space storage space = spaces[_spaceId];
        return space.ownerAddress;
    }

    /// @notice Checks if a string contains valid username ASCII characters [0-1], [a-z] and _.
    /// @param str the string to be checked.
    /// @return true if the string contains only valid characters, false otherwise.
    function _isAllowedAsciiString(bytes memory str)
        internal
        pure
        returns (bool)
    {
        for (uint256 i = 0; i < str.length; i++) {
            uint8 charInt = uint8(str[i]);
            if (
                (charInt >= 1 && charInt <= 47) ||
                (charInt >= 58 && charInt <= 94) ||
                charInt == 96 ||
                charInt >= 123
            ) {
                return false;
            }
        }
        return true;
    }
}
