// sample component
import React from 'react';

class CacheCallExample extends React.Component {
  state = { dataKey: null };

  componentDidMount() {
    const { drizzle } = this.props;
    const contract = drizzle.contracts.SimpleStorage;
    let dataKey = contract.methods["storedData"].cacheCall(); // declare this call to be cached and synchronized
    this.setState({ dataKey });
  }

  render() {
    const { SimpleStorage } = this.props.drizzleState.contracts;
    const displayData = SimpleStorage.storedData[this.state.dataKey]; // if displayData (an object) exists, then we can display the value below
    return (
      <p>Hi from Truffle! Here is your storedData: {displayData && displayData.value}</p>
    )
  }
}

export default CacheCallExample
