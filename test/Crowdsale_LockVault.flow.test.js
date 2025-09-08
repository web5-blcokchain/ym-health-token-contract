const { expect } = require("chai");
const { ethers, network } = require("hardhat");

/**
 * Crowdsale + Token-level locking (no LockVault) end-to-end flow
 * - Deploy MockUSDT(6), HLTToken(18), Crowdsale
 * - Fund Crowdsale with HLT, set crowdsale on token, start crowdsale
 * - Buy with USDT -> HLT transfers to buyer immediately, while token records a lock entry
 * - Before unlock: buyer cannot transfer locked amount; but can transfer any non-locked tokens
 * - After unlock: buyer can transfer all
 */

describe("Crowdsale + TokenLock - E2E", function () {
  async function deployAll() {
    const [owner, otherAccount, buyer, receiver] = await ethers.getSigners();

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

    // 绑定 crowdale 到 token
    await (await token.connect(owner).setCrowdsaleContract(crowdsale.address ?? (await crowdsale.getAddress()))).wait();

    // 为 Crowdale 充值售卖 HLT
    const saleFund = ethers.utils.parseUnits("1000000", 18); // 1,000,000 HLT for tests
    await (await token.connect(owner).transfer(crowdsale.address ?? (await crowdsale.getAddress()), saleFund)).wait();

    return { owner, otherAccount, buyer, receiver, usdt, token, crowdsale, lockDuration };
  }

  // simple generic revert checker (avoid waffle matchers)
  async function expectRevert(promise) {
    let reverted = false;
    try {
      const tx = await promise;
      await tx.wait?.();
    } catch (e) {
      reverted = true;
    }
    if (!reverted) {
      throw new Error("Expected revert but the tx succeeded");
    }
  }

  it("should complete purchase -> lock -> transfer constraints -> unlock flow", async function () {
    const { owner, buyer, receiver, usdt, token, crowdsale, lockDuration } = await deployAll();

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

    // Buyer should receive HLT immediately
    const buyerHLTAfter = await token.balanceOf(buyer.address);
    expect(buyerHLTAfter.toString()).to.equal(expectedHLT.toString());

    // Token-level lock should be recorded
    const locks = await token.getLocks(buyer.address);
    expect(locks.length).to.equal(1);
    const lockedNow = await token.getLockedAmount(buyer.address);
    expect(lockedNow.toString()).to.equal(expectedHLT.toString());
    const unlockedNow = await token.getUnlockedAmount(buyer.address);
    expect(unlockedNow.isZero()).to.be.true;

    // Send some non-locked tokens to buyer (simulate transfer from owner not via crowdsale)
    const extra = ethers.utils.parseUnits("50", 18);
    await (await token.connect(owner).transfer(buyer.address, extra)).wait();

    // Now buyer should have some unlocked amount (= extra)
    const unlockedAfterExtra = await token.getUnlockedAmount(buyer.address);
    expect(unlockedAfterExtra.toString()).to.equal(extra.toString());

    // Buyer can transfer within unlocked amount
    const transferAmt = ethers.utils.parseUnits("10", 18);
    await (await token.connect(buyer).transfer(receiver.address, transferAmt)).wait();
    const receiverBal = await token.balanceOf(receiver.address);
    expect(receiverBal.toString()).to.equal(transferAmt.toString());

    // But cannot transfer more than unlocked (expected revert)
    const tryOver = expectedHLT; // equals locked amount right now
    await expectRevert(token.connect(buyer).transfer(receiver.address, tryOver));

    // Fast-forward time by lockDuration + 1
    await network.provider.send("evm_increaseTime", [lockDuration + 1]);
    await network.provider.send("evm_mine");

    // Now locked becomes zero; user can transfer freely
    const lockedAfter = await token.getLockedAmount(buyer.address);
    expect(lockedAfter.isZero()).to.be.true;

    const fullTransfer = await token.balanceOf(buyer.address);
    await (await token.connect(buyer).transfer(receiver.address, fullTransfer)).wait();
    const buyerFinal = await token.balanceOf(buyer.address);
    expect(buyerFinal.isZero()).to.be.true;
  });
});