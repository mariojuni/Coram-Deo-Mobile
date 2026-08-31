import React, { useState, useRef, useEffect } from "react";
import { BounceCard } from "@/components/ui/BounceCard";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  ChevronLeft,
  Upload,
  CheckCircle2,
  Copy,
  QrCode,
  X,
  Info,
  User,
  Users,
} from "lucide-react-native";
import { useAuthStore } from "../store/useAuthStore";
import { useMemberStore } from "../store/useMemberStore";
import { useGiving } from "../features/giving/presentation/hooks/useGiving";
import {
  submitGivingRecord,
  uploadProofOfPayment,
  generateGivingRecordId,
} from "../features/giving/data/giving.repository";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import {
  getSoftShadowStyle,
  getTopBarButtonShadowStyle,
} from "../components/ui/SoftCard";
import { AccessibleTextInput } from "../components/a11y/AccessibleTextInput";
import { AccessibleButton } from "../components/a11y/AccessibleButton";
import { PrimaryGradientButton } from "../components/ui/PrimaryGradientButton";

export default function GivingFormScreen() {
  const { campaignId, fundType, fundId } = useLocalSearchParams();
  const router = useRouter();
  const { userProfile, currentUser } = useAuthStore();
  const { members, households } = useMemberStore();
  const currentMember = members.find((m) => m.id === userProfile?.memberId);
  const foundHousehold = households?.find((h) => 
    (userProfile?.memberId && h.memberIds?.includes(userProfile.memberId)) || 
    (currentUser?.uid && h.memberIds?.includes(currentUser.uid))
  );
  const resolvedHouseholdId = userProfile?.householdId || currentMember?.householdId || foundHousehold?.id;
  
  const {
    funds = [],
    donationAccounts: rawAccounts,
    campaigns = [],
  } = useGiving();
  const donationAccounts = rawAccounts || [];
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState("");
  const [selectedFundId, setSelectedFundId] = useState("");

  const initialPreselected = Boolean(fundId || campaignId || fundType);
  const [isPreselectedFund, setIsPreselectedFund] =
    useState(initialPreselected);

  const [giverType, setGiverType] = useState<"individual" | "household">(
    resolvedHouseholdId ? "household" : "individual"
  );
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [hasSentDonation, setHasSentDonation] = useState(false);
  const [showQRForAccount, setShowQRForAccount] = useState<any>(null);

  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [proofUri, setProofUri] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [15, 45],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (fundId && funds.some((f: any) => f.id === fundId)) {
      setSelectedFundId(fundId as string);
    } else if (campaignId && campaigns.length > 0 && !selectedFundId) {
      const campaign = campaigns.find((c: any) => c.id === campaignId);
      if (campaign && funds.some((f: any) => f.id === campaign.fundId)) {
        setSelectedFundId(campaign.fundId);
      }
    } else if (fundType && funds.length > 0 && !selectedFundId) {
      const fund = funds.find(
        (f: any) =>
          f.type === fundType ||
          f.name.toLowerCase() === (fundType as string).toLowerCase()
      );
      if (fund) {
        setSelectedFundId(fund.id);
      }
    }
  }, [fundId, fundType, campaignId, funds, campaigns]);

  useEffect(() => {
    if (donationAccounts.length > 0 && !selectedAccountId) {
      const primary =
        donationAccounts.find((a) => a.isPrimary) || donationAccounts[0];
      setSelectedAccountId(primary.id);
    }
  }, [donationAccounts, selectedAccountId]);

  const churchId = userProfile?.churchId;
  const userId = currentUser?.uid;

  const hasVerificationEvidence =
    referenceNumber.trim().length > 0 || proofUri != null;

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.1,
      });

      if (!result.canceled && result.assets[0]) {
        setProofUri(result.assets[0].uri);
      }
    } catch (error) {
      console.warn("Image picker error:", error);
      Alert.alert(
        "Error",
        "Image picker is not available or failed to load. You may need to restart the Expo Go app."
      );
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", `${label} copied to clipboard.`);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!churchId || !userId) {
      Alert.alert("Error", "Missing church or user information.");
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Validation Error", "Please enter a valid amount.");
      return;
    }

    if (!selectedFundId) {
      Alert.alert("Validation Error", "Please select a giving fund.");
      return;
    }

    if (!selectedAccountId) {
      Alert.alert(
        "Validation Error",
        "Please select a bank account to transfer to."
      );
      return;
    }

    if (!hasVerificationEvidence) {
      Alert.alert(
        "Validation Error",
        "Please provide the bank reference number or upload a receipt so the Finance team can verify your donation."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const recordId = generateGivingRecordId();
      let uploadedProofUrl = "";
      if (proofUri) {
        uploadedProofUrl = await uploadProofOfPayment(
          churchId,
          recordId,
          proofUri
        );
      }

      const account = donationAccounts.find((a) => a.id === selectedAccountId);

      await submitGivingRecord(
        {
          churchId,
          userId,
          householdId:
            giverType === "household" && resolvedHouseholdId
              ? resolvedHouseholdId
              : undefined,
          giverEntityType: giverType,
          fundId: selectedFundId,
          campaignId: (campaignId as string) || undefined,
          amount: Number(amount),
          currency: "PHP",
          method: "bank_transfer",
          paymentAccountId: selectedAccountId,
          paymentAccountSnapshot: account
            ? {
                bankName: account.bankName,
                accountName: account.accountName,
                accountNumberLast4: account.accountNumber.slice(-4),
              }
            : undefined,
          bankTransactionReference: referenceNumber.trim(),
          referenceNumber: referenceNumber.trim(),
          proofUrl: uploadedProofUrl,
          notes: note,
        },
        recordId
      );

      setIsSuccess(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit giving record.");
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient
          colors={["#FDF2F8", "#FFF"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ alignItems: "center" }}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 size={64} color="#22C55E" />
          </View>
          <Text style={styles.successTitle}>Donation Submitted</Text>
          <Text style={styles.successText}>
            Thank you for your generosity.{"\n"}Your donation has been submitted
            to our Finance team for verification.
          </Text>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeLabel}>Status</Text>
            <Text style={styles.statusBadgeValue}>Pending Verification</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.doneBtn}
            onPress={() => router.replace("/my-giving?fromSuccess=true")}
          >
            <LinearGradient
              colors={["#FF6596", "#C084FC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 32 }]}
            />
            <Text style={styles.doneBtnText}>View Giving History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginTop: 20 }}
            onPress={() => router.replace("/giving")}
          >
            <Text style={{ color: "#6B7280", fontSize: 16, fontWeight: "600" }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selectedCampaign = campaigns.find((c: any) => c.id === campaignId);
  const isCampaignInactive = Boolean(campaignId && !selectedCampaign);
  const selectedFundObj = funds.find((f: any) => f.id === selectedFundId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient
        colors={["#FAFAFA", "#FAFAFA"]}
        style={StyleSheet.absoluteFill}
      />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(0,0,0,0.05)",
            },
          ]}
        />
        <View style={styles.headerContent}>
          <BounceCard
            bounceScale={0.85}
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2} />
          </BounceCard>
          <Animated.Text
            style={[styles.headerTitleCenter, { opacity: headerTitleOpacity }]}
          >
            Give
          </Animated.Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 24) + 76,
          paddingBottom: insets.bottom + 140,
        }}
      >
        {selectedCampaign && (
          <View style={styles.campaignInfo}>
            <LinearGradient
              colors={["#FFF0F5", "#FFE8F1"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <Text style={styles.campaignInfoLabel}>GIVING TO PROJECT</Text>
            <Text style={styles.campaignInfoTitle}>
              {selectedCampaign.title}
            </Text>
          </View>
        )}

        {isCampaignInactive && (
          <View
            style={[
              styles.campaignInfo,
              { borderColor: "#FECACA", shadowColor: "#EF4444" },
            ]}
          >
            <LinearGradient
              colors={["#FEF2F2", "#FEE2E2"]}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <Text style={[styles.campaignInfoLabel, { color: "#EF4444" }]}>
              CAMPAIGN UNAVAILABLE
            </Text>
            <Text style={styles.campaignInfoTitle}>
              This campaign is paused or has ended.
            </Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencySymbol}>₱</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="number-pad"
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              value={amount}
              onChangeText={setAmount}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="none"
              accessibilityLabel="Donation Amount in PHP"
            />
          </View>
        </View>

        {resolvedHouseholdId ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Give As</Text>
            <View style={styles.giverTypeContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.giverTypeBtn,
                  giverType === "household" && styles.giverTypeBtnActive,
                ]}
                onPress={() => setGiverType("household")}
                accessibilityLabel="Give as Household"
              >

                <Users
                  size={18}
                  color={giverType === "household" ? "#FFF" : "#6B7280"}
                />
                <Text
                  style={[
                    styles.giverTypeBtnText,
                    giverType === "household" && styles.giverTypeBtnTextActive,
                  ]}
                >
                  Household
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.giverTypeBtn,
                  giverType === "individual" && styles.giverTypeBtnActive,
                ]}
                onPress={() => setGiverType("individual")}
                accessibilityLabel="Give as Individual"
              >

                <User
                  size={18}
                  color={giverType === "individual" ? "#FFF" : "#6B7280"}
                />
                <Text
                  style={[
                    styles.giverTypeBtnText,
                    giverType === "individual" && styles.giverTypeBtnTextActive,
                  ]}
                >
                  Individual
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Giving To</Text>
          {isPreselectedFund && selectedFundObj ? (
            <View style={styles.preselectedFundBox}>
              <Text style={styles.preselectedFundName}>
                {selectedFundObj.name}
              </Text>
              <TouchableOpacity
                onPress={() => setIsPreselectedFund(false)}
                accessibilityLabel="Change Fund"
              >
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.horizontalScroll}
            >
              {funds
                .filter(
                  (f: any) =>
                    f.visibility !== "admin_only" &&
                    f.visibility !== "finance_only"
                )
                .map((fund: any) => {
                  const isActive = selectedFundId === fund.id;
                  return (
                    <TouchableOpacity
                      key={fund.id}
                      activeOpacity={0.8}
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => setSelectedFundId(fund.id)}
                      accessibilityLabel={`Select fund ${fund.name}`}
                    >
                      {isActive && (
                        <LinearGradient
                          colors={["#FF6596", "#FF8AAB"]}
                          style={[
                            StyleSheet.absoluteFill,
                            { borderRadius: 24 },
                          ]}
                        />
                      )}
                      <Text
                        style={[
                          styles.pillText,
                          isActive && styles.pillTextActive,
                        ]}
                      >
                        {fund.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bank Transfer</Text>

          {donationAccounts.length === 0 ? (
            <View style={styles.noBankBox}>
              <Info size={24} color="#6B7280" />
              <Text style={styles.noBankTitle}>Bank Giving Unavailable</Text>
              <Text style={styles.noBankText}>
                The church has not configured a bank account for online giving
                yet. Please contact the church for giving instructions.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.instructionsText}>Send your donation to</Text>

              {donationAccounts.map((account) => {
                const isSelected = selectedAccountId === account.id;
                return (
                  <TouchableOpacity
                    key={account.id}
                    activeOpacity={0.9}
                    onPress={() => setSelectedAccountId(account.id)}
                    style={[
                      styles.bankCard,
                      isSelected && styles.bankCardSelected,
                    ]}
                    accessibilityLabel={`${account.bankName}, ${
                      account.accountName
                    }, account ending ${account.accountNumber.slice(-4)}`}
                  >
                    <View style={styles.bankCardHeader}>
                      {isSelected ? (
                        <CheckCircle2 size={20} color="#FF6596" />
                      ) : (
                        <View style={styles.unselectedRadio} />
                      )}
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        {account.isPrimary && (
                          <Text style={styles.primaryBadge}>
                            PRIMARY ACCOUNT
                          </Text>
                        )}
                        <Text style={styles.bankName}>{account.bankName}</Text>
                        <Text style={styles.accountName}>
                          {account.accountName}
                        </Text>
                      </View>
                    </View>

                    {isSelected && (
                      <View style={styles.bankCardDetails}>
                        <View style={styles.divider} />

                        <Text style={styles.accountNumberLabel}>
                          Account Number
                        </Text>
                        <View style={styles.accountNumberRow}>
                          <Text style={styles.accountNumber}>
                            {account.accountNumber}
                          </Text>
                          <TouchableOpacity
                            style={styles.copyBtn}
                            onPress={() =>
                              copyToClipboard(
                                account.accountNumber,
                                account.bankName
                              )
                            }
                            accessibilityLabel={`Copy ${account.bankName} account number`}
                          >
                            <Copy size={16} color="#4B5563" />
                            <Text style={styles.copyBtnText}>Copy</Text>
                          </TouchableOpacity>
                        </View>

                        {account.qrImagePath ? (
                          <TouchableOpacity
                            style={styles.qrBtn}
                            onPress={() => setShowQRForAccount(account)}
                            accessibilityLabel={`View Official QR for ${account.bankName}`}
                          >
                            <QrCode size={18} color="#FF6596" />
                            <Text style={styles.qrBtnText}>
                              View Official QR
                            </Text>
                          </TouchableOpacity>
                        ) : null}

                        {account.instructions ? (
                          <Text style={styles.bankInstructions}>
                            {account.instructions}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.disclaimerText}>
                Transfer your donation using your preferred banking or e-wallet
                application. The transfer happens outside this app. After
                completing the transfer, return here to submit your details for
                verification.
              </Text>

              {!hasSentDonation && (
                <AccessibleButton
                  style={styles.sentDonationBtn}
                  onPress={() => setHasSentDonation(true)}
                  accessibilityLabel="Report completed bank transfer"
                >
                  <Text style={styles.sentDonationBtnText}>
                    I Have Sent My Donation
                  </Text>
                </AccessibleButton>
              )}
            </View>
          )}
        </View>

        {hasSentDonation && (
          <View style={styles.transferDetailsBox}>
            <Text style={styles.sectionTitle}>Transfer Details</Text>
            <Text style={styles.sectionSubtitle}>
              Help us verify your donation
            </Text>

            <View style={styles.formGroup}>
              <AccessibleTextInput
                label="Bank Reference Number (Optional)"
                style={styles.textInput}
                placeholder="e.g. 123456789"
                placeholderTextColor="#9CA3AF"
                value={referenceNumber}
                onChangeText={setReferenceNumber}
                autoCorrect={false}
                spellCheck={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Proof of Transfer (Optional)</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.uploadBtn}
                onPress={pickImage}
              >
                <LinearGradient
                  colors={["rgba(255,101,150,0.05)", "rgba(255,101,150,0.02)"]}
                  style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                />
                {proofUri ? (
                  <CheckCircle2 size={24} color="#FF6596" />
                ) : (
                  <Upload size={24} color="#FF6596" />
                )}
                <Text
                  style={[
                    styles.uploadBtnText,
                    proofUri && { color: "#FF6596", fontWeight: "700" },
                  ]}
                >
                  {proofUri
                    ? "Receipt Selected (Tap to change)"
                    : "Upload Receipt / Screenshot"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <AccessibleTextInput
                label="Note (Optional)"
                style={[styles.textInput, styles.textArea]}
                placeholder="Add a message..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={note}
                onChangeText={setNote}
                autoCorrect={false}
                spellCheck={false}
              />
            </View>
          </View>
        )}
      </Animated.ScrollView>

      {hasSentDonation && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + 16, 32) },
          ]}
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderTopWidth: 1,
                borderTopColor: "rgba(0,0,0,0.05)",
              },
            ]}
            pointerEvents="none"
          />

          <PrimaryGradientButton
            title={isCampaignInactive ? "Campaign Ended" : "Submit Giving"}
            onPress={handleSubmit}
            disabled={isCampaignInactive}
            loading={isSubmitting}
          />
        </View>
      )}

      {/* QR Code Viewer Modal */}
      <Modal
        visible={!!showQRForAccount}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRForAccount(null)}
      >
        {showQRForAccount && (
          <View style={styles.modalOverlay}>
            <View style={styles.qrModalContainer}>
              <TouchableOpacity
                style={styles.qrCloseBtn}
                onPress={() => setShowQRForAccount(null)}
              >
                <X size={24} color="#4B5563" />
              </TouchableOpacity>

              <Text style={styles.qrBankName}>{showQRForAccount.bankName}</Text>
              <Text style={styles.qrAccountName}>
                {showQRForAccount.accountName}
              </Text>

              <View style={styles.qrImageWrap}>
                <Image
                  source={{ uri: showQRForAccount.qrImagePath }}
                  style={styles.qrImage}
                  resizeMode="contain"
                  accessibilityLabel={`Official receiving QR for ${showQRForAccount.bankName}`}
                />
              </View>

              <Text style={styles.qrAccountNumberLabel}>Account Number</Text>
              <Text style={styles.qrAccountNumber}>
                {showQRForAccount.accountNumber}
              </Text>

              <TouchableOpacity
                style={styles.qrCopyBtn}
                onPress={() =>
                  copyToClipboard(
                    showQRForAccount.accountNumber,
                    showQRForAccount.bankName
                  )
                }
              >
                <Copy size={16} color="#FF6596" />
                <Text style={styles.qrCopyBtnText}>Copy Account Number</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    paddingBottom: 14,
    marginTop: 8,
  },
  headerTitleCenter: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    flex: 1,
  },
  backBtn: {
    ...getTopBarButtonShadowStyle(20),
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, paddingHorizontal: 24 },

  campaignInfo: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    shadowColor: "#FF6596",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  campaignInfoLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF6596",
    letterSpacing: 1,
    marginBottom: 6,
  },
  campaignInfoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },

  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
    marginLeft: 4,
  },
  amountInputWrap: {
    ...getSoftShadowStyle(20),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: "#fff",
    borderRadius: 16,
  },
  currencySymbol: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1a1a1a",
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    height: "100%",
    paddingVertical: 0,
  },
  giverTypeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  giverTypeBtn: {
    ...getSoftShadowStyle(24),
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    overflow: "hidden",
  },
  giverTypeBtnActive: {
    backgroundColor: "#FF759E",
    borderColor: "transparent",
    shadowColor: "#FF759E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    boxShadow: "0px 4px 14px rgba(255, 117, 158, 0.25)",
  },
  giverTypeBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
  },
  giverTypeBtnTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  preselectedFundBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  preselectedFundName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  changeBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FF6596",
  },
  horizontalScroll: {
    flexDirection: "row",
    overflow: "visible",
  },
  pill: {
    ...getSoftShadowStyle(24),
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginRight: 12,
  },
  pillActive: {
    borderColor: "transparent",
    shadowColor: "#FF6596",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  pillText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
  },
  pillTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  instructionsText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    marginLeft: 4,
  },
  noBankBox: {
    padding: 24,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    alignItems: "center",
  },
  noBankTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
    marginBottom: 8,
  },
  noBankText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  bankCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  bankCardSelected: {
    borderColor: "#FF6596",
    backgroundColor: "#FFF0F5",
  },
  bankCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  unselectedRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
  },
  primaryBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FF6596",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bankName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  accountName: {
    fontSize: 14,
    color: "#4B5563",
  },
  bankCardDetails: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginBottom: 16,
  },
  accountNumberLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  accountNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  accountNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  qrBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,101,150,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  qrBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6596",
  },
  bankInstructions: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginTop: 4,
  },
  disclaimerText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  sentDonationBtn: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  sentDonationBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  transferDetailsBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    marginTop: 4,
  },
  textInput: {
    ...(getSoftShadowStyle(16) as any),
    fontSize: 16,
    color: "#1a1a1a",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,101,150,0.3)",
    borderStyle: "dashed",
    backgroundColor: "#fff",
  },
  uploadBtnText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  submitBtnWrap: {
    width: "100%",
    borderRadius: 32,
    overflow: "hidden",
  },
  submitBtnGradient: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  statusBadge: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 40,
  },
  statusBadgeLabel: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusBadgeValue: {
    fontSize: 15,
    color: "#92400E",
    fontWeight: "800",
  },
  doneBtn: {
    paddingHorizontal: 40,
    height: 56,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6596",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    width: "100%",
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalContainer: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  qrCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
  },
  qrBankName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a1a",
    marginTop: 8,
  },
  qrAccountName: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 24,
  },
  qrImageWrap: {
    width: 240,
    height: 240,
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  qrImage: {
    width: 220,
    height: 220,
  },
  qrAccountNumberLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  qrAccountNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: 1,
    marginBottom: 24,
  },
  qrCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,101,150,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: "100%",
    justifyContent: "center",
  },
  qrCopyBtnText: {
    color: "#FF6596",
    fontSize: 16,
    fontWeight: "700",
  },
});
