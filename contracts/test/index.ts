import { expect } from "chai";
import { utils } from "ethers";
import { ethers, upgrades } from "hardhat";

describe("Test", function () {
  it("V1 Should deploy and implements the ERC1155 Interfaces", async function () {
    const TestContract = await ethers.getContractFactory("TestContract");
    const tester = await upgrades.deployProxy(
      TestContract,
      ["https://localhost/uri_from_init"],
      {
        kind: "uups",
      }
    );
    await tester.deployed();
    expect(await tester.supportsInterface("0xd9b67a26")).to.equal(true);
    expect(await tester.supportsInterface("0x00000000")).to.equal(false);

    expect(await tester.uri(0)).to.equal("https://localhost/uri_from_init");

    expect(await tester.test()).to.equal("Greetings from TestContract");
  });

  it("V1 upgrades to V2 succesfully changing tokenUrl", async function () {
    const TestContract = await ethers.getContractFactory("TestContract");

    const tester = await upgrades.deployProxy(
      TestContract,
      ["https://localhost/uri"],
      {
        kind: "uups",
      }
    );
    expect(await tester.test()).to.equal("Greetings from TestContract");
    expect(await tester.uri(1)).to.equal("https://localhost/uri");

    const TestContractV2 = await ethers.getContractFactory("TestContractV2");

    await upgrades.upgradeProxy(tester.address, TestContractV2, {
      call: { fn: "updateTokenURI", args: ["https://localhost/uri2"] },
    });

    expect(await tester.test()).to.equal("Greetings from TestContractV2");
    expect(await tester.uri(1)).to.equal("https://localhost/uri2");
  });

  it("V2 deploys succesfully", async function () {
    const TestContractV2 = await ethers.getContractFactory("TestContractV2");
    const tester = await upgrades.deployProxy(
      TestContractV2,
      ["https://localhost/uri_from_init"],
      {
        kind: "uups",
      }
    );
    await tester.deployed();
    expect(await tester.supportsInterface("0xd9b67a26")).to.equal(true);
    expect(await tester.supportsInterface("0x00000000")).to.equal(false);

    expect(await tester.uri(0)).to.equal("https://localhost/uri_from_init");

    expect(await tester.test()).to.equal("Greetings from TestContractV2");
  });

  /*
   * This test fails because we V2 introduces a storage slot for rounds that V1
   * doesn't have.
   */
  it("V2 throws on downgrade to V1", async function () {
    const TestContractV2 = await ethers.getContractFactory("TestContractV2");
    const tester = await upgrades.deployProxy(
      TestContractV2,
      ["https://localhost/uri_from_init"],
      {
        kind: "uups",
      }
    );
    await tester.deployed();

    expect(await tester.uri(0)).to.equal("https://localhost/uri_from_init");
    expect(await tester.test()).to.equal("Greetings from TestContractV2");

    const TestContract = await ethers.getContractFactory("TestContract");
    let error;
    try {
      const newProxy = await upgrades.upgradeProxy(
        tester.address,
        TestContract
      );
    } catch (err: any) {
      error = err;
    }
    expect(error.message === "New storage layout is incompatible");
    expect(await tester.test()).to.equal("Greetings from TestContractV2");
  });

  it("V2 starts a new round", async function () {
    const TestContractV2 = await ethers.getContractFactory("TestContractV2");
    const tester = await upgrades.deployProxy(
      TestContractV2,
      ["https://localhost/uri_from_init"],
      {
        kind: "uups",
      }
    );
    await tester.deployed();
    const gameNonce = utils.hexlify(utils.randomBytes(32));

    await tester.newGame(gameNonce);
    expect(await tester.currentGame()).to.equal(gameNonce);
    expect(await tester.hasRunningGame()).to.equal(true);
  });

  it("V2 double starts a new round", async function () {
    const TestContractV2 = await ethers.getContractFactory("TestContractV2");
    const tester = await upgrades.deployProxy(
      TestContractV2,
      ["https://localhost/uri_from_init"],
      {
        kind: "uups",
      }
    );
    await tester.deployed();
    const gameNonce = utils.hexlify(utils.randomBytes(32));

    await tester.newGame(gameNonce);
    expect(await tester.currentGame()).to.equal(gameNonce);
    expect(await tester.hasRunningGame()).to.equal(true);

    const gameNonce2 = utils.hexlify(utils.randomBytes(32));
    const failedStart = tester.newGame(gameNonce2);
    await expect(failedStart).to.be.revertedWith("newGameR1");
  });

  it("V2 currentGame called without running game", async function () {
    const TestContractV2 = await ethers.getContractFactory("TestContractV2");
    const tester = await upgrades.deployProxy(
      TestContractV2,
      ["https://localhost/uri_from_init"],
      {
        kind: "uups",
      }
    );
    await tester.deployed();
    await expect(tester.currentGame()).to.be.revertedWith("currentGameR1");
  });

  it("V2 commitGuess called without running game", async function () {
    const TestContractV2 = await ethers.getContractFactory("TestContractV2");
    const tester = await upgrades.deployProxy(
      TestContractV2,
      ["https://localhost/uri_from_init"],
      {
        kind: "uups",
      }
    );
    await tester.deployed();
    const gameNonce = utils.hexlify(utils.randomBytes(32));

    await expect(tester.commitGuess(gameNonce)).to.be.revertedWith(
      "commitGuessR1"
    );
  });

  it("V2 commits 5 guesses", async function () {
    const TestContractV2 = await ethers.getContractFactory("TestContractV2");
    const tester = await upgrades.deployProxy(
      TestContractV2,
      ["https://localhost/uri_from_init"],
      {
        kind: "uups",
      }
    );
    await tester.deployed();
    const gameNonce = utils.hexlify(utils.randomBytes(32));

    await tester.newGame(gameNonce);
    expect(await tester.currentGame()).to.equal(gameNonce);

    for (let i = 0; i < 5; i++) {
      const guess = utils.hexlify(utils.randomBytes(32));
      await tester.commitGuess(guess);
    }
    expect((await tester.getCommittedGuesses()).length).to.equal(5);
  });
});
