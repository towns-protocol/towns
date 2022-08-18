import { expect } from "./chai-setup";

import { ethers, deployments, getNamedAccounts } from "hardhat";

describe("Space manager contract", function () {
  it("Create a space with a name", async function () {
    await deployments.fixture(["zion-space-manager"]);
    await deployments.fixture(["user-granted-entitlement-manager"]);

    const spaceName = "myspace";
    console.log("Deployed Zion space manager");
    const { deployer } = await getNamedAccounts();
    console.log("Got token deployer: ", deployer);
    const zionSpaceManager = await ethers.getContract("ZionSpaceManager");
    const userGrantedEntitlementManager = await ethers.getContract(
      "UserGrantedEntitlementManager"
    );
    const entitlementManagerAddress = userGrantedEntitlementManager.address;

    console.log("Zion space manager address is ", zionSpaceManager.address);
    await zionSpaceManager.createSpace(spaceName, [entitlementManagerAddress]);
    const {
      spaceId,
      createdAt,
      name,
      creatorAddress,
      ownerAddress,
    } = await zionSpaceManager.getSpaceValues(1);

    const entitlementManagerAddresses = await zionSpaceManager.getSpaceEntitlementManagerAddresses(
      spaceId
    );
    // const spaceValues2 = await zionSpaceManager.getSpaceValues(2);
    // const spaceValues0 = await zionSpaceManager.getSpaceValues(0);
    console.log(`Space id is ${spaceId}`);
    console.log(`Created at is ${createdAt}`);
    console.log(`Name is ${name}`);
    console.log(`Creator address is ${creatorAddress}`);
    console.log(`Owner address is ${ownerAddress}`);
    console.log(
      `Entitlement manager addresses are ${entitlementManagerAddresses}`
    );
    console.log(
      `Entitlement manager address is ${entitlementManagerAddresses[0]}`
    );
    expect(spaceId).to.equal(1);
    expect(name).to.equal(spaceName);
    expect(entitlementManagerAddresses[0]).to.equal(entitlementManagerAddress);
  });

  it("Create a space with a duplicate name", async function () {
    await deployments.fixture(["zion-space-manager"]);
    await deployments.fixture(["user-granted-entitlement-manager"]);

    const spaceName = "myspace";
    const { deployer } = await getNamedAccounts();

    const zionSpaceManager = await ethers.getContract("ZionSpaceManager");
    const userGrantedEntitlementManager = await ethers.getContract(
      "UserGrantedEntitlementManager"
    );
    const entitlementManagerAddress = userGrantedEntitlementManager.address;

    await zionSpaceManager.createSpace(spaceName, [entitlementManagerAddress]);
    const { spaceId, name } = await zionSpaceManager.getSpaceValues(1);

    expect(spaceId).to.equal(1);
    expect(name).to.equal(spaceName);
    // expect(entitlementManagerAddress).to.equal(deployer);

    await expect(
      zionSpaceManager.createSpace(spaceName, [entitlementManagerAddress])
    ).to.be.revertedWith("Space name already exists");
  });

  //   it("Create space and add read write entitlement", async function () {
  //     await deployments.fixture(["zion-space-manager"]);
  //     const spaceName = "myspace";
  //     const { deployer } = await getNamedAccounts();

  //     const zionSpaceManager = await ethers.getContract("ZionSpaceManager");
  //     await zionSpaceManager.createSpace(spaceName, deployer);
  //     const {
  //       spaceId,
  //       name,
  //       entitlementManagerAddress,
  //     } = await zionSpaceManager.getSpaceValues(1);

  //     expect(spaceId).to.equal(1);
  //     expect(name).to.equal(spaceName);
  //     expect(entitlementManagerAddress).to.equal(deployer);

  //     await zionSpaceManager.setUserEntitlements(1, 0, deployer, [2, 3, 4, 5]);

  //   });
});
