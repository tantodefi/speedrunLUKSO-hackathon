import { Wallet } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const deployerPrivateKey =
  process.env.DEPLOYER_PRIVATE_KEY ?? "0xeea9c799728160aa56424244af84b39d606c304d6b22abdeb4e9b50b28ebac04";

async function main() {
  const wallet = new Wallet(deployerPrivateKey);
  console.log("Deployer address:", wallet.address);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
