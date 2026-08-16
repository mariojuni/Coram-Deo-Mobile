# CoramDeoMobile

CoramDeoMobile is a comprehensive React Native (Expo) mobile application designed to foster spiritual growth, community engagement, and church administration for the Coram Deo community. 

## 📖 High-Level Overview

As a central hub for church members and staff, CoramDeoMobile provides seamless access to digital ministry resources. From reading the Bible and engaging with sermons to managing serving schedules and participating in discipleship groups, the app is architected to support the complete lifecycle of church engagement.

## ✨ Key Features

- **Bible Integration**: Built-in Bible reading interface with support for reading plans, highlights, and personal notes.
- **Sermons & Worship**: Access to latest sermons, worship resources, and multimedia content.
- **Community Feed & Discipleship**: Engage with the community through feeds, comments, prayer requests, and discipleship group management.
- **Serving & Scheduling**: Streamlined event assignment, volunteer scheduling, and ministry management.
- **Staff & Administration**: Tools for staff to manage members, track attendance, and oversee church operations.
- **Giving**: Secure and easy-to-use online giving interface.

## 📸 Feature Spotlight: Sermons & Engagement

The app provides an intuitive interface for users to browse, listen, and watch sermons, along with tools for community engagement.

<div align="center">
  <img src="https://via.placeholder.com/250x500.png?text=Sermons+List" alt="Sermons List" width="250"/>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://via.placeholder.com/250x500.png?text=Sermon+Player" alt="Sermon Player" width="250"/>
</div>

> **Note:** The images above are placeholders. To update them with actual screenshots of the Sermon feature, place your screenshot images in the `assets/images/` directory and update the `src` attribute in the README.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Expo CLI](https://expo.dev/)
- iOS Simulator, Android Emulator, or Expo Go app on a physical device

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd CoramDeoMobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Firebase Credentials:**
   Ensure you have the appropriate `GoogleService-Info.plist` and `google-services.json` files for your environment (Staging/Production) placed in the `credentials/` directory or at the project root as required by your Firebase setup.

### Running the App

Start the Expo development server:

```bash
npx expo start
```

In the output, you can press `i` to open in iOS simulator, `a` for Android emulator, or scan the QR code with the Expo Go app.

## 🛠 Tech Stack

- **Framework**: React Native with [Expo](https://expo.dev/)
- **Language**: TypeScript
- **Backend/BaaS**: Firebase (Authentication, Firestore, Cloud Functions, Cloud Messaging)
- **Routing**: Expo Router (File-based routing via `app/` directory)

## 🤝 Contributing

1. Create your feature branch (`git checkout -b feat/your-feature`)
2. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
3. Push to the branch (`git push origin feat/your-feature`)
4. Open a Pull Request
