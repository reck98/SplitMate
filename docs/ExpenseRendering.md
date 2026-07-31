# Expense Rendering & Multi-Payer Contributor Formatting

## 1. Overview

In SplitMate, each expense card displays expense details, total amount, payer information, and participant shares.

---

## 2. Multi-Payer & Contributor Strike-Through Detection

### 2.1 Rule

Every participant who has **contributed to paying their share of the expense** receives visual strike-through styling (`line-through opacity-75 decoration-2`), distinguishing paid contributors from unpaid debtors.

### 2.2 Paid Contributor Criteria

A participant $P$ for expense $E$ is considered a **paid contributor** if ANY of the following conditions are met:

1. **Primary Upfront Payer**: $P$ is the primary upfront payer ($E.\text{paid\_by} = P.\text{user\_id}$).
2. **Settled Obligation**: $P$'s debt obligation for expense $E$ has been fully settled ($P.\text{remaining\_debt} \le 0.01$).
3. **Explicit Contributor Record**: $P$ is included in $E.\text{contributors}$ array returned by the API.

---

## 3. Formatting Examples

### Example: Expense ₹120 (3 Participants @ ₹40 each)

Participants:

- `Development Projects` (Share: ₹40)
- `reck98` (Share: ₹40, Paid Upfront)
- `Mocnygaz` (Share: ₹40)

#### State A: Initial Expense Creation (Only reck98 Paid Upfront)

- ~~reck98: ₹40.00~~
- Development Projects: ₹40.00
- Mocnygaz: ₹40.00

#### State B: Development Projects Settles ₹40 for this Expense

- ~~Development Projects: ₹40.00~~
- ~~reck98: ₹40.00~~
- Mocnygaz: ₹40.00

Both **reck98** and **Development Projects** display with strike-through styling because both have contributed to paying the expense.

#### State C: All Participants Settled

- ~~Development Projects: ₹40.00~~
- ~~reck98: ₹40.00~~
- ~~Mocnygaz: ₹40.00~~

All participants display with strike-through styling.

---

## 4. Accessibility & Compatibility

- Strike-through decoration uses `decoration-2` with `opacity-75` to maintain clear readability across both Light and Dark themes.
- Fully compatible across all split types (Equal, Custom, Percentage, Shares, Exact Amount).
