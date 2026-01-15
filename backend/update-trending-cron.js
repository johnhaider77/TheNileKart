#!/usr/bin/env node

// Script to update trending products - should be run hourly via cron
const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function updateTrendingProducts() {
  try {
    console.log(`[${new Date().toISOString()}] Starting trending products update...`);
    
    const response = await axios.post(`${BASE_URL}/api/products/update-trending`);
    
    if (response.data.success) {
      console.log(`[${new Date().toISOString()}] ✅ Trending products updated successfully!`);
      console.log(`Updated ${response.data.updated_count} trending products`);
    } else {
      console.error(`[${new Date().toISOString()}] ❌ Failed to update trending products:`, response.data.message);
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating trending products:`, error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the update
updateTrendingProducts();