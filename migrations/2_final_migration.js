const Minty = artifacts.require("Minty");
const MintyPreset = artifacts.require("MintyPreset");

module.exports = async function (deployer) {
  await deployer.deploy(Minty, "Julep", "JLP");
  await deployer.deploy(MintyPreset, "Julep", "JLP");
};