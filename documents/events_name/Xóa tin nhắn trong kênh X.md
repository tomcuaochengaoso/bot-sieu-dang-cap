# "Xóa tin nhắn trong kênh X"

X is replaced by the channel or thread name.  3 types: voice channel, text channel, thread 
Full name examples:
- `"Xóa tin nhắn trong kênh Phòng Học"` (voice channel)
- `"Xóa tin nhắn trong kênh tin-tuc"` (text channel)
- `"Xóa tin nhắn trong kênh Thread Bài Viết"` (forum thread — uses thread name)

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
  "luong": <string>  // Flow category (luồng) — the top-level funnel group this event belongs to in the analytics dashboard.
  "parent_category_id": <string>  // Snowflake ID of the parent channel's category, stored as a string. Used to route forum threads to the correct luong.
  "parent_category_name": <string>  // Human-readable name of the parent channel's category.
  "parent_channel_id": <string>  // Snowflake ID of the parent channel for thread events, stored as a string.
  "parent_channel_name": <string>  // Name of the parent channel for thread events.
  "parent_channel_type": <string>  // Discord channel type of the parent channel, used to determine whether a thread is inside a forum.
  "roles": <array>  // List of role names held by the user in the server at the time of the event.
  "server_id": <string>  // Discord snowflake ID of the server (guild) where the event occurred, stored as a string.
  "servername": <string>  // The user's server-specific display name (display_name). This is also the source for distinct_id.
  "timestamp": <string>  // UTC timestamp of when the event occurred, in ISO 8601 format.
  "vietnamese_event_name": <string>  // The full Vietnamese event name as registered in Mixpanel. Mirrors the top-level event field.
}
```

---

## Trigger Condition

Fired when a `message_deleted` event occurs in a voice, text, or forum thread channel.

---

## Collection Logic

**GenericChannelProcessor** resolves `"Xóa tin nhắn trong kênh {channel_name}"`.
For voice channels the fixed vs custom classification applies. For forum
threads, the channel_name is the thread name rather than the parent forum name
(unlike other forum events which use the parent name). This is because
`message_deleted` in a thread arrives with the thread as the primary channel.
