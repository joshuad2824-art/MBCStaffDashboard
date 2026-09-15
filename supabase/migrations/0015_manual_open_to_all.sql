-- 0015 — the manual is open to everyone who signs in.
--
-- Joshua's decision, 15 September 2026, reversing the premise of 0014: the
-- bylaws, policies and procedures are the church's own documents and are
-- available to its members as a matter of course. There is no reason for the
-- dashboard to keep a shelf of them from one side or the other, and so no
-- reason for a document to carry an audience at all. A gate nobody wants is
-- worse than no gate: it is a switch waiting to be thrown by accident.
--
-- So the audience column, its check and its trigger go, and the read policy
-- becomes the plainest one the schema has — anyone signed in. That is any
-- account on the roster with access, limited accounts included: a deacon
-- without a staff role reads the manual, as does a volunteer coordinator.
--
-- What does not change:
--   * The docket (governance_finding) stays the deacon side's. It is the
--     Board's record of where its own governing documents disagree with
--     themselves — working material for the chairman, not the manual.
--   * Nothing writes either table through the API. No insert, update or
--     delete policy, before or after.
--   * The restricted three — the salary plan, the performance standards and
--     policy E006 — are not in the database and this does not put them there.
--     The loader still refuses them by front matter and names them on stderr.

-- The policy reads the column, so it goes first; then the trigger and the
-- column (the check goes with it); then the policy that replaces it.
drop policy governance_document_read on governance_document;

drop trigger if exists governance_document_audience_names_bodies on governance_document;

alter table governance_document drop column audience;

create policy governance_document_read on governance_document
  for select using (is_signed_in());
