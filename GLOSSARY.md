# Prologue

Prologue (Project Log Gue) is a dashboard where developers keep track of the software projects they are working on: where the code lives, where it runs, what version is out, and what work is left.

## Language

### Projects & people

**Project**:
A piece of software someone is building and wants to keep track of in Prologue.
_Avoid_: App, workspace, product

**Owner**:
The single user who created a Project and has full control over it, including who else can access it.
_Avoid_: Admin, creator

**Member**:
A user who has been given access to a Project, with a Role.
_Avoid_: Collaborator, participant, user (when meaning access to a Project)

**Role**:
The level of access a Member has on a Project: Owner, Editor, or Viewer.
_Avoid_: Permission, access level

**Invitation**:
An offer to an email address to become a Member of a Project, pending until accepted or declined.
_Avoid_: Invite link, share

**Shared Project**:
A Project the current user is a Member of but does not own.
_Avoid_: Team project, joined project

**Project Status**:
Whether a Project is still worked on: Active or Inactive. A Project becomes Inactive when work stops or moves elsewhere, for example to a new repository. Inactive Projects leave the dashboard overview and the sidebar and are listed under the Projects page's Inactive tab.
_Avoid_: State, phase

**Tech Tag**:
A short label naming a technology a Project uses, such as "React" or "Laravel".
_Avoid_: Stack, category

**Pin**:
A Member's personal marker that keeps a Project at the top of their own dashboard. Pins are not shared between Members.
_Avoid_: Favorite, star

**Quick Link**:
A named link to anything related to a Project that is not a Repository or Environment, such as a design file or API docs.
_Avoid_: Bookmark, resource

### Code & deployments

**Repository**:
A source-code repository belonging to a Project. A Project has at most one.
_Avoid_: Repo link, codebase

**Environment**:
A named place where a Repository's code runs, such as Production or Development, tying together the branch it is deployed from, its URLs, and the Version running there. Every Environment belongs to exactly one Repository.
_Avoid_: Stage, server, deployment

**Environment Kind**:
What sort of Environment it is, regardless of its name: Production, Staging, Development, Preview, or Other. The dashboard shows the Version of the Repository's Production Environment.
_Avoid_: Type, tier

**Version**:
The identifier of what is currently running in an Environment, such as "1.4.0" or "1.2.0 (45)". It is always the Version of the Environment's latest Release; an Environment with no Release has no Version.
_Avoid_: App version, build (unless the Project genuinely distinguishes builds)

**Release**:
A record that a specific Version was shipped to an Environment at a point in time, with notes describing what changed.
_Avoid_: Changelog entry, deploy

### Work tracking

**Board**:
The kanban board of a Project. Every Project has exactly one.
_Avoid_: Kanban, sprint

**Column**:
A stage on a Board that Tasks move through, such as "In Progress". Each Project can customise its Columns.
_Avoid_: List, lane, status

**Done Column**:
A Column marked as meaning the work in it is finished. Tasks in a Done Column are not counted as open.
_Avoid_: Completed list, archive

**Task**:
A single unit of work on a Board.
_Avoid_: Card, ticket, issue, todo

**Open Task**:
A Task that is not in a Done Column.
_Avoid_: Pending task, active task

**Assignee**:
The one Member responsible for a Task. A Task may have no Assignee.
_Avoid_: Owner (reserved for the Project Owner), responsible

**Priority**:
How urgent a Task is: Low, Medium, High, or Urgent.
_Avoid_: Severity, importance

**Label**:
A project-specific marker attached to Tasks to group them, such as "bug" or "ui".
_Avoid_: Tag (reserved for Tech Tag)
