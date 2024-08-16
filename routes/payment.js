const express = require('express');
const router = express.Router();
const { Paynow } = require('paynow');
const supabase = require('../supabaseClient');
const cron = require('node-cron');
require('dotenv').config();

const paynowZIG = new Paynow('15556', '88dc1eb2-8ea3-4f7a-9e41-e7c20edaef28'); // ZiG
const paynowUSD = new Paynow('14946', '2d520a15-0787-4a31-8998-7c9e2bc55517'); // USD

async function pollPaymentStatus(paynow, pollUrl) {
  while (true) {
    const status = await paynow.pollTransaction(pollUrl);
    console.log('Polling payment status:', status);

    if (status.paid || status.status !== 'sent') {
      return status;
    }

    // Wait for a few seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

async function processPayment(amount, phone, email, userId, host, currency) {
  console.log('Starting payment process...');
  console.log(`Amount: ${amount}, Phone: ${phone}, Email: ${email}, User ID: ${userId}, Currency: ${currency}`);

  const selectedPaynow = currency.toUpperCase() === 'USD' ? paynowUSD : paynowZIG;
  selectedPaynow.resultUrl = `http://${host}/api/payments/result`;
  selectedPaynow.returnUrl = `http://${host}/api/payments/return`;

  try {
    const payment = selectedPaynow.createPayment(userId, email);
    payment.add('Payment for Order', amount);
    console.log('Payment object created:', payment);

    let response;
    try {
      response = await selectedPaynow.sendMobile(payment, phone, 'ecocash');
      console.log('Response from Paynow:', response);
    } catch (apiError) {
      console.error('Error making request to Paynow:', apiError.message);
      throw new Error('Error making request to Paynow');
    }

    if (response && response.success) {
      console.log('Payment initiated, awaiting confirmation...');
      console.log('Poll URL:', response.pollUrl);
      console.log('Instructions:', response.instructions);

      // Log the poll URL for debugging purposes
      const pollUrl = response.pollUrl;
      console.log('Poll URL:', pollUrl);

      // Poll the transaction status
      const status = await pollPaymentStatus(selectedPaynow, pollUrl);
      console.log('Final payment status:', status);

      // Detailed logging for debugging
      console.log('Status object:', JSON.stringify(status, null, 2));

      // Insert payment status into payments table
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            user_id: userId,
            amount: amount,
            payment_method: 'ecocash',
            status: status.status === 'paid' ? 'Paid' : 'Failed',
          },
        ]);

      if (paymentError) {
        console.error('Error inserting payment status:', paymentError.message);
        throw paymentError;
      }

      if (status.status === 'paid') {
        const { data, error } = await supabase
          .from('profiles')
          .update({ issubscribed: true, subscription_start_date: new Date().toISOString() })
          .eq('id', userId);

        if (error) {
          console.error('Error updating user subscription:', error.message);
          throw error;
        }
        console.log('User subscription updated successfully.');
      }

      return status;
    } else {
      const errorMessage = response ? response.error : 'Undefined response from Paynow';
      console.error('Payment initiation failed:', errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Error processing payment:', error.message);
    throw error;
  }
}

router.post('/pay', async (req, res) => {
  const { amount, phone, email, userId, currency } = req.body;
  const host = req.get('host');
  console.log('Received payment request:', req.body);
  console.log('Host:', host);

  try {
    const status = await processPayment(amount, phone, email, userId, host, currency);
    console.log('Payment processed successfully:', status);
    res.status(200).json(status);
  } catch (error) {
    console.error('Error in payment route:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/result', (req, res) => {
  console.log('Received result from Paynow:', req.body);
  res.status(200).send('Result received');
});

router.get('/return', (req, res) => {
  console.log('User returned from Paynow:', req.query);
  res.status(200).send('Return received');
});

// Schedule task to update subscription status every month
cron.schedule('0 0 1 * *', async () => {
  console.log('Running monthly subscription check...');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, subscription_start_date')
    .eq('issubscribed', true);

  if (error) {
    console.error('Error fetching subscribed profiles:', error.message);
    return;
  }

  const currentDate = new Date();

  for (const profile of profiles) {
    const subscriptionStartDate = new Date(profile.subscription_start_date);
    const oneMonthLater = new Date(subscriptionStartDate);
    oneMonthLater.setMonth(subscriptionStartDate.getMonth() + 1);

    if (currentDate >= oneMonthLater) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ issubscribed: false })
        .eq('id', profile.id);

      if (error) {
        console.error(`Error updating subscription status for user ${profile.id}:`, error.message);
        continue;
      }

      console.log(`Subscription status updated to false for user ${profile.id}`);
    }
  }
});

module.exports = router;
