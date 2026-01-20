const { Client, Environment, OrdersController } = require('@paypal/paypal-server-sdk');

// PayPal configuration with live credentials
const paypalClient = new Client({
  environment: process.env.NODE_ENV === 'production' ? Environment.Live : Environment.Sandbox,
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID || 'Adh-Fdl76IfAGhV3vAPZM3KhrI4WxKCl8Le_fT4dD4e1w9cGzXlkQl9okaG5TipW6qvWV-TM6IGb2f7p',
    oAuthClientSecret: process.env.PAYPAL_SECRET || 'ECY9w9OAyss7JA_lUSpSyli8JgB-FGrhyLNT-x2bxhtktY_rdYMTLF_KrSMpNkzUlpPfOWqmCfUEh00d'
  }
});

// Helper function to generate client token for HostedFields
exports.generateClientToken = async (req, res) => {
  try {
    const token = await paypalClient.clientToken().generate();
    res.json({ clientToken: token });
  } catch (error) {
    console.error('Error generating client token:', error);
    res.status(500).json({ error: 'Failed to generate client token' });
  }
};

// Create orders controller
const ordersController = new OrdersController(paypalClient);

module.exports = {
  paypalClient,
  ordersController
};