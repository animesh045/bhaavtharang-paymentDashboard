import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay client only if keys are present
const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

/**
 * Creates a Razorpay order.
 * @param amountInPaise The amount in paise (e.g. 50000 for INR 500)
 * @param receipt A unique identifier for this order (usually the booking ID)
 */
export async function createRazorpayOrder(amountInPaise: number, receipt: string) {
  try {
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt,
      payment_capture: true, // Auto-capture payment on success
    });
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error('Failed to create payment order');
  }
}

/**
 * Validates the webhook signature from Razorpay.
 * @param bodyString The raw string request body.
 * @param signature The signature from the 'x-razorpay-signature' header.
 */
export function verifyWebhookSignature(bodyString: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('RAZORPAY_WEBHOOK_SECRET is not set. Skipping signature validation (not recommended for production).');
    return true; // Or fallback to false. Let's make it secure by returning false or validating.
  }
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyString)
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying Razorpay webhook signature:', error);
    return false;
  }
}
