# "Gửi sticker trong X"

X is replaced by the forum channel name (not the thread name).

Full name example: `"Gửi sticker trong Chia Sẻ Kinh Nghiệm"`

This template applies to forum channels only.
For voice and text channels the name is `"Gửi sticker trong kênh X"` (separate event).

---

## Properties

```json
{
  "$insert_id": <string>  // UUID generated per event for Mixpanel deduplication. Ensures the same event is not counted twice.
  "$time": <string>  // Mixpanel ingestion timestamp in ISO 8601 format, set from the event timestamp at creation time.
  "User ID": <string>  // Discord snowflake ID of the user who performed the action, stored as a string to prevent precision loss.
  "attachment_count": <number>  // Total number of file attachments in the message.
  "category_id": <number>  // Discord snowflake ID of the category that contains this channel, stored as a string. Used for category-based tracking.
  "category_name": <string>  // Human-readable name of the category that contains this channel.
  "channel_id": <string>  // Discord snowflake ID of the channel where the event occurred, stored as a string.
  "channel_name": <string>  // Name of the Discord channel where the event occurred.
  "channel_type": <string>  // Discord channel type string (e.g. text, voice, public_thread, forum).
  "character_count": <number>  // Number of characters in the message content at the time the event was captured.
  "discordname": <string>  // The user's Discord global display name (global_name), falling back to username if not set.
  "distinct_id": <string>  // Mixpanel user identity key. Derived from servername if available, otherwise falls back to User ID.
  "embed_count": <number>  // Total number of embed cards in the message.
  "event_type": <string>  // Internal system identifier for the event type. Used for schema validation and routing logic.
  "has_attachments": <boolean>  // Boolean indicating whether the message contained one or more file attachments.
  "has_custom_stickers": <boolean>  // Boolean indicating whether any of the stickers belong to the server (guild-specific stickers).
  "has_embeds": <boolean>  // Boolean indicating whether the message contained one or more embed cards.
  "has_gif": <boolean>  // Boolean indicating whether the message content contained a GIF link.
  "has_stickers": <boolean>  // Boolean indicating whether the message contained one or more stickers.
  "interaction_type": <string>  // Sub-classification of the interaction within the channel type (e.g. message, reaction, sticker, join, leave).
  "is_bot": <boolean>  // Boolean indicating whether the actor is a Discord bot account.
  "is_trackable": <boolean>  // Boolean flag indicating the event passed tracking eligibility. Always true for events that reach Mixpanel.
  "is_unidentified": <boolean>  // Boolean flag marking fallback events that could not be matched to any known event pattern.
  "luong": <string>  // Flow category (luồng) — the top-level funnel group this event belongs to in the analytics dashboard.
  "message_id": <string>  // Discord snowflake ID of the message associated with this event, stored as a string.
  "message_type": <string>  // Discord message type string (e.g. default, reply).
  "parent_category_id": <string>  // Snowflake ID of the parent channel's category, stored as a string. Used to route forum threads to the correct luong.
  "parent_category_name": <string>  // Human-readable name of the parent channel's category.
  "parent_channel_id": <string>  // Snowflake ID of the parent channel for thread events, stored as a string.
  "parent_channel_name": <string>  // Name of the parent channel for thread events.
  "parent_channel_type": <string>  // Discord channel type of the parent channel, used to determine whether a thread is inside a forum.
  "roles": <array>  // List of role names held by the user in the server at the time of the event.
  "server_id": <string>  // Discord snowflake ID of the server (guild) where the event occurred, stored as a string.
  "servername": <string>  // The user's server-specific display name (display_name). This is also the source for distinct_id.
  "sticker_count": <number>  // Total number of stickers in the message.
  "sticker_ids": <array>  // List of Discord snowflake IDs of the stickers used in the message.
  "sticker_names": <array>  // List of display names of the stickers used in the message.
  "thread_id": <string>  // Snowflake ID of the thread if the event occurred inside a thread, stored as a string.
  "thread_name": <string>  // Display name of the thread if the event occurred inside a thread.
  "timestamp": <string>  // UTC timestamp of when the event occurred, in ISO 8601 format.
  "vietnamese_event_name": <string>  // The full Vietnamese event name as registered in Mixpanel. Mirrors the top-level event field.
}
```

---

## Trigger Condition

Fired when a `sticker_sent` event occurs inside a thread whose parent channel
is of type `forum`, and the parent channel's category is a tracked forum
category (`category_id` in the tracked set).

---

## Collection Logic

**GenericChannelProcessor (forum)** resolves `channel_name` to the parent
forum channel name when the event occurs inside a thread. The system uses
`parent_channel_type` to detect forum routing, and `parent_category_id` to
verify the category is being tracked. Category IDs are registered in
`TrackedForumCategories.TRACKED_CATEGORY_IDS`. Any forum channel inside a
tracked category is automatically captured — no individual channel IDs need
to be configured.
