import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isProd = process.env.EXPO_PUBLIC_APP_ENV === 'production';
  const appName = isProd ? "Coram Deo" : "Coram Deo Staging";
  const bundleIdentifier = isProd ? "com.coramdeo.app.prod" : "com.coramdeo.app.staging";

  return {
    ...config,
    name: "Coram Deo", // Keep this static so the Xcode project folder is always 'CoramDeo'
    slug: "ChurchAppNative",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "churchappnative",
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/expo.icon",
      bundleIdentifier,
      googleServicesFile: isProd ? "./credentials/production/GoogleService-Info.plist" : "./credentials/staging/GoogleService-Info.plist",
      infoPlist: {
        CFBundleDisplayName: appName,
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false,
      package: bundleIdentifier,
      googleServicesFile: isProd ? "./credentials/production/google-services.json" : "./credentials/staging/google-services.json",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK"
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
            "useFrameworks": "static"
          }
        }
      ],
      "@react-native-firebase/app",
      "expo-router",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: isProd 
            ? "YOUR_PROD_REVERSED_CLIENT_ID_HERE" // Update this once production GoogleService-Info.plist has CLIENT_ID
            : "com.googleusercontent.apps.676505939287-dudp40gr0pns1kpff4fc1ohu6qt4ha92"
        }
      ],
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#208AEF",
          "android": {
            "image": "./assets/images/splash-icon.png",
            "imageWidth": 76
          }
        }
      ],
      "expo-sqlite",
      "@react-native-community/datetimepicker",
      "expo-video",
      "expo-audio",
      "expo-sharing",
      "expo-web-browser"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "5355c6b6-c940-422e-8184-be77e4d9ca07"
      }
    }
  };
};
