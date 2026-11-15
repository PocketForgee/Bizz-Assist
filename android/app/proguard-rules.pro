# Release builds keep minify off (see app/build.gradle.kts); rules here are for when it is turned on.
-keep class ai.nexconn.** { *; }
-keep class io.rong.** { *; }
-keepattributes *Annotation*, InnerClasses, Signature
-keep,includedescriptorclasses class app.bizzassist.agent.data.**$$serializer { *; }
-keepclassmembers class app.bizzassist.agent.data.** { *** Companion; kotlinx.serialization.KSerializer serializer(...); }
