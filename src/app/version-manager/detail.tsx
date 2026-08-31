import { saveVersion, redownloadVersion } from "@/features/bible/data/bible.repository";
import { bibleDataService } from "@/features/bible/data/BibleDataService";
import { BounceCard } from "@/components/ui/BounceCard";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle,
  ChevronLeft,
  Globe2,
  HardDrive,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";

const CustomCloudDownload = ({ size = 24, color = "#FFF", style }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path fillRule="evenodd" clipRule="evenodd" d="M7.5972 5.93261C8.49457 4.74647 9.9306 3.7979 12 3.7979C14.0694 3.7979 15.5054 4.74647 16.4028 5.93261C17.0817 6.83002 17.4565 7.86576 17.5901 8.73983C18.6302 8.87036 19.5832 9.29671 20.3196 10.0021C21.2224 10.8669 21.75 12.1038 21.75 13.5868C21.75 15.5713 20.5685 17.2785 18.8724 18.0445C18.4948 18.215 18.0506 18.0472 17.8801 17.6697C17.7097 17.2921 17.8775 16.8479 18.255 16.6774C19.433 16.1455 20.25 14.961 20.25 13.5868C20.25 12.4739 19.8625 11.6413 19.282 11.0853C18.696 10.5241 17.8634 10.1972 16.8967 10.1968C16.4826 10.1966 16.147 9.8609 16.147 9.44681C16.147 8.78795 15.8767 7.72337 15.2066 6.83762C14.5596 5.98245 13.5471 5.2979 12 5.2979C10.4529 5.2979 9.4404 5.98245 8.79342 6.83762C8.1233 7.72337 7.85303 8.78795 7.85303 9.44681C7.85303 9.85852 7.52115 10.1933 7.10946 10.1968C6.13987 10.2051 5.30495 10.5332 4.71806 11.0932C4.13756 11.6472 3.75 12.4749 3.75 13.5868C3.75 14.961 4.56699 16.1455 5.745 16.6774C6.12251 16.8479 6.29034 17.2921 6.11986 17.6697C5.94938 18.0472 5.50515 18.215 5.12765 18.0445C3.4315 17.2785 2.25 15.5713 2.25 13.5868C2.25 12.1029 2.77898 10.8703 3.68251 10.0081C4.41942 9.30484 5.37188 8.87971 6.40925 8.74411C6.54225 7.86914 6.91715 6.83148 7.5972 5.93261Z" fill={color}></Path>
    <Path fillRule="evenodd" clipRule="evenodd" d="M12 11.707C12.4142 11.707 12.75 12.0428 12.75 12.457L12.7503 19.4515C12.7504 19.8657 12.4146 20.2015 12.0004 20.2016C11.5862 20.2016 11.2504 19.8658 11.2503 19.4516L11.25 12.4571C11.25 12.0429 11.5858 11.7071 12 11.707Z" fill={color}></Path>
    <Path fillRule="evenodd" clipRule="evenodd" d="M8.69819 16.1494C8.99108 15.8565 9.46595 15.8565 9.75885 16.1494L11.9995 18.3901L14.2402 16.1494C14.5331 15.8565 15.008 15.8565 15.3009 16.1494C15.5938 16.4423 15.5938 16.9171 15.3009 17.21L12.5299 19.981C12.237 20.2739 11.7621 20.2739 11.4692 19.981L8.69819 17.21C8.40529 16.9171 8.40529 16.4423 8.69819 16.1494Z" fill={color}></Path>
  </Svg>
);
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
import { styles } from "@/features/bible/presentation/version-manager/styles";

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

  const localBible = savedVersions.find((v: any) => String(v.id) === String(bible?.id));
  const localVersion: number = Number(localBible?._localContentVersion ?? 0);

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
        await saveVersion({
          ...bible,
          _localContentVersion: updateInfo?.remoteVersion ?? bible.contentVersion ?? 1,
        });
        await refreshSavedVersions();
        if (updateInfo) {
          setUpdateInfo({ ...updateInfo, hasUpdate: false });
        }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }} edges={["bottom"]}>
      {/* Top Navigation */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 21, paddingBottom: 16 }}>
        <BounceCard
          bounceScale={0.85}
          onPress={() => router.back()}
          style={styles.headerCircle}
        >
          <ChevronLeft size={24} color="#111827" strokeWidth={2} />
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

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 24 }}>
            <HardDrive size={14} color="#999" />
            <Text style={{ fontSize: 13, color: "#999", fontWeight: "500" }}>
              {sizeLabel}
            </Text>
          </View>
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
              <CustomCloudDownload size={20} color="#FFF" style={{ marginRight: 8 }} />
            ) : isDownloaded ? (
              null
            ) : (
              <CustomCloudDownload size={20} color="#FFF" style={{ marginRight: 8 }} />
            )}
            <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>
              {isDownloading
                ? isDownloaded && updateInfo?.hasUpdate
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
