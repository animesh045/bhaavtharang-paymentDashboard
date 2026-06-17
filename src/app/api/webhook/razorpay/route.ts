import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { createZoomMeeting } from '@/lib/zoom';
import { createCalendarEvent } from '@/lib/calendar';
import { sendConfirmationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // 1. Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('Invalid Razorpay Webhook Signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`Processing Razorpay Webhook Event: ${event}`);

    // We only process successful payment/order events
    if (event !== 'payment.captured' && event !== 'order.paid') {
      return NextResponse.json({ status: 'ignored', message: 'Event not handled' });
    }

    // Extract Order ID and Payment ID
    let orderId = '';
    let paymentId = '';

    if (event === 'payment.captured') {
      orderId = payload.payload.payment.entity.order_id;
      paymentId = payload.payload.payment.entity.id;
    } else if (event === 'order.paid') {
      orderId = payload.payload.order.entity.id;
      // An order can have multiple payments, we try to get the payment ID from the event if possible
      paymentId = payload.payload.payment?.entity?.id || '';
    }

    if (!orderId) {
      console.warn('No order_id found in webhook payload');
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // 2. Fetch the corresponding booking from DB
    const booking = await prisma.booking.findUnique({
      where: { orderId: orderId },
    });

    if (!booking) {
      console.warn(`Booking with order ID ${orderId} not found in database.`);
      return NextResponse.json({ status: 'ignored', message: 'Order not found in system' });
    }

    // 3. Idempotency Check: if booking is already confirmed/paid, return success immediately
    if (booking.paymentStatus === 'paid' && booking.bookingStatus === 'confirmed') {
      console.log(`Booking ${booking.id} is already processed and confirmed. Skipping.`);
      return NextResponse.json({ status: 'ok', message: 'Already processed' });
    }

    // 4. Update the payment status in database to avoid duplicate runs
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: 'paid',
        paymentId: paymentId || booking.paymentId,
      },
    });

    // 5. Integrate Zoom meeting creation
    let zoomMeeting;
    try {
      zoomMeeting = await createZoomMeeting(updatedBooking.scheduledTime, updatedBooking.customerName);
      console.log(`Zoom meeting created for Booking ${updatedBooking.id}: ${zoomMeeting.joinUrl}`);
    } catch (zoomError) {
      console.error(`Failed to create Zoom meeting for Booking ${updatedBooking.id}:`, zoomError);
      // Fallback details if the function failed completely without falling back internally
      zoomMeeting = {
        meetingId: 'mock-meeting-id',
        joinUrl: 'https://zoom.us/j/mock-meeting-id',
        startUrl: 'https://zoom.us/s/mock-meeting-id',
      };
    }

    // 6. Integrate Google Calendar event creation
    let calendarEventId = '';
    try {
      calendarEventId = await createCalendarEvent({
        id: updatedBooking.id,
        customerName: updatedBooking.customerName,
        phone: updatedBooking.phone,
        email: updatedBooking.email,
        scheduledTime: updatedBooking.scheduledTime,
        zoomJoinUrl: zoomMeeting.joinUrl,
        notes: updatedBooking.notes,
      });
      console.log(`Google Calendar event created for Booking ${updatedBooking.id}: ${calendarEventId}`);
    } catch (calendarError) {
      console.error(`Failed to create Google Calendar event for Booking ${updatedBooking.id}:`, calendarError);
    }

    // 7. Update booking details with Zoom and Calendar references
    await prisma.booking.update({
      where: { id: updatedBooking.id },
      data: {
        bookingStatus: 'confirmed',
        zoomMeetingId: zoomMeeting.meetingId,
        zoomJoinUrl: zoomMeeting.joinUrl,
        zoomStartUrl: zoomMeeting.startUrl,
        calendarEventId: calendarEventId || null,
      },
    });

    // 8. Send Confirmation Email
    try {
      await sendConfirmationEmail({
        id: updatedBooking.id,
        customerName: updatedBooking.customerName,
        email: updatedBooking.email,
        scheduledTime: updatedBooking.scheduledTime,
        zoomJoinUrl: zoomMeeting.joinUrl,
      });
    } catch (emailError) {
      console.error(`Failed to send confirmation email for Booking ${updatedBooking.id}:`, emailError);
    }

    return NextResponse.json({ status: 'success', bookingId: updatedBooking.id });
  } catch (error) {
    console.error('Fatal error in Razorpay Webhook processing:', error);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
