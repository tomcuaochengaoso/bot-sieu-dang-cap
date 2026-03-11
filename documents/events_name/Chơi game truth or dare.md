# "Chơi game truth or dare"

Event fired when a user sends a message inside the truth-or-dare game thread,
OR when the Truth or Dare bot sends a message.
Static name with no dynamic part.

---

## Properties

```json
{
  "$insert_id": <string>  // UUID generated per event for Mixpanel deduplication. Ensures the same event is not counted twice.
  "$time": <string>  // Mixpanel ingestion timestamp in ISO 8601 format, set from the event timestamp at creation time.
  "User ID": <string>  // Discord snowflake ID of the user who performed the action, stored as a string to prevent precision loss.
  "attachment_count": <number>  // Total number of file attachments in the message.
  "bot_id": <string>  // Discord snowflake ID of the bot that produced the response, stored as a string.
  "bot_name": <string>  // English name of the bot as configured in the system.
  "channel_id": <string>  // Discord snowflake ID of the channel where the event occurred, stored as a string.
  "channel_name": <string>  // Name of the Discord channel where the event occurred.
  "channel_type": <string>  // Discord channel type string (e.g. text, voice, public_thread, forum).
  "character_count": <number>  // Number of characters in the message content at the time the event was captured.
  "correlation_confidence": <number>  // Float between 0.0 and 1.0 indicating how confident the system is in the user-bot correlation.
  "correlation_delay_seconds": <number>  // Number of seconds between the user message and the bot response, present only when is_correlated is true.
  "correlation_type": <string>  // Vietnamese string describing whether the triggering user was identified (theo dõi / không theo dõi).
  "discordname": <string>  // The user's Discord global display name (global_name), falling back to username if not set.
  "distinct_id": <string>  // Mixpanel user identity key. Derived from servername if available, otherwise falls back to User ID.
  "embed_count": <number>  // Total number of embed cards in the message.
  "event_type": <string>  // Internal system identifier for the event type. Used for schema validation and routing logic.
  "has_attachments": <boolean>  // Boolean indicating whether the message contained one or more file attachments.
  "has_embeds": <boolean>  // Boolean indicating whether the message contained one or more embed cards.
  "has_gif": <boolean>  // Boolean indicating whether the message content contained a GIF link.
  "has_stickers": <boolean>  // Boolean indicating whether the message contained one or more stickers.
  "in_bot_thread": <boolean>  // Boolean indicating whether the bot responded inside the designated bot thread (ID 1383325105614098583).
  "is_bot": <boolean>  // Boolean indicating whether the actor is a Discord bot account.
  "is_correlated": <boolean>  // Boolean indicating whether the system successfully matched this bot response to a triggering user message.
  "is_trackable": <boolean>  // Boolean flag indicating the event passed tracking eligibility. Always true for events that reach Mixpanel.
  "is_unidentified": <boolean>  // Boolean flag marking fallback events that could not be matched to any known event pattern.
  "luong": <string>  // Flow category (luồng) — the top-level funnel group this event belongs to in the analytics dashboard.
  "message_id": <string>  // Discord snowflake ID of the message associated with this event, stored as a string.
  "message_type": <string>  // Discord message type string (e.g. default, reply).
  "parent_channel_id": <string>  // Snowflake ID of the parent channel for thread events, stored as a string.
  "parent_channel_name": <string>  // Name of the parent channel for thread events.
  "parent_channel_type": <string>  // Discord channel type of the parent channel, used to determine whether a thread is inside a forum.
  "roles": <array>  // List of role names held by the user in the server at the time of the event.
  "server_id": <string>  // Discord snowflake ID of the server (guild) where the event occurred, stored as a string.
  "servername": <string>  // The user's server-specific display name (display_name). This is also the source for distinct_id.
  "special_thread": <boolean>  // Boolean flag marking this event as originating from a configured special thread.
  "sticker_count": <number>  // Total number of stickers in the message.
  "thread_id": <string>  // Snowflake ID of the thread if the event occurred inside a thread, stored as a string.
  "thread_name": <string>  // Display name of the thread if the event occurred inside a thread.
  "timestamp": <string>  // UTC timestamp of when the event occurred, in ISO 8601 format.
  "use_correlation": <boolean>  // Boolean indicating whether this bot uses the user-to-bot correlation tracking mechanism.
  "vietnamese_bot_name": <string>  // Vietnamese display name of the bot as configured in the system.
  "vietnamese_event_name": <string>  // The full Vietnamese event name as registered in Mixpanel. Mirrors the top-level event field.
}
```

---

## Trigger Condition

Fired in two independent ways:
1. A `message_sent` event occurs in the special truth-or-dare thread
   (`thread_id = 1383323246619004998`), regardless of who sent it.
2. A `message_sent` event is received from the Truth or Dare bot
   (`bot_id = 692045914436796436`), regardless of channel.

---

## Collection Logic

**SpecialThreadHandler** holds a hardcoded dictionary of special thread IDs.
When a message is sent in a registered thread, the handler returns the
configured event name directly — bypassing the generic channel pattern pipeline.

For the bot path, **BotInteractionCorrelator** intercepts the bot message
before channel processing occurs. Because `use_correlation = false` for this
bot, no correlation is attempted.
