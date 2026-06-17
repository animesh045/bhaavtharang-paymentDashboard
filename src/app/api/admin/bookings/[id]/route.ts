import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createZoomMeeting } from '@/lib/zoom';
import { createCalendarEvent } from '@/lib/calendar';
import { sendConfirmationEmail } from '@/lib/email';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate admin
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (session !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // --- Action: Verify Payment & Confirm Booking ---
    if (action === 'verify-payment') {
      let updated = booking;
      if (booking.paymentStatus !== 'paid') {
        updated = await prisma.booking.update({
          where: { id },
          data: { paymentStatus: 'paid' },
        });
      }

      // If booking is not confirmed, confirm it and generate links
      if (updated.bookingStatus !== 'confirmed') {
        // Create Zoom meeting
        const zoomMeeting = await createZoomMeeting(updated.scheduledTime, updated.customerName);

        // Create Google Calendar event
        const calendarEventId = await createCalendarEvent({
          id: updated.id,
          customerName: updated.customerName,
          phone: updated.phone,
          email: updated.email,
          scheduledTime: updated.scheduledTime,
          zoomJoinUrl: zoomMeeting.joinUrl,
          notes: updated.notes,
        });

        // Update database with confirmed status and links
        const finalBooking = await prisma.booking.update({
          where: { id },
          data: {
            bookingStatus: 'confirmed',
            zoomMeetingId: zoomMeeting.meetingId,
            zoomJoinUrl: zoomMeeting.joinUrl,
            zoomStartUrl: zoomMeeting.startUrl,
            calendarEventId: calendarEventId,
          },
        });

        // Send Email Confirmation
        await sendConfirmationEmail({
          id: finalBooking.id,
          customerName: finalBooking.customerName,
          email: finalBooking.email,
          scheduledTime: finalBooking.scheduledTime,
          zoomJoinUrl: finalBooking.zoomJoinUrl,
        });

        return NextResponse.json({ success: true, booking: finalBooking });
      }

      return NextResponse.json({ success: true, booking: updated });
    }

    // --- Action: Assign Time / Reschedule ---
    if (action === 'assign-time') {
      const { scheduledTime } = body;
      if (!scheduledTime) {
        return NextResponse.json({ error: 'Missing scheduledTime' }, { status: 400 });
      }

      const newDate = new Date(scheduledTime);
      if (isNaN(newDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }

      // Update time in database
      const updated = await prisma.booking.update({
        where: { id },
        data: {
          scheduledTime: newDate,
        },
      });

      // If booking was already confirmed, let's also regenerate meetings/events to sync
      if (updated.bookingStatus === 'confirmed') {
        const zoomMeeting = await createZoomMeeting(updated.scheduledTime, updated.customerName);
        const calendarEventId = await createCalendarEvent({
          id: updated.id,
          customerName: updated.customerName,
          phone: updated.phone,
          email: updated.email,
          scheduledTime: updated.scheduledTime,
          zoomJoinUrl: zoomMeeting.joinUrl,
          notes: updated.notes,
        });

        const syncedBooking = await prisma.booking.update({
          where: { id },
          data: {
            zoomMeetingId: zoomMeeting.meetingId,
            zoomJoinUrl: zoomMeeting.joinUrl,
            zoomStartUrl: zoomMeeting.startUrl,
            calendarEventId: calendarEventId,
          },
        });

        // Send Email Confirmation for rescheduling
        await sendConfirmationEmail({
          id: syncedBooking.id,
          customerName: syncedBooking.customerName,
          email: syncedBooking.email,
          scheduledTime: syncedBooking.scheduledTime,
          zoomJoinUrl: syncedBooking.zoomJoinUrl,
        });

        return NextResponse.json({ success: true, booking: syncedBooking });
      }

      return NextResponse.json({ success: true, booking: updated });
    }

    // --- Action: Reassign Meet (Regenerate Links) ---
    if (action === 'reassign-meet') {
      // Create fresh zoom meeting
      const zoomMeeting = await createZoomMeeting(booking.scheduledTime, booking.customerName);

      // Create fresh google calendar event
      const calendarEventId = await createCalendarEvent({
        id: booking.id,
        customerName: booking.customerName,
        phone: booking.phone,
        email: booking.email,
        scheduledTime: booking.scheduledTime,
        zoomJoinUrl: zoomMeeting.joinUrl,
        notes: booking.notes,
      });

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          zoomMeetingId: zoomMeeting.meetingId,
          zoomJoinUrl: zoomMeeting.joinUrl,
          zoomStartUrl: zoomMeeting.startUrl,
          calendarEventId: calendarEventId,
          bookingStatus: 'confirmed', // Mark confirmed if it wasn't
        },
      });

      // Send email notification with new links
      await sendConfirmationEmail({
        id: updated.id,
        customerName: updated.customerName,
        email: updated.email,
        scheduledTime: updated.scheduledTime,
        zoomJoinUrl: updated.zoomJoinUrl,
      });

      return NextResponse.json({ success: true, booking: updated });
    }

    // --- Action: Cancel Booking ---
    if (action === 'cancel-booking') {
      const updated = await prisma.booking.update({
        where: { id },
        data: {
          bookingStatus: 'cancelled',
        },
      });
      return NextResponse.json({ success: true, booking: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error executing admin booking action:', error);
    return NextResponse.json({ error: 'Internal server error executing action' }, { status: 500 });
  }
}
