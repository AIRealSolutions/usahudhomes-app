import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { propertyService } from '../services/database'

function PropertyDetailSimple() {
  const { caseNumber } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProperty = async () => {
      setLoading(true)
      const result = await propertyService.getPropertyByCaseNumber(caseNumber)
      if (result.success) {
        setProperty(result.data)
      }
      setLoading(false)
    }
    loadProperty()
  }, [caseNumber])

  if (loading) {
    return <div style={{ padding: '50px' }}>Loading property...</div>
  }

  if (!property) {
    return <div style={{ padding: '50px' }}>Property not found</div>
  }

  return (
    <div style={{ padding: '50px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>{property.address}</h1>
      <p>{property.city}, {property.state} {property.zipCode}</p>
      <p>Case Number: {property.case_number}</p>
      <p>Price: ${property.price?.toLocaleString()}</p>
      <p>Bedrooms: {property.bedrooms}</p>
      <p>Bathrooms: {property.bathrooms}</p>
      <p>Square Feet: {property.sqft}</p>
      <p>Status: {property.status}</p>
      
      {property.images && property.images[0] && (
        <img src={property.images[0]} alt={property.address} style={{ maxWidth: '100%', marginTop: '20px' }} />
      )}
      
      <div style={{ marginTop: '20px' }}>
        <Link to="/search">← Back to Search</Link>
      </div>
    </div>
  )
}

export default PropertyDetailSimple
