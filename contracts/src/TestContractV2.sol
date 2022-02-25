//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./TestContract.sol";

contract TestContractV2 is TestContract {
    uint16 private constant CONTRACT_VERSION = 2;

    struct Round {
        bytes32 nonce;
        mapping(address => Guess[]) committedGuesses;
    }
    Round[] private rounds;

    struct Guess {
        bytes32 guessHash;
        bool revealed;
    }

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

    function newGame(bytes32 nonce) public {
        require(rounds.length == 0, "newGameR1");
        Round storage newRound = rounds.push();
        newRound.nonce = nonce;
    }

    function currentGame() public view returns (bytes32) {
        require(rounds.length == 1, "currentGameR1");
        return rounds[0].nonce;
    }

    function hasRunningGame() public view returns (bool) {
        return rounds.length == 1;
    }

    function commitGuess(bytes32 guessHash) public {
        //require(block.timestamp < guessDeadline, "Guess deadline has passed");
        require(rounds.length == 1, "commitGuessR1");
        Guess memory guess;
        guess.guessHash = guessHash;
        guess.revealed = false;
        rounds[0].committedGuesses[msg.sender].push(guess);
    }

    function getCommittedGuesses() public view returns (Guess[] memory) {
        return rounds[0].committedGuesses[msg.sender];
    }

}
