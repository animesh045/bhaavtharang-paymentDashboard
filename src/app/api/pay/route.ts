import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Razorpay integration removed

export async function POST(request: Request) {
  try {
    const { name, phone, email, notes, scheduledTime } = await request.json();

    // 1. Validation
    if (!name || !phone || !scheduledTime) {
      return NextResponse.json(
        { error: 'Name, phone, and scheduled time are required' },
        { status: 400 }
      );
    }

    const slotDate = new Date(scheduledTime);
    if (isNaN(slotDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduled time format' },
        { status: 400 }
      );
    }

    // 2. Prevent double booking on confirmed sessions
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        scheduledTime: slotDate,
        bookingStatus: 'confirmed',
      },
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'This time slot has already been booked. Please select another slot.' },
        { status: 400 }
      );
    }

    // Fixed price for Meta Vibronics premium session: 120 INR (in paise: 12000)
    const amount = 12000;
    const amountInINR = (amount / 100).toFixed(2);

    // 3. Create a booking in DB with a unique UPI order reference
    const booking = await prisma.booking.create({
      data: {
        customerName: name,
        phone: phone,
        email: email || null,
        notes: notes || null,
        amount: amount,
        orderId: `UPI_${Date.now()}_${Math.random().toString(36).substring(5)}`,
        scheduledTime: slotDate,
      },
    });

    // 4. Generate UPI link
    // Format: https://upi.pe/9868842836@superyes/120.00
    const upiUrl = `https://upi.pe/9868842836@superyes/${amountInINR}`;

    return NextResponse.json({
      bookingId: booking.id,
      upiUrl: upiUrl,
      amount: amountInINR,
    });
  } catch (error) {
    console.error('Error in payment order handler:', error);
    return NextResponse.json(
      { error: 'Internal server error processing payment request' },
      { status: 500 }
    );
  }
}
