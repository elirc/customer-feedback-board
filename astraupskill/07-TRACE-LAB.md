# Trace lab: follow a product decision all the way through

Use the fictional keyboard-shortcuts idea. This lab connects a visible product action with identity checks, a transaction, projections, and the next user's experience. Keep a short notebook of observations and distinguish what you saw from what you inferred.

## Trace A: follow, plan, notify

Sign in as the customer, open the keyboard idea, and choose Follow. Inspect [CommandForm](../src/components/command-form.tsx): it submits the desired follow state rather than asking the server to toggle blindly. In [the service](../src/modules/feedback/service.ts), find the current actor lookup, visible-post check, and existing user/post pair check. Predict what happens if the same command arrives twice, then confirm the relevant backend test.

Sign in as the product manager in a separate browser context. Change the idea from Open to Planned. Write down the version that the status form captured. Trace `status` through the role check, version comparison, post update, audit creation, and follower notification. Locate the exact call that commits the database document. Before that commit, the prepared in-memory changes are not an accepted write.

Return to the customer's notifications page. Confirm that the status notification appears and can be marked read. Try the notification command with an admin identity in a disposable test: admin status does not make someone the owner of another user's inbox. Explain why the notification service filters by the current actor independently of which page linked to it.

## Trace B: a competing edit

Open the same author's idea in two tabs. Type different titles before saving either. Save one, then the other. The second transaction obtains a current database document, but it still carries an old expected version. Explain why `BEGIN IMMEDIATE` alone would not protect the author's intent without that comparison.

Inspect the losing form. Its title should remain in memory, and the export should contain its original version. Compare the exported draft with the accepted record before loading current values. Note that there is no automatic merge or persistent browser draft store. State what would be lost if the tab closed before export.

## Trace C: merge without erasing history

Create a second public idea about the same problem, add a comment, and vote for both ideas. As moderator, merge the second into the first. Inspect the resulting support count, the source's Duplicate state, its canonical link, and the retained source comment. The source becomes read-only. Explain why merging a public idea into an internal one is rejected and why a canonical target with incoming duplicates cannot itself become a duplicate chain.

## What to write down at each hop

Keep the notebook in one shape, so two traces can be compared:

```text
hop            : status form -> saveFeedback -> executeCommand -> transact -> COMMIT -> revalidatePath
actor          : u_pm (product manager), resolved INSIDE the transaction by actor(db, user)
captured version: 4   (read when the form rendered)
current version : 4   (read inside the transaction)  -> match, so the write proceeds
guards passed  : role=product, version match, post visible to actor, not hidden/duplicate
writes         : post.status, post.version++, audit("post.status"), notification per eligible follower
commit point   : db.exec("COMMIT") in src/server/store.ts
after commit   : revalidatePath("/", "layout")  -- must not make the user retry
observed       : notification appears for the customer; board shows Planned after reload
inferred       : (write nothing here unless you actually could not observe it)
```

The last two lines matter most. Keeping "observed" and "inferred" apart is the habit that makes an incident write-up trustworthy, and it is the same habit `VERIFICATION.md` applies to the delivered evidence.

## Your final explanation

Write a five-minute walkthrough for another junior engineer. Include the browser command, authenticated actor, policy checks, transaction boundary, persisted result, and visible recovery path. Finish with one remaining limitation and a concrete next exercise. Use [the verification record](VERIFICATION.md) to support your claims, and avoid presenting untested deployment behavior as an observed result.
