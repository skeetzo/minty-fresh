// App.js
import React from "react";
import { DrizzleContext } from "@drizzle/react-plugin";
import { Drizzle } from "@drizzle/store";

import SimpleStorage from "./contracts/SimpleStorage.json";
import MyComponent from "./MyComponent"; // Check out drizzle's react components at @drizzle/react-components

const drizzleOptions = {
  contracts: [SimpleStorage],
  events: {
    SimpleStorage: ["StorageSet"],
  },
};

const drizzle = new Drizzle(drizzleOptions);

const App = () => {
  return (
    <DrizzleContext.Provider drizzle={drizzle}>
      <DrizzleContext.Consumer>
        {drizzleContext => {
          const {drizzle, drizzleState, initialized} = drizzleContext;

          if(!initialized) {
            return "Loading..."
          }

          return (
            <MyComponent drizzle={drizzle} drizzleState={drizzleState} />
            )
          }}
      </DrizzleContext.Consumer>
    </DrizzleContext.Provider>
  );
}

export default App;
