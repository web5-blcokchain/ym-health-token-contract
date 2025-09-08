const { expect } = require("chai");
const { ethers } = require("hardhat");

// simple helper to assert revert without hardhat-chai-matchers
async function expectRevert(promise, message) {
  let failed = false;
  try {
    await promise;
  } catch (err) {
    failed = true;
    if (message) {
      expect(err.message).to.include(message);
    }
  }
  if (!failed) {
    throw new Error("Expected revert, but transaction succeeded");
  }
}

// Crowdsale + Token-level locking behavior tests
// - Multiple purchases create multiple lock entries
// - Transfer restriction: cannot transfer locked portion
// - Edge transfer: exactly equal to unlocked amount is allowed
// - Mid-sale price change affects subsequent purchases
// - Batch user statistics aggregation

describe("Crowdsale locking behavior (token-level)", function () {
  async function deployAll() {
    const [owner, other, alice, bob, carol] = await ethers.getSigners();

    // Deploy token
    const HLTToken = await ethers.getContractFactory("HLTToken");
    const hltToken = await HLTToken.deploy("HealthLife Token", "HLT", owner.address, other.address);
    await hltToken.deployed();

    // Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy(owner.address);
    await usdt.deployed();

    // Deploy Crowdsale (1 hour lock for tests)
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const crowdsale = await Crowdsale.deploy(hltToken.address, usdt.address, owner.address, 3600);
    await crowdsale.deployed();

    // Bind crowdsale contract on token and fund sale supply (use SALE_AMOUNT)
    await hltToken.setCrowdsaleContract(crowdsale.address);
    const saleAmount = await hltToken.SALE_AMOUNT();
    await hltToken.transfer(crowdsale.address, saleAmount);

    return { owner, other, alice, bob, carol, hltToken, usdt, crowdsale };
  }

  it("creates multiple lock entries across multiple purchases and restricts transfers of locked amounts", async function () {
    const { owner, alice, hltToken, usdt, crowdsale } = await deployAll();

    // Mint USDT to alice and approve
    const a100 = ethers.utils.parseUnits("100", 6);
    const a50 = ethers.utils.parseUnits("50", 6);
    await usdt.mint(alice.address, a100.add(a50));
    await usdt.connect(alice).approve(crowdsale.address, a100.add(a50));

    // Start crowdsale
    await crowdsale.startCrowdsale();

    // First purchase 100 USDT at default price (12 HLT/USDT)
    await crowdsale.connect(alice).buyTokens(a100);
    // Second purchase 50 USDT
    await crowdsale.connect(alice).buyTokens(a50);

    const locks = await hltToken.getLocks(alice.address);
    expect(locks.length).to.equal(2);

    const locked = await hltToken.getLockedAmount(alice.address);
    const bal = await hltToken.balanceOf(alice.address);
    expect(locked.eq(bal)).to.be.true; // all purchased tokens are locked

    // Attempt to transfer any positive amount should revert (no unlocked)
    await expectRevert(hltToken.connect(alice).transfer(owner.address, 1), "Transfer exceeds unlocked");
  });

  it("allows transferring exactly unlocked amount and reverts for amount > unlocked", async function () {
    const { owner, alice, hltToken, usdt, crowdsale } = await deployAll();

    // Prepare: alice buys 100 USDT -> fully locked 1200 HLT
    const a100 = ethers.utils.parseUnits("100", 6);
    await usdt.mint(alice.address, a100);
    await usdt.connect(alice).approve(crowdsale.address, a100);
    await crowdsale.startCrowdsale();
    await crowdsale.connect(alice).buyTokens(a100);

    // Owner transfers some unlocked HLT to alice (not locked)
    const freeAmt = ethers.utils.parseEther("10");
    await hltToken.transfer(alice.address, freeAmt);

    const unlocked = await hltToken.getUnlockedAmount(alice.address);
    expect(unlocked.eq(freeAmt)).to.be.true;

    // Transfer exactly unlocked amount -> should pass
    await hltToken.connect(alice).transfer(owner.address, freeAmt);

    // Now unlocked is 0, transferring 1 wei should revert
    await expectRevert(hltToken.connect(alice).transfer(owner.address, 1), "Transfer exceeds unlocked");
  });

  it("updates purchase amounts after mid-sale price change", async function () {
    const { owner, alice, hltToken, usdt, crowdsale } = await deployAll();

    // Mint and approve
    const amt = ethers.utils.parseUnits("1", 6);
    await usdt.mint(alice.address, amt.mul(2));
    await usdt.connect(alice).approve(crowdsale.address, amt.mul(2));

    await crowdsale.startCrowdsale();

    // Initial price should be 12
    const p0 = await crowdsale.getTokenPrice();
    expect(p0.eq(12)).to.be.true;

    // Buy before price change
    await crowdsale.connect(alice).buyTokens(amt);
    const balBefore = await hltToken.balanceOf(alice.address);
    expect(balBefore.eq(ethers.utils.parseEther("12"))).to.be.true;

    // Change price to 24
    await crowdsale.setTokenPrice(24);
    const p1 = await crowdsale.getTokenPrice();
    expect(p1.eq(24)).to.be.true;

    // Buy again
    await crowdsale.connect(alice).buyTokens(amt);
    const balAfter = await hltToken.balanceOf(alice.address);
    // total should be 12 + 24 = 36 HLT
    expect(balAfter.eq(ethers.utils.parseEther("36"))).to.be.true;

    // Locks should have two entries
    const locks = await hltToken.getLocks(alice.address);
    expect(locks.length).to.equal(2);
  });

  it("aggregates batch user statistics correctly", async function () {
    const { owner, alice, bob, carol, hltToken, usdt, crowdsale } = await deployAll();

    await crowdsale.startCrowdsale();

    const one = ethers.utils.parseUnits("1", 6);
    const two = ethers.utils.parseUnits("2", 6);
    const three = ethers.utils.parseUnits("3", 6);

    // mint + approve for three users
    for (const [user, amt] of [ [alice, one], [bob, two], [carol, three] ]) {
      await usdt.mint(user.address, amt);
      await usdt.connect(user).approve(crowdsale.address, amt);
      await crowdsale.connect(user).buyTokens(amt);
    }

    // totals: USDT = 6; HLT = 6 * 12 = 72
    const totalUSDT = await crowdsale.totalUSDTRaised();
    const totalHLT = await crowdsale.totalHLTSold();
    const participants = await crowdsale.totalParticipants();

    expect(totalUSDT.eq(one.add(two).add(three))).to.be.true;
    expect(totalHLT.eq(ethers.utils.parseEther("72"))).to.be.true;
    expect(participants.eq(3)).to.be.true;

    // user info batch check
    const infoA = await crowdsale.getUserInfo(alice.address);
    const infoB = await crowdsale.getUserInfo(bob.address);
    const infoC = await crowdsale.getUserInfo(carol.address);

    expect(infoA.participated).to.equal(true);
    expect(infoB.participated).to.equal(true);
    expect(infoC.participated).to.equal(true);

    expect(infoA.usdtPurchased.eq(one)).to.be.true;
    expect(infoB.usdtPurchased.eq(two)).to.be.true;
    expect(infoC.usdtPurchased.eq(three)).to.be.true;

    expect(infoA.hltAmount.eq(ethers.utils.parseEther("12"))).to.be.true;
    expect(infoB.hltAmount.eq(ethers.utils.parseEther("24"))).to.be.true;
    expect(infoC.hltAmount.eq(ethers.utils.parseEther("36"))).to.be.true;
  });
});