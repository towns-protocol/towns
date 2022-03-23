//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "hardhat/console.sol";

contract NodeManager is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable
{
    uint16 private constant CONTRACT_VERSION = 1;
    uint16 internal deployedContractVersion;

    function initialize() public virtual initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Ownable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        deployedContractVersion = CONTRACT_VERSION;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlUpgradeable)
        returns (bool)
    {
        if (super.supportsInterface(interfaceId)) {
            return true;
        } else {
            return
                interfaceId == type(IERC1822ProxiableUpgradeable).interfaceId;
        }
    }

    function getContractVersion() public pure virtual returns (uint16) {
        return CONTRACT_VERSION;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        view
        virtual
        override
        onlyOwner
    {
        NodeManager newContract = NodeManager(newImplementation);
        uint16 newVersion = newContract.getContractVersion();
        require(deployedContractVersion < newVersion, "NO_DOWNGRADE");
    }

    function test() public pure virtual returns (string memory) {
        return "Greetings from NodeManager";
    }
}
