const stripe = require("stripe")(
  "sk_test_51O8UWtKHNXl8PTAGxN4Gwt29m8jTT5gGWKM5bueaB51kYTO0c1r6oTFLuTj5rxuh58wSyGP4leDhqeQ7GSCvn28c00oHEk08BZ"
);
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

    const product = await stripe.products.create({ name: items[0].name });
    const stripePrice = await stripe.prices.create({
      product: product.id,

      unit_amount: Math.round(items[0].price * 100), // Convert to cents
      currency: "usd",
    });

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

const successController = (req, res) =>
  res.redirect("http://localhost:3000/success");
const cancelController = (req, res) =>
  res.redirect("http://localhost:3000/failure");

module.exports = {
  stripeCheckoutController,
  successController,
  cancelController,
};
