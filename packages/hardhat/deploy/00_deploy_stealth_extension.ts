import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployStealthExtension: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Get the deployer signer
  const deployerSigner = await hre.ethers.getSigner(deployer);

  // Get the contract factory
  const StealthExtension = await hre.ethers.getContractFactory("LSP17StealthExtension", deployerSigner);

  // Estimate gas for deployment
  const deployTx = await StealthExtension.getDeployTransaction();
  const estimatedGas = await deployerSigner.estimateGas(deployTx);
  console.log("Estimated deployment gas:", estimatedGas.toString());

  await deploy("LSP17StealthExtension", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
    gasLimit: Math.ceil(Number(estimatedGas) * 1.2), // Add 20% buffer
    gasPrice: "10000000", // 0.01 gwei
    waitConfirmations: 1,
  });
};

export default deployStealthExtension;
deployStealthExtension.tags = ["LSP17StealthExtension"];
