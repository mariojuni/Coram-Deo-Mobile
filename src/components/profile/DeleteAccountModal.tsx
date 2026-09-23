import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AppModal from '@/components/ui/AppModal';
import { useAuthStore } from '@/store/useAuthStore';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteAccountModal({ isOpen, onClose, onSuccess }: DeleteAccountModalProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userProfile = useAuthStore((state) => state.userProfile);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setError('');
    }
  }, [isOpen]);

  if (!userProfile) return null;

  const requirePassword = userProfile.providers?.includes('password');

  const handleConfirm = async () => {
    setError('');
    
    if (requirePassword) {
      if (!input) {
        setError('Please enter your password.');
        return;
      }
    } else {
      if (!input || input.toLowerCase() !== userProfile.email?.toLowerCase()) {
        setError('Email address does not match.');
        return;
      }
    }

    setLoading(true);

    try {
      if (requirePassword) {
        // Re-authenticate using the password to ensure they have recent login
        await login(userProfile.email || userProfile.username || '', input);
      }
      
      // If validation succeeds, proceed with deletion
      await deleteAccount();
      onSuccess();
    } catch (err: any) {
      console.error('Delete account failed:', err);
      if (err?.code === 'auth/requires-recent-login' || err?.message?.includes('recent-login')) {
        onClose();
        Alert.alert(
          'Re-authentication Required',
          'For your security, please sign out and sign in again before deleting your account.'
        );
      } else {
        setError(err?.message || 'Failed to verify or delete account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="Delete Account" dynamicHeight avoidKeyboard>
      <View style={styles.container}>
        <Text style={styles.warningText}>
          Are you sure you want to permanently delete your account? This action cannot be undone and you will lose all your data.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            {requirePassword ? 'Enter your password to confirm:' : 'Enter your email address to confirm:'}
          </Text>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(text) => {
              setInput(text);
              setError('');
            }}
            placeholder={requirePassword ? 'Password' : userProfile.email || 'Email address'}
            secureTextEntry={!!requirePassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <TouchableOpacity 
          style={[styles.deleteButton, loading && styles.deleteButtonDisabled]} 
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  warningText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 8,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
