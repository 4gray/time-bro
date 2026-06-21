# Settings token visibility

Goal: let users reveal the saved Jira API token in Settings so they can inspect or copy it from the input.

Decisions:
- Add an inline eye toggle inside the Jira API token field.
- Keep the token hidden by default and do not add clipboard writes.
- Reuse the existing Welcome screen icon pattern.

Pending work:
- Done.

Verification:
- `npm run test -- --run` passed.
- `npm run build` passed.
- Rendered demo Settings in the in-app browser and verified the Jira token input changes from `password` to `text` after clicking the eye button.
