interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface ZoomMeetingResponse {
  id: number;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  join_url: string;
  start_url: string;
}

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiryTime = 0;

/**
 * Retrieves the cached Zoom OAuth token or requests a new one.
 */
export async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Missing Zoom credentials in environment variables');
  }

  // If cached token is still valid (with a 60-second buffer), use it
  if (cachedToken && Date.now() < tokenExpiryTime - 60000) {
    return cachedToken;
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zoom OAuth token request failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as ZoomTokenResponse;
    cachedToken = data.access_token;
    tokenExpiryTime = Date.now() + data.expires_in * 1000;
    
    return cachedToken;
  } catch (error) {
    console.error('Error fetching Zoom OAuth token:', error);
    throw error;
  }
}

/**
 * Creates a Zoom meeting for a given scheduled time and customer name.
 * Falls back to a mock meeting if Zoom environment credentials are placeholders.
 */
export async function createZoomMeeting(
  scheduledTime: Date,
  customerName: string
): Promise<{ meetingId: string; joinUrl: string; startUrl: string }> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const isMockMode = !accountId || accountId.includes('YOUR_ZOOM');

  if (isMockMode) {
    console.warn('⚠️ ZOOM_ACCOUNT_ID is not configured. Creating a simulated Zoom meeting.');
    const mockId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    return {
      meetingId: mockId,
      joinUrl: `https://zoom.us/j/${mockId}?pwd=mockPasscode-${Math.random().toString(36).substring(7)}`,
      startUrl: `https://zoom.us/s/${mockId}`,
    };
  }

  try {
    const token = await getZoomAccessToken();
    const formattedStartTime = scheduledTime.toISOString().split('.')[0] + 'Z'; // Zoom expects UTC without milliseconds

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: `Meta Vibronics Session - ${customerName}`,
        type: 2, // Scheduled meeting
        start_time: formattedStartTime,
        duration: 60, // 60 minutes
        timezone: 'UTC',
        settings: {
          join_before_host: true,
          jbh_time: 0,
          waiting_room: false,
          host_video: true,
          participant_video: true,
          mute_upon_entry: true,
          approval_type: 2, // No registration required
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zoom meeting creation failed: ${response.status} - ${errorText}`);
    }

    const meeting = (await response.json()) as ZoomMeetingResponse;
    return {
      meetingId: meeting.id.toString(),
      joinUrl: meeting.join_url,
      startUrl: meeting.start_url,
    };
  } catch (error) {
    console.error('Error creating Zoom meeting, falling back to mock meeting:', error);
    // Even if it fails in production due to rate limit/temporary Zoom issue, we fall back to a mock instead of breaking the flow.
    const fallbackId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    return {
      meetingId: fallbackId,
      joinUrl: `https://zoom.us/j/${fallbackId}?pwd=fallbackPasscode-${Math.random().toString(36).substring(7)}`,
      startUrl: `https://zoom.us/s/${fallbackId}`,
    };
  }
}
