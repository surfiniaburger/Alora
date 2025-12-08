This guide provides instructions on integrating the Navigation SDK into your Android project using Gradle or Maven for dependency management.

You'll need to configure your build settings, including minSdkVersion, targetSdkVersion, and dex options, for compatibility with the Navigation SDK.

Securely store your API key using the Secrets Gradle Plugin and add it to your AndroidManifest.xml for authentication.

Remember to include the required attributions (NOTICE.txt, LICENSES.txt) in your app's legal notices section, accessible through a menu item.

If you are a Mobility or Fleet Engine Deliveries customer, consult the Mobility documentation for billing details and transaction recording.

This page explains how to integrate the Navigation SDK into your development project.

Add the Navigation SDK to your project
The Navigation SDK is available through the Google Maven Repository. You can add the SDK to your project using either your Gradle build.gradle or Maven pom.xml configuration.

Note: This method is incompatible with some libraries that depend on Navigation SDK through the prior artifact ID. This includes releases of the Driver SDK v4.4 or earlier.
Add the following dependency to your Gradle or Maven configuration, substituting the VERSION_NUMBER placeholder for the desired version of Navigation SDK for Android.

Gradle
Maven
Add the following to your module-level build.gradle:


dependencies {
        ...
        implementation 'com.google.android.libraries.navigation:navigation:VERSION_NUMBER'
}
Note: If you are a Mobility Services customer upgrading from the original private Maven repository, note that the group and artifact names have changed, and the com.google.cloud.artifactregistry.gradle-plugin plugin is no longer necessary.
If you have any dependencies that use the Maps SDK, you have to exclude the dependency in each declared dependency that relies on the Maps SDK.

Gradle
Maven
Add the following to your top-level build.gradle:


allprojects {
        ...
        // Required: you must exclude the Google Play service Maps SDK from
        // your transitive dependencies to make sure there won't be
        // multiple copies of Google Maps SDK in your binary, as the Navigation
        // SDK already bundles the Google Maps SDK.
        configurations {
            implementation {
                exclude group: 'com.google.android.gms', module: 'play-services-maps'
            }
        }
}
Configure the build
After you have created the project, you can configure the settings for a successful build and use of the Navigation SDK.

Update local properties
In the Gradle Scripts folder, open the local.properties file and add android.useDeprecatedNdk=true.
Update the Gradle build script
Open the build.gradle (Module:app) file and use the following guidelines to update the settings to meet the requirements for Navigation SDK and consider setting the optimization options as well.

Required settings for Navigation SDK

Set minSdkVersion to 23 or higher.
Set targetSdkVersion to 34 or higher.
Add a dexOptions setting that increases the javaMaxHeapSize.
Set the location for additional libraries.
Add the repositories and dependencies for the Navigation SDK.
Replace the version numbers in the dependencies with the latest available versions.
Optional settings to decrease build time

Enable code shrinking and resource shrinking using R8/ProGuard to remove unused code and resources from dependencies. If the R8/ProGuard step takes too much time to run, consider enabling multidex for development work.
Reduce the number of language translations included in the build: Set resConfigs for one language during development. For the final build, set resConfigs for languages you actually use. By default, Gradle includes resource strings for all languages supported by the Navigation SDK.
Add desugaring for Java8 support

If you're building your app using the Android Gradle plugin 4.0.0 or higher, the plugin extends support for using a number of Java 8 language APIs. See Java 8 desugaring support for more information. See the example build script snippet below for how compile and dependency options.
We recommend using Gradle 8.4, the Android Gradle plugin version 8.3.0, and the Desugar library com.android.tools:desugar_jdk_libs_nio:2.0.3. This setup is compatible with the Navigation SDK for Android version 6.0.0 and higher.
The Desugar library needs to be enabled for the app module and any module that directly depends on the Navigation SDK.
Below is an example of the Gradle build script for the application. Check the sample apps for updated sets of dependencies, as the version of Navigation SDK you are using may be slightly ahead or behind this documentation.


apply plugin: 'com.android.application'

ext {
    navSdk = "__NAVSDK_VERSION__"
}

