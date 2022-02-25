//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

contract TestContract is
    ERC1155Upgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable
{
    uint16 private constant CONTRACT_VERSION = 1;
    uint16 internal deployedContractVersion;

    function initialize(string memory uri_) public virtual initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Ownable_init();
        __ERC1155_init(uri_);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        deployedContractVersion = CONTRACT_VERSION;
    }

    function getContractVersion() public pure virtual returns (uint16) {
        return CONTRACT_VERSION;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        view
        virtual
        override
        onlyOwner
    {
        TestContract newContract = TestContract(newImplementation);
        uint16 newVersion = newContract.getContractVersion();
        require(
            deployedContractVersion < newVersion,
            "NO_DOWNGRADE"
        );
    }

    function test() public pure virtual returns (string memory) {
        return "Greetings from TestContract";
    }
}
