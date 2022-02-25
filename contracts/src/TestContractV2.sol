//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./TestContract.sol";

contract TestContractV2 is TestContract {
    uint16 private constant CONTRACT_VERSION = 2;

    function initialize(string memory uri_) public override initializer {
        super.initialize(uri_);
        deployedContractVersion = CONTRACT_VERSION;
        console.log("TestContractV2 initialized");
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

    function newGame(bytes32 nonce) public {
        require(rounds.length == 0, "newGame called during running game");
        Round storage newRound = rounds.push();
        newRound.nonce = nonce;
    }

    function currentGame() public view returns (bytes32) {
        require(rounds.length == 1, "currentGame called without running game");
        return rounds[0].nonce;
    }

    function hasRunningGame() public view returns (bool) {
        return rounds.length == 1;
    }

    function commitGuess(bytes32 guessHash) public {
        //require(block.timestamp < guessDeadline, "Guess deadline has passed");
        require(rounds.length == 1, "commitGuess called without running game");
        Guess memory guess;
        guess.guessHash = guessHash;
        guess.revealed = false;
        rounds[0].committedGuesses[msg.sender].push(guess);
    }

    function getCommittedGuesses() public view returns (TestContract.Guess[] memory) {
        return rounds[0].committedGuesses[msg.sender];
    }

}
