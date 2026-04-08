# Events Schema Comparison Report

## Files Compared

| Aspect | Legacy Schema | Current Schema |
|--------|---------------|----------------|
| **File** | `legacy_event_schema.yaml` | `eventSchemas.yml` |
| **Version** | 9.0 | 0.1.1 |
| **Format** | mixpanel_vietnamese_events | ivan-bot-event-schema |
| **Lines** | 1,346 | 528 |

---

## 🚨 CRITICAL DISCREPANCIES

### 1. Vietnamese Event Name Spelling Mismatch

| Event Type | Legacy (v9.0) | Current (0.1.1) | Status |
|------------|---------------|-----------------|--------|
| General Chat | "Sử dụng **chát** chung" | "Sử dụng **chat** chung" | ⚠️ MISMATCH |
| Sticker in Chat | "Vào **emojy** trong chát chung" | "Vào **sticker** trong chat chung" | ⚠️ MISMATCH |
| Marwuy Game | "Chơi **gêm** marwuy coin" | "Chơi **game** marwuy coin" | ⚠️ MISMATCH |
| Pancake/OwO | "Chơi **gêm** pancake và owo" | "Chơi **game** pancake và owo" | ⚠️ MISMATCH |
| Truth/Dare | "Chơi **gêm** truth or dare" | "Chơi **game** truth or dare" | ⚠️ MISMATCH |
| Tree Growing | "Chơi **gêm** trồng cây" | "Chơi **game** trồng cây" | ⚠️ MISMATCH |
| Marketing Role | "vào mục ⭐️kiến-thức-marketing" | "vào mục kiến-thức-marketing" | ⚠️ MISMATCH |
| Room Settings Bot | "Sử dụng **bots** cài đặt room" | "Sử dụng bots cài đặt room" | ✅ MATCH |

**Analysis**: Legacy uses Vietnamese-style spelling ("gêm", "chát", "emojy"), while current uses English spelling ("game", "chat", "sticker").

---

### 2. Event Coverage Gap Analysis

#### Events in LEGACY but NOT in CURRENT:

| Event Name | Luồng Category | Severity |
|------------|----------------|----------|
| `mod_message_update` | Onbroading server | 🔴 HIGH |
| `general_chat_emoji` | Sử dụng tính năng chát chung | 🟡 MEDIUM |
| `announcement_follow` | Xem loa phương | 🔴 HIGH |
| `user_role_added` | Vai trò ngườii dùng cập nhập | 🔴 HIGH |
| `user_role_removed` | Vai trò ngườii dùng cập nhập | 🔴 HIGH |
| `bot_thread_message_uncorrelated` | Vào mục gêm gủng | 🟡 MEDIUM |
| `voice_fixed_leave` | Vào các kênh voice cố định | 🔴 HIGH |
| `voice_switch_to_fixed` | Vào các kênh voice cố định | 🔴 HIGH |
| `voice_fixed_delete_message` | Vào các kênh voice cố định | 🟡 MEDIUM |
| `voice_fixed_edit_message` | Vào các kênh voice cố định | 🟡 MEDIUM |
| `voice_fixed_reaction` | Vào các kênh voice cố định | 🟡 MEDIUM |
| `voice_fixed_sticker` | Vào các kênh voice cố định | 🟡 MEDIUM |
| `voice_fixed_bot_interaction` | Vào các kênh voice cố định | 🟡 MEDIUM |
| `voice_custom_join` | Vào các kênh voice tự tạo | 🔴 HIGH |
| `voice_custom_leave` | Vào các kênh voice tự tạo | 🔴 HIGH |
| `voice_switch_to_custom` | Vào các kênh voice tự tạo | 🔴 HIGH |
| `voice_custom_delete_message` | Vào các kênh voice tự tạo | 🟡 MEDIUM |
| `voice_custom_edit_message` | Vào các kênh voice tự tạo | 🟡 MEDIUM |
| `voice_custom_reaction` | Vào các kênh voice tự tạo | 🟡 MEDIUM |
| `voice_custom_sticker` | Vào các kênh voice tự tạo | 🟡 MEDIUM |
| `voice_custom_bot_interaction` | Vào các kênh voice tự tạo | 🟡 MEDIUM |
| `text_channel_delete_message` | Vào các kênh chat | 🟡 MEDIUM |
| `text_channel_edit_message` | Vào các kênh chat | 🟡 MEDIUM |
| `text_channel_reaction` | Vào các kênh chat | 🟡 MEDIUM |
| `text_channel_sticker` | Vào các kênh chat | 🟡 MEDIUM |
| `text_channel_bot_interaction` | Vào các kênh chat | 🟡 MEDIUM |
| `forum_thread_follow` | Vào mục "{forum_name}" | 🟡 MEDIUM |
| `forum_react_to_thread` | Vào mục "{forum_name}" | 🟡 MEDIUM |
| `forum_react_to_message` | Vào mục "{forum_name}" | 🟡 MEDIUM |
| `forum_sticker_in_thread` | Vào mục "{forum_name}" | 🟡 MEDIUM |

