const express = require('express');
const router = express.Router();
const {Paynow} = require('paynow');

// Initialize Paynow
const paynow = new Paynow('18603', '7945acd8-60c3-437f-8d7b-8ab49dacd622');

// Payment processing function
async function processPayment(amount, phone, email) {
    try {
        const payment = paynow.createPayment('Order123', email);
        payment.add('Payment for Order 123', amount);

        const response = await paynow.sendMobile(payment, phone, 'ecocash');

        if (response.success) {
            console.log('Payment initiated, awaiting confirmation...');
            // Check payment status
            const status = await paynow.pollTransaction(response.pollUrl);
            return status;
        } else {
            throw new Error('Payment initiation failed.');
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        throw error;
    }
}

// Define the payment route
router.post('/pay', async (req, res) => {
    const { amount, phone, email } = req.body;

    try {
        const status = await processPayment(amount, phone, email);
        res.status(200).json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