android {
    compileSdk 33
    buildToolsVersion='28.0.3'

    defaultConfig {
        applicationId "<your id>"
        // Navigation SDK supports SDK 23 and later.
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0"
        // Set this to the languages you actually use, otherwise you'll include resource strings
        // for all languages supported by the Navigation SDK.
        resConfigs "en"
        multiDexEnabled true
    }

    dexOptions {
        // This increases the amount of memory available to the dexer. This is required to build
        // apps using the Navigation SDK.
        javaMaxHeapSize "4g"
    }
    buildTypes {
        // Run ProGuard. Note that the Navigation SDK includes its own ProGuard configuration.
        // The configuration is included transitively by depending on the Navigation SDK.
        // If the ProGuard step takes too long, consider enabling multidex for development work
        // instead.
        all {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        // Flag to enable support for the new language APIs
        coreLibraryDesugaringEnabled true
        // Sets Java compatibility to Java 8
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

repositories {
    // Navigation SDK for Android and other libraries are hosted on Google's Maven repository.
    google()
}

dependencies {
    // Include the Google Navigation SDK.
    // Note: remember to exclude Google Play service Maps SDK from your transitive
    // dependencies to avoid duplicate copies of the Google Maps SDK.
    api "com.google.android.libraries.navigation:navigation:${navSdk}"

    // Declare other dependencies for your app here.

    annotationProcessor "androidx.annotation:annotation:1.7.0"
    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs_nio:2.0.3'
}
Add the API key to your app
This section describes how to store your API key so that it can be securely referenced by your app. You should not check your API key into your version control system, so we recommend storing it in the secrets.properties file, which is located in the root directory of your project. For more information about the secrets.properties file, see Gradle properties files.

To streamline this task, we recommend that you use the Secrets Gradle Plugin for Android.

Note: See the Secrets Gradle Plugin for Android documentation on GitHub for the latest system requirements and installation instructions.
To install the Secrets Gradle Plugin for Android in your Google Maps project:

In Android Studio, open your top-level build.gradle.kts or build.gradle file and add the following code to the dependencies element under buildscript.
Kotlin
Groovy

buildscript {
    dependencies {
        classpath "com.google.android.libraries.mapsplatform.secrets-gradle-plugin:secrets-gradle-plugin:2.0.1"
    }
}
Open your module-level build.gradle.kts or build.gradle file and add the following code to the plugins element.
Kotlin
Groovy

plugins {
    // ...
    id 'com.google.android.libraries.mapsplatform.secrets-gradle-plugin'
}
In your module-level build.gradle.kts or build.gradle file, ensure that targetSdk and compileSdk are set to 34.
Sync your project with Gradle.
Open the secrets.properties file in your top-level directory, and then add the following code. Replace YOUR_API_KEY with your API key. Store your key in this file because secrets.properties is excluded from being checked into a version control system.
Note: If the secrets.properties file does not exist, create it in the same folder as the local.properties file.

MAPS_API_KEY=YOUR_API_KEY
Create the local.defaults.properties file in your top-level directory, the same folder as the secrets.properties file, and then add the following code.

Note: Enter the code as shown. Don't replace DEFAULT_API_KEY with your API key.

MAPS_API_KEY=DEFAULT_API_KEY
The purpose of this file is to provide a backup location for the API key if the secrets.properties file is not found so that builds don't fail. This can happen if you clone the app from a version control system which omits secrets.properties and you have not yet created a secrets.properties file locally to provide your API key.

In your AndroidManifest.xml file, go to com.google.android.geo.API_KEY and update the android:value attribute. If the <meta-data> tag does not exist, create it as a child of the <application> tag.

<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="${MAPS_API_KEY}" />
Note: com.google.android.geo.API_KEY is the recommended metadata name for the API key. A key with this name can be used to authenticate to multiple Google Maps-based APIs on the Android platform, including the Navigation SDK for Android. For backwards compatibility, the API also supports the name com.google.android.maps.v2.API_KEY. This legacy name allows authentication to the Android Maps API v2 only. An application can specify only one of the API key metadata names. If both are specified, the API throws an exception.

In Android Studio, open your module-level build.gradle.kts or build.gradle file and edit the secrets property. If the secrets property does not exist, add it.

Edit the properties of the plugin to set propertiesFileName to secrets.properties, set defaultPropertiesFileName to local.defaults.properties, and set any other properties.

Kotlin
Groovy

secrets {
    // To add your Maps API key to this project:
    // 1. If the secrets.properties file does not exist, create it in the same folder as the local.properties file.
    // 2. Add this line, where YOUR_API_KEY is your API key:
    //        MAPS_API_KEY=YOUR_API_KEY
    propertiesFileName = "secrets.properties"

    // A properties file containing default secret values. This file can be
    // checked in version control.
    defaultPropertiesFileName = "local.defaults.properties"
}
 