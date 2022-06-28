import React from "react";
import { newContextComponents } from "@drizzle/react-components";
import logo from "./logo.png";

// const { AccountData } = newContextComponents;
const { AccountData, ContractData, ContractForm } = newContextComponents;

const contract = "Minty";

export default ({ drizzle, drizzleState }) => {
  // destructure drizzle and drizzleState from props
  return (
    <div className="App">
      <div>
        <img src={logo} alt="drizzle-logo" />
        <h1>Minty Fresh</h1>
        <p>
          Tool for assisting in NFT uploads and minting.
        </p>
      </div>

      <div className="section">
        <h2>Active Account</h2>
        <AccountData
          drizzle={drizzle}
          drizzleState={drizzleState}
          accountIndex={0}
          units="ether"
          precision={3}
        />
      </div>
      
      <div className="section">

        <h2>{contract}</h2>

        <p>
          <strong>My Balance: </strong>
          <ContractData
            drizzle={drizzle}
            drizzleState={drizzleState}
            contract={contract}
            method="balanceOf"
            methodArgs={[drizzleState.accounts[0]]}
          />
        </p>

        <h3>Mint</h3>

        <p>
          Mint a new NFT from an existing schema template.
        </p>

        <p>
          <ContractForm
            drizzle={drizzle}
            drizzleState={drizzleState}
            contract={contract}
            method="mintToken"
            labels={["To Address", "Token URI"]}
          />
        </p>

        <h3>Show</h3>

        <p>
          Get info about an NFT using its token ID.
        </p>

        <p>
          <ContractForm
            drizzle={drizzle}
            drizzleState={drizzleState}
            contract={contract}
            method="tokenURI"
            labels={["Token ID"]}
          />
        </p>

        <h3>Transfer</h3>

        <p>
          Transfer your NFT to another address using its token ID.
        </p>

        <p>
          <ContractForm
            drizzle={drizzle}
            drizzleState={drizzleState}
            contract={contract}
            method="safeTransferFrom"
            labels={["From Address", "To Address", "Token ID"]}
          />
        </p>

      </div>

    </div>
  );
};
