# "Bấm để tạo room"

Event fired when a user enters the designated room-creation trigger voice channel.
This is a fixed-name event — no dynamic part in the name.

---

## Properties

```json
{
  "$insert_id": <string>  // UUID generated per event for Mixpanel deduplication. Ensures the same event is not counted twice.
  "$time": <string>  // Mixpanel ingestion timestamp in ISO 8601 format, set from the event timestamp at creation time.
  "User ID": <string>  // Discord snowflake ID of the user who performed the action, stored as a string to prevent precision loss.
  "channel_id": <string>  // Discord snowflake ID of the channel where the event occurred, stored as a string.
  "channel_name": <string>  // Name of the Discord channel where the event occurred.
  "channel_type": <string>  // Discord channel type string (e.g. text, voice, public_thread, forum).
  "destination_channel_id": <string>  // Snowflake ID of the channel the user was routed to after the room-creation trigger, stored as a string.
  "discordname": <string>  // The user's Discord global display name (global_name), falling back to username if not set.
  "distinct_id": <string>  // Mixpanel user identity key. Derived from servername if available, otherwise falls back to User ID.
  "event_type": <string>  // Internal system identifier for the event type. Used for schema validation and routing logic.
  "is_bot": <boolean>  // Boolean indicating whether the actor is a Discord bot account.
  "is_trackable": <boolean>  // Boolean flag indicating the event passed tracking eligibility. Always true for events that reach Mixpanel.
  "is_unidentified": <boolean>  // Boolean flag marking fallback events that could not be matched to any known event pattern.
  "luong": <string>  // Flow category (luồng) — the top-level funnel group this event belongs to in the analytics dashboard.
  "roles": <array>  // List of role names held by the user in the server at the time of the event.
  "room_creation": <boolean>  // Boolean flag marking this event as a room-creation trigger interaction.
  "server_id": <string>  // Discord snowflake ID of the server (guild) where the event occurred, stored as a string.
  "servername": <string>  // The user's server-specific display name (display_name). This is also the source for distinct_id.
  "timestamp": <string>  // UTC timestamp of when the event occurred, in ISO 8601 format.
  "trigger_channel_id": <string>  // Snowflake ID of the room-creation trigger voice channel, stored as a string.
  "vietnamese_event_name": <string>  // The full Vietnamese event name as registered in Mixpanel. Mirrors the top-level event field.
}
```

---

## Trigger Condition

Fired when a `user_joined_voice_channel` Discord event occurs and the destination
channel ID matches the configured room-creation trigger channel
(`channel_id = 1127643888883077170`).
Also fires on a voice channel switch (`user_switched_voice_channel`) where the
destination or origin channel is the same trigger channel.

---

## Collection Logic

**RoomCreationHandler** intercepts voice join events before any generic voice
channel processing. The channel is identified by a single hardcoded ID
(`1127643888883077170`), not by category. Because the check runs first in
`try_specific_identification`, this channel never generates a generic
"Vào kênh X" event — the room-creation event exclusively captures all
traffic to that channel.
