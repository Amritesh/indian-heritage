# Admin Email Edit Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the signed-in user `thenectorgod@gmail.com` see item edit links in the public site and reach the existing admin CMS edit form.

**Architecture:** Keep Firebase email/password login unchanged. Extend frontend auth state so the known email is treated as admin in UI guards, then surface edit links from public item views to the existing `/admin/items/:id/edit` route.

**Tech Stack:** React, TypeScript, React Router, Vitest, Testing Library, Firebase Auth

---

### Task 1: Document the admin-email rule in auth behavior

**Files:**
- Modify: `frontend/src/features/auth/context/AuthContext.tsx`
- Test: `frontend/src/features/auth/context/AuthContext.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('treats thenectorgod@gmail.com as an admin even without an admin profile role', async () => {
  // Mock Firebase auth state for the allowed email and assert isAdmin becomes true.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/src/features/auth/context/AuthContext.test.tsx`
Expected: FAIL because the allowed email override does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
const ADMIN_EMAIL = 'thenectorgod@gmail.com';
const hasAdminEmail = firebaseUser?.email?.toLowerCase() === ADMIN_EMAIL;
const isAdmin = userProfile?.role === 'admin' || hasAdminEmail;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/src/features/auth/context/AuthContext.test.tsx`
Expected: PASS

### Task 2: Add public edit links for admin users

**Files:**
- Modify: `frontend/src/shared/ui/ItemCard.tsx`
- Modify: `frontend/src/pages/item-detail/ItemDetailPage.tsx`
- Test: `frontend/src/shared/ui/ItemCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('renders an edit link for admins that points to the admin item form', () => {
  // Mock useAuth() to return isAdmin true and expect href /admin/items/<id>/edit.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frontend/src/shared/ui/ItemCard.test.tsx`
Expected: FAIL because no edit link is rendered.

- [ ] **Step 3: Write minimal implementation**

```tsx
const { isAdmin } = useAuth();
{isAdmin ? <Link to={`/admin/items/${item.id}/edit`}>Edit</Link> : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- frontend/src/shared/ui/ItemCard.test.tsx`
Expected: PASS

### Task 3: Verify no route changes are needed

**Files:**
- Inspect: `frontend/src/app/router.tsx`

- [ ] **Step 1: Confirm target route exists**

Check that `path: 'items/:id/edit'` already maps to `AdminItemFormPage`.

- [ ] **Step 2: Run targeted test suite**

Run: `npm test -- frontend/src/shared/ui/ItemCard.test.tsx frontend/src/features/auth/context/AuthContext.test.tsx`
Expected: PASS
