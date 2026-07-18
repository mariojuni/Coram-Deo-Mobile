import { getFabMenuItems } from '@/features/navigation/presentation/fabMenuItems';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { HandHeart, HeartHandshake, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View, Text, Platform } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { getSoftShadowStyle } from '@/components/ui/SoftCard';
import { canSubmitGiving } from '../../permissions/mobilePermissions';

interface FabMenuProps {
  isStaff: boolean;
}

export default function FabMenu({ isStaff }: FabMenuProps) {
  const router = useRouter();
  const { userProfile } = useAuthStore();
  const { openPrayerModal } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const animation = useMemo(() => new Animated.Value(0), []);

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    
    Animated.spring(animation, {
      toValue,
      friction: 6,
      useNativeDriver: true,
    }).start();
    
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    if (isOpen) toggleMenu();
  };

  const handlePress = (actionOrRoute: string | (() => void)) => {
    closeMenu();
    setTimeout(() => {
      if (typeof actionOrRoute === 'function') {
        actionOrRoute();
      } else {
        router.push(actionOrRoute as any);
      }
    }, 200);
  };

  const getSubItemStyle = (index: number) => {
    return {
      transform: [
        { scale: animation },
        {
          translateY: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -60 * (index + 1)] // Negative Y to go up
          })
        }
      ],
      opacity: animation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1]
      })
    };
  };

  const rotation = {
    transform: [
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg']
        })
      }
    ]
  };

  const baseItems: any[] = [
    { 
      icon: HeartHandshake, 
      key: 'submit-prayer', 
      title: 'Submit Prayer Request', 
      route: (() => openPrayerModal()) as any 
    }
  ];

  if (canSubmitGiving(userProfile)) {
    baseItems.push({ icon: HandHeart, key: 'giving', title: 'Giving', route: '/giving' });
  }

  baseItems.push(...getFabMenuItems(isStaff));

  const menuItems = baseItems;
  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Overlay when open */}
      {isOpen && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={closeMenu} 
        />
      )}

      {/* Sub Items */}
      {menuItems.map((item, index) => (
        <Animated.View key={item.key} style={[styles.subItemContainer, getSubItemStyle(index)]}>
          <TouchableOpacity 
            style={styles.subItemRow} 
            onPress={() => handlePress(item.route)}
            activeOpacity={0.8}
          >
            <View style={styles.subItem}>
              <item.icon size={20} color="#FF6596" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}

      {/* Main FAB */}
      <TouchableOpacity 
        style={styles.fabContainer}
        onPress={toggleMenu}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF6596', '#B66DFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Animated.View style={rotation}>
            <Plus size={24} color="#fff" />
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    marginLeft: 12
  },
  overlay: {
    position: 'absolute',
    top: -1000,
    bottom: -100,
    left: -1000,
    right: -1000,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  fabContainer: {
    borderRadius: 26,
    backgroundColor: 'transparent',
    zIndex: 10,
    boxShadow: '0px 8px 15px rgba(255, 101, 150, 0.4)',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  subItemContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'flex-end',
    right: 2,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  subItemLabelWrap: {
    ...getSoftShadowStyle(8),
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
    boxShadow: '0px 6px 16px rgba(164, 164, 164, 0.12)', // Keep increased visibility
  },
  subItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  subItem: {
    ...getSoftShadowStyle(24),
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 16px rgba(164, 164, 164, 0.12)', // Keep increased visibility
  }
});
