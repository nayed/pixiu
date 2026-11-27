## Continuous integration and releases

GitHub Actions runs the typecheck, lint, tests, and both builds on every push to `main` and on every pull request.

To release, bump `version` in `package.json`, commit, then tag and push, with the new version in place of X.Y.Z:

```bash
git tag -a vX.Y.Z -m "Pixiu X.Y.Z"
git push origin vX.Y.Z
```

The release workflow checks that the tag matches `package.json`, runs the checks, builds the zip, and makes a draft release with the zip attached and notes generated from the commits. Edit the notes on GitHub, then publish the draft.