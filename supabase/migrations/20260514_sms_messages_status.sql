-- Add status + bot_confidence + escalation fields to sms_messages so
-- the Twilio auto-respond webhook can track which outbound replies
-- were auto-sent vs queued for approval, and the daily digest can
-- summarize bot activity.

ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN (
      'sent',              -- ordinary outbound, sent via Twilio
      'received',          -- inbound logged
      'auto_sent',         -- bot drafted + auto-sent (no human approval)
      'pending_approval',  -- bot drafted but low-confidence; awaits Patrick
      'manually_sent',     -- Patrick approved or manually composed
      'failed'             -- send attempt errored
    ));

ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS bot_confidence REAL;

ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS bot_rationale TEXT;

ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
-- Why a draft got queued instead of auto-sent. Examples:
--   'low_confidence' | 'bk_keyword' | 'lawyer_keyword' | 'profanity'
--   | 'quiet_hours' | 'brain_escalate' | 'first_human_review'

-- The conversation-thread reader (brain) and inbox UI both need fast
-- lookups by status (e.g. "all pending_approval drafts across all
-- leads"). Add an index.
CREATE INDEX IF NOT EXISTS sms_messages_status_idx
  ON sms_messages (status, created_at DESC)
  WHERE status IN ('pending_approval', 'auto_sent');
