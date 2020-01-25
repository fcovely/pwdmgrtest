### Prerequisite (IMPORTANT):
Ensure that you're using NodeJS 8 or newer on OSX. Android projects can be built and tested on Linux and Windows, but these platforms are not officially supported.
Before getting started, ensure you follow the [official React Native Getting Started guide](https://facebook.github.io/react-native/docs/getting-started.html) for your desired platform (iOS/Android). It is also recommended to have the react-native-cli installed:

```bash
npm install -g react-native-cli
```

### Installation:
From your command line:
```bash
# Clone this repository
# On the directory
# install dependencies
npm install
```

### To Run on iOS:
Use xcode


### To Run on Android:
```bash
# To build
adb devices
react-native run-android
```

### During building for Android (if error):
```bash
Keystore file '/Project-Folder/android/app/debug.keystore' not found for signing config 'debug'
```
[Download](https://raw.githubusercontent.com/facebook/react-native/master/template/android/app/debug.keystore) official template
And paste the downloaded debug.keystore in '/Project-Folder/android/app/'


### Do's:
- App BLE scan for specific service UUID in advertising packet "1949000D-5537-4F5E-99CA-290F4FBFF142"
- Only allow to connect to a peripheral name with substring of "ETH!" on the foreground
- Once connected, retrieve all items (type: generic) from Ethernom's card. App display a list of retrieved items
- Add account
- Edit account

### To-Do's:
- Implement features add Items: custom