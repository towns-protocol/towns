//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./TestContract.sol";

contract TestContractV2 is TestContract {
    uint16 private constant CONTRACT_VERSION = 2;

    function initialize(string memory uri_) public override initializer {
        super.initialize(uri_);
        deployedContractVersion = CONTRACT_VERSION;
    }

    function getContractVersion() public pure override returns (uint16) {
        return super.getContractVersion() + 1;
    }

    function test() public pure override returns (string memory) {
        return "Greetings from TestContractV2";
    }

    function updateTokenURI(string memory uri_) public onlyOwner {
        _setURI(uri_);
    }
}
