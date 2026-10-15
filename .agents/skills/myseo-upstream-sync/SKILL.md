---
name: myseo-upstream-sync
description: Sync this fork to a new upstream Paseo release, preserving the fork's changes.
disable-model-invocation: true
---

# Upstream release sync

Bring `dev` from its current base tag to a chosen upstream release tag while
preserving the fork's delta. The merge is mechanical; the verification is the
work.

Ground rules, in force throughout:

- The sync lands locally. Pushing to origin and upgrading production are
  separate, user-authorized steps (AGENTS.md owns those rules).
- The dev services (`systemd` user units `myseo-dev-server`/`myseo-dev-app`)
  watch the working tree. Stop them before any tree-rewriting step (merge,
  `npm ci`, builds). The `myseo-dev-*` shell helpers are interactive-only —
  call `systemctl --user stop myseo-dev-app myseo-dev-server` directly, app
  first.
- After a version jump, install dependencies with `npm ci`. A tree converged
  by `npm install` can carry invalid versions that bundle a broken renderer
  with zero build errors.

## Steps

1. **Back up.** Require a clean `git status`. Create `git branch
backup-dev-<version>` and `tar -czf /tmp/paseo-home-<version>.tar.gz -C
.dev paseo-home`. Stop the services. Done when the tree is clean, both
   artifacts exist, and both units report inactive.

2. **Fetch and survey.** `git fetch upstream --tags --prune`, then read the
   changelog between the current base tag and the target tag
   (`git show <tag>:CHANGELOG.md`) for Node version bumps, config or
   home-format changes, and churn in files the fork customized
   (`git diff --stat <base>..<tag> -- scripts/ packages/desktop docs/`).
   Done when you can state the release's headline changes and its
   infrastructure requirements (or that it has none).

3. **Check the merge-base before any merge.** `git merge-base HEAD <tag>`
   must return the fork's base tag. Upstream has already rewritten history
   once (the fork's v0.10.3 shares only the 0.10.0 cut with upstream's
   current line), and a textual merge across a rewrite silently stitches old
   and new code — it builds and breaks at render.
   - Base matches → scratch branch, `git merge <tag>`, resolving conflicts by
     keeping upstream's code and re-applying the fork's intent on top.
   - Base is older → **exact-tree merge**: `git reset --hard <tag>` on the
     scratch branch, `git merge -s ours <fork-tip>` (records both history
     lines, takes upstream's tree verbatim), then `git cherry-pick` the fork's
     commits. This converts every future sync into the normal path; the pain
     is one-time.

4. **Verify the fork delta.** `git diff <tag> HEAD --stat` must match the
   fork's recorded delta — compare with `git diff <base> backup-dev-<version>
--stat`: same files, same insertions and deletions. A mismatch means a fork
   change was dropped or the wrong tip was merged.

5. **Rebuild and verify, services still stopped.** `npm ci`, then
   `build:client`, `build:server`, `typecheck`, `lint`, `format`. Run only the
   tests covering fork-touched files (`npx vitest run <file> --bail=1`); the
   full suite is CI's job (AGENTS.md). Check `git status` when done: a
   formatter that touched `package-lock.json` is damage — restore it; the
   lockfile is npm's output, not a source file.

6. **Restart and smoke.** Start the server unit, then the app. The daemon
   needs 1–2 minutes to compile and bind. Done when port `6768` is listening
   (`ss -tlnp | grep 6768`), the daemon log reports the new version
   (`grep -o '"daemonVersion":"[^"]*"' .dev/paseo-home/daemon.log | tail -1`),
   and the app unit shows Metro up. `npm run cli -- daemon status` answers
   from the production daemon on 6767 — ignore it here.

7. **Land and wrap up.** `git checkout dev && git merge --ff-only <scratch>`,
   delete the scratch branch, restart the services once more so the app's
   build label says `dev`. Keep the backup branch and state tarball for a few
   days. Confirm with the user on pushing `origin/dev`; production is a
   separate upgrade with its own restart.

## Hazards (reference)

- **History rewrite** (step 3): merge-base older than the expected base tag.
  Exact-tree merge; textual merge is off the table.
- **Invalid dependency trees**: renderer crashes with a green build mean the
  tree first — `npm ls --all --workspace=@getpaseo/app 2>&1 | grep
"invalid:"`; any hit means `npm ci` and rebuild.
- **Desktop artifacts**: package only via root `npm run build:desktop`, which
  exports the web bundle with `PASEO_WEB_PLATFORM=electron`. A manual
  `expo export` produces the browser flavor, which crashes the packaged shell
  (React #130), and CI's packaged smoke does not launch the renderer.
