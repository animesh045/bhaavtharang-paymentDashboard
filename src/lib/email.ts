import { Resend } from 'resend';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('your_api_key')) {
    return null;
  }
  return new Resend(apiKey);
};

export async function sendConfirmationEmail(booking: {
  customerName: string;
  email?: string | null;
  scheduledTime: Date;
  zoomJoinUrl?: string | null;
  id: string;
}): Promise<boolean> {
  if (!booking.email) {
    console.log(`Skipping email confirmation for Booking ${booking.id} because no email address was provided.`);
    return false;
  }

  const resendClient = getResendClient();
  const fromEmail = process.env.EMAIL_FROM || 'Meta Vibronics <onboarding@resend.dev>';
  const formattedTime = new Date(booking.scheduledTime).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'UTC', // We will assume UTC or local. Showing standard string representation.
  });

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-bottom: 20px;">Your Session is Confirmed!</h2>
      <p>Hello <strong>${booking.customerName}</strong>,</p>
      <p>Thank you for booking a session with <strong>Meta Vibronics</strong>. Your booking details are summarized below:</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Session Time:</strong> ${formattedTime} (UTC)</p>
        <p style="margin: 5px 0;"><strong>Booking Reference:</strong> ${booking.id}</p>
        <p style="margin: 5px 0;"><strong>Zoom Link:</strong> <a href="${booking.zoomJoinUrl || '#'}" style="color: #4f46e5; text-decoration: underline;">Join Zoom Meeting</a></p>
      </div>

      <p style="margin-top: 25px;"><strong>How to prepare:</strong></p>
      <ul>
        <li>Ensure you have a stable internet connection.</li>
        <li>Log in to the Zoom meeting 5 minutes before the start time.</li>
        <li>Bring any notes or materials relevant to your session.</li>
      </ul>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
      <p style="font-size: 12px; color: #64748b;">If you need to reschedule or have questions, please reply to this email or contact support.</p>
    </div>
  `;

  if (!resendClient) {
    console.warn('⚠️ RESEND_API_KEY is not configured. Print confirmation email locally:');
    console.log('--- EMAIL SIMULATION ---');
    console.log(`From: ${fromEmail}`);
    console.log(`To: ${booking.email}`);
    console.log(`Subject: Booking Confirmed: Meta Vibronics Session`);
    console.log(`Body: (Reference ID ${booking.id}, Scheduled at ${formattedTime})`);
    console.log(`Zoom URL: ${booking.zoomJoinUrl}`);
    console.log('------------------------');
    return true;
  }

  try {
    const response = await resendClient.emails.send({
      from: fromEmail,
      to: booking.email,
      subject: 'Booking Confirmed: Meta Vibronics Session',
      html: emailHtml,
    });

    if (response.error) {
      console.error('Resend API returned error:', response.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send confirmation email via Resend:', error);
    return false;
  }
}
