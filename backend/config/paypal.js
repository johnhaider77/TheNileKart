const { Client, Environment, OrdersController } = require('@paypal/paypal-server-sdk');

// PayPal configuration with live credentials
const paypalClient = new Client({
  environment: process.env.NODE_ENV === 'production' ? Environment.Live : Environment.Sandbox,
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID || 'AdDtfr_P4XNO3lLxmk4x7vbltnscMWnCDEMVd3fE6HPEOpnSu8bV6GAobHwM-W95CRojTtu2UZwvquVl',
    oAuthClientSecret: process.env.PAYPAL_SECRET || 'EG8oJsEWMicBlyIjN66U5YOTy2mPDFY1dpK2OFRiyEZYCOq8RMAFUDNsrJi7AclVl6V4I2Tu4CEJk40X'
  }
});

// Create orders controller
const ordersController = new OrdersController(paypalClient);

module.exports = {
  paypalClient,
  ordersController
};