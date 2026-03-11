# "Vào kênh X"

X is replaced by the voice channel name. 2 type: (fixed voice channel, custom voice channel)

Full name examples:
- `"Vào kênh Phòng Học"` (fixed voice channel)
- `"Vào kênh Phòng Riêng ABC"` (custom voice channel)

Note: the room-creation trigger channel (`1127643888883077170`) uses this same
name pattern but is intercepted by **RoomCreationHandler** before reaching this
template, so it produces `"Bấm để tạo room"` instead.

---

## Properties

```json
{
  "$insert_id": <string>  // UUID generated per event for Mixpanel deduplication. Ensures the same event is not counted twice.
  "$time": <string>  // Mixpanel ingestion timestamp in ISO 8601 format, set from the event timestamp at creation time.
  "User ID": <string>  // Discord snowflake ID of the user who performed the action, stored as a string to prevent precision loss.
  "category_id": <string>  // Discord snowflake ID of the category that contains this channel, stored as a string. Used for category-based tracking.
  "category_name": <string>  // Human-readable name of the category that contains this channel.
  "channel_id": <string>  // Discord snowflake ID of the channel where the event occurred, stored as a string.
  "channel_name": <string>  // Name of the Discord channel where the event occurred.
  "channel_type": <string>  // Discord channel type string (e.g. text, voice, public_thread, forum).
  "discordname": <string>  // The user's Discord global display name (global_name), falling back to username if not set.
  "distinct_id": <string>  // Mixpanel user identity key. Derived from servername if available, otherwise falls back to User ID.
  "event_type": <string>  // Internal system identifier for the event type. Used for schema validation and routing logic.
  "interaction_type": <string>  // Sub-classification of the interaction within the channel type (e.g. message, reaction, sticker, join, leave).
  "is_bot": <boolean>  // Boolean indicating whether the actor is a Discord bot account.
  "is_trackable": <boolean>  // Boolean flag indicating the event passed tracking eligibility. Always true for events that reach Mixpanel.
  "is_unidentified": <boolean>  // Boolean flag marking fallback events that could not be matched to any known event pattern.
  "is_voice_switch": <boolean>  // Boolean flag indicating this join event was part of a voice channel switch rather than a fresh join.
  "luong": <string>  // Flow category (luồng) — the top-level funnel group this event belongs to in the analytics dashboard.
  "previous_channel_id": <string>  // Snowflake ID of the voice channel the user was in before switching, stored as a string.
  "previous_channel_name": <string>  // Name of the voice channel the user was in before switching.
  "roles": <array>  // List of role names held by the user in the server at the time of the event.
  "server_id": <string>  // Discord snowflake ID of the server (guild) where the event occurred, stored as a string.
  "servername": <string>  // The user's server-specific display name (display_name). This is also the source for distinct_id.
  "timestamp": <string>  // UTC timestamp of when the event occurred, in ISO 8601 format.
  "vietnamese_event_name": <string>  // The full Vietnamese event name as registered in Mixpanel. Mirrors the top-level event field.
}
```

---

## Trigger Condition

Fired when a `user_joined_voice_channel` or `user_switched_voice_channel` event
occurs in any voice channel that is NOT the room-creation trigger channel.

---

## Collection Logic

**RoomCreationHandler** is checked first in `try_specific_identification`. If the
channel ID does not match the trigger channel, processing falls through to
**GenericChannelProcessor (voice)** which applies `"Vào kênh {channel_name}"`.
`TrackedVoiceCategories` then assigns the luong: fixed voice for channels in
category `1087553008033644604`, custom voice for all others. Voice channel
switches that land outside the fixed category generate this event with the
`is_voice_switch = true` flag and additional `previous_channel_id` /
`previous_channel_name` properties.
