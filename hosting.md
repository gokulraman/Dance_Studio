# Hosting options for DLegacy

## Short answer

For the app described in [REBUILD.md](./REBUILD.md), you do not need an EC2 or Azure server, and you do not need Docker. It is an Expo / React Native app that talks directly to Supabase; there is no separate app backend to deploy.

- **Android app:** Build an installable Android package with Expo Application Services (EAS), or build it locally.
- **Database and authentication:** Supabase.
- **Optional web version:** Publish its static build to Cloudflare Pages or Azure Static Web Apps.

## Hosting options

| What you need | Low-cost option | Notes |
|---|---|---|
| Android app for 3–5 people | **EAS Build** | Expo's current free plan includes up to 15 Android and 15 iOS builds. For private use, distribute an installable build to your users; no VM is needed. See [EAS pricing](https://expo.dev/pricing) and [EAS Build](https://docs.expo.dev/build/introduction/). |
| A web version | **Cloudflare Pages** | Host the exported static web app on its free plan. Static asset requests are free and unlimited; the free plan currently allows 500 builds per month. See [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/) and [pricing](https://developers.cloudflare.com/pages/functions/pricing/). |
| Web version within Azure | **Azure Static Web Apps** | A static-hosting option to consider if you prefer Azure; it does not require an always-on VM. Check the current plan limits before deploying. |
| Database, login, and app data | **Supabase Free** | Likely ample for 3–5 users and ordinary attendance records. The relevant constraint is reliability and recovery, not user capacity. See [Supabase pricing](https://supabase.com/pricing). |
| EC2 or Azure VM | **Not recommended for this app** | Adds server maintenance and possible costs for the VM, disk, networking, or other services, without solving a need this app currently has. Free credits or introductory offers are time-limited and vary. |

## Do you need Docker?

**No—not for the current architecture.** Docker packages server-side applications and their runtime. Your Expo app is built for Android and runs on the users' phones; it does not need to stay running on a cloud server. Docker would make sense only if you later add a custom backend or choose to self-host services.

You can still use Docker or local Supabase tooling for development, but that is optional and separate from hosting the app.

## Is Supabase Free enough for production?

**For the expected amount of usage: probably yes. For production reliability and recovery: it has important trade-offs.**

Supabase's current Free plan includes 500 MB of database space, 5 GB of egress, 1 GB of file storage, and up to 50,000 monthly active users—well beyond what 3–5 people would normally need for records and attendance, assuming you are not storing lots of media. But Free projects can be paused after a week of inactivity, and the Free plan does not include the automated database backups available on paid plans. Supabase recommends that Free-tier projects export their data regularly and keep off-site backups. See [Supabase pricing](https://supabase.com/pricing) and its [database backups guidance](https://supabase.com/docs/guides/platform/backups).

So the recommendation is:

- **Private pilot / cost must stay at zero:** Supabase Free is a reasonable start, provided you accept the pause risk and arrange regular data exports.
- **Business-critical attendance or payment records:** Consider Supabase Pro when losing access or data recovery would be unacceptable. Supabase currently lists it from **$25/month** and includes daily backups; check its [current pricing](https://supabase.com/pricing) before deciding.

Since the app handles student and payment-related records, keep the Supabase **service-role/secret key out of the app**. The mobile app should use the publishable key, with access controlled by correctly configured Row Level Security policies.

## Recommendation

Start with **EAS for the Android build + Supabase Free**, and skip EC2, Azure VMs, and Docker. Add free static hosting only if you actually want a browser version. Upgrade Supabase based on your backup and uptime requirements—not because 3–5 users need more capacity.

## Step-by-step: build and distribute Android and iOS apps

These steps assume the Expo app is at the repository root, as described in [REBUILD.md](./REBUILD.md). EAS builds the installable app binaries in the cloud; there is no app server to deploy.

### 1. Prepare the app

1. Finish the app setup and local checks in [REBUILD.md](./REBUILD.md). From a terminal, enter the repository:

   ```sh
   npm install
   npx tsc --noEmit
   npx expo-doctor
   ```

2. In `app.json`, set permanent, globally unique identifiers before your first release:

   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.yourstudio.dlegacy"
       },
       "android": {
         "package": "com.yourstudio.dlegacy"
       }
     }
   }
   ```

   Merge these fields into the existing `ios` and `android` sections; do not replace their icons or other settings. Choose an identifier you control. Once distributed, changing it creates a different app.

3. The local `.env.local` file is not automatically available to cloud builds. Create `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Expo project’s **Environment variables** settings for both the `preview` and `production` environments. Use the Supabase project URL and publishable key. These values are included in the client app, so never put a Supabase secret or service-role key in them. See [Expo environment variables](https://docs.expo.dev/eas/environment-variables/).

### 2. Configure EAS Build

1. Create or log in to a free Expo account at [expo.dev](https://expo.dev/).
2. From the repository root, configure the project and link it to EAS:

   ```sh
   npx eas-cli@latest login
   npx eas-cli@latest build:configure
   ```

   Follow the prompts. This creates or updates `eas.json` and links the app to your Expo account.

3. Configure build profiles in `eas.json`. Keep any settings created by `build:configure` that your project needs; make sure the profiles include the following:

   ```json
   {
     "build": {
       "preview": {
         "distribution": "internal",
         "environment": "preview",
         "android": {
           "buildType": "apk"
         }
       },
       "production": {
         "environment": "production",
         "autoIncrement": true
       },
       "ios-simulator": {
         "environment": "preview",
         "ios": {
           "simulator": true
         }
       }
     }
   }
   ```

   If `eas.json` already has a `cli` section or other settings, preserve them and merge these build profiles instead of overwriting the file.

### 3. Build for Android

For a direct install on Android phones—without publishing to Google Play—build an APK:

```sh
npx eas-cli@latest build --platform android --profile preview
```

On the first build, follow the prompts to create or configure Android signing credentials. When the build completes, open its EAS link on each Android device, download the APK, and approve installation if Android asks to allow installs from that source. Share the link only with the intended users.

For Google Play, build a production Android App Bundle (`.aab`) instead:

```sh
npx eas-cli@latest build --platform android --profile production
```

An AAB is for Play Console and cannot be installed by tapping it like an APK. Publishing through Google Play requires a Play Console developer account and the store’s listing and review steps. See [EAS Android submission](https://docs.expo.dev/submit/android/).

### 4. Build for iOS

**Simulator only:** An iOS Simulator build can be created without Apple Developer Program membership. It runs in the iOS Simulator on a Mac, not on an iPhone:

```sh
npx eas-cli@latest build --platform ios --profile ios-simulator
```

**Install on iPhones for private testing:** Apple requires Apple Developer Program membership for standard signed iPhone distribution through EAS. This membership is paid and renews annually; check [Apple’s current membership details](https://developer.apple.com/programs/). With membership:

1. Register each tester’s iPhone with EAS:

   ```sh
   npx eas-cli@latest device:create
   ```

   Follow the link on each iPhone to register its device.
2. Build the internal iOS app:

   ```sh
   npx eas-cli@latest build --platform ios --profile preview
   ```

3. Follow EAS’s prompts to sign in to Apple and configure signing credentials. The internal/ad hoc build is limited to devices registered for that build. Register any additional devices and rebuild so they are included.
4. Open the EAS installation link on each registered iPhone and follow the install instructions.

Without paid membership, a free Apple account can install apps to a limited number of personal devices using Xcode, but the signing expires after 7 days and must be renewed. This is suitable for development on your own device, not practical ongoing distribution to a small group. See [Apple’s developer account overview](https://developer.apple.com/help/account/basics/about-your-developer-account/).

For wider distribution via TestFlight or the App Store, use an Apple Developer Program account, create the app in App Store Connect, and build the store version:

```sh
npx eas-cli@latest build --platform ios --profile production
```

Then upload the build to App Store Connect with EAS Submit or the website:

```sh
npx eas-cli@latest submit --platform ios --profile production --latest
```

TestFlight lets invited testers install the app after Apple processes the build. Public App Store release additionally requires completing the store listing and passing App Review. See [EAS iOS submission](https://docs.expo.dev/submit/ios/).

### 5. Updates and future builds

Whenever you change native app code or configuration, run the relevant build command again and share/install the new binary. EAS Build’s free allowance is limited (currently up to 15 Android and 15 iOS builds); check [EAS pricing](https://expo.dev/pricing) for current limits. Keep a copy of signing credentials and source code, and test login, access policies, and data operations against the intended Supabase project before distributing each release.
