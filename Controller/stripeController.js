const stripe = require("stripe")(
  "sk_test_51O8UWtKHNXl8PTAGxN4Gwt29m8jTT5gGWKM5bueaB51kYTO0c1r6oTFLuTj5rxuh58wSyGP4leDhqeQ7GSCvn28c00oHEk08BZ"
);

const { createClient } = require('@supabase/supabase-js');


const supabaseUrl = process.env.SUPABASE_URL || 'https://peflgfeieqtklcpkhszz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZmxnZmVpZXF0a2xjcGtoc3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMDEzNzksImV4cCI6MjA0Njc3NzM3OX0.OlEbttWuDvHHy9svUAr2quK4IrmRgkGUI0i8Z9LHfrU';
const supabase = createClient(supabaseUrl, supabaseKey);
const express = require("express");

const stripeCheckoutController = async (req, res) => {
  try {
    const { customer, items, shipping } = req.body;

    if (!items || !items.length || !items[0].name || !items[0].price) {
      return res.status(400).json({
        success: false,
        error: "Product name and price are required",
      });
    }

    // Create product in Stripe
    const product = await stripe.products.create({ name: items[0].name });

    // Create price in Stripe
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(items[0].price * 100), // cents
      currency: "usd",
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: stripePrice.id, quantity: items[0].quantity }],
      customer_email: customer.email || "codesense24@gmail.com",
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: Math.round(parseFloat(shipping.rate) * 100),
              currency: "usd",
            },
            display_name: shipping.name,
          },
        },
      ],
      mode: "payment",
      success_url: `${req.protocol}://${req.get("host")}/stripe/success`,
      cancel_url: `${req.protocol}://${req.get("host")}/stripe/cancel`,
    });

    // Save payment details to Supabase (temporary - assumes success)
    const { error } = await supabase.from("payments").insert([
      {
        customer_email: customer.email || "unknown",
        product_name: items[0].name,
        price: items[0].price,
        quantity: items[0].quantity,
        shipping_name: shipping.name,
        shipping_rate: shipping.rate,
        status: "completed", 
        session_id: session.id,
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error.message);
    }

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error.stack);
    return res.status(500).json({
      success: false,
      error: "Stripe checkout error",
      details: error.message,
    });
  }
};

const stripeWebhookController = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const sessionId = session.id;
    const customerEmail = session.customer_email;

    // Update the Supabase record where session_id matches
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid" })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error updating payment status in Supabase:", error.message);
      return res.status(500).send("Supabase update failed");
    }

    console.log(`Payment completed for session: ${sessionId}`);
  }

  res.status(200).send("Received");
};

const successController = (req, res) =>
  res.redirect("http://localhost:3000/success");

const cancelController = (req, res) =>
  res.redirect("http://localhost:3000/failure");

module.exports = {
  stripeCheckoutController,
  successController,
  cancelController,
};
