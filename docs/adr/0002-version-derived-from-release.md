# An Environment's Version is derived from its latest Release

There is no editable "version" field on an Environment. Its Version is always the Version of its most recent Release (by `released_at`), exposed through the `environment_versions` view. We did this so the displayed Version and the release history can never disagree, and so that bumping a Version automatically leaves a record of what shipped. The cost is that changing a Version always means writing a Release, even for a quick correction; to fix a typo, edit or delete the latest Release rather than adding a field back.

Versions are free text, not enforced semver, because mobile Projects commonly use forms like `1.2.0 (45)`.