**Total Missing in Current**: ~30 events

---

#### Events in CURRENT but NOT in LEGACY:

| Event Name | Notes |
|------------|-------|
| None identified | Current schema is a subset of legacy |

---

### 3. Bot Configuration Discrepancies

#### Legacy Schema Bots:

| Bot | Bot ID | Thread ID | Correlation |
|-----|--------|-----------|-------------|
| Tree Growing | 731736201400418314 | 1383313866943103067 | ❌ No |
| Pancake | 239631525350604801 | 1383325105614098583 | ✅ Yes |
| OwO | 408785106942164992 | 1383325105614098583 | ✅ Yes |
| Marwuy Coin | 693167035068317736 | 1382960305427976202 | ❌ No |
| Truth or Dare | 692045914436796436 | 1382963564943380531 | ❌ No |
| Room Settings | 1127643944117878834 | null | ✅ Yes |

#### Current Schema Bots:

##### Correlation Tracked:
| Bot | Bot ID | Thread ID | Match Legacy? |
|-----|--------|-----------|---------------|
| Pancake | 239631525350604801 | 1383325105614098583 | ✅ Yes |
| OwO | 408785106942164992 | 1383325105614098583 | ✅ Yes |
| Room Settings | 1127643944117878834 | 1383325105614098583 | ⚠️ DIFFERENT |

##### Thread Tracked:
| Bot | Bot ID | Match Legacy? |
|-----|--------|---------------|
| Marwuy Coin | 693167035068317736 | ✅ Yes |
| Truth or Dare | 692045914436796436 | ✅ Yes |
| Tree Growing | 731736201400418314 | ✅ Yes |

**⚠️ CRITICAL ISSUE**: Room Settings Bot has different thread_id in current schema!
- Legacy: `null` (no dedicated thread)
- Current: `1383325105614098583` (same as Pancake/OwO)

---

### 4. Channel/Category ID Discrepancies

| Config | Legacy Value | Current Value | Match? |
|--------|--------------|---------------|--------|
| General Chat ID | 1092307876594323510 | 1092307876594323510 | ✅ Yes |
| Room Creation Trigger ID | 1127643888883077170 | 1127643888883077170 | ✅ Yes |
| Designated Bot Thread ID | 1383325105614098583 | 1383325105614098583 | ✅ Yes |
| Marketing Channel ID | 1135417332446019604 | 1135417332446019604 | ✅ Yes |
| Special Thread (Truth/Dare) | 1383323246619004998 | 1383323246619004998 | ✅ Yes |

#### Forum Category IDs:
| Legacy | Current | Match? |
|--------|---------|--------|
| 1094265617823047804 | 1227583449867993099 | ❌ NO |
| 1092298134639620199 | 1385484886766194749 | ❌ NO |
| 1112913932030574619 | - | ❌ MISSING |
| 1113493487258718369 | - | ❌ MISSING |

#### Voice Fixed Category IDs:
| Legacy | Current | Match? |
|--------|---------|--------|
| 1092298134639620204 | 1087553008033644604 | ❌ NO |

**⚠️ WARNING**: Forum and voice category IDs are completely different between schemas!

---

### 5. Correlation Settings Discrepancy

| Setting | Legacy | Current | Match? |
|---------|--------|---------|--------|
| Time Window | 2.0 seconds | 2000 ms (2s) | ✅ Equivalent |
| Min Confidence | 0.3 | 0.3 | ✅ Yes |
| Pending Timeout | 2.0 seconds | 10000 ms (10s) | ❌ DIFFERENT |

**⚠️ ISSUE**: Pending timeout differs:
- Legacy: 2 seconds
- Current: 10 seconds

---

### 6. Marketing Roles Discrepancy

