//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

contract GreeterV2  is ERC1155Upgradeable, UUPSUpgradeable, OwnableUpgradeable, AccessControlUpgradeable {

    function initialize(string memory uri_) public initializer  {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Ownable_init();
        __ERC1155_init(uri_);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        console.log("Deploying a GreeterV2 with uri_:", uri_);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address) internal onlyOwner override {}

    function greet() public pure returns (string memory) {
        return "Greetings from V2";
    }

    function updateTokenURI(string memory uri_) public onlyOwner {
        _setURI(uri_);
    }

}
