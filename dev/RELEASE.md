# Release

### 1. [Update version metadata](../android/app/build.gradle.kts#L18-L24)

```
versionCode = 2
versionName = "1.1"
```

### 2. Update [CHANGELOG.md](../CHANGELOG.md)

### 3. Rebuild the .apk and .aab

```bash
make build
make android-deploy
make android-release
```

### 4. Commit and push to GitHub

### 5. Tag the commit: 

`git tag v<version>` (e.g. `git tag v1.2`)

### 6. Release on [Google Play](https://play.google.com/console/u/0/developers)

Bsharp -> Test and release -> Production -> Create new release

Release name: use `<versionCode> (<versionName>)`, for example `7 (1.6)`.

Release notes: copy the release bullets from [CHANGELOG.md](../CHANGELOG.md) into the "What's new" field. Wrap them in the locale tags shown below:

```
<en-US>
- Update Android compatibility for current Android versions
- Improve system-bar display and reduce release app size
</en-US>
```

Drag and drop the [.aab](../android/app/build/outputs/bundle/release/app-release.aab)
