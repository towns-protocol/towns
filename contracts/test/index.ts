import { expect } from "chai";
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

  it("V2 reverts downgrade to V1", async function () {
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
    await expect(
      upgrades.upgradeProxy(tester.address, TestContract)
    ).to.be.revertedWith("Contract may not downgrade");
    expect(await tester.test()).to.equal("Greetings from TestContractV2");
  });
});
