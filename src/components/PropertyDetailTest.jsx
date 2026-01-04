import React from 'react'
import { useParams } from 'react-router-dom'

function PropertyDetailTest() {
  const { caseNumber } = useParams()
  
  return (
    <div style={{ padding: '50px', fontSize: '24px' }}>
      <h1>Property Detail Test Page</h1>
      <p>Case Number: {caseNumber}</p>
      <p>If you can see this, the routing works!</p>
    </div>
  )
}

export default PropertyDetailTest
