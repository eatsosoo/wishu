# Relational database

Migration `202610190003_normalize_wish_data.sql` moves application records out of `wish_state.snapshot`. The `snapshot` property in API responses is now a JSON view assembled from relational tables, not the persisted source of truth.

| Table | Contents |
| --- | --- |
| `wish_couples` | Space name, anniversary, invitation |
| `wish_members` | Auth user, couple, actor and display name |
| `wishes` | One wish per row, creator, category, budget, priority, cover metadata |
| `preparations` | Private preparation, `preparing`/`completed`, dates |
| `memories` | Completed memory, original wish ID, date, note, favorite |
| `memory_photos` | One photo reference per row, explicit position 0–7 |
| `gift_notifications` | Recipient notification linked to its memory |
| `gift_push_deliveries`, `gift_web_push_deliveries` | Durable delivery outboxes |

Small photo references remain JSONB (`art`, `uri`, `storagePath`); image files stay in private Storage. Wishes have no public preparation status: revealing the partner's private preparation would spoil the surprise.

## Relationships and privacy

Migration `202610250001_review_integrity.sql` binds notification senders and
recipients to memberships in the same couple and requires exactly one memory or
check-in target with matching JSON payload. Memory notification uniqueness uses
the canonical `memory_id` column. Check-in creators reference their membership.
These references prevent removing individual memberships that still own retained
data; deactivation keeps memberships and continues to work. Whole-space deletion
by a trusted operator still removes all dependent rows in one statement.

Native push has partial `retry_at` indexes for pending/sending deliveries and
accepted receipts. This avoids indexing completed history in the worker queues.

For this migration, run `supabase/tests/review-integrity-preflight.sql` before
deployment (all counters must be zero) and
`supabase/tests/review-integrity-postflight.sql` afterwards (seven validated
constraints and five indexes). The migration aborts if existing data violates a
new constraint; it never removes invalid records automatically.

Regression checks: `node --test tests/database-integrity.test.cjs tests/check-ins.test.cjs tests/relational-db.test.cjs tests/account-deletion.test.cjs`.

Keys include `couple_id` so references cannot cross couples, including older wish IDs that are only unique within one couple. Wishes reference their creator's membership. Preparations reference their wish and preparer. Memory photos reference their memory and preserve order.

Deleting a wish cascades its preparations and sets `memories.wish_id` to null. `source_wish_id` preserves the original API ID and existing memories/photos/notifications remain available. Account deactivation sets `account_access.status` to `inactive`, retaining Auth, membership, photos and shared data. Inactive accounts cannot access app data; their partner keeps access. See [account deactivation](ACCOUNT_DELETION.md).

RLS permits members to read their couple's wishes, memories and photos. Preparations are readable only by their preparer. Clients cannot insert/update/delete these tables or execute the mutation RPC. `get_my_couple()` also explicitly filters preparations and recipient notifications. Storage policies use a lightweight membership lookup instead of constructing the complete response.

## Commands

`wish-action` verifies the bearer token and validates input before calling service-only `apply_wish_command(p_user,p_command)`. The database enforces membership and ownership. Each command updates only its affected rows. Completion commits the memory, ordered photos, preparation status, notification and both push outboxes in one transaction. Replaying completion without another active preparation returns no new gift.

Wish row locks serialize preparation/completion/deletion for the same wish. Favorites toggle in SQL. A shared couple lock coordinates commands with account deletion's exclusive lock; deletion freezes subsequent commands. There is no snapshot version or full-state overwrite in the runtime write path.

`get_my_couple()` retains the previous response shape for existing mobile/web clients. It currently returns complete couple lists; server pagination can be added separately without another storage migration. Indexes cover owner/category wish queries, private preparation status and calendar/category memory queries.

## Migration and deployment

The migration locks writes while backfilling, preserves IDs/order/metadata, and verifies row counts. Invalid data rolls back the transaction. It preserves `wish_state` as an archived pre-migration backup and revokes application access. Old `commit_wish_state()` callers cannot overwrite that backup.

Before release:

```sh
npm run test:db
node --test tests/wish-action.test.cjs
npm run lint
npm run typecheck
npx supabase db query --linked --file supabase/tests/normalize-preflight.sql
npx supabase db push --linked --dry-run
```

Apply migration and deploy the updated Edge Function together during a quiet period:

```sh
npx supabase db push --linked
npx supabase functions deploy wish-action
npx supabase db query --linked --file supabase/tests/normalize-postflight.sql
```

An old function will reject writes between the database cutover and Edge Function deployment. Existing read APIs and notification delivery workers retain their contracts. The pending photo-limit migration is applied first if it has not been deployed yet.

The archived JSON is a pre-cutover backup only. Once new relational writes have occurred, restoring that old JSON would discard them. Use forward fixes or export the current relational data before planning a rollback; never silently switch runtime reads back to the archive.

## Verification

`tests/relational-db.test.cjs` runs the real migration SQL against PostgreSQL WASM (PGlite), with Supabase Auth/Storage schema stubs. It checks backfill fidelity and rollback, RLS/execute grants, private preparations, completion/outboxes/replay, invalid command rollback, ownership, favorites, read receipts, create/join/profile and account-deletion cascades. It does not replace a production two-connection lock/load test or device UI checks.

`tests/wish-action.test.cjs` checks verified identity forwarding, the response contract, worker scheduling and safe error handling. Existing domain/image/account-deletion/Web Push tests remain applicable.

## Applied deployment

On 2026-10-19, migrations `202610190002` and `202610190003` were applied to the linked Supabase project, and `wish-action` was deployed using API bundling. Postflight counts matched preflight: 2 couples, 9 wishes, 2 preparations, 1 memory and 1 photo. RLS was enabled on all four new tables; authenticated clients had no mutation-RPC privilege, and the backend had no legacy snapshot write privilege. The Storage upload limit was verified at 2 MiB.

On 2026-10-21, migrations `202610210001` (wish visibility) and `202610210002` (personal profiles) were applied to linked project `rpodnpatutevydgpkzzd`, and `wish-action` was deployed using API bundling. `supabase/tests/personal-profile-postflight.sql` verified profile updates, snapshot reads, invalid-gender rejection and restricted mutation-RPC access inside a rolled-back transaction. Counts remained 2 members, 1 wish and 0 memories. Both `wish_members.birth_date` and `wish_members.gender` were present after deployment.

Migration `202610210003_member_presence.sql` adds a `joined` boolean to each member returned by `get_my_couple()`. It does not alter member records. The home screen uses this metadata for its waiting silhouette; missing gender on an existing account uses a neutral character instead. Apply this migration before releasing the independent home characters, then run `supabase/tests/member-presence-postflight.sql` to verify the read contract.
