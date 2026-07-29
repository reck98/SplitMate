# Expense Rendering & Payer Visual Formatting

## 1. Overview
In the group expenses feed, each expense card displays expense details, total amount, payer information, and participant shares.

---

## 2. Payer Strike-Through Formatting

### 2.1 Rule
The member who paid the expense (`paid_by`) is formatted with a visual strike-through (`line-through opacity-75`), distinguishing them from debtors who still owe their split share.

### 2.2 Formatting Examples

#### Equal Split (₹20, Paid by reck98)
- ~~reck98: ₹10.00~~
- Akash: ₹10.00

#### Custom Split (₹150, Paid by Akash)
- reck98: ₹50.00
- ~~Akash: ₹100.00~~

---

## 3. Split Type Compatibility
Payer strike-through styling evaluates `participant.user_id === expense.paid_by` dynamically and applies across all current and future split strategies:
- Equal Split
- Custom Split
- Percentage Split
- Shares Split
