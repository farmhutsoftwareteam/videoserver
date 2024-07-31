const express = require('express');
const router = express.Router();
const { Paynow } = require('paynow');

// Initialize Paynow
const paynow = new Paynow('15556', '88dc1eb2-8ea3-4f7a-9e41-e7c20edaef28');

// Payment processing function
async function processPayment(amount, phone, email, userId, host) {
    console.log('Starting payment process...');
    console.log(`Amount: ${amount}, Phone: ${phone}, Email: ${email}, User ID: ${userId}`);

    // Set dynamic result URL based on the host
    paynow.resultUrl = `http://${host}/api/payments/result`;
    paynow.returnUrl = `http://${host}/api/payments/return`;

    try {
        const payment = paynow.createPayment(`${userId}`, email);
        payment.add('Payment for Order', amount);
        console.log('Payment object created:', payment);

        const response = await paynow.sendMobile(payment, phone, 'ecocash');
        console.log('Response from Paynow:', response);

        if (response.success) {
            console.log('Payment initiated, awaiting confirmation...');
            console.log('Poll URL:', response.pollUrl);
            console.log('Instructions:', response.instructions);

            // Check payment status
            const status = await paynow.pollTransaction(response.pollUrl);
            console.log('Payment status:', status);
            return status;
        } else {
            console.error('Payment initiation failed:', response.error);
            throw new Error('Payment initiation failed.');
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        throw error;
    }
}

// Define the payment route
router.post('/pay', async (req, res) => {
    const { amount, phone, email, userId } = req.body;
    const host = req.get('host');
    console.log('Received payment request:', req.body);
    console.log('Host:', host);

    try {
        const status = await processPayment(amount, phone, email, userId, host);
        console.log('Payment processed successfully:', status);
        res.status(200).json(status);
    } catch (error) {
        console.error('Error in payment route:', error);
        res.status(500).json({ error: error.message });
    }
});

// Define the result URL route
router.post('/result', (req, res) => {
    console.log('Received result from Paynow:', req.body);
    // Handle the result from Paynow here
    res.status(200).send('Result received');
});

// Define the return URL route
router.get('/return', (req, res) => {
    console.log('User returned from Paynow:', req.query);
    // Handle the return from Paynow here
    res.status(200).send('Return received');
});

module.exports = router;