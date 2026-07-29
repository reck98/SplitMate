# Settlement Engine Architecture & Financial Precision

## 1. Overview
The Settlement Engine in SplitMate processes group expenses, participant share allocations, and settlement entries to calculate precise net member balances and individual debt obligations.

---

## 2. Equal Split & Integer Paise Financial Precision

### 2.1 Integer Paise Arithmetic
To prevent floating-point accumulation errors (e.g., ₹9.50 instead of ₹10.00, or ₹99.99 instead of ₹100.00), all internal financial calculations convert monetary amounts into integer paise:
$$\text{amountInPaise} = \text{Math.round}(\text{amount} \times 100)$$

### 2.2 Exact Remainder Distribution Rounding Policy
When an expense amount $A$ (in paise) is split equally among $N$ participants:
1. Base share per participant (in paise):
   $$\text{baseSharePaise} = \lfloor A / N \rfloor$$
2. Remainder (in paise):
   $$\text{remainderPaise} = A \pmod N$$
3. Share allocation:
   - The first $\text{remainderPaise}$ participants receive $\text{baseSharePaise} + 1$ paise.
   - The remaining $N - \text{remainderPaise}$ participants receive $\text{baseSharePaise}$ paise.
4. Total Verification Guarantee:
   $$\sum_{i=1}^{N} \text{share}_i = \text{remainderPaise} \times (\text{baseSharePaise} + 1) + (N - \text{remainderPaise}) \times \text{baseSharePaise} = A$$
   The sum of allocated shares **always equals the total expense amount down to the exact paise**.

#### Example
- Expense Amount: ₹100.00 (10,000 paise) among 3 participants.
  - $\text{baseSharePaise} = \lfloor 10000 / 3 \rfloor = 3333$ paise (₹33.33)
  - $\text{remainderPaise} = 10000 \pmod 3 = 1$ paise
  - Participant 1 share: $3333 + 1 = 3334$ paise (₹33.34)
  - Participant 2 share: $3333$ paise (₹33.33)
  - Participant 3 share: $3333$ paise (₹33.33)
  - Total: ₹33.34 + ₹33.33 + ₹33.33 = ₹100.00 (100% exact).

- Expense Amount: ₹20.00 (2,000 paise) between 2 participants (`reck98` and `Akash Singh`).
  - $\text{baseSharePaise} = \lfloor 2000 / 2 \rfloor = 1000$ paise (₹10.00)
  - $\text{remainderPaise} = 0$ paise
  - Participant 1 share: ₹10.00
  - Participant 2 share: ₹10.00
  - Akash owes reck98: **₹10.00** (Exact).

---

## 3. Grouped Suggested Payments by Counterparty
Suggested payments are presented on the Settlements tab grouped by counterparty user:
- Line items display expense-wise details (title, date, individual debt amount).
- Headers display total accumulated debt per counterparty.
- Direct expense relationships are preserved without multi-party graph rerouting or un-requested debt simplification.
- Existing filters (`All`, `You Owe`, `Owed to You`) remain fully supported.

---

## 4. Balance Computation
For any group member $M$, net balance is calculated as:
$$\text{Net Balance} = \text{Lent} - \text{Owed}$$
Where:
- $\text{Lent}$: Active un-settled debt obligations owed to $M$ by other members.
- $\text{Owed}$: Active un-settled debt obligations owed by $M$ to other members.
- Payments made via cash or UPI deduct from active obligations chronologically.
