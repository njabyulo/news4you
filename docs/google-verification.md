# Google OAuth verification preparation

Account state checked in Google Cloud on 25 October 2026, project
`news4you-512621-n0`:

- External, **In production**, confirmed by the operator.
- Branding verified and published, including homepage, privacy and terms links.
- openid, profile, email, Calendar events read-only and Gmail read-only declared.
- Data access **not verified**; warning and lifetime 100-user cap remain.
- No verification request submitted. No paid assessment authorised.

The Google form requires scope justifications, intended Gmail data use, and a
YouTube demonstration. Draft justifications were entered in the browser, but
the form cannot save them without the video URL. Do not put a placeholder or a
fictional demonstration URL into that field.

## Calendar justification draft

News4You creates a personal daily newspaper. With the reader's consent, the API
reads primary-calendar events for the edition date and displays meeting titles,
exact times and available event details in the reader's private agenda and
edition. It does not create, edit or delete events. Free/busy access cannot
supply the event titles and details needed for the agenda; calendar-wide write
access is unnecessary. The app limits collection to the primary calendar and
the reader's local edition date.

## Gmail justification draft

Intended use category: **Email productivity**.

News4You summarizes delivery updates and newsletters selected by the reader for
their private daily newspaper. The reader chooses All recent mail, a custom Gmail label, or No email. No email means no Gmail reads. The API lists at most eight messages from the 24 hours before collection starts across Gmail or using the chosen label, checks Spam/Trash exclusions and label membership when applicable, reads plain-text
bodies or snippets, and skips attachments. Metadata-only access cannot provide
the message text needed for these summaries. The app never sends mail, modifies
messages, marks them read or changes labels. Gmail's grant covers the mailbox;
the saved collection mode and label restrictions are enforced by the app. Raw collected source text expires
after seven days. Personal content is blocked from the unpaid hosted AI
endpoint; email metadata and calendar events bypass AI. Snapshots are shown only to the
signed-in owner. Data is not sold, used for ads or used to train general-purpose
models.

## Walkthrough evidence still needed

Record a real staging/local flow with disposable example calendar events and
emails. The public `/demo` alone does not demonstrate OAuth or actual API use.

1. Show the app URL, Google OAuth client/project and the consent screen with
   the exact requested permissions. Include the expected unverified-app screen.
2. Connect Google via Auth0 and enable publisher daily access using the same
   News4You account. Include all OAuth clients assigned to this Google project.
3. Demonstrate the All recent mail, label-selected and No email choices, and enable the primary-calendar option.
4. Request an edition, wait for the hosted Cloudflare publisher, and show the resulting
   agenda, selected email summaries and source references.
5. Show that No email means no email collection and that disconnecting
   stops future collection. Explain that existing editions remain in history.
6. Show the public privacy policy and explain local model processing, limited
   retention and account deletion requests. Do not expose credentials or real
   private messages in the recording.

Upload the resulting video with the operator's authorisation, enter its YouTube
URL and save the justifications. Review the final Google declarations with the
operator before submission. Approval and any required restricted-scope security
assessment are external requirements; production publishing alone does not
remove them or prove unlimited public availability.
