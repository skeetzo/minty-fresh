import contracts from "../contracts/deployed_addresses.json" with { type: "json" };

export function getContractAddress(chainId, contractName, projectName="") {
  for (const contractModule in contracts) {
    // "ModuleName#ContractName" : "address"
    // console.log(contractModule)
    if (contractModule.toLowerCase().includes("#"+contractName.toLowerCase())) {
      if (projectName != "" && !contractModule.includes(projectName)) continue;
      console.log("contract found:", contractName, contracts[contractModule]);
      return contracts[contractModule];
    }
  }
}