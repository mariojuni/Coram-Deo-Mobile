import { saveVersion, redownloadVersion } from "@/features/bible/data/bible.repository";
import { bibleDataService } from "@/features/bible/data/BibleDataService";
import { BounceCard } from "@/components/ui/BounceCard";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle,
  ChevronLeft,
  CloudDownload,
  Globe2,
  HardDrive,
  RefreshCw,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVersionContext } from "@/features/bible/presentation/context/VersionManagerContext";
import { doc, getDoc } from "firebase/firestore";
import { getActiveDb } from "@/firebase";

export default function VersionDetailScreen() {
  const router = useRouter();
  const { bibleStr } = useLocalSearchParams();
  const bible = bibleStr ? JSON.parse(bibleStr as string) : null;
  const { savedVersions, refreshSavedVersions, publishers, handleSelectVersion } = useVersionContext();
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    hasUpdate: boolean;
    remoteVersion: number;
  } | null>(null);
  const [fullBibleDetails, setFullBibleDetails] = useState<any>(null);

  const localVersion: number = bible?._localContentVersion ?? 0;

  useEffect(() => {
    if (!bible) return;
    const id = String(bible.id);
    getDoc(doc(getActiveDb(), "bibleVersions", id))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setFullBibleDetails(data);
          const remoteVersion: number = data.contentVersion ?? 1;
          setUpdateInfo({
            hasUpdate: remoteVersion > localVersion,
            remoteVersion,
          });
        }
      })
      .catch(() => {});
  }, [bible?.id]);

  if (!bible) return null;
  const displayBible = fullBibleDetails || bible;

  const isDownloaded = savedVersions
    .map((v: any) => String(v.id))
    .includes(String(bible.id));
  const abbr = String(
    displayBible.abbreviation || displayBible.localized_abbreviation || displayBible.id || ""
  );
  const publisherName =
    displayBible.publisher?.name ||
    publishers[displayBible.organization_id] ||
    (displayBible.organization_id ? "Loading..." : "Public Domain");

  const sizeBytes: number | undefined =
    displayBible.sizeBytes || displayBible.size || displayBible.offline?.size;
  let sizeLabel = "";
  if (sizeBytes) {
    const mb = sizeBytes / (1024 * 1024);
    sizeLabel = mb < 1 ? `~${Math.round(mb * 1024)} KB` : `${mb.toFixed(1)} MB`;
  } else {
    const chapterCount: number = displayBible.chapterCount ?? displayBible.chapter_count ?? 0;
    const estimatedBytes = chapterCount > 0 ? chapterCount * 20480 : 1189 * 20480;
    const estimatedMB = estimatedBytes / (1024 * 1024);
    sizeLabel =
      estimatedMB < 1
        ? `~${Math.round(estimatedMB * 1024)} KB`
        : `${estimatedMB.toFixed(1)} MB`;
  }

  const handleDownload = async () => {
    if (isDownloaded && !updateInfo?.hasUpdate) return;

    setIsDownloading(true);

    if (isDownloaded && updateInfo?.hasUpdate) {
      const success = await redownloadVersion(bible.id, updateInfo.remoteVersion);
      if (success) {
        await refreshSavedVersions();
        setUpdateInfo({
          hasUpdate: false,
          remoteVersion: updateInfo.remoteVersion,
        });
        Alert.alert("Updated!", `Bible updated to version ${updateInfo.remoteVersion}.`);
      } else {
        Alert.alert("Error", "Failed to update. Please try again.");
      }
    } else {
      const success = await bibleDataService.downloadVersion(bible.id);
      if (success) {
        await saveVersion(bible);
        await refreshSavedVersions();
        Alert.alert("Success", "Bible downloaded successfully!");
      } else {
        Alert.alert("Error", "Failed to start download. Please try again.");
      }
    }

    setIsDownloading(false);
  };

  const copyrightText =
    displayBible.copyright?.long?.text ||
    displayBible.copyright?.long ||
    displayBible.copyright?.longText ||
    displayBible.copyright_long?.text ||
    displayBible.copyright_long ||
    displayBible.description ||
    displayBible.localized_description ||
    "No detailed description is available for this version yet. This translation provides a faithful rendering of the original texts.";

  const languageName = displayBible.language?.name || displayBible.language?.name_local || "English";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }} edges={["top", "bottom"]}>
      {/* Top Navigation */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <BounceCard
          bounceScale={0.85}
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#fff",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </BounceCard>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Hero Section */}
        <View style={{ alignItems: "center", paddingHorizontal: 24, marginTop: 16 }}>
          <LinearGradient
            colors={["#FF6596", "#FF8FB0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 140,
              height: 140,
              borderRadius: 16,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 24,
              shadowColor: "#FF6596",
              shadowOpacity: 0.3,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}
          >
            <Text style={{ fontSize: 40, fontWeight: "bold", color: "#FFF", textAlign: "center" }}>
              {abbr}
            </Text>
          </LinearGradient>

          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1a1a1a", textAlign: "center", marginBottom: 8 }}>
            {displayBible.title || displayBible.localized_title}
          </Text>

          <Text style={{ fontSize: 14, color: "#666", textAlign: "center", marginBottom: 12, fontWeight: "500" }}>
            {publisherName} • {languageName}
          </Text>

          {!isDownloaded && !isDownloading && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24 }}>
              <HardDrive size={14} color="#999" />
              <Text style={{ fontSize: 13, color: "#999", fontWeight: "500" }}>
                {sizeLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: 24, marginBottom: 32, gap: 12 }}>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              height: 52,
              borderRadius: 26,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#1a1a1a",
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
              opacity: isDownloading ? 0.8 : 1,
            }}
            onPress={() => {
              if (isDownloaded && !updateInfo?.hasUpdate) {
                handleSelectVersion(bible.id);
                if (router.dismissAll) {
                  router.dismissAll();
                } else {
                  router.navigate('/(tabs)/bible');
                }
              } else {
                handleDownload();
              }
            }}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator color="#FFF" style={{ marginRight: 8 }} />
            ) : isDownloaded && updateInfo?.hasUpdate ? (
              <RefreshCw size={20} color="#FFF" style={{ marginRight: 8 }} />
            ) : isDownloaded ? (
              null
            ) : (
              <CloudDownload size={20} color="#FFF" style={{ marginRight: 8 }} />
            )}
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
              {isDownloading
                ? updateInfo?.hasUpdate
                  ? "Updating..."
                  : "Downloading..."
                : isDownloaded && updateInfo?.hasUpdate
                ? "Update"
                : isDownloaded
                ? "Read in Bible"
                : "Download"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Details Section */}
        <View style={{ paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#1a1a1a", marginBottom: 16 }}>
            Details
          </Text>

          {displayBible.publisher?.url && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Globe2 size={20} color="#666" />
              <Text style={{ fontSize: 15, color: "#666", fontWeight: "500" }}>
                {displayBible.publisher.url}
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 14, color: "#555", lineHeight: 22 }}>
            {copyrightText}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
