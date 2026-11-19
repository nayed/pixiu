## Continuous integration and releases

GitHub Actions runs the typecheck, lint, tests, and both builds on every push to `main` and on every pull request.

To release, bump `version` in `package.json`, commit, then tag and push:

```bash
git tag -a v0.2.0 -m "Pixiu 0.2.0"
git push origin v0.2.0
```

The release workflow checks that the tag matches `package.json`, runs the checks, builds the zip, and makes a draft release with the zip attached and notes generated from the commits. Edit the notes on GitHub, then publish the draft.