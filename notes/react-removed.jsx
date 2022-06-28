<div className="section">
  <h2>SimpleStorage</h2>
  <p>
    This shows a simple ContractData component with no arguments, along
    with a form to set its value.
  </p>
  <p>
    <strong>Stored Value: </strong>
    <ContractData
      drizzle={drizzle}
      drizzleState={drizzleState}
      contract="SimpleStorage"
      method="storedData"
    />
  </p>
  <ContractForm drizzle={drizzle} contract="SimpleStorage" method="set" />
</div>



<div className="section">
  <h2>MintyPreset</h2>
  <p>
    Finally this contract shows data types with additional considerations.
    Note in the code the strings below are converted from bytes to UTF-8
    strings and the device data struct is iterated as a list.
  </p>
  <p>
    <strong>String 1: </strong>
    <ContractData
      drizzle={drizzle}
      drizzleState={drizzleState}
      contract="MintyPreset"
      method="string1"
      toUtf8
    />
  </p>
  <p>
    <strong>String 2: </strong>
    <ContractData
      drizzle={drizzle}
      drizzleState={drizzleState}
      contract="MintyPreset"
      method="string2"
      toUtf8
    />
  </p>
  <strong>Single Device Data: </strong>
  <ContractData
    drizzle={drizzle}
    drizzleState={drizzleState}
    contract="MintyPreset"
    method="singleDD"
  />
</div>