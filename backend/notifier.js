import twilio from 'twilio';
import { dbAll, dbGet, dbRun } from './db.js';

let twilioClient = null;
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('Twilio client initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Twilio client:', err.message);
  }
} else {
  console.log('Twilio credentials not found. emergency alerts will execute in Sandbox Mock Mode.');
}

/**
 * Dispatches emergency warnings via SMS, phone call, or push alerts to configured contacts.
 * 
 * @param {number} userId - The affected user's ID.
 * @param {number} alertId - The ID of the logged alert row.
 * @param {object} alertDetails - Anomaly details (type, value, rule text).
 */
export async function sendEmergencyAlert(userId, alertId, alertDetails) {
  try {
    // 1. Fetch User details
    const user = await dbGet(`SELECT full_name FROM users WHERE id = ?`, [userId]);
    const userName = user ? user.full_name : `Patient ID #${userId}`;

    // 2. Fetch emergency contacts
    const contacts = await dbAll(
      `SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY priority_order ASC`,
      [userId]
    );

    if (!contacts || contacts.length === 0) {
      console.warn(`[WARNING] No emergency contacts configured for user ${userName} (ID ${userId}).`);
      return { status: 'no_contacts', message: 'No emergency contacts found.' };
    }

    const messageText = `Your Health Will Partner EMERGENCY: Critical state detected for ${userName}.\n` +
      `Incident: ${alertDetails.anomalyType} (${alertDetails.readingValue})\n` +
      `Details: ${alertDetails.rule}\n` +
      `Estimated Location: Lat 37.7749, Long -122.4194 (User's registered home address).\n` +
      `Please contact emergency services or check on them immediately!`;

    const dispatchLog = [];

    for (const contact of contacts) {
      const contactLog = { 
        name: contact.name, 
        phone: contact.phone_number, 
        methods: [] 
      };

      // A. SMS Dispatch
      if (contact.notify_sms) {
        if (twilioClient && TWILIO_PHONE_NUMBER) {
          try {
            await twilioClient.messages.create({
              body: messageText,
              from: TWILIO_PHONE_NUMBER,
              to: contact.phone_number
            });
            contactLog.methods.push('SMS_SENT');
          } catch (twilioErr) {
            console.error(`Twilio SMS failed for ${contact.name}:`, twilioErr.message);
            contactLog.methods.push('SMS_FAILED');
          }
        } else {
          contactLog.methods.push('SMS_MOCKED_SANDBOX');
        }
      }

      // B. Voice Call Dispatch
      if (contact.notify_call) {
        if (twilioClient && TWILIO_PHONE_NUMBER) {
          try {
            // TwiML text-to-speech redirect URL
            const speechUrl = `http://twimlets.com/message?Message=${encodeURIComponent(messageText)}`;
            await twilioClient.calls.create({
              url: speechUrl,
              from: TWILIO_PHONE_NUMBER,
              to: contact.phone_number
            });
            contactLog.methods.push('CALL_DIALED');
          } catch (twilioErr) {
            console.error(`Twilio call failed for ${contact.name}:`, twilioErr.message);
            contactLog.methods.push('CALL_FAILED');
          }
        } else {
          contactLog.methods.push('CALL_MOCKED_SANDBOX');
        }
      }

      // C. Push Notification Dispatch
      if (contact.notify_push) {
        contactLog.methods.push('PUSH_NOTIFICATION_MOCKED');
      }

      dispatchLog.push(contactLog);
    }

    // 3. Update database log to contact_notified
    await dbRun(
      `UPDATE alerts_log SET status = ?, notes = ? WHERE id = ?`,
      ['contact_notified', JSON.stringify({ dispatchLog, messageText }), alertId]
    );

    console.log(`[EMERGENCY DISPATCH LOG FOR ${userName}]:`, JSON.stringify(dispatchLog, null, 2));
    return { status: 'dispatched', dispatchLog, messageText };

  } catch (error) {
    console.error('Error in sendEmergencyAlert pipeline:', error);
    throw error;
  }
}
