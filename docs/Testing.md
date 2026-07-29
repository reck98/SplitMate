# Test Suite & Quality Verification Guide

## 1. Unit Tests

Backend unit tests are written using Vitest in `backend/src/__tests__/`:

| Test Suite | File Path | Coverage |
|---|---|---|
| Equal Split Precision | `backend/src/__tests__/split.test.ts` | Remainder distribution, integer paise accuracy, deduplication |
| Expenses & Custom Split | `backend/src/__tests__/expenses.test.ts` | Equal/custom split validation, share totals |
| Balance & Settlements | `backend/src/__tests__/balance.test.ts` | Detailed debts, balance calculations, settlement deduction |
| Counterparty Grouping | `backend/src/__tests__/grouping.test.ts` | Counterparty debt grouping, line item preservation |
| Integration Workflow | `backend/src/__tests__/integration.test.ts` | End-to-end API scenario lifecycle |
| Performance Benchmark | `backend/src/__tests__/performance.test.ts` | 100 members, 1,000+ expenses scale verification |
| UPI Link Generation | `backend/src/__tests__/upi.test.ts` | UPI URI schema construction |
| Invite Code Logic | `backend/src/__tests__/invite.test.ts` | Code generation and validation |

### Running Unit Tests
```bash
cd backend
npm run test
```

---

## 2. Frontend Linting & Type Checks

Frontend components and pages are validated using `astro check`.

### Running Frontend Check
```bash
cd frontend
npm run lint
```

---

## 3. Production Build Verification

Verify that both backend (`tsc`) and frontend (`astro build`) compile without errors:

```bash
npm run build
```
