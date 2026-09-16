plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.caxetaroyale"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.caxetaroyale"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            // O jogo e 100% client-side: nada a ofuscar, e o R8 so atrapalharia o WebView.
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources.excludes += setOf("META-INF/*.kotlin_module")
    }
}

/**
 * O jogo mora em /web na raiz do repositorio. Em vez de duplicar os arquivos,
 * o build copia a pasta pra assets antes de empacotar.
 */
val webSource = rootProject.file("../web")

val copiarJogo = tasks.register<Sync>("copiarJogo") {
    description = "Copia /web para os assets do APK"
    from(webSource)
    into(layout.buildDirectory.dir("generated/assets/web"))
    exclude("**/.DS_Store")
}

android.sourceSets.getByName("main") {
    assets.srcDir(layout.buildDirectory.dir("generated/assets"))
}

tasks.matching { it.name.startsWith("merge") && it.name.endsWith("Assets") }.configureEach {
    dependsOn(copiarJogo)
}
tasks.matching { it.name.startsWith("generate") && it.name.endsWith("Assets") }.configureEach {
    dependsOn(copiarJogo)
}

dependencies { }
