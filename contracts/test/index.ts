import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    const Greeter = await ethers.getContractFactory("Greeter");
    const greeter = await upgrades.deployProxy(Greeter, ["Hello, world!"], {
      kind: "uups",
    });
    await greeter.deployed();

    expect(await greeter.greet()).to.equal("Greetings from Greeter");
  });

  it("works before and after upgrading", async function () {
    const Greeter = await ethers.getContractFactory("Greeter");

    const greeter = await upgrades.deployProxy(Greeter, ["Hello, world!"], {
      kind: "uups",
    });
    expect(await greeter.greet()).to.equal("Greetings from Greeter");

    const GreeterV2 = await ethers.getContractFactory("GreeterV2");
    await upgrades.upgradeProxy(greeter.address, GreeterV2);
    expect(await greeter.greet()).to.equal("Greetings from V2");
  });

  it("returns the uri before and after upgrading", async function () {
    const Greeter = await ethers.getContractFactory("Greeter");

    const greeter = await upgrades.deployProxy(
      Greeter,
      ["https://localhost/uri"],
      {
        kind: "uups",
      }
    );
    expect(await greeter.greet()).to.equal("Greetings from Greeter");
    expect(await greeter.uri(1)).to.equal("https://localhost/uri");

    const GreeterV2 = await ethers.getContractFactory("GreeterV2");

    await upgrades.upgradeProxy(greeter.address, GreeterV2, {
      call: { fn: "updateTokenURI", args: ["https://localhost/uri2"] },
    });
    expect(await greeter.greet()).to.equal("Greetings from V2");
    expect(await greeter.uri(1)).to.equal("https://localhost/uri2");
  });
});
