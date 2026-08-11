import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import AppModal from './ui/AppModal';
import {
  AppEnvironment,
  BUILD_ENV,
  getAllowedEnvironments,
  getSavedEnvironment,
} from '../config/environments';

interface EnvironmentSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyEnv: (targetEnv: AppEnvironment) => Promise<void>;
  currentActiveEnv: AppEnvironment;
}

export default function EnvironmentSwitcherModal({
  isOpen,
  onClose,
  onApplyEnv,
  currentActiveEnv,
}: EnvironmentSwitcherModalProps) {
  const [selectedEnv, setSelectedEnv] = useState<AppEnvironment>(currentActiveEnv);
  const [isApplying, setIsApplying] = useState(false);
  const allowedEnvs = getAllowedEnvironments();

  useEffect(() => {
    if (isOpen) {
      getSavedEnvironment().then((env) => {
        setSelectedEnv(env);
      });
    }
  }, [isOpen]);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApplyEnv(selectedEnv);
      // If the app didn't restart (e.g. in Release mode), we need to reset the button state and close the modal
      setIsApplying(false);
      onClose();
    } catch (error) {
      console.error('Failed to apply environment change:', error);
      setIsApplying(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Environment Switcher"
      heightRatio={0.65}
      dynamicHeight={false}
    >
      <View style={styles.container}>
        {/* Info Badges */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Build Env:</Text>
            <Text style={styles.infoValue}>{BUILD_ENV.toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Active Firebase Env:</Text>
            <Text style={[styles.infoValue, { color: '#B66DFF' }]}>
              {currentActiveEnv.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Environment Selection Cards */}
        <Text style={styles.sectionTitle}>Select Target Environment</Text>
        <View style={styles.envList}>
          {allowedEnvs.map((env) => {
            const isSelected = selectedEnv === env;
            return (
              <TouchableOpacity
                key={env}
                style={[styles.envCard, isSelected && styles.envCardSelected]}
                onPress={() => setSelectedEnv(env)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <View style={styles.envCardContent}>
                  <Text style={[styles.envName, isSelected && styles.envNameSelected]}>
                    {env.toUpperCase()}
                  </Text>
                  <Text style={styles.envSubtext}>
                    {env === 'staging'
                      ? 'Connects to Staging Firebase (nazarenechurch-9c030)'
                      : 'Connects to Production Firebase (coramdeo-prod)'}
                  </Text>
                </View>
                {isSelected && <CheckCircle2 size={22} color="#B66DFF" />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Warning Banner */}
        <View style={styles.warningBox}>
          <AlertTriangle size={20} color="#D97706" style={{ marginTop: 2 }} />
          <Text style={styles.warningText}>
            Changing environment will sign you out and restart the app.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={isApplying}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.applyBtnWrapper}
            onPress={handleApply}
            disabled={isApplying}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#FF6596', '#B66DFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.applyBtn}
            >
              {isApplying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.applyBtnText}>Apply & Restart</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  envList: {
    gap: 10,
    marginBottom: 16,
  },
  envCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  envCardSelected: {
    borderColor: '#B66DFF',
    backgroundColor: '#F5EEFF',
  },
  envCardContent: {
    flex: 1,
    paddingRight: 12,
  },
  envName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 2,
  },
  envNameSelected: {
    color: '#7C3AED',
  },
  envSubtext: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
  applyBtnWrapper: {
    flex: 1.5,
  },
  applyBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
