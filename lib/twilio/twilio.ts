import twilio from "twilio";

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials missing. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local",
    );
  }
  return twilio(accountSid, authToken);
}

export function isE164(phone: string) {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
