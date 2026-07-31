# SplitMate – Master Product Requirements Document (PRD v1.0)

**Version:** 1.0
**Project:** SplitMate
**Platform:** Mobile-first Web Application (PWA Ready)
**Target Users:** Indian college students, roommates, trips, clubs, and friend groups.

---

# 1. Product Vision

SplitMate is a lightweight expense-sharing application built specifically for Indian users.

Instead of integrating payment gateways, SplitMate focuses on making expense tracking effortless while allowing users to settle debts through their preferred UPI application using a responsive Show QR Payment Modal with Copy UPI ID and scannable PNG QR download capabilities.

The product philosophy is:

> **Track expenses. Calculate balances. Show UPI QR. Never handle money.**

This keeps the product simple, privacy-friendly, and easy to maintain.

---

# 2. Goals

## Primary Goals

- Extremely simple onboarding
- Google Sign-In only
- Mobile-first UI
- Show QR Code Payment Modal with 1-click Copy UPI ID and PNG download
- Split expenses with friends
- Equal & Custom splits (integer paise accuracy)
- Minimal number of settlement transactions
- Fast (<300ms API responses under normal load)

---

## Non Goals (V1)

- No payment gateway
- No bank integration
- No transaction verification
- No notifications
- No recurring expenses
- No multiple currencies
- No offline mode
- No file/image attachments
- No chat
- No analytics dashboard
- No personal expenses

---

# 3. Technology Stack

## Frontend

- Astro
- TypeScript
- Tailwind CSS
- Nano Stores
- Mobile-first responsive design

---

## Backend

- Node.js
- Express
- TypeScript
- Drizzle ORM

---

## Database

- Turso (SQLite)

---

## Authentication

Firebase Authentication (Google Provider)

No passwords.

---

## Deployment

Frontend

- Vercel

Backend

- Railway

Database

- Turso

---

# 4. Functional Requirements

---

## 4.1 Authentication

### Login

User signs in using Google.

Store

```
id
firebase_uid
name
email
avatar
upi_id
is_profile_complete
created_at
updated_at
```

If Google avatar is unavailable

Generate avatar using DiceBear.

---

### First Login

Flow

```
Firebase Google Sign-In

↓

POST /api/auth/firebase (Authorization: Bearer <token>)

↓

Create User (if new) or Update Profile

↓

Enter UPI ID (if first login)

↓

Validate format

↓

Activate Profile

↓

Dashboard
```

Only one UPI ID per account.

---

# 4.2 Dashboard

Dashboard shows

- User profile
- Active groups
- Create group button
- Join group button

---

# 4.3 Groups

Each group contains

```
id
name
owner_id
invite_code
created_at
```

Maximum members

```
100
```

---

## Create Group

Owner provides

- Group Name

Backend generates

- Invite Code
- Invite Link

Example

```
Invite Code

A82DKP
```

Invite Link

```
https://splitup.app/join/A82DKP
```

---

## Join Group

Two methods

- Invite Link
- Invite Code

No passwords.

---

## Delete Group

Only owner can delete.

Deletion permanently removes

- Group
- Members
- Expenses
- Splits
- Settlements

No archive.

---

# 4.4 Group Members

Members can

- Add expense
- Edit own expense
- Delete own expense
- Record settlements
- Update own profile
- Leave group (only if balance is ₹0)

Owner additionally can

- Delete group

Owner cannot delete another member's expense.

---

# 4.5 Expenses

Expense contains

```
Description

Amount

Paid By (Authenticated user only)

Participants

Split Type
```

Split Types

- Equal
- Custom

---

## Equal Split

Example

Dinner

₹1200

Participants

```
Rahul

Aman

Riya

Kabir
```

Each owes

₹300

---

## Custom Split

Example

```
Rahul

100

Aman

500

Riya

300

Kabir
```

Validation

```
Sum(split amounts)
==
Expense amount
```

Otherwise reject request.

---

## Expense Permissions

Creator may

- Edit
- Delete

Others

Read only.

---

# 4.6 Editing Expense

Editable fields

- Description
- Amount
- Participants
- Split Type
- Split Amounts

The payer is immutable — editing cannot change who paid.

Editing automatically recalculates balances.

---

# 4.7 Deleting Expense

Only creator.

Deletion removes

Expense

Expense Participants

Balances update immediately.

---

# 4.8 Settlements

App never processes payments.

Instead,

Generate

```
upi://pay
```

URI

Example

```
upi://pay?pa=aanidadas@okicici&am=10&cu=INR
```

