# "vào mục kiến-thức-marketing"

Event co-fired alongside `"thêm vai trò X"` or `"loại bỏ vai trò X"` whenever
the changed role is a marketing role. Static name with no dynamic part.

---

## Properties

```json
{
  "$insert_id": <string>  // UUID generated per event for Mixpanel deduplication. Ensures the same event is not counted twice.
  "$time": <string>  // Mixpanel ingestion timestamp in ISO 8601 format, set from the event timestamp at creation time.
  "User ID": <string>  // Discord snowflake ID of the user who performed the action, stored as a string to prevent precision loss.
  "discordname": <string>  // The user's Discord global display name (global_name), falling back to username if not set.
  "distinct_id": <string>  // Mixpanel user identity key. Derived from servername if available, otherwise falls back to User ID.
  "event_type": <string>  // Internal system identifier for the event type. Used for schema validation and routing logic.
  "is_bot": <boolean>  // Boolean indicating whether the actor is a Discord bot account.
  "is_marketing_role": <boolean>  // Boolean flag indicating the changed role is one of the configured marketing roles.
  "is_trackable": <boolean>  // Boolean flag indicating the event passed tracking eligibility. Always true for events that reach Mixpanel.
  "is_unidentified": <boolean>  // Boolean flag marking fallback events that could not be matched to any known event pattern.
  "luong": <string>  // Flow category (luồng) — the top-level funnel group this event belongs to in the analytics dashboard.
  "role_action": <string>  // Direction of the role change: 'added' when a role is granted, 'removed' when it is revoked.
  "role_name": <string>  // Name of the Discord role that was added or removed in this event.
  "roles": <array>  // List of role names held by the user in the server at the time of the event.
  "server_id": <string>  // Discord snowflake ID of the server (guild) where the event occurred, stored as a string.
  "servername": <string>  // The user's server-specific display name (display_name). This is also the source for distinct_id.
  "timestamp": <string>  // UTC timestamp of when the event occurred, in ISO 8601 format.
  "triggered_by_role_change": <boolean>  // Boolean flag on the secondary marketing onboarding event, indicating it was co-fired by a role change.
  "vietnamese_event_name": <string>  // The full Vietnamese event name as registered in Mixpanel. Mirrors the top-level event field.
}
```

---

## Trigger Condition

Fired when a `user_role_added` or `user_role_removed` event occurs for any role
in the marketing role set: Mkt Fundamental, Case Study, Branding, Digital,
Trade, Công nghệ Mkt, Tâm thế làm Mkt.
This event is always paired with the corresponding `"thêm vai trò X"` or
`"loại bỏ vai trò X"` event in the same batch.

---

## Collection Logic

**UnifiedRoleHandler.is_marketing_role()** checks whether the role name is in
the `MARKETING_ROLE_NAMES` set. If true, a second `EventIdentification` object
with this fixed event name and luong = "Onbroading server" is appended to the
return list. The marketing channel ID `1135417332446019604` is stored in the
handler but is not used to filter this event — it fires on any server that
adds/removes a marketing role.