| Legacy Role Names | Current Role Names |
|-------------------|-------------------|
| "Mar Fundamental" | "Mkt Fundamental" |
| "Case Study" | "Case Study" |
| "Branding" | "Branding" |
| "Digital" | "Digital" |
| "Trade" | "Trade" |
| "Công nghệ Mar" | "Công nghệ Mkt" |
| "Tâm thế làm Mar" | "Tâm thế làm Mkt" |

**⚠️ MISMATCH**: 
- Legacy uses "Mar" abbreviation
- Current uses "Mkt" abbreviation
- This affects role matching logic!

---

### 7. Property Definition Differences

#### Legacy Schema Properties:
Uses detailed YAML anchors with type definitions:
```yaml
- name: discord_name
  type: string
  source: "user.global_name or user.name"
```

#### Current Schema Properties:
Uses simple list references:
```yaml
- *base_user
- *base_channel
```

**Analysis**: Current schema lacks:
- Property type definitions
- Property source documentation
- Required vs optional distinction per property

---

### 8. Luồng (Flow) Category Differences

| Legacy Luồng | Current Luồng | Match? |
|--------------|---------------|--------|
| "Onbroading server" | "Onbroading server" | ✅ Yes |
| "Sử dụng tính năng chát chung" | "Sử dụng tính năng chat chung" | ⚠️ SPELLING |
| "Xem loa phương" | - | ❌ MISSING |
| "Vai trò ngườii dùng cập nhập" | "Vai trò ngườii dùng cập nhập" | ✅ Yes |
| "Vào mục gêm gủng" | "Vào mục game gặng" | ⚠️ SPELLING |
| "Vào mục cài-đặt-room" | "Vào mục cài-đặt-room" | ✅ Yes |
| "Vào mục Bấm để tạo room" | "Vào mục Bấm để tạo room" | ✅ Yes |
| "Vào các kênh voice cố định" | "Vào các kênh voice cố định" | ✅ Yes |
| "Vào các kênh voice tự tạo" | "Vào các kênh voice tự tạo" | ✅ Yes |
| "Vào các kênh chat" | "Vào các kênh chat" | ✅ Yes |
| "Vào mục \"{forum_name}\"" | "Vào mục {forum_name}" | ✅ Equivalent |

**Spelling differences**:
- Legacy: "chát", "gêm", "gủng"
- Current: "chat", "game", "gặng"

---

### 9. Unhandled Events Documentation

**Legacy Schema** has a comprehensive `unhandled_events` section (lines 1312-1346) documenting:
- `user_interested_in_event`
- `user_not_interested_in_event`
- `invite_created`
- `user_joined_server`
- `user_left_server`
- `channel_created`
- `channel_deleted`

**Current Schema** has NO unhandled events documentation.

---

## 📊 Summary Statistics

| Metric | Legacy | Current | Status |
|--------|--------|---------|--------|
| Total Event Types | ~50+ | 19 | ⚠️ Major gap |
| Luồng Categories | 11 | 10 | 🟡 Minor gap |
| Bot Configurations | 6 | 6 | ✅ Complete |
| Property Templates | 8 anchors | 7 anchors | 🟡 Similar |
| Validation Rules | Inline | Separate section | 🟡 Different approach |
| Unhandled Events | 7 documented | 0 documented | 🔴 Missing |

---

## 🔴 HIGH PRIORITY FIXES NEEDED

1. **Sync Vietnamese event names** - Choose either spelling style
2. **Add missing ~30 event types** from legacy to current
3. **Fix Room Settings Bot thread_id** discrepancy
4. **Update Forum Category IDs** to match environment
5. **Update Voice Fixed Category ID** to match environment
6. **Sync Marketing Role Names** (Mar vs Mkt)
7. **Adjust Pending Timeout** to match legacy (2s vs 10s)
8. **Add unhandled events documentation**

---

## 🟡 MEDIUM PRIORITY

1. Add property type definitions to current schema
2. Add property source documentation
3. Document required vs optional distinction
4. Add special_channels configuration to current schema
5. Add mod_message_channels configuration

---

## 📋 RECOMMENDATIONS

1. **Decision needed**: Which spelling convention to use?
   - Option A: Keep legacy Vietnamese-style ("gêm", "chát")
   - Option B: Use English spelling ("game", "chat")

2. **Immediate action**: Verify which category IDs are correct for the production environment

3. **Event parity**: Current schema needs significant expansion to match legacy coverage

4. **Thread tracking**: Clarify Room Settings Bot thread_id requirement

---

*Report generated: 2026-04-07*
*Comparing: legacy_event_schema.yaml (v9.0) vs eventSchemas.yml (v0.1.1)*
