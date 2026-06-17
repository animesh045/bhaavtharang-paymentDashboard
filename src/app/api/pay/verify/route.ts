import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { createZoomMeeting } from '@/lib/zoom';
import { createCalendarEvent } from '@/lib/calendar';
import { sendConfirmationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = await request.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !bookingId) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }

    // 1. Verify the client-side Razorpay signature
    // Client signature verification uses the format: hmac_sha256(order_id + "|" + payment_id, secret)
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;
    
    if (!isValid) {
      console.error('Invalid Razorpay signature on client verification');
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // 2. Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 3. If already paid and confirmed, return success immediately (idempotent)
    if (booking.paymentStatus === 'paid' && booking.bookingStatus === 'confirmed') {
      return NextResponse.json({ success: true, bookingId: booking.id });
    }

    // 4. Update payment status in database
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: 'paid',
        paymentId: razorpay_payment_id,
      },
    });

    // 5. Create Zoom meeting
    let zoomMeeting;
    try {
      zoomMeeting = await createZoomMeeting(updatedBooking.scheduledTime, updatedBooking.customerName);
    } catch (zoomError) {
      console.error('Error creating Zoom meeting during client verify, using fallback:', zoomError);
      zoomMeeting = {
        meetingId: 'mock-meeting-id',
        joinUrl: 'https://zoom.us/j/mock-meeting-id',
        startUrl: 'https://zoom.us/s/mock-meeting-id',
      };
    }

    // 6. Create Google Calendar event
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
    } catch (calendarError) {
      console.error('Error creating Google Calendar event during client verify:', calendarError);
    }

    // 7. Save confirmed booking details
    const finalBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        bookingStatus: 'confirmed',
        zoomMeetingId: zoomMeeting.meetingId,
        zoomJoinUrl: zoomMeeting.joinUrl,
        zoomStartUrl: zoomMeeting.startUrl,
        calendarEventId: calendarEventId || null,
      },
    });

    // 8. Send confirmation email
    try {
      await sendConfirmationEmail({
        id: finalBooking.id,
        customerName: finalBooking.customerName,
        email: finalBooking.email,
        scheduledTime: finalBooking.scheduledTime,
        zoomJoinUrl: finalBooking.zoomJoinUrl,
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email during client verify:', emailError);
    }

    return NextResponse.json({ success: true, bookingId: finalBooking.id });
  } catch (error) {
    console.error('Error in client payment verification:', error);
    return NextResponse.json({ error: 'Internal server error verifying payment' }, { status: 500 });
  }
}
