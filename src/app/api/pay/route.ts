import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRazorpayOrder } from '@/lib/razorpay';

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

    // Fixed price for Meta Vibronics premium session: 999 INR (in paise: 99900)
    const amount = 99900;

    // 3. Create a temporary booking in DB to generate a receipt ID
    // We create it with dummy orderId first, then update it.
    const tempBooking = await prisma.booking.create({
      data: {
        customerName: name,
        phone: phone,
        email: email || null,
        notes: notes || null,
        amount: amount,
        orderId: `temp_${Date.now()}_${Math.random().toString(36).substring(5)}`,
        scheduledTime: slotDate,
      },
    });

    // 4. Create Razorpay Order
    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayOrder(amount, tempBooking.id);
    } catch (orderError) {
      // Clean up the temporary booking if order creation fails
      await prisma.booking.delete({ where: { id: tempBooking.id } });
      throw orderError;
    }

    // 5. Update the booking with the actual Razorpay Order ID
    const updatedBooking = await prisma.booking.update({
      where: { id: tempBooking.id },
      data: {
        orderId: razorpayOrder.id,
      },
    });

    return NextResponse.json({
      bookingId: updatedBooking.id,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID || '',
    });
  } catch (error) {
    console.error('Error in payment order handler:', error);
    return NextResponse.json(
      { error: 'Internal server error processing payment request' },
      { status: 500 }
    );
  }
}
