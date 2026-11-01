#!/bin/sh
set -e
export JAVA_HOME=/home/appuser/jdk21
export ANDROID_HOME=/home/appuser/android-sdk
export ANDROID_SDK_ROOT=/home/appuser/android-sdk
export PATH=/home/appuser/jdk21/bin:$PATH
echo "sdk.dir=/home/appuser/android-sdk" > /tmp/cc-agent/63962358/project/android/local.properties
cd /tmp/cc-agent/63962358/project/android
./gradlew assembleRelease --no-daemon --max-workers=1 \
  -Dorg.gradle.jvmargs="-Xmx1536m -XX:MaxMetaspaceSize=256m -XX:+UseSerialGC -XX:ActiveProcessorCount=1"
