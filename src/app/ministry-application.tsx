import { useAuthStore } from '@/store/useAuthStore';
import { BounceCard } from '@/components/ui/BounceCard';
import { useMinistryApplicationStore } from '@/store/useMinistryApplicationStore';
import { useMinistryStore } from '@/store/useMinistryStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MinistryApplicationScreen() {
  const { ministryId } = useLocalSearchParams<{ ministryId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const userProfile = useAuthStore((s) => s.userProfile);
  const currentUser = useAuthStore((s) => s.currentUser);
  const ministry = useMinistryStore((s) => s.ministries.find((m) => m.id === ministryId));
  const { submitApplication, myApplications } = useMinistryApplicationStore();

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [reasonForJoining, setReasonForJoining] = useState('');
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const churchId = userProfile?.churchId ?? null;
  // super_admin accounts may not have memberId set; fall back to auth UID
  const memberId = userProfile?.memberId ?? currentUser?.uid ?? null;
  const userId = userProfile?.uid ?? null;

  // Guard: check for duplicate pending application
  const hasPending = myApplications.some(
    (a) =>
      a.ministryId === ministryId &&
      a.churchId === churchId &&
      a.status === 'pending'
  );

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async () => {
    if (!churchId || !memberId || !userId || !ministryId || !ministry) {
      Alert.alert('Error', 'Your account is not fully set up. Please contact your church admin.');
      return;
    }

    if (hasPending) {
      Alert.alert('Already Applied', 'You already have a pending application for this ministry.');
      return;
    }

    if (!reasonForJoining.trim()) {
      Alert.alert('Required', 'Please share your reason for joining.');
      return;
    }
    if (!availability.trim()) {
      Alert.alert('Required', 'Please enter your availability.');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await submitApplication({
        churchId,
        ministryId,
        ministryName: ministry.name,
        memberId,
        userId,
        preferredRoleIds: selectedRoles,
        preferredRoleNames: selectedRoles,
        reasonForJoining: reasonForJoining.trim(),
        experience: experience.trim(),
        availability: availability.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
        status: 'pending',
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit application', err);
      Alert.alert('Error', 'Failed to submit your application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#FFE8F1', '#F5F2FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Check size={36} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Application Submitted!</Text>
          <Text style={styles.successBody}>
            Your ministry application has been submitted.{'\n'}The ministry leader will review it shortly.
          </Text>
          <BounceCard bounceScale={0.85} style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </BounceCard>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient
        colors={['#FFE8F1', '#F5F2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}
      >
        <BounceCard bounceScale={0.85} style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#1a1a1a" />
        </BounceCard>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Apply to Join</Text>
          {ministry ? (
            <Text style={styles.headerSubtitle}>{ministry.name}</Text>
          ) : null}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Preferred Roles */}
        {ministry?.roles && ministry.roles.length > 0 ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Preferred Role</Text>
            <Text style={styles.hint}>Select one or more roles you&apos;d like to serve in.</Text>
            <View style={styles.rolesWrap}>
              {ministry.roles.map((role, i) => {
                const roleLabel = typeof role === 'string' ? role : (role as any)?.name ?? String(role);
                const selected = selectedRoles.includes(roleLabel);
                return (
                  <TouchableOpacity
                    key={roleLabel || i}
                    onPress={() => toggleRole(roleLabel)}
                    style={[styles.roleChip, selected && styles.roleChipSelected]}
                    activeOpacity={0.75}
                  >
                    {selected ? (
                      <Check size={12} color="#fff" style={{ marginRight: 4 }} />
                    ) : null}
                    <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>
                      {roleLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Reason for Joining */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Reason for Joining <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.textArea]}
            placeholder="Why do you want to serve in this ministry?"
            placeholderTextColor="#B0B3C0"
            value={reasonForJoining}
            onChangeText={setReasonForJoining}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Experience / Skills */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Experience & Skills</Text>
          <TextInput
            style={[styles.textArea]}
            placeholder="Share any relevant experience or skills."
            placeholderTextColor="#B0B3C0"
            value={experience}
            onChangeText={setExperience}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Availability */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Availability <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sunday mornings, weekday evenings"
            placeholderTextColor="#B0B3C0"
            value={availability}
            onChangeText={setAvailability}
          />
        </View>

        {/* Optional Note */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Additional Note <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.textArea]}
            placeholder="Anything else you'd like the ministry leader to know."
            placeholderTextColor="#B0B3C0"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={submitting ? ['#D1D5DB', '#D1D5DB'] : ['#FF6596', '#B66DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitGradient}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Application</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FC' },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { gap: 2 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  form: {
    padding: 24,
    gap: 20,
  },
  fieldGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  required: { color: '#EF4444' },
  optional: { color: '#9CA3AF', fontWeight: '400' },

  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 90,
  },

  rolesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  roleChipSelected: {
    backgroundColor: '#FF6596',
    borderColor: '#FF6596',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  roleChipTextSelected: {
    color: '#fff',
  },

  submitBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },

  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6596',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 8,
  },
  successBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  doneBtn: {
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 16,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
