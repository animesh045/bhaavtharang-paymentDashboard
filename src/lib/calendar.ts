import { google } from 'googleapis';

const getCalendarClient = () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey || email.includes('your-service-account')) {
    return null;
  }

  try {
    const formattedKey = privateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: email,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    return google.calendar({ version: 'v3', auth });
  } catch (error) {
    console.error('Failed to initialize Google Calendar client:', error);
    return null;
  }
};

/**
 * Checks Google Calendar availability for a specific day.
 * Returns an array of ISO string start times that are BUSY.
 * If not configured, returns simulated busy slots.
 */
export async function getBusySlots(startOfDay: Date, endOfDay: Date): Promise<Date[]> {
  const calendarClient = getCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!calendarClient) {
    console.warn('⚠️ Google Calendar service account not configured. Returning simulated busy slots.');
    // Simulate some busy slots: e.g. 11:00 AM to 12:00 PM and 3:00 PM to 4:00 PM local time
    const baseDate = new Date(startOfDay);
    baseDate.setHours(11, 0, 0, 0);
    const slot1 = new Date(baseDate);
    
    baseDate.setHours(15, 0, 0, 0);
    const slot2 = new Date(baseDate);
    
    return [slot1, slot2];
  }

  try {
    const response = await calendarClient.freebusy.query({
      requestBody: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busyList = response.data.calendars?.[calendarId]?.busy || [];
    return busyList
      .map((period) => (period.start ? new Date(period.start) : null))
      .filter((d): d is Date => d !== null);
  } catch (error) {
    console.error('Error fetching free/busy availability from Google Calendar:', error);
    return [];
  }
}

/**
 * Generates list of available hourly slots for a date (e.g. 9:00 AM to 6:00 PM local time).
 * Excludes slots that conflict with the busy list.
 */
export async function getAvailableSlots(date: Date): Promise<Date[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // We fetch busy start times from the calendar
  const busyStartTimes = await getBusySlots(startOfDay, endOfDay);
  const busyTimestamps = busyStartTimes.map((d) => d.getTime());

  const slots: Date[] = [];
  // Available working hours: 9:00 AM to 6:00 PM (18:00)
  for (let hour = 9; hour < 18; hour++) {
    const slotTime = new Date(date);
    slotTime.setHours(hour, 0, 0, 0);
    
    // Check if slot time conflicts with any busy time (within 60-minute window)
    const isBusy = busyTimestamps.some((busyTime) => {
      // Conflict if slot falls inside the busy event time
      // Assume calendar busy events are 60 mins long
      return Math.abs(slotTime.getTime() - busyTime) < 60 * 60 * 1000;
    });

    // Also verify that the slot is in the future
    if (!isBusy && slotTime.getTime() > Date.now()) {
      slots.push(slotTime);
    }
  }

  return slots;
}

/**
 * Schedules a 60-minute event on the admin's Google Calendar with Zoom link.
 * Falls back to mock code if credentials are not configured.
 */
export async function createCalendarEvent(booking: {
  customerName: string;
  phone: string;
  email?: string | null;
  zoomJoinUrl?: string | null;
  scheduledTime: Date;
  id: string;
  notes?: string | null;
}): Promise<string> {
  const calendarClient = getCalendarClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!calendarClient) {
    console.warn('⚠️ Google Calendar service account not configured. Skipping event creation.');
    return `mock-event-${Math.random().toString(36).substring(7)}`;
  }

  const startTime = new Date(booking.scheduledTime);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 60 minutes duration

  const description = `
Meta Vibronics Booking Details:
- Customer Name: ${booking.customerName}
- Phone Number: ${booking.phone}
- Email: ${booking.email || 'N/A'}
- Reference ID: ${booking.id}
- Zoom Link: ${booking.zoomJoinUrl || 'N/A'}
- Notes: ${booking.notes || 'None'}
  `.trim();

  try {
    const response = await calendarClient.events.insert({
      calendarId: calendarId,
      requestBody: {
        summary: `Meta Vibronics Session - ${booking.customerName}`,
        description: description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'email', minutes: 120 },
          ],
        },
      },
    });

    return response.data.id || `mock-event-${Math.random().toString(36).substring(7)}`;
  } catch (error) {
    console.error('Error creating Google Calendar event, falling back:', error);
    return `fallback-event-${Math.random().toString(36).substring(7)}`;
  }
}
