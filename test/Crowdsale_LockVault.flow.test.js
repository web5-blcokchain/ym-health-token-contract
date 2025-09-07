const { expect } = require("chai");
const { ethers, network } = require("hardhat");

/**
 * Crowdsale + LockVault end-to-end flow
 * - Deploy MockUSDT(6 decimals), HLTToken(18 decimals), LockVault, Crowdsale
 * - Fund Crowdsale with HLT, set vault on Crowdsale, set crowdsale on Vault
 * - Start crowdsale, buy with USDT, verify vault schedule & balances
 * - Before unlock claim should be zero, after 12 months claimAll transfers HLT to user
 */

describe("Crowdsale + LockVault - E2E", function () {
  async function deployAll() {
    const [owner, otherAccount, buyer] = await ethers.getSigners();

    // Deploy MockUSDT (constructor expects only initialOwner)
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy(owner.address);
    await usdt.deployed?.();
    await usdt.waitForDeployment?.();

    // Deploy HLTToken
    const HLTToken = await ethers.getContractFactory("HLTToken");
    const token = await HLTToken.deploy("HealthLife Token", "HLT", owner.address, otherAccount.address);
    await token.deployed?.();
    await token.waitForDeployment?.();

    // Deploy Crowdsale
    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const lockDuration = 3600; // 1小时，更快完成端到端验证
    const crowdsale = await Crowdsale.deploy(token.address ?? (await token.getAddress()), usdt.address ?? (await usdt.getAddress()), owner.address, lockDuration);
    await crowdsale.deployed?.();
    await crowdsale.waitForDeployment?.();

    // Deploy LockVault
    const LockVault = await ethers.getContractFactory("LockVault");
    const vault = await LockVault.deploy(token.address ?? (await token.getAddress()), owner.address);
    await vault.deployed?.();
    await vault.waitForDeployment?.();

    // Wire Crowdsale <-> Vault
    await (await crowdsale.connect(owner).setVault(vault.address ?? (await vault.getAddress()))).wait();
    await (await vault.connect(owner).setCrowdsale(crowdsale.address ?? (await crowdsale.getAddress()))).wait();

    // Fund Crowdsale with HLT (transfer some sale tokens to crowdsale)
    const saleFund = ethers.utils.parseUnits("1000000", 18); // 1,000,000 HLT for tests
    await (await token.connect(owner).transfer(crowdsale.address ?? (await crowdsale.getAddress()), saleFund)).wait();

    return { owner, otherAccount, buyer, usdt, token, crowdsale, vault };
  }

  it("should complete the full purchase -> lock -> claim flow", async function () {
    const { owner, buyer, usdt, token, crowdsale, vault } = await deployAll();

    // Owner starts crowdsale
    await (await crowdsale.connect(owner).startCrowdsale()).wait();

    // Mint USDT to buyer and approve
    const usdtAmount = ethers.utils.parseUnits("10", 6); // 10 USDT (6 decimals)
    await (await usdt.connect(owner).mint(buyer.address, usdtAmount)).wait();
    await (await usdt.connect(buyer).approve(crowdsale.address ?? (await crowdsale.getAddress()), usdtAmount)).wait();

    // Price: 1 USDT = 12 HLT, HLT 18 decimals
    const expectedHLT = usdtAmount.mul(ethers.utils.parseUnits("1", 12)).mul(12); // _usdtAmount * 1e12 * tokensPerUSDT

    // Buy
    await (await crowdsale.connect(buyer).buyTokens(usdtAmount)).wait();

    // Buyer should not receive HLT immediately
    const buyerHLTAfter = await token.balanceOf(buyer.address);
    expect(buyerHLTAfter.isZero()).to.be.true;

    // Vault should have received HLT
    const vaultHLT = await token.balanceOf(vault.address ?? (await vault.getAddress()));
    expect(vaultHLT.toString()).to.equal(expectedHLT.toString());

    // Schedule exists and locked balance correct
    const schedules = await vault.schedulesOf(buyer.address);
    expect(schedules.length).to.equal(1);
    const locked = await vault.getLockedBalance(buyer.address);
    expect(locked.toString()).to.equal(expectedHLT.toString());

    // Claimable should be zero before unlock
    const claimableBefore = await vault.getClaimable(buyer.address);
    expect(claimableBefore.isZero()).to.be.true;

    // Fast-forward time by 12 months + 1 day
    const oneYear = 365 * 24 * 60 * 60;
    await network.provider.send("evm_increaseTime", [oneYear + 1]);
    await network.provider.send("evm_mine");

    // Now claimable equals locked
    const claimableAfter = await vault.getClaimable(buyer.address);
    expect(claimableAfter.toString()).to.equal(expectedHLT.toString());

    // Claim all
    await (await vault.connect(buyer).claimAll()).wait();

    // HLT should be transferred to buyer
    const buyerHLTFinal = await token.balanceOf(buyer.address);
    expect(buyerHLTFinal.toString()).to.equal(expectedHLT.toString());

    // Vault should be reduced
    const vaultHLTAfter = await token.balanceOf(vault.address ?? (await vault.getAddress()));
    expect(vaultHLTAfter.isZero()).to.be.true;

    // Locked balance now zero
    const lockedAfter = await vault.getLockedBalance(buyer.address);
    expect(lockedAfter.isZero()).to.be.true;
  });
});