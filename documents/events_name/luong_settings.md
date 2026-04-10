# Luong Settings

"Luong" (luồng) is the flow category property sent on every Mixpanel event.
It groups events into top-level user journey funnels in the analytics dashboard.

Some events have a **fixed** luong. Others have a **dynamic** luong that changes
based on the channel or context — these are marked with a note.

---

## All Possible Luong Values

- `Onbroading server`
- `Sử dụng tính năng chat chung`
- `Vào mục game gặng`
- `Vào mục Bấm để tạo room`
- `Vào mục cài-đặt-room`
- `Vào mục {forum_name}` — dynamic, see forum events below
- `Vào các kênh voice cố định`
- `Vào các kênh voice tự tạo`
- `Vào các kênh chat`
- `Vai trò người dùng cập nhập`

---

## Luong per Event Template

### Fixed Voice Channel Events
Events in voice channels inside the tracked voice category (`category_id = 1087553008033644604`).

| Event template | Luong |
|---|---|
| "Vào kênh X" | `Vào các kênh voice cố định` |
| "Rời kênh X" | `Vào các kênh voice cố định` |
| "Nhắn trong kênh X" | `Vào các kênh voice cố định` |
| "Sửa tin nhắn trong kênh X" | `Vào các kênh voice cố định` |
| "Xóa tin nhắn trong kênh X" | `Vào các kênh voice cố định` |
| "React trong kênh X" | `Vào các kênh voice cố định` |
| "Gửi sticker trong kênh X" | `Vào các kênh voice cố định` |

---

### Custom Voice Channel Events
Events in voice channels **outside** the tracked voice category (user-created rooms).

| Event template | Luong |
|---|---|
| "Vào kênh X" | `Vào các kênh voice tự tạo` |
| "Rời kênh X" | `Vào các kênh voice tự tạo` |

> Note: Only join and leave are tested for custom voice channels. Other interactions
> (message, react, sticker, edit, delete) would also get `Vào các kênh voice tự tạo`
> if they occurred, as the same category-check logic applies.

---

### Forum Channel Events
Forum events have a **dynamic luong** — the value is `"Vào mục {forum_name}"` where
`forum_name` is the name of the parent forum channel (not the thread name).

| Event template | Luong |
|---|---|
| "Đăng bài trong X" | `Vào mục {forum_name}` — dynamic |
| "Xóa bài trong X" | `Vào mục {forum_name}` — dynamic |
| "Thảo luận về bài viết trong X" | `Vào mục {forum_name}` — dynamic |
| "Sửa tin nhắn về bài viết trong X" | `Vào mục {forum_name}` — dynamic |
| "Gửi sticker trong X" | `Vào mục {forum_name}` — dynamic |

Example: if the forum channel is named "Chia Sẻ Kinh Nghiệm", the luong becomes
`"Vào mục Chia Sẻ Kinh Nghiệm"`.

> Note: `"Xóa tin nhắn trong kênh X"` inside a forum thread is an exception —
> it receives `Vào các kênh chat` instead, because message deletion in a thread
> is routed as a text channel event, not a forum event.

---

### Text Channel Events
Events in standard text channels.

| Event template | Luong |
|---|---|
| "Nhắn trong kênh X" | `Vào các kênh chat` |
| "Sửa tin nhắn trong kênh X" | `Vào các kênh chat` |
| "Xóa tin nhắn trong kênh X" | `Vào các kênh chat` |
| "React trong kênh X" | `Vào các kênh chat` |
| "Gửi sticker trong kênh X" | `Vào các kênh chat` |

---

### General Chat Channel Events
Events exclusively in the general chat channel (`channel_id = 1092307876594323510`).

| Event template | Luong |
|---|---|
| "Sử dụng chat chung" | `Sử dụng tính năng chat chung` |
| "Vào gif trong chat chung" | `Sử dụng tính năng chat chung` |
| "React trong kênh X" (chat-chung) | `Vào các kênh chat` |
| "Vào sticker trong chat chung" | `Sử dụng tính năng chat chung` |

> Note: React in the general chat channel falls through to the generic text
> channel pattern, so it receives `Vào các kênh chat` rather than
> `Sử dụng tính năng chat chung`.

---

### Bot Events

| Event template | Luong |
|---|---|
| "Chơi game trồng cây" | `Vào mục game gặng` |
| "Chơi game marwuy coin" | `Vào mục game gặng` |
| "Chơi game truth or dare" | `Vào mục game gặng` |
| "Chơi game pancake và owo X" | `Vào mục game gặng` |
| "Sử dụng bots cài đặt room X" | `Vào mục cài-đặt-room` |

---

### Special Channel Events

| Event template | Luong |
|---|---|
| "Bấm để tạo room" | `Vào mục Bấm để tạo room` |

---

### Role Events

| Event template | Luong |
|---|---|
| "thêm vai trò X" | `Vai trò người dùng cập nhập` |
| "loại bỏ vai trò X" | `Vai trò người dùng cập nhập` |
| "vào mục kiến-thức-marketing" | `Onbroading server` |

> Note: When a marketing role is added or removed, two events fire. The role event
> itself gets `Vai trò người dùng cập nhập`. The co-fired secondary event
> `"vào mục kiến-thức-marketing"` gets `Onbroading server`.

---

### Unidentified / Fallback Events

| Event template | Luong |
|---|---|
| "UNIDENTIFIED_EVENT: {event_type}" | `Vào các kênh chat` |
