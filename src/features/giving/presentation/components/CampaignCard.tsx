import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { GivingCampaign } from '../../domain/giving.types';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { useCachedImage } from '../../../files/presentation/hooks/useCachedImage';
import { SoftCard } from '@/components/ui/SoftCard';
import { BounceCard } from '@/components/ui/BounceCard';
import ShimmerSkeleton from '@/components/ui/ShimmerSkeleton';

interface CampaignCardProps {
  campaign: GivingCampaign;
  onPress: () => void;
}

export function CampaignCard({ campaign, onPress }: CampaignCardProps) {
  const progress = Math.min((campaign.raisedAmount / campaign.goalAmount) * 100, 100);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const { cachedUri } = useCachedImage(campaign.coverImageUrl, {
    id: campaign.id,
    churchId: campaign.churchId,
    visibility: 'public', // campaigns are public
  });
  
  return (
    <BounceCard onPress={onPress} activeOpacity={0.8} style={styles.container}>
      <SoftCard innerStyle={styles.cardInner}>
      <View style={styles.imageContainer}>
        {cachedUri ? (
          <>
            <Image 
              source={{ uri: cachedUri }} 
              style={[styles.coverImage, !imageLoaded && { position: 'absolute', opacity: 0 }]} 
              resizeMode="cover" 
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <ShimmerSkeleton width="100%" height="100%" borderRadius={12} />
            )}
          </>
        ) : (
          <LinearGradient
            colors={['#FF6596', '#FF8AAB']}
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
      </SoftCard>
    </BounceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  cardInner: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 14,
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
    marginBottom: 0,
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
    marginBottom: 0,
  },
  title: {
    fontSize: 15,
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
    marginTop: 0,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  progressContainer: {
    width: '100%',
  },
  progressTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
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
