# "loại bỏ vai trò X"

X is replaced by the role name.

Full name example: `"loại bỏ vai trò VIP Member"`

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
  "is_role_event": <boolean>  // Boolean flag marking this event as a role change event.
  "is_trackable": <boolean>  // Boolean flag indicating the event passed tracking eligibility. Always true for events that reach Mixpanel.
  "is_unidentified": <boolean>  // Boolean flag marking fallback events that could not be matched to any known event pattern.
  "luong": <string>  // Flow category (luồng) — the top-level funnel group this event belongs to in the analytics dashboard.
  "role_action": <string>  // Direction of the role change: 'added' when a role is granted, 'removed' when it is revoked.
  "role_name": <string>  // Name of the Discord role that was added or removed in this event.
  "roles": <array>  // List of role names held by the user in the server at the time of the event.
  "server_id": <string>  // Discord snowflake ID of the server (guild) where the event occurred, stored as a string.
  "servername": <string>  // The user's server-specific display name (display_name). This is also the source for distinct_id.
  "single_role_event": <boolean>  // Boolean flag indicating this is a standard (non-marketing) role change event.
  "timestamp": <string>  // UTC timestamp of when the event occurred, in ISO 8601 format.
  "vietnamese_event_name": <string>  // The full Vietnamese event name as registered in Mixpanel. Mirrors the top-level event field.
}
```

---

## Trigger Condition

Fired when a `user_role_removed` Discord event occurs for any role.
One event is fired per role removal.

---

## Collection Logic

**UnifiedRoleHandler** processes all role change events. On removal, it formats
the event name using the pattern `"loại bỏ vai trò {role_name}"` and assigns
luong = "Vai trò người dùng cập nhập". If the removed role is in the configured
marketing role set (`MARKETING_ROLES`), a secondary `"vào mục kiến-thức-marketing"`
event is also co-fired. Role names longer than 50 characters are truncated with
an ellipsis.
