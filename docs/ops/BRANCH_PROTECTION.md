# Branch Protection: main

## Required Settings

Configure at: GitHub → Repository → Settings → Branches → Add rule

### Branch name pattern: `main`

Required status checks (all must pass before merge):

- `CI / Build, Lint, Typecheck, Test` (from .github/workflows/ci.yml)
- `Android CI / Assemble Debug + Lint` (from .github/workflows/android.yml)
- `Xcode Cloud` (from Xcode Cloud GitHub App — must be installed first)

Merge settings:

- Require pull request before merging: ✓
- Require approvals: 0 (solo founder)
- Dismiss stale pull request approvals when new commits are pushed: ✓
- Require conversation resolution before merging: ✓
- Require linear history: ✓ (squash merge only)
- Allow squash merging: ✓
- Allow merge commits: ✗
- Allow rebase merging: ✗

Force push:

- Do not allow force pushes to main

## Setting Up Xcode Cloud Status Check

1. Install the Xcode Cloud GitHub App: https://github.com/apps/xcode-cloud
2. Grant it access to this repository
3. Open apps/ios/WonderWaltz.xcodeproj in Xcode
4. Product → Xcode Cloud → Create Workflow
5. Configure: Action=Build, Scheme=WonderWaltz, Debug, iOS Simulator
6. Start Condition: Pull Request to main or any branch
7. After first PR build, the check name "Xcode Cloud" will appear in GitHub
8. Add it as a required status check in branch protection
