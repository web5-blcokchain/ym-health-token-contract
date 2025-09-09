const { ethers } = require("hardhat");

async function main() {
    const crowdsaleAddress = process.env.CROWDSALE_ADDRESS;
    if (!crowdsaleAddress) {
        throw new Error("Missing CROWDSALE_ADDRESS env var");
    }
    const [owner] = await ethers.getSigners();
    console.log("Owner:", owner.address);

    const Crowdsale = await ethers.getContractFactory("Crowdsale");
    const crowdsale = Crowdsale.attach(crowdsaleAddress);

    const isActive = await crowdsale.crowdsaleActive();
    if (isActive) {
        console.log("Crowdsale already active");
        return;
    }
    console.log("Starting crowdsale...");
    const tx = await crowdsale.startCrowdsale();
    await tx.wait();
    console.log("Crowdsale started. Tx:", tx.hash);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});