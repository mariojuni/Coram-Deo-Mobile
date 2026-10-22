import { ExpoConfig, ConfigContext } from 'expo/config';
import { withDangerousMod, withAndroidManifest, withInfoPlist } from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const withAndroidSigningFix = (config: ExpoConfig) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'app', 'build.gradle');
      if (fs.existsSync(buildGradlePath)) {
        let contents = fs.readFileSync(buildGradlePath, 'utf-8');
        
        const releaseSigningBlock = `        release {
            if (project.hasProperty('android.injected.signing.store.file')) {
                def storeFilePath = project.property('android.injected.signing.store.file')
                def sf = file(storeFilePath)
                if (!sf.exists()) {
                    sf = rootProject.file(storeFilePath)
                }
                if (!sf.exists()) {
                    sf = file("../" + storeFilePath)
                }
                storeFile sf
                storePassword project.property('android.injected.signing.store.password')
                keyAlias project.property('android.injected.signing.key.alias')
                keyPassword project.property('android.injected.signing.key.password')
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`;

        if (!contents.includes('signingConfigs {')) {
          contents = contents.replace('android {', `android {\n    signingConfigs {\n${releaseSigningBlock}\n    }`);
        } else if (!contents.includes('release {') || !contents.includes('android.injected.signing.store.file')) {
          contents = contents.replace('signingConfigs {', `signingConfigs {\n${releaseSigningBlock}`);
        }

        contents = contents.replace(
          /buildTypes\s*\{\s*debug\s*\{[^\}]*\}\s*release\s*\{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*signingConfig signingConfigs\.debug/,
          `buildTypes {\n        debug {\n            signingConfig signingConfigs.debug\n        }\n        release {\n            signingConfig signingConfigs.release`
        );

        fs.writeFileSync(buildGradlePath, contents);
      }
      return config;
    },
  ]);
};

const withFirebaseSPMDisableAndRecaptcha = (config: ExpoConfig) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        let contents = fs.readFileSync(podfilePath, 'utf-8');
        let modified = false;

        // 1. Disable SPM
        if (!contents.includes('$RNFirebaseDisableSPM = true')) {
          contents = "$RNFirebaseDisableSPM = true\n" + contents;
          modified = true;
        }

        // 2. Add RecaptchaEnterprise pod for Phone Auth (SMS)
        const recaptchaPod = "pod 'RecaptchaEnterprise', '~> 18.0'";
        if (!contents.includes("pod 'RecaptchaEnterprise'")) {
          // Find the config = use_native_modules! line and insert after it
          const targetLine = "config = use_native_modules!(config_command)";
          if (contents.includes(targetLine)) {
            contents = contents.replace(
              targetLine,
              `${targetLine}\n\n  # Injected by app.config.ts: Required for Firebase Phone Auth (SMS)\n  ${recaptchaPod}\n`
            );
            modified = true;
          }
        }

        if (modified) {
          fs.writeFileSync(podfilePath, contents);
        }
      }
      return config;
    },
  ]);
};

const withRemoveOrientationRestriction = (config: ExpoConfig) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application?.[0];
    if (application && application.activity) {
      const activityName = 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';
      const existingActivity = application.activity.find(
        (a: any) => a.$['android:name'] === activityName
      );
      if (existingActivity) {
        existingActivity.$['android:screenOrientation'] = 'unspecified';
        existingActivity.$['tools:node'] = 'merge';
        existingActivity.$['tools:replace'] = 'android:screenOrientation';
      } else {
        application.activity.push({
          $: {
            'android:name': activityName,
            'tools:node': 'merge',
            'tools:replace': 'android:screenOrientation',
            'android:screenOrientation': 'unspecified',
          }
        });
      }
      
      if (!androidManifest.manifest.$['xmlns:tools']) {
        androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
      }
    }
    return config;
  });
};

