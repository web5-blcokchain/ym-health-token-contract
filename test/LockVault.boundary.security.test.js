const { expect } = require("chai");
const { ethers, network } = require("hardhat");

// Helper to expect revert without hardhat-chai-matchers
async function expectRevert(p, includes) {
  let reverted = false;
  try {
    await p;
  } catch (e) {
    const msg = e.message || String(e);
    if (includes) {
      expect(msg).to.include(includes);
    } else {
      expect(msg.toLowerCase()).to.include("revert");
    }
    reverted = true;
  }
  if (!reverted) {
    throw new Error("Expected revert but the tx succeeded");
  }
}

describe("LockVault - boundary & security", function () {
  async function deploy() {
    const [owner, other, buyer] = await ethers.getSigners();

    const HLTToken = await ethers.getContractFactory("HLTToken");
    const token = await HLTToken.deploy("HealthLife Token", "HLT", owner.address, other.address);
    await token.deployed?.();
    await token.waitForDeployment?.();

    const LockVault = await ethers.getContractFactory("LockVault");
    const vault = await LockVault.deploy(token.address ?? (await token.getAddress()), owner.address);
    await vault.deployed?.();
    await vault.waitForDeployment?.();

    return { owner, other, buyer, token, vault };
  }

  it("only owner can set crowdsale and rejects zero address", async function () {
    const { owner, other, vault } = await deploy();

    // Non-owner cannot set (generic revert due to OZ v5 custom error)
    await expectRevert(vault.connect(other).setCrowdsale(other.address));

    // Owner cannot set zero address
    await expectRevert(vault.connect(owner).setCrowdsale(ethers.constants.AddressZero), "Invalid crowdsale");

    // Owner set ok
    await (await vault.connect(owner).setCrowdsale(other.address)).wait();
    // No assert on event; success is enough
  });

  it("only crowdsale can create schedules; invalid params revert", async function () {
    const { owner, other, buyer, vault } = await deploy();

    // Before setting crowdsale, any caller should be rejected
    await expectRevert(
      vault.connect(owner).createSchedule(buyer.address, 1, 0, 1),
      "Only crowdsale"
    );

    // Set crowdsale = other
    await (await vault.connect(owner).setCrowdsale(other.address)).wait();

    // Non-crowdsale cannot create
    await expectRevert(
      vault.connect(owner).createSchedule(buyer.address, 1, 0, 1),
      "Only crowdsale"
    );

    // Invalid params from crowdsale
    await expectRevert(
      vault.connect(other).createSchedule(ethers.constants.AddressZero, 1, 0, 1),
      "Invalid user"
    );
    await expectRevert(
      vault.connect(other).createSchedule(buyer.address, 0, 0, 1),
      "Amount=0"
    );
    await expectRevert(
      vault.connect(other).createSchedule(buyer.address, 1, 10, 5),
      "Bad time"
    );
  });

  it("claim flows: zero before unlock; claimAll after unlock; isolation per user", async function () {
    const { owner, other, buyer, token, vault } = await deploy();

    // Set crowdsale = other
    await (await vault.connect(owner).setCrowdsale(other.address)).wait();

    // Prepare schedule params
    const block = await ethers.provider.getBlock("latest");
    const start = block.timestamp;
    const unlock = start + 365 * 24 * 60 * 60; // one year
    const amount = ethers.utils.parseUnits("1000", 18);

    // Fund vault with tokens for later claim
    await (await token.connect(owner).transfer(vault.address ?? (await vault.getAddress()), amount)).wait();

    // Create schedule from crowdsale
    await (await vault.connect(other).createSchedule(buyer.address, amount, start, unlock)).wait();

    // Check views
    const locked0 = await vault.getLockedBalance(buyer.address);
    expect(locked0.toString()).to.equal(amount.toString());
    const claimable0 = await vault.getClaimable(buyer.address);
    expect(claimable0.isZero()).to.be.true;

    // Other user has nothing to claim
    await expectRevert(vault.connect(other).claimAll(), "Zero claim");

    // Claim before unlock should revert (Zero claim in claimAll)
    await expectRevert(vault.connect(buyer).claimAll(), "Zero claim");

    // Fast forward to after unlock
    const oneYear = 365 * 24 * 60 * 60;
    await network.provider.send("evm_increaseTime", [oneYear + 1]);
    await network.provider.send("evm_mine");

    // Claimable equals amount
    const claimableAfter = await vault.getClaimable(buyer.address);
    expect(claimableAfter.toString()).to.equal(amount.toString());

    // Claim all
    await (await vault.connect(buyer).claimAll()).wait();

    // Buyer received
    const balBuyer = await token.balanceOf(buyer.address);
    expect(balBuyer.toString()).to.equal(amount.toString());

    // Vault decreased
    const balVault = await token.balanceOf(vault.address ?? (await vault.getAddress()));
    expect(balVault.isZero()).to.be.true;

    // Locked balance is now zero
    const locked1 = await vault.getLockedBalance(buyer.address);
    expect(locked1.isZero()).to.be.true;

    // Re-claim should revert (nothing left)
    await expectRevert(vault.connect(buyer).claimAll(), "Zero claim");
  });

  it("claim(ids): only unlocked ids; out-of-range and already-claimed reverts", async function () {
    const { owner, other, buyer, token, vault } = await deploy();

    await (await vault.connect(owner).setCrowdsale(other.address)).wait();

    const nowBlock = await ethers.provider.getBlock("latest");
    const now = nowBlock.timestamp;

    const amount1 = ethers.utils.parseUnits("100", 18);
    const amount2 = ethers.utils.parseUnits("200", 18);

    // Fund vault with enough tokens
    await (await token.connect(owner).transfer(vault.address ?? (await vault.getAddress()), amount1.add(amount2))).wait();

    // Create two schedules with different unlocks
    const unlock1 = now + 1000; // avoid flakiness
    const unlock2 = now + 100000; // far later
    await (await vault.connect(other).createSchedule(buyer.address, amount1, now, unlock1)).wait();
    await (await vault.connect(other).createSchedule(buyer.address, amount2, now, unlock2)).wait();

    // Out of range id
    await expectRevert(vault.connect(buyer).claim([2]), "Bad id");

    // Before unlock1, claim([0]) should revert Not unlocked
    await expectRevert(vault.connect(buyer).claim([0]), "Not unlocked");

    // Move time past unlock1 but before unlock2 precisely
    const deltaToUnlock1 = unlock1 - now + 1;
    await network.provider.send("evm_increaseTime", [deltaToUnlock1]);
    await network.provider.send("evm_mine");

    // Double-check current time is still before unlock2 on-chain
    const scheds = await vault.schedulesOf(buyer.address);
    const unlock2OnChain = scheds[1].unlock;
    const tsBefore = (await ethers.provider.getBlock("latest")).timestamp;
    const delta = Number(unlock2OnChain) - Number(tsBefore);
    expect(delta).to.be.greaterThan(0);

    // claim only first schedule
    await (await vault.connect(buyer).claim([0])).wait();

    // Second remains locked and unclaimed
    const locked = await vault.getLockedBalance(buyer.address);
    expect(locked.toString()).to.equal(amount2.toString());

    // Claiming first again should revert Nothing to claim
    await expectRevert(vault.connect(buyer).claim([0]), "Nothing to claim");

    // Claiming second before its unlock should still revert (generic)
    await expectRevert(vault.connect(buyer).claim([1]));

    // Move time to unlock second and claim
    const tsMid = (await ethers.provider.getBlock("latest")).timestamp;
    const deltaToUnlock2 = unlock2 - tsMid + 1;
    await network.provider.send("evm_increaseTime", [deltaToUnlock2]);
    await network.provider.send("evm_mine");

    await (await vault.connect(buyer).claim([1])).wait();

    const lockedAfter = await vault.getLockedBalance(buyer.address);
    expect(lockedAfter.isZero()).to.be.true;
  });
});