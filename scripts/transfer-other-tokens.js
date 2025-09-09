/* eslint-disable no-console */
const { ethers } = require("hardhat");

async function main() {
  const HLT_ADDRESS = process.env.HLT_ADDRESS || "0x74f1ED24295F42682EEB4F4A36d264cdA40DB66e";

  const [owner] = await ethers.getSigners();
  const HLTToken = await ethers.getContractFactory("HLTToken");
  const hlt = HLTToken.attach(HLT_ADDRESS);

  console.log("Owner:", owner.address);
  console.log("HLT:", HLT_ADDRESS);

  const [transferred, addrs] = await Promise.all([
    hlt.getTokenAllocationStatus(),
    hlt.getContractAddresses(), // returns (crowdsaleContract, otherAccount)
  ]);
  const otherAccount = addrs[1];
  console.log("otherAccount:", otherAccount);

  const [balOwnerBefore, balOtherBefore] = await Promise.all([
    hlt.balanceOf(owner.address),
    hlt.balanceOf(otherAccount),
  ]);
  console.log("owner before:", ethers.utils.formatEther(balOwnerBefore), "HLT");
  console.log("other before:", ethers.utils.formatEther(balOtherBefore), "HLT");

  if (transferred) {
    console.log("已转过 7600 万（otherTokensTransferred=true），无需重复执行。");
    return;
  }

  console.log("开始转移 7600 万 HLT 到 otherAccount...");
  const tx = await hlt.transferOtherTokens();
  console.log("tx:", tx.hash);
  await tx.wait();

  const [balOwnerAfter, balOtherAfter] = await Promise.all([
    hlt.balanceOf(owner.address),
    hlt.balanceOf(otherAccount),
  ]);
  console.log("owner after:", ethers.utils.formatEther(balOwnerAfter), "HLT");
  console.log("other after:", ethers.utils.formatEther(balOtherAfter), "HLT");
  console.log("完成。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});