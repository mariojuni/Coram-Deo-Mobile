import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { GivingCampaign } from '../../domain/giving.types';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';

interface CampaignCardProps {
  campaign: GivingCampaign;
  onPress: () => void;
}

export function CampaignCard({ campaign, onPress }: CampaignCardProps) {
  const progress = Math.min((campaign.raisedAmount / campaign.goalAmount) * 100, 100);
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        {campaign.coverImageUrl ? (
          <Image source={{ uri: campaign.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <LinearGradient
            colors={['#FF6596', '#B66DFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverImagePlaceholder}
          />
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            {campaign.phaseLabel && (
              <Text style={styles.phaseLabel}>{campaign.phaseLabel.toUpperCase()}</Text>
            )}
            <Text style={styles.title} numberOfLines={1}>{campaign.title}</Text>
          </View>
          <View style={styles.chevronWrap}>
            <ChevronRight size={16} color="#FF6596" />
          </View>
        </View>
        
        <Text style={styles.description} numberOfLines={1}>{campaign.description}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressTextRow}>
            <Text style={styles.raisedText}>
              ₱{campaign.raisedAmount.toLocaleString()}
            </Text>
            <Text style={styles.goalText}>
              of ₱{campaign.goalAmount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <LinearGradient 
              colors={['#FF6596', '#FF8AAB']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0 }} 
              style={[styles.progressBarFill, { width: `${progress}%` }]} 
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  phaseLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6596',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  progressContainer: {
    width: '100%',
  },
  progressTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  raisedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6596',
  },
  goalText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginLeft: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