/**
 * expo-audio automatically injects "audio" into UIBackgroundModes during prebuild.
 * This app does NOT play audio in the background (only in-app), so we strip it
 * to satisfy App Store Guideline 2.5.4.
 */
const withRemoveAudioBackgroundMode = (config: ExpoConfig) =>
  withInfoPlist(config, (c) => {
    const modes: string[] = c.modResults.UIBackgroundModes ?? [];
    c.modResults.UIBackgroundModes = modes.filter((m) => m !== 'audio');
    return c;
  });

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProd = process.env.EXPO_PUBLIC_APP_ENV === 'production';
  const appName = isProd ? "Coram Deo" : "CoramDeo - DEV";
  const bundleIdentifier = isProd ? "com.coramdeo.app.prod" : "com.coramdeo.app.staging";

  const buildNumber = process.env.GITHUB_RUN_NUMBER ? parseInt(process.env.GITHUB_RUN_NUMBER, 10) : 1;

  const baseConfig: ExpoConfig = {
    ...config,
    name: isProd ? "CoramDeo" : "CoramDeo-DEV",
    slug: "CoramDeoApp",
    version: require('./package.json').version || "1.0.0",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: "coramdeoapp",
    userInterfaceStyle: "light",
    backgroundColor: "#FAFAFA",
    ios: {
      supportsTablet: true,
      buildNumber: String(buildNumber),
      appleTeamId: "267GZU5SHN",
      icon: "./assets/expo.icon",
      bundleIdentifier,
      googleServicesFile: isProd ? "./credentials/production/GoogleService-Info.plist" : "./credentials/staging/GoogleService-Info.plist",
      entitlements: {
        // Must be "production" for all distributed builds (ad-hoc, App Store).
        // "development" only works when installed directly via Xcode in debug mode.
        "aps-environment": "production",
        "com.apple.developer.devicecheck.appattest-environment": isProd ? "production" : "development"
      },
      infoPlist: {
        UIBackgroundModes: [
          "remote-notification",
          "fetch"
        ],
        UIAppFonts: [
          "Montserrat-Regular.ttf",
          "Montserrat-Medium.ttf",
          "Montserrat-SemiBold.ttf",
          "Montserrat-Bold.ttf",
          "Montserrat-ExtraBold.ttf",
          "Montserrat-Italic.ttf",
          "Montserrat-MediumItalic.ttf",
          "Montserrat-SemiBoldItalic.ttf",
          "Montserrat-BoldItalic.ttf",
          "Roboto-Regular.ttf",
          "Roboto-Medium.ttf",
          "Roboto-SemiBold.ttf",
          "Roboto-Bold.ttf",
          "Roboto-Italic.ttf",
          "Roboto-BoldItalic.ttf",
          "Lora-Regular.ttf",
          "Lora-Medium.ttf",
          "Lora-SemiBold.ttf",
          "Lora-Bold.ttf",
          "Lora-Italic.ttf",
          "Lora-BoldItalic.ttf"
        ],
        CFBundleDisplayName: appName,
        ITSAppUsesNonExemptEncryption: false,
        UISupportedInterfaceOrientations: [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ],
        "UISupportedInterfaceOrientations~ipad": [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ],
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: isProd
              ? [(process.env.EXPO_PUBLIC_IOS_REVERSED_CLIENT_ID_PROD || "com.googleusercontent.apps.130463348213-7fqr37i68h4u3jt7hjj30gag2t8ntv1k")]
              : [
                  "com.googleusercontent.apps.130463348213-4vn6d7vfvp1bad7298agpf9n8r0npq7l",
                  (process.env.EXPO_PUBLIC_IOS_REVERSED_CLIENT_ID_PROD || "com.googleusercontent.apps.130463348213-7fqr37i68h4u3jt7hjj30gag2t8ntv1k")
                ]
          }
        ]
      }
    },
    android: {
      versionCode: buildNumber,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/logo.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false,
      package: bundleIdentifier,
      googleServicesFile: isProd ? "./credentials/production/google-services.json" : "./credentials/staging/google-services.json",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static",
            "deploymentTarget": "16.4",
            "enableSceneSupport": true
          }
        }
      ],
      "@react-native-firebase/app",
      "@react-native-firebase/app-check",
      "@react-native-firebase/auth",
      "@react-native-firebase/messaging",
      "expo-router",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: (isProd && process.env.EXPO_PUBLIC_IOS_REVERSED_CLIENT_ID_PROD)
            ? process.env.EXPO_PUBLIC_IOS_REVERSED_CLIENT_ID_PROD
            : "com.googleusercontent.apps.130463348213-4vn6d7vfvp1bad7298agpf9n8r0npq7l"
        }
      ],
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#FAFAFA",
          "image": "./assets/images/logo.png",
          "dark": {
            "backgroundColor": "#FAFAFA"
          },
          "android": {
            "image": "./assets/images/logo.png",
            "imageWidth": 76
          }
        }
      ],
      "expo-sqlite",
      "@react-native-community/datetimepicker",
      "expo-video",
      "expo-audio",
      "expo-sharing",
      "expo-web-browser",
      "expo-apple-authentication",
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow CoramDeo to access your photos to let you update your profile picture and share images in the community."
        }
      ],
      [
        "expo-font",
        {
          "fonts": [
            "./assets/fonts/Inter-Regular.ttf",
            "./assets/fonts/Inter-Medium.ttf",
            "./assets/fonts/Inter-SemiBold.ttf",
            "./assets/fonts/Inter-Bold.ttf",
            "./assets/fonts/Inter-ExtraBold.ttf",
            "./assets/fonts/Inter-Italic.ttf",
            "./assets/fonts/Inter-MediumItalic.ttf",
            "./assets/fonts/Inter-SemiBoldItalic.ttf",
            "./assets/fonts/Inter-BoldItalic.ttf",
            "./assets/fonts/Inter-VariableFont_opsz,wght.ttf",
            "./assets/fonts/Inter-Italic-VariableFont_opsz,wght.ttf",
            "./assets/fonts/Montserrat-Regular.ttf",
            "./assets/fonts/Montserrat-Medium.ttf",
            "./assets/fonts/Montserrat-SemiBold.ttf",
            "./assets/fonts/Montserrat-Bold.ttf",
            "./assets/fonts/Montserrat-ExtraBold.ttf",
            "./assets/fonts/Montserrat-Italic.ttf",
            "./assets/fonts/Montserrat-MediumItalic.ttf",
            "./assets/fonts/Montserrat-SemiBoldItalic.ttf",
            "./assets/fonts/Montserrat-BoldItalic.ttf",
            "./assets/fonts/Roboto-Regular.ttf",
            "./assets/fonts/Roboto-Medium.ttf",
            "./assets/fonts/Roboto-SemiBold.ttf",
            "./assets/fonts/Roboto-Bold.ttf",
            "./assets/fonts/Roboto-Italic.ttf",
            "./assets/fonts/Roboto-BoldItalic.ttf",
            "./assets/fonts/Lora-Regular.ttf",
            "./assets/fonts/Lora-Medium.ttf",
            "./assets/fonts/Lora-SemiBold.ttf",
            "./assets/fonts/Lora-Bold.ttf",
            "./assets/fonts/Lora-Italic.ttf",
            "./assets/fonts/Lora-BoldItalic.ttf"
          ]
        }
      ],

      "./plugins/withPodfileDeploymentTarget.js"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "23bdb368-b237-4ec3-94c5-991fb625547b"
      }
    },
    owner: "maryow"
  };

  // withRemoveAudioBackgroundMode runs LAST so it strips the 'audio' entry that
  // expo-audio injects, regardless of plugin execution order.
  return withRemoveAudioBackgroundMode(
    withRemoveOrientationRestriction(withAndroidSigningFix(withFirebaseSPMDisableAndRecaptcha(baseConfig)))
  );
};
