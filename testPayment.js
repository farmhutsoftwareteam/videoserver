const axios = require('axios');

async function testPayment() {
  const url = 'http://localhost:8080/api/pay';
  const paymentData = {
    amount: '1.00',
    phone: '0778687452',
    email: 'user@example.com',
    userId: 'user-123',
    currency: 'ZIG'  // Change to 'USD' to test USD payments
  };

  try {
    const response = await axios.post(url, paymentData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Payment processed successfully:', response.data);
  } catch (error) {
    console.error('Error in payment route:', error.response ? error.response.data : error.message);
  }
}

testPayment();
