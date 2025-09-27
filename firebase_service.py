#!/usr/bin/env python3
"""
Firebase Service for USAhudHomes.com
Handles database operations for properties, leads, brokers, and referrals
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FirebaseService:
    def __init__(self, credentials_path: str = None):
        """
        Initialize Firebase service
        
        Args:
            credentials_path: Path to Firebase service account credentials JSON file
        """
        self.db = None
        self.initialize_firebase(credentials_path)
    
    def initialize_firebase(self, credentials_path: str = None):
        """Initialize Firebase Admin SDK"""
        try:
            if not firebase_admin._apps:
                if credentials_path and os.path.exists(credentials_path):
                    cred = credentials.Certificate(credentials_path)
                    firebase_admin.initialize_app(cred)
                else:
                    # Use default credentials (for production deployment)
                    firebase_admin.initialize_app()
                
                self.db = firestore.client()
                logger.info("Firebase initialized successfully")
            else:
                self.db = firestore.client()
                logger.info("Using existing Firebase app")
                
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            raise
    
    # Property Management
    def add_property(self, property_data: Dict[str, Any]) -> bool:
        """
        Add a property to the database
        
        Args:
            property_data: Dictionary containing property information
            
        Returns:
            True if successful, False otherwise
        """
        try:
            property_id = property_data.get('property_id')
            if not property_id:
                logger.error("Property ID is required")
                return False
            
            # Add timestamp
            property_data['created_at'] = datetime.now()
            property_data['updated_at'] = datetime.now()
            
            # Add to Firestore
            self.db.collection('properties').document(property_id).set(property_data)
            logger.info(f"Property {property_id} added successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error adding property: {e}")
            return False
    
    def update_property(self, property_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update a property in the database
        
        Args:
            property_id: Property ID to update
            updates: Dictionary of fields to update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            updates['updated_at'] = datetime.now()
            self.db.collection('properties').document(property_id).update(updates)
            logger.info(f"Property {property_id} updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error updating property {property_id}: {e}")
            return False
    
    def get_properties(self, state: str = None, limit: int = 50) -> List[Dict]:
        """
        Get properties from the database
        
        Args:
            state: Filter by state (optional)
            limit: Maximum number of properties to return
            
        Returns:
            List of property dictionaries
        """
        try:
            query = self.db.collection('properties')
            
            if state:
                query = query.where('state', '==', state)
            
            query = query.limit(limit).order_by('created_at', direction=firestore.Query.DESCENDING)
            
            docs = query.stream()
            properties = []
            
            for doc in docs:
                property_data = doc.to_dict()
                property_data['id'] = doc.id
                properties.append(property_data)
            
            logger.info(f"Retrieved {len(properties)} properties")
            return properties
            
        except Exception as e:
            logger.error(f"Error getting properties: {e}")
            return []
    
    def bulk_add_properties(self, properties: List[Dict[str, Any]]) -> int:
        """
        Add multiple properties to the database
        
        Args:
            properties: List of property dictionaries
            
        Returns:
            Number of properties successfully added
        """
        success_count = 0
        batch = self.db.batch()
        batch_size = 0
        
        try:
            for property_data in properties:
                property_id = property_data.get('property_id')
                if not property_id:
                    continue
                
                property_data['created_at'] = datetime.now()
                property_data['updated_at'] = datetime.now()
                
                doc_ref = self.db.collection('properties').document(property_id)
                batch.set(doc_ref, property_data)
                batch_size += 1
                
                # Commit batch every 500 operations (Firestore limit)
                if batch_size >= 500:
                    batch.commit()
                    success_count += batch_size
                    batch = self.db.batch()
                    batch_size = 0
            
            # Commit remaining operations
            if batch_size > 0:
                batch.commit()
                success_count += batch_size
            
            logger.info(f"Successfully added {success_count} properties")
            return success_count
            
        except Exception as e:
            logger.error(f"Error in bulk add properties: {e}")
            return success_count
    
    # Lead Management
    def add_lead(self, lead_data: Dict[str, Any]) -> Optional[str]:
        """
        Add a lead to the database
        
        Args:
            lead_data: Dictionary containing lead information
            
        Returns:
            Lead ID if successful, None otherwise
        """
        try:
            # Add timestamps and default status
            lead_data['created_at'] = datetime.now()
            lead_data['status'] = lead_data.get('status', 'New')
            
            # Add to Firestore
            doc_ref = self.db.collection('leads').add(lead_data)
            lead_id = doc_ref[1].id
            
            logger.info(f"Lead {lead_id} added successfully")
            return lead_id
            
        except Exception as e:
            logger.error(f"Error adding lead: {e}")
            return None
    
    def assign_lead_to_broker(self, lead_id: str, broker_id: str) -> bool:
        """
        Assign a lead to a broker
        
        Args:
            lead_id: Lead ID
            broker_id: Broker ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.db.collection('leads').document(lead_id).update({
                'assigned_broker_id': broker_id,
                'status': 'Assigned',
                'assigned_at': datetime.now()
            })
            
            logger.info(f"Lead {lead_id} assigned to broker {broker_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error assigning lead: {e}")
            return False
    
    # Broker Management
    def add_broker(self, broker_data: Dict[str, Any]) -> bool:
        """
        Add a broker to the database
        
        Args:
            broker_data: Dictionary containing broker information
            
        Returns:
            True if successful, False otherwise
        """
        try:
            broker_id = broker_data.get('broker_id')
            if not broker_id:
                logger.error("Broker ID is required")
                return False
            
            broker_data['created_at'] = datetime.now()
            broker_data['updated_at'] = datetime.now()
            
            self.db.collection('brokers').document(broker_id).set(broker_data)
            logger.info(f"Broker {broker_id} added successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error adding broker: {e}")
            return False
    
    def get_brokers_by_state(self, state: str) -> List[Dict]:
        """
        Get brokers that cover a specific state
        
        Args:
            state: State code
            
        Returns:
            List of broker dictionaries
        """
        try:
            query = self.db.collection('brokers').where('coverage_states', 'array_contains', state)
            docs = query.stream()
            
            brokers = []
            for doc in docs:
                broker_data = doc.to_dict()
                broker_data['id'] = doc.id
                brokers.append(broker_data)
            
            logger.info(f"Found {len(brokers)} brokers for state {state}")
            return brokers
            
        except Exception as e:
            logger.error(f"Error getting brokers for state {state}: {e}")
            return []
    
    # Referral Management
    def create_referral(self, lead_id: str, broker_id: str, property_id: str = None) -> Optional[str]:
        """
        Create a referral record
        
        Args:
            lead_id: Lead ID
            broker_id: Broker ID
            property_id: Property ID (optional)
            
        Returns:
            Referral ID if successful, None otherwise
        """
        try:
            referral_data = {
                'lead_id': lead_id,
                'broker_id': broker_id,
                'property_id': property_id,
                'status': 'Pending',
                'payout_status': 'Unpaid',
                'created_at': datetime.now()
            }
            
            doc_ref = self.db.collection('referrals').add(referral_data)
            referral_id = doc_ref[1].id
            
            logger.info(f"Referral {referral_id} created successfully")
            return referral_id
            
        except Exception as e:
            logger.error(f"Error creating referral: {e}")
            return None
    
    def update_referral_status(self, referral_id: str, status: str, amount_earned: float = None) -> bool:
        """
        Update referral status and payout information
        
        Args:
            referral_id: Referral ID
            status: New status
            amount_earned: Amount earned from referral (optional)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            updates = {
                'status': status,
                'updated_at': datetime.now()
            }
            
            if amount_earned is not None:
                updates['amount_earned'] = amount_earned
                updates['payout_status'] = 'Paid'
                updates['closed_at'] = datetime.now()
            
            self.db.collection('referrals').document(referral_id).update(updates)
            logger.info(f"Referral {referral_id} updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error updating referral {referral_id}: {e}")
            return False

def main():
    """Test the Firebase service"""
    try:
        # Initialize service (will use default credentials in production)
        service = FirebaseService()
        
        # Test adding a sample property
        sample_property = {
            'property_id': 'TEST-123456',
            'address': '123 Test Street',
            'city': 'Test City',
            'state': 'NC',
            'zip_code': '12345',
            'price': 250000,
            'bedrooms': 3,
            'bathrooms': 2,
            'status': 'Available',
            'county': 'Test County',
            'listing_source': 'HUD'
        }
        
        success = service.add_property(sample_property)
        if success:
            print("Test property added successfully")
        
        # Test getting properties
        properties = service.get_properties(state='NC', limit=5)
        print(f"Retrieved {len(properties)} properties")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")

if __name__ == "__main__":
    main()