Browser launches installed UPI applications.

---

After payment

User manually clicks

```
Mark as Settled
```

Backend stores

```
payer_id

receiver_id

amount

created_at
```

No payment verification.

---

# 5. Balance Calculation

Balances are NEVER stored.

They are computed on every request.

Formula

```
Total Paid

-

Total Share

+

Money Received

-

Money Paid
```

This prevents synchronization bugs.

---

## Simplified Debt Algorithm

The backend computes the minimum number of transactions required to settle balances.

Example

Instead of

```
A owes B

A owes C

D owes B
```

Return

```
A → B ₹250

D → C ₹150
```

The frontend always displays simplified settlements.

---

# 6. API Specification

Authentication

```
POST /auth/firebase

GET /me

PATCH /me
```

Groups

```
POST /groups

GET /groups

GET /groups/:id

DELETE /groups/:id

POST /groups/join

POST /groups/:id/leave
```

Expenses

```
POST /groups/:id/expenses

PATCH /expenses/:id

DELETE /expenses/:id
```

Settlements

```
POST /groups/:id/settlements
```

---

# 7. Database Schema

```
users
------
id
google_id
email
name
avatar
upi_id
is_profile_complete
created_at
updated_at
```

```
groups
-------
id
name
owner_id
invite_code
created_at
```

```
group_members
--------------
group_id
user_id
joined_at
```

```
expenses
---------
id
group_id
description
amount
paid_by
created_by
created_at
updated_at
```

```
expense_participants
--------------------
expense_id
user_id
share_amount
```

```
settlements
-----------
id
group_id
payer_id
receiver_id
amount
created_at
```

---

# 8. UI Pages

Landing

Login

Complete Profile

Dashboard

Create Group

Join Group

Group Details

Add Expense

Edit Expense

Profile

404

---

# 9. Polling Strategy

Instead of WebSockets

Frontend polls

```
GET /groups/:id
```

Every

```
1000ms
```

Advantages

- Easy deployment
- Stateless backend
- Near real-time updates
- Easy migration to WebSockets later

---

# 10. Security

- Firebase Authentication only
- Firebase ID Token verification via Admin SDK
- HTTPS only
- Validate all request bodies
- Rate limit public APIs
- Invite codes must be cryptographically random
- Server validates all permissions
- Users may only modify their own resources
- Parameterized SQL through Drizzle ORM
- Never trust client-calculated split amounts without validation

---

# 11. Validation Rules

## User

- Valid email
- One Google account
- One UPI ID
- Valid UPI ID syntax

---

## Group

- Name required
- Maximum 100 members

---

## Expense

- Amount > ₹0
- At least one participant
- Paid by must be a group member
- Participants must be group members
- Custom split total must equal expense amount

---

## Leave Group

Allowed only when

```
Net Balance == ₹0
```

---

# 12. Performance Requirements

- API response under 300 ms for typical groups
- Group load under 500 ms
- Support 100 members per group
- Support thousands of groups overall
- Live balance calculation on every request

---

# 13. Error Handling

Meaningful HTTP responses:

- `400 Bad Request` – Invalid input
- `401 Unauthorized` – Authentication required
- `403 Forbidden` – Insufficient permissions
- `404 Not Found` – Resource does not exist
- `409 Conflict` – Business rule violation (e.g., leaving with a non-zero balance)
- `500 Internal Server Error` – Unexpected server error

All errors should return a consistent JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "GROUP_NOT_FOUND",
    "message": "The requested group does not exist."
  }
}
```

---

# 14. Future Roadmap (Out of Scope for V1)

- Push notifications
- Expense attachments (receipts)
- Email invitations
- Multi-currency support
- Recurring expenses
- Group analytics
- QR-code invitations
- WebSockets
- PWA offline caching
- Payment verification via PSPs
- AI-powered expense categorization

---

# 15. Acceptance Criteria

A release is considered complete when:

- A user can sign in with Google.
- A new user must provide a valid-format UPI ID before accessing the app.
- A user can create and delete a group they own.
- Another user can join using an invite link or invite code.
- Group size is capped at 100 members.
- Members can create equal and custom-split expenses.
- Only the expense creator can edit or delete an expense.
- Balances are computed dynamically on every request (never stored).
- The backend returns simplified settlement recommendations.
- A user can launch a UPI app using a generated `upi://pay` deep link.
- Users can manually record settlements.
- Users with a non-zero balance cannot leave a group.
- The UI updates within approximately one second through polling.
- All endpoints enforce authentication, authorization, and input validation.
