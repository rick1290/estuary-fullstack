# Stripe Integration for Estuary

This module provides a comprehensive integration with Stripe for payment processing in the Estuary platform. It supports both credit purchases and direct service purchases with a unified approach to metadata handling.

## Overview

The Stripe integration handles two main types of purchases:

1. **Credit Purchases**: Users can buy credits that can be used later for various services.
2. **Direct Service Purchases**: Users can directly purchase services, including:
   - Individual Sessions (1-on-1)
   - Workshops (group services with one session)
   - Courses (series of related workshop sessions)
   - Packages/Bundles (collections of services)

## Payment Flow

The payment flow follows these steps:

1. Create an Order record in the database
2. Create a Stripe Payment Intent or Checkout Session with appropriate metadata
3. Process the payment on the client side
4. Handle webhook events from Stripe to update the Order status
5. Create appropriate records (Credit Transaction or Booking) after successful payment
6. Store payment methods for future use when enabled

## Metadata Structure

We use a minimal and unified metadata approach for both credit and direct purchases:

### Base Metadata (All Purchases)
```json
{
  "order_id": "123",
  "user_id": "456",
  "order_type": "credit|direct"
}
```

### Additional Metadata for Direct Service Purchases
```json
{
  "service_id": "789",
  "service_type": "session|workshop|package|bundle|course",
  "service_name": "Service Name"
}
```

### Service-Specific Metadata
- For workshops: `service_session_id`
- For sessions/packages/bundles: `scheduling_data` (JSON string containing scheduling information)

## Post-Payment Processing

After a successful payment, the system:

1. For credit purchases:
   - Creates a CreditTransaction record

2. For direct service purchases:
   - Creates Booking record(s) based on the service type
   - For workshops/courses: Adds the user as a participant to the relevant ServiceSession(s)
   - For packages/bundles: Creates a parent Booking and potentially child Bookings

## Refund Handling

The system also handles refunds:

1. For credit purchases:
   - Creates a refund CreditTransaction with a negative amount

2. For direct service purchases:
   - Updates the status of associated Booking(s)
   - For full refunds: Cancels the booking(s)
   - For partial refunds: Marks the booking(s) as partially refunded

## API Endpoints

### Create Payment
- **URL**: `/api/v1/payments/create/`
- **Method**: POST
- **Authentication**: Required
- **Description**: Creates a payment for a service or credit purchase

#### Request Body for Service Purchase
```json
{
  "service_id": "123",
  "payment_type": "intent|checkout",
  "amount": 100.00,
  "service_data": {},
  "scheduling_data": {
    "start_datetime": "2023-01-01T10:00:00Z",
    "service_session_id": "456"
  },
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel"
}
```

#### Request Body for Credit Purchase
```json
{
  "is_credit_purchase": true,
  "amount": 100.00,
  "credit_amount": 100.00,
  "payment_type": "intent|checkout",
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel"
}
```

### Get Payment Methods
- **URL**: `/api/v1/payments/methods/`
- **Method**: GET
- **Authentication**: Required
- **Description**: Retrieves all saved payment methods for the authenticated user
- **Response**: List of payment methods with card details

### Set Default Payment Method
- **URL**: `/api/v1/payments/methods/default/`
- **Method**: POST
- **Authentication**: Required
- **Description**: Sets a payment method as the default for the authenticated user
- **Request Body**: `{ "payment_method_id": "123" }`

### Delete Payment Method
- **URL**: `/api/v1/payments/methods/{payment_method_id}/`
- **Method**: DELETE
- **Authentication**: Required
- **Description**: Deletes a payment method for the authenticated user

### Webhook Handler
- **URL**: `/api/v1/payments/webhook/`
- **Method**: POST
- **Authentication**: None (uses Stripe signature verification)
- **Description**: Handles webhook events from Stripe

## Frontend Implementation Guide

This section provides a comprehensive guide for implementing the frontend portion of the Stripe integration.

### Payment Flow Overview

The payment process follows a two-step approach:

1. **Create Payment Intent (Backend)**
   - Frontend calls the backend API
   - Backend creates an Order in the database
   - Backend calls Stripe's API to create a Payment Intent
   - Backend returns the `client_secret` to the frontend

2. **Confirm Payment (Frontend)**
   - Frontend collects card details using Stripe Elements
   - Frontend calls Stripe's JavaScript API directly with the `client_secret` and card details
   - Stripe processes the payment and returns the result
   - Backend receives webhook events and updates the order status

This approach ensures security (Stripe secret key stays on the server), PCI compliance (card details never touch your server), and reliability (webhook processing ensures orders are completed even if users close their browser).

### Required Dependencies

