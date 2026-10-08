# Account deletion

In **Của chúng ta → Cài đặt → Xoá tài khoản**, users confirm permanent deletion.
Accounts that have not paired can use **Cài đặt tài khoản** on the pairing screen.
Cancelling makes no server request. While deletion runs, repeated submits and closing
the confirmation are blocked. Success clears the app session and returns to login.

Deleting a paired account also deletes the entire shared space, including both
members' wishes, preparations, memories, photos, gift notifications and push outbox.
The confirmation explicitly describes this consequence. The partner's Auth account
is preserved; their next refresh returns them to the pairing screen.

## Backend deployment

Apply migrations before deploying the new Edge Function to the project's Supabase:

```sh
npx supabase db push
npx supabase functions deploy delete-account
```

`supabase/config.toml` disables gateway JWT verification for this function because
the handler verifies the bearer token with `Auth.getUser`. The service role key is
used only on the server. The client cannot supply a target user ID or photo paths.

`prepare_account_deletion` records a retryable request and freezes further shared
state changes, membership changes and photo uploads. Photos are removed through
the Storage API in batches of at most 1,000, including unused uploads owned by the
user. Only then is the Auth user deleted. An Auth trigger deletes the shared space
in that same database transaction; foreign keys remove membership, state, tokens
and notifications. If cleanup fails, the account remains available to retry from
Settings. Some photos may already have been permanently removed.

## Verification

```sh
npm run lint
npm run typecheck
npm run test:account-deletion
```

Use disposable accounts on a test Supabase project for integration checks:

1. Pair two accounts and upload photos from each, including an unused upload.
2. Cancel the confirmation and verify both accounts and all data remain.
3. Confirm deletion; verify login appears, the Auth user and private photos are
   gone, and shared tables no longer contain the couple.
4. Refresh the partner's app; verify their login remains and pairing appears.
5. Delete an unpaired account from its account settings.
6. Simulate a Storage failure, verify no success is shown, then retry after recovery.
7. Call the endpoint without a session or confirmation; verify rejection. Supplying
   another user's ID must never change the authenticated deletion target.

Local sequence tests cover batching, cleanup-before-Auth ordering, failure handling,
retry after partial cleanup, and deletion of an account with no photos. They do not
replace the database/Storage checks above.
