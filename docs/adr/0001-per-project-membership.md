# Access is granted per Project, not per workspace

Other people get into Prologue's data only by being a Member of a specific Project (Owner, Editor, or Viewer), invited by email and accepted in-app. We chose this over a Workspace/Team layer because Prologue starts as a personal tool where sharing is occasional and project-by-project; a workspace would force every user to reason about an extra container they mostly don't need. Every row-level security policy hangs off `project_members`, so changing this later means rewriting all of them; a Workspace can still be added above Projects without breaking this model.

## Consequences

- Each Project has exactly one Owner, stored both as `projects.owner_id` and as the `owner` row in `project_members`. Only the Owner manages Members and deletes the Project.
- An Invitation can target an email that isn't registered yet. It waits as pending; once someone registers with that email they see it and must accept it to become a Member.

## Accepted risk: no email confirmation

Signup does not confirm email ownership, by choice, to keep registration to email + password. Because Invitations are matched by email, someone could register with another person's address first and receive Invitations meant for them. We accept this for now. The partial mitigation is that the invite dialog shows the display name already registered to an email, so the Owner can spot a mismatch. If Prologue is opened up beyond trusted circles, turn on email confirmation in Supabase Auth or switch Invitations to single-use invite links. The schema already supports either.
