# Database Schema

## Technology

- Turso (SQLite-compatible edge database)
- Drizzle ORM for type-safe queries

## Tables

---

### users

Core user profile.

| Column             | Type      | Constraints                  |
|--------------------|-----------|------------------------------|
| id                 | text      | PRIMARY KEY (UUID)           |
| firebase_uid       | text      | UNIQUE, NOT NULL             |
| email              | text      | UNIQUE, NOT NULL             |
| name               | text      | NOT NULL                     |
| avatar             | text      |                              |
| upi_id             | text      |                              |
| is_profile_complete| integer   | NOT NULL, DEFAULT 0 (boolean)|
| created_at         | text      | NOT NULL (ISO 8601)          |
| updated_at         | text      | NOT NULL (ISO 8601)          |

---

### groups

Expense sharing groups.

| Column     | Type      | Constraints                  |
|------------|-----------|------------------------------|
| id         | text      | PRIMARY KEY (UUID)           |
| name       | text      | NOT NULL                     |
| owner_id   | text      | NOT NULL, FK → users.id      |
| invite_code| text      | UNIQUE, NOT NULL             |
| created_at | text      | NOT NULL (ISO 8601)          |

Indexes:
- `idx_groups_invite_code` on `invite_code`

---

### group_members

Join table linking users to groups.

| Column   | Type      | Constraints                  |
|----------|-----------|------------------------------|
| group_id | text      | NOT NULL, FK → groups.id     |
| user_id  | text      | NOT NULL, FK → users.id      |
| joined_at| text      | NOT NULL (ISO 8601)          |

Primary Key: `(group_id, user_id)`

---

### expenses

Expenses created within groups.

| Column      | Type      | Constraints                  |
|-------------|-----------|------------------------------|
| id          | text      | PRIMARY KEY (UUID)           |
| group_id    | text      | NOT NULL, FK → groups.id     |
| description | text      | NOT NULL                     |
| amount      | real      | NOT NULL                     |
| paid_by     | text      | NOT NULL, FK → users.id      |
| created_by  | text      | NOT NULL, FK → users.id      |
| created_at  | text      | NOT NULL (ISO 8601)          |
| updated_at  | text      | NOT NULL (ISO 8601)          |

---

### expense_participants

Individual shares for each expense.

| Column       | Type      | Constraints                    |
|--------------|-----------|--------------------------------|
| expense_id   | text      | NOT NULL, FK → expenses.id     |
| user_id      | text      | NOT NULL, FK → users.id        |
| share_amount | real      | NOT NULL                       |

Primary Key: `(expense_id, user_id)`

---

### settlements

Recorded settlements between users.

| Column      | Type      | Constraints                  |
|-------------|-----------|------------------------------|
| id          | text      | PRIMARY KEY (UUID)           |
| group_id    | text      | NOT NULL, FK → groups.id     |
| payer_id    | text      | NOT NULL, FK → users.id      |
| receiver_id | text      | NOT NULL, FK → users.id      |
| amount      | real      | NOT NULL                     |
| created_at  | text      | NOT NULL (ISO 8601)          |

---

## Entity Relationships

```
users 1───* group_members *───1 groups
users 1───* expenses (paid_by)
users 1───* expense_participants
users 1───* settlements (payer)
users 1───* settlements (receiver)
groups 1───* expenses
groups 1───* settlements
expenses 1───* expense_participants
```

## Migration Notes

- All IDs are UUIDs stored as text (SQLite has no native UUID type)
- Timestamps are ISO 8601 strings
- Boolean values are stored as integers (0/1) per SQLite convention
- Foreign keys should be enabled via `PRAGMA foreign_keys = ON`
- Index `invite_code` for fast join lookups
