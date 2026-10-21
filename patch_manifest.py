import re, sys
p = "android/app/src/main/AndroidManifest.xml"
s = open(p, encoding="utf-8").read()
perms = ["INTERNET", "FOREGROUND_SERVICE", "FOREGROUND_SERVICE_MEDIA_PLAYBACK", "WAKE_LOCK", "POST_NOTIFICATIONS"]
add = ""
for x in perms:
    line = '<uses-permission android:name="android.permission.%s" />' % x
    if ("android.permission.%s\"" % x) not in s:
        add += "    " + line + "\n"
if add:
    s = s.replace("<application", add + "    <application", 1)
open(p, "w", encoding="utf-8").write(s)
print("manifest patched")
