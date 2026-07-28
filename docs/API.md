# API Documentation

## Base URL

Development: `http://localhost:3000`
Production: Configured via `PUBLIC_API_URL`

## Authentication

All endpoints except `POST /auth/firebase` require authentication via `Authorization: Bearer <firebase-id-token>` header.

## Response Format

Success:

```json
{
  "success": true,
  "data": { ... }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

---

## Auth Endpoints

### POST /auth/firebase

Authenticate with Firebase ID Token.

**Auth:** `Authorization: Bearer <firebase-id-token>` header (from Firebase `getIdToken()`)

**Request:** Empty body (token is in Authorization header).

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firebase_uid": "abc123...",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://...",
    "upi_id": "user@upi",
    "is_profile_complete": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Errors:** `401` if token is invalid or expired.

---

### GET /me

Get current user profile.

**Auth:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "google_id": "123456789",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://...",
    "upi_id": "user@upi",
    "is_profile_complete": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Errors:** `401` if not authenticated.

---

### PATCH /me

Update current user profile.

**Auth:** Required

**Request:**

```json
{
  "upi_id": "user@upi"
}
```

**Validation:**

- `upi_id`: Required, valid UPI ID format (e.g., `user@provider`)

**Response:** Updated user object.

**Errors:** `400` if invalid UPI format.

---

## Group Endpoints

### POST /groups

Create a new group.

**Auth:** Required

**Request:**

```json
{
  "name": "Trip to Goa"
}
```

**Validation:**

- `name`: Required, non-empty string

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Trip to Goa",
    "owner_id": "uuid",
    "invite_code": "A82DKP",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### GET /groups

List all groups for the authenticated user.

**Auth:** Required

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Trip to Goa",
      "owner_id": "uuid",
      "invite_code": "A82DKP",
      "member_count": 4,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET /groups/:id

Get group details including members, expenses, balances, and settlements.

**Auth:** Required (must be a member)

**Response:**

```json
{
  "success": true,
  "data": {
    "group": { ... },
    "members": [
      {
        "user_id": "uuid",
        "name": "User Name",
        "email": "user@example.com",
        "avatar": "https://...",
        "joined_at": "2024-01-01T00:00:00Z"
      }
    ],
    "expenses": [
      {
        "id": "uuid",
        "description": "Dinner",
        "amount": 1200,
        "paid_by": "uuid",
        "paid_by_name": "User Name",
        "created_by": "uuid",
        "split_type": "equal",
        "participants": [
          {
            "user_id": "uuid",
            "share_amount": 300
          }
        ],
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "balances": [
      {
        "user_id": "uuid",
        "name": "User Name",
        "net_balance": 250,
        "paid": 600,
        "share": 300,
        "received": 0,
        "paid_out": 50
      }
    ],
    "settlements": [
      {
        "id": "uuid",
        "payer_id": "uuid",
        "receiver_id": "uuid",
        "amount": 250,
        "expense_id": "uuid",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "obligations": [
      {
        "id": "uuid_participantId",
        "expenseId": "uuid",
        "expenseTitle": "Dinner",
        "payerId": "uuid",
        "payerName": "Payer Name",
        "debtorId": "uuid",
        "debtorName": "Debtor Name",
        "amount": 250,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "simplified_debts": [
      {
        "from": {
          "user_id": "uuid",
          "name": "User Name"
        },
        "to": {
          "user_id": "uuid",
          "name": "Other User"
        },
        "amount": 250
      }
    ]
  }
}
```

**Errors:** `403` if not a member, `404` if group not found.

---

### DELETE /groups/:id

Delete a group. Only the owner can delete.

**Auth:** Required (must be owner)

**Errors:** `403` if not owner, `404` if not found.

---

### POST /groups/join

Join a group using an invite code.

**Auth:** Required

**Request:**

```json
{
  "invite_code": "A82DKP"
}
```

**Validation:**

- `invite_code`: Required, non-empty string

**Errors:** `404` if invalid code, `409` if already a member or group full.

---

### POST /groups/:id/leave

Leave a group.

**Auth:** Required

**Errors:** `409` if balance is not ₹0, `403` if owner (must delete instead).

---

## Expense Endpoints

### POST /groups/:id/expenses

Create an expense in a group.

The payer is always the authenticated user. The backend ignores any `paid_by` value sent by the client.

**Auth:** Required (must be a member)

**Request (Equal Split):**

```json
{
  "description": "Dinner",
  "amount": 1200,
  "split_type": "equal",
  "participants": ["uuid1", "uuid2", "uuid3", "uuid4"]
}
```

**Request (Custom Split):**

```json
{
  "description": "Dinner",
  "amount": 1200,
  "split_type": "custom",
  "participants": [
    { "user_id": "uuid1", "share_amount": 100 },
    { "user_id": "uuid2", "share_amount": 500 },
    { "user_id": "uuid3", "share_amount": 300 },
    { "user_id": "uuid4", "share_amount": 300 }
  ]
}
```

**Validation:**

- `description`: Required, non-empty string
- `amount`: Required, number > 0
- `split_type`: Required, "equal" or "custom"
- `participants`: Required array
  - Equal: array of user IDs, at least 1
  - Custom: array of `{ user_id, share_amount }`, sum must equal expense amount
- All participants must be group members
- `paid_by` is NOT accepted — the payer is always the authenticated user

---

### PATCH /expenses/:id

Edit an expense. Only the creator can edit. The payer is immutable and cannot be changed via this endpoint.

**Auth:** Required (must be creator)

**Request:** Same shape as create expense (without `paid_by`).

**Note:** The `paid_by` field is never updated — the original payer is preserved.

**Errors:** `403` if not creator, `404` if not found.

---

### DELETE /expenses/:id

Delete an expense. Only the creator can delete.

**Auth:** Required (must be creator)

**Errors:** `403` if not creator, `404` if not found.

---

## Settlement Endpoints

### POST /groups/:id/settlements

Record a settlement between two members.

**Auth:** Required (must be a member)

**Request:**

```json
{
  "payer_id": "uuid",
  "receiver_id": "uuid",
  "amount": 250
}
```

**Validation:**

- `payer_id`: Required, must be a group member
- `receiver_id`: Required, must be a group member
- `amount`: Required, number > 0
- Payer and receiver must be different

**Errors:** `400` if validation fails, `403` if not a member.
