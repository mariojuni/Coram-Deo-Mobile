import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronLeft, Upload, CheckCircle2, ChevronDown } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useGiving } from '@/features/giving/presentation/hooks/useGiving';
import { submitGivingRecord, uploadProofOfPayment } from '@/features/giving/data/giving.repository';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// ImagePicker imported dynamically to prevent native module crashes on startup

export default function GivingFormScreen() {
  const { campaignId, fundType } = useLocalSearchParams();
  const router = useRouter();
  const { userProfile, currentUser } = useAuthStore();
  const { funds, paymentMethods, campaigns } = useGiving();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [amount, setAmount] = useState('');
  const [selectedFundId, setSelectedFundId] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [note, setNote] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (fundType && funds.length > 0 && !selectedFundId) {
      const fund = funds.find(f => f.type === fundType || f.name.toLowerCase() === (fundType as string).toLowerCase());
      if (fund) {
        setSelectedFundId(fund.id);
      }
    }
  }, [fundType, funds]);

  const churchId = userProfile?.churchId;
  const userId = currentUser?.uid;

  const requiresProof = ['gcash', 'maya', 'bank_transfer'].includes(
    paymentMethods.find(m => m.id === selectedPaymentMethod)?.type || ''
  );

  const pickImage = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.1,
      });

      if (!result.canceled && result.assets[0]) {
        setProofUri(result.assets[0].uri);
      }
    } catch (error) {
      console.warn('Image picker error:', error);
      Alert.alert('Error', 'Image picker is not available or failed to load. You may need to restart the Expo Go app.');
    }
  };

  const isDebouncing = useRef(false);
  const withDebounce = (callback: Function, delay: number = 1000) => {
    return (...args: any[]) => {
      if (isDebouncing.current) return;
      isDebouncing.current = true;
      callback(...args);
      setTimeout(() => {
        isDebouncing.current = false;
      }, delay);
    };
  };

  const handlePickImageDebounced = withDebounce(pickImage);

  const handleSubmit = async () => {
    if (!churchId || !userId) {
      Alert.alert('Error', 'Missing church or user information.');
      return;
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }
    
    if (!selectedFundId) {
      Alert.alert('Validation Error', 'Please select a giving fund.');
      return;
    }
    
    if (!selectedPaymentMethod) {
      Alert.alert('Validation Error', 'Please select a payment method.');
      return;
    }

    if (requiresProof && !proofUri) {
      Alert.alert('Validation Error', 'Proof of payment is required for this payment method.');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedProofUrl = '';
      if (proofUri) {
        uploadedProofUrl = await uploadProofOfPayment(churchId, userId, proofUri);
      }

      const method = paymentMethods.find(m => m.id === selectedPaymentMethod);

      await submitGivingRecord({
        churchId,
        userId,
        memberId: userProfile?.memberId || undefined,
        fundId: selectedFundId,
        campaignId: (campaignId as string) || undefined,
        amount: Number(amount),
        currency: 'PHP',
        paymentMethod: method?.type || 'other',
        referenceNumber,
        proofOfPaymentUrl: uploadedProofUrl,
        note,
      });
      
      setIsSuccess(true);
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: true })
      ]).start();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit giving record.');
      setIsSubmitting(false);
    }
  };

  const handleSubmitDebounced = withDebounce(handleSubmit, 2000);

  if (isSuccess) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={['#FDF2F8', '#FFF']} style={StyleSheet.absoluteFill} />
        <Animated.View style={{ opacity: successOpacity, transform: [{ scale: successScale }], alignItems: 'center' }}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 size={64} color="#22C55E" />
          </View>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successText}>
            Thank you for your generosity. Your giving submission is now pending verification.
          </Text>
          <TouchableOpacity activeOpacity={0.8} style={styles.doneBtn} onPress={withDebounce(() => router.replace('/my-giving?fromSuccess=true'))}>
            <LinearGradient colors={['#FF6596', '#FF8AAB']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
            <Text style={styles.doneBtnText}>View My Giving</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  const selectedCampaign = campaigns.find(c => c.id === campaignId);
  const isCampaignInactive = Boolean(campaignId && !selectedCampaign);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FAFAFA', '#FAFAFA']} style={StyleSheet.absoluteFill} />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 16, position: 'absolute', width: '100%', zIndex: 10 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.5)' }]} />
        </Animated.View>
        <TouchableOpacity style={styles.backBtn} onPress={withDebounce(() => router.back())}>
          <ChevronLeft size={24} color="#1a1a1a" />
          <Text style={styles.headerTitle}>Make a Gift</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + 80, paddingBottom: 100 }}
      >
        {selectedCampaign && (
          <View style={styles.campaignInfo}>
            <LinearGradient colors={['#FFF0F5', '#FFE8F1']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
            <Text style={styles.campaignInfoLabel}>GIVING TO PROJECT</Text>
            <Text style={styles.campaignInfoTitle}>{selectedCampaign.title}</Text>
          </View>
        )}
        
        {isCampaignInactive && (
          <View style={[styles.campaignInfo, { borderColor: '#FECACA', shadowColor: '#EF4444' }]}>
            <LinearGradient colors={['#FEF2F2', '#FEE2E2']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
            <Text style={[styles.campaignInfoLabel, { color: '#EF4444' }]}>CAMPAIGN UNAVAILABLE</Text>
            <Text style={styles.campaignInfoTitle}>This campaign is paused or has ended.</Text>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Amount (₱)</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencySymbol}>₱</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Fund</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {funds.map((fund) => {
              const isActive = selectedFundId === fund.id;
              return (
                <TouchableOpacity
                  key={fund.id}
                  activeOpacity={0.8}
                  style={[styles.pill, isActive && styles.pillActive]}
                  onPress={() => setSelectedFundId(fund.id)}
                >
                  {isActive && <LinearGradient colors={['#FF6596', '#FF8AAB']} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />}
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {fund.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Payment Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {paymentMethods.map((method) => {
              const isActive = selectedPaymentMethod === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  activeOpacity={0.8}
                  style={[styles.pill, isActive && styles.pillActive]}
                  onPress={() => setSelectedPaymentMethod(method.id)}
                >
                  {isActive && <LinearGradient colors={['#FF6596', '#FF8AAB']} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />}
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {method.displayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Reference Number (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 123456789"
            placeholderTextColor="#9CA3AF"
            value={referenceNumber}
            onChangeText={setReferenceNumber}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Proof of Payment {requiresProof && <Text style={{ color: '#EF4444' }}>*</Text>}
          </Text>
          <TouchableOpacity activeOpacity={0.8} style={styles.uploadBtn} onPress={handlePickImageDebounced}>
            <LinearGradient colors={['rgba(255,101,150,0.05)', 'rgba(255,101,150,0.02)']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
            {proofUri ? (
              <CheckCircle2 size={24} color="#FF6596" />
            ) : (
              <Upload size={24} color="#FF6596" />
            )}
            <Text style={[styles.uploadBtnText, proofUri && { color: '#FF6596', fontWeight: '700' }]}>
              {proofUri ? 'Image Selected (Tap to change)' : 'Upload Receipt/Screenshot'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Add a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
          />
        </View>
      </Animated.ScrollView>

      <BlurView intensity={80} tint="light" style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.submitBtnWrap, (isSubmitting || isCampaignInactive) && styles.submitBtnDisabled]} 
          onPress={handleSubmitDebounced}
          disabled={isSubmitting || isCampaignInactive}
        >
          <LinearGradient colors={isCampaignInactive ? ['#D1D5DB', '#9CA3AF'] : ['#FF6596', '#FF8AAB']} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>{isCampaignInactive ? 'Campaign Ended' : 'Submit Giving'}</Text>
          )}
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
  },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingRight: 16,
    paddingLeft: 4,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginLeft: 4 },
  content: { flex: 1, paddingHorizontal: 24 },
  
  campaignInfo: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  campaignInfoLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 1,
    marginBottom: 6,
  },
  campaignInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  formGroup: {
    marginBottom: 28,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
    marginLeft: 4,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '800',
    color: '#1a1a1a',
    paddingVertical: 20,
  },
  textInput: {
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  horizontalScroll: {
    flexDirection: 'row',
    overflow: 'visible',
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  pillActive: {
    borderColor: 'transparent',
    shadowColor: '#FF6596',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,101,150,0.3)',
    borderStyle: 'dashed',
    backgroundColor: '#fff',
  },
  uploadBtnText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.5)',
  },
  submitBtnWrap: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  doneBtn: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