```bash
# Install Stripe.js and React Stripe.js
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### Basic Implementation

Here's a basic implementation using React and Next.js:

```jsx
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ serviceId, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create payment intent via your backend
      const response = await fetch('/api/v1/payments/create/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourAuthToken}` // Include your auth token
        },
        body: JSON.stringify({
          service_id: serviceId,
          amount: amount,
          payment_type: 'intent'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment');
      }
      
      const { client_secret } = await response.json();
      
      // 2. Confirm the payment with Stripe.js
      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: 'User Name', // Replace with actual user name
          },
        }
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      if (result.paymentIntent.status === 'succeeded') {
        setSuccess(true);
        // Redirect to success page or show success message
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Payment successful!</div>}
      
      <div className="form-row">
        <label>Card Details</label>
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }}/>
      </div>
      
      <button 
        type="submit" 
        disabled={!stripe || loading}
      >
        {loading ? 'Processing...' : `Pay $${amount}`}
      </button>
    </form>
  );
}

// Wrap your checkout form with the Elements provider
function CheckoutPage({ serviceId, amount }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm serviceId={serviceId} amount={amount} />
    </Elements>
  );
}

export default CheckoutPage;
```

### Implementation with Saved Cards

For users with saved payment methods, here's how to implement card selection:

```jsx
function CheckoutForm({ serviceId, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  
  // Fetch saved cards when component loads
  useEffect(() => {
    async function fetchCards() {
      try {
        const response = await fetch('/api/v1/payments/methods/', {
          headers: {
            'Authorization': `Bearer ${yourAuthToken}` // Include your auth token
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch payment methods');
        }
        
        const data = await response.json();
        setSavedCards(data.payment_methods);
        
        // Auto-select default card if available
        const defaultCard = data.payment_methods.find(card => card.is_default);
        if (defaultCard) {
          setSelectedCard(defaultCard.stripe_payment_method_id);
        } else if (data.payment_methods.length > 0) {
          setShowNewCardForm(true);
        }
      } catch (err) {
        console.error('Error fetching payment methods:', err);
      }
    }
    
    fetchCards();
  }, []);
  
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create payment intent via your backend
      const response = await fetch('/api/v1/payments/create/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourAuthToken}`
        },
        body: JSON.stringify({
          service_id: serviceId,
          amount: amount,
          payment_type: 'intent'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment');
      }
      
      const { client_secret } = await response.json();
      
      // 2. Confirm payment with either saved card or new card
      let result;
      
      if (selectedCard && !showNewCardForm) {
        // Use saved card
        result = await stripe.confirmCardPayment(client_secret, {
          payment_method: selectedCard
        });
      } else {
        // Use new card
        result = await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: { 
              name: 'User Name' // Replace with actual user name
            }
          }
        });
      }
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      if (result.paymentIntent.status === 'succeeded') {
        setSuccess(true);
        // Redirect to success page or show success message
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Payment successful!</div>}
      
      {/* Saved cards selection */}
      {savedCards.length > 0 && (
        <div className="saved-cards">
          <h3>Your saved cards</h3>
          {savedCards.map(card => (
            <div key={card.id} className="saved-card">
              <input
                type="radio"
                id={`card-${card.id}`}
                name="payment-method"
                checked={selectedCard === card.stripe_payment_method_id && !showNewCardForm}
                onChange={() => {
                  setSelectedCard(card.stripe_payment_method_id);
                  setShowNewCardForm(false);
                }}
              />
              <label htmlFor={`card-${card.id}`}>
                {card.card_brand} ending in {card.last4}
                {card.is_default && " (Default)"}
                <span className="expiry">Expires {card.exp_month}/{card.exp_year}</span>
              </label>
            </div>
          ))}
          
          <div className="new-card-option">
            <input
              type="radio"
              id="new-card"
              name="payment-method"
              checked={showNewCardForm}
              onChange={() => {
                setShowNewCardForm(true);
                setSelectedCard(null);
              }}
            />
            <label htmlFor="new-card">Use a new card</label>
          </div>
        </div>
      )}
      
      {/* New card form */}
      {(showNewCardForm || savedCards.length === 0) && (
        <div className="form-row">
          <label>Card Details</label>
          <CardElement options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}/>
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={!stripe || loading || (!selectedCard && !elements)}
      >
        {loading ? 'Processing...' : `Pay $${amount}`}
      </button>
    </form>
  );
}
```

### Managing Saved Cards

You can also implement a separate interface for users to manage their saved payment methods:

```jsx
function PaymentMethodsManager() {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  async function fetchPaymentMethods() {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/payments/methods/', {
        headers: {
          'Authorization': `Bearer ${yourAuthToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }
      
      const data = await response.json();
      setPaymentMethods(data.payment_methods);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    fetchPaymentMethods();
  }, []);
  
  async function setDefaultPaymentMethod(paymentMethodId) {
    try {
      const response = await fetch('/api/v1/payments/methods/default/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourAuthToken}`
        },
        body: JSON.stringify({
          payment_method_id: paymentMethodId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }
      
      // Refresh payment methods list
      fetchPaymentMethods();
    } catch (err) {
      setError(err.message);
    }
  }
  
  async function deletePaymentMethod(paymentMethodId) {
    try {
      const response = await fetch(`/api/v1/payments/methods/${paymentMethodId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${yourAuthToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }
      
      // Refresh payment methods list
      fetchPaymentMethods();
    } catch (err) {
      setError(err.message);
    }
  }
  
  if (loading) return <div>Loading payment methods...</div>;
  if (error) return <div className="error">{error}</div>;
  
  return (
    <div className="payment-methods">
      <h2>Your Payment Methods</h2>
      
      {paymentMethods.length === 0 ? (
        <p>You don't have any saved payment methods.</p>
      ) : (
        <ul className="payment-methods-list">
          {paymentMethods.map(method => (
            <li key={method.id} className="payment-method-item">
              <div className="card-info">
                <span className="card-brand">{method.card_brand}</span>
                <span className="card-last4">•••• {method.last4}</span>
                <span className="card-expiry">Expires {method.exp_month}/{method.exp_year}</span>
                {method.is_default && <span className="default-badge">Default</span>}
              </div>
              
              <div className="card-actions">
                {!method.is_default && (
                  <button 
                    onClick={() => setDefaultPaymentMethod(method.id)}
                    className="set-default-btn"
                  >
                    Set as Default
                  </button>
                )}
                
                <button 
                  onClick={() => deletePaymentMethod(method.id)}
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Testing the Integration

1. Use Stripe's test cards for testing:
   - `4242 4242 4242 4242` - Successful payment
   - `4000 0000 0000 0002` - Declined payment
   - `4000 0025 0000 3155` - Requires authentication (3D Secure)

2. Set up webhook forwarding in development:
   - Install the Stripe CLI: https://stripe.com/docs/stripe-cli
   - Run: `stripe listen --forward-to localhost:8000/api/v1/payments/webhook/`

3. Test different scenarios:
   - Successful payments
   - Failed payments
   - Saved cards
   - Webhook processing

### Common Issues and Solutions

1. **Payment Intent Creation Fails**
   - Check that your backend API is correctly configured
   - Verify that you're sending the correct data from the frontend
   - Ensure your Stripe secret key is valid

2. **Card Element Not Showing**
   - Make sure you've wrapped your component with `<Elements stripe={stripePromise}>`
   - Check that your Stripe publishable key is correct

3. **Webhook Events Not Processing**
   - Verify your webhook endpoint is accessible
   - Check that your webhook secret is correctly set
   - Look for errors in your webhook handler logs

4. **Saved Cards Not Appearing**
   - Ensure the user has successfully completed a payment
   - Check that `setup_future_usage='off_session'` is set in your backend
   - Verify that your payment method storage logic is working

### Security Considerations

1. **Never store raw card data** in your database
2. **Always use HTTPS** for all API calls
3. **Validate all inputs** on both client and server
4. **Use proper authentication** for all payment-related API calls
5. **Monitor Stripe Dashboard** for suspicious activity

By following this implementation guide, you'll have a secure, reliable payment system that provides a great user experience with saved payment methods and proper error handling.

## Implementation Details

### Key Files

- **utils.py**: Contains utility functions for creating orders, payment intents, and checkout sessions
- **api.py**: Contains API endpoints for creating payments
- **webhooks.py**: Contains the webhook handler for processing Stripe events
- **client.py**: Contains the Stripe client for interacting with the Stripe API
- **urls.py**: Contains URL routing for the API endpoints

### Dependencies

- **stripe**: The Stripe Python SDK
- **django**: The web framework
- **rest_framework**: For API endpoints

## Payment Methods

The integration supports saving and reusing payment methods:

1. **Automatic Saving**: Payment methods are automatically saved when a customer makes a payment (with `setup_future_usage='off_session'` enabled)
2. **Management**: Users can view, set as default, and delete their saved payment methods
3. **Future Payments**: Saved payment methods can be used for future payments without requiring the customer to re-enter their card details

### PaymentMethod Model

The system stores payment methods in the `PaymentMethod` model with the following fields:

- `user`: The user who owns the payment method
- `stripe_payment_method_id`: The Stripe payment method ID
- `card_brand`: The card brand (Visa, Mastercard, etc.)
- `last4`: The last 4 digits of the card
- `exp_month`: The expiration month
- `exp_year`: The expiration year
- `is_default`: Whether this is the default payment method for the user

## Environment Variables

The following environment variables are required:

- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret
- `FRONTEND_URL`: The URL of your frontend application (for redirect URLs)

## Testing

To test the integration:

1. Set up a Stripe test account
2. Configure the environment variables with test keys
3. Use Stripe's test cards for payment testing
4. Use Stripe CLI to forward webhook events to your local environment

## Future Improvements

- Add support for subscriptions
- Implement more payment method types (beyond cards)
- Add support for multiple currencies
- Enhance error handling and retry mechanisms
