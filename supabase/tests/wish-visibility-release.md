# Wish visibility release

1. Apply migrations through `202610210002_personal_profile.sql` before releasing the app.
2. Deploy the updated `wish-action` Edge Function, which accepts `wishActive` and `personalProfile` commands.
3. Release the app with the pending/completed jar tabs and visibility controls.

Existing wishes and requests from older clients default to active. Only the wish creator can change visibility. Inactive wishes are omitted from the partner's snapshot and direct table reads; preparations remain stored and become available again when the wish is reactivated. New preparation/completion commands cannot act on an inactive wish.

Memories already shared remain in the shared history, including their photos. Private uploaded covers without a shared memory reference are accessible only to their uploader until the wish becomes active.

The profile migration adds optional birth date and gender fields to each member. Profile commands update only the authenticated user's member row; the partner receives the new fields in the couple snapshot. The calendar shows the partner's annual birthday and Valentine on February 14. A birthday on February 29 appears on that date in leap years. Birthday and holiday markers coexist if they share a date.

Local regression checks:

```
npm run lint
npm run typecheck
node --test tests/domain.test.cjs tests/relational-db.test.cjs tests/wish-action.test.cjs tests/wish-visibility.test.cjs tests/personal-profile.test.cjs tests/account-deletion.test.cjs
```
