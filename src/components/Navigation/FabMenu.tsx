import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CalendarPlus, HandHeart, HeartHandshake, Plus, QrCode, UserPlus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

interface FabMenuProps {
  isStaff: boolean;
}

export default function FabMenu({ isStaff }: FabMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

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

  const handlePress = (route: string) => {
    closeMenu();
    // Use setTimeout to allow menu to close before navigating
    setTimeout(() => {
      router.push(route as any);
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

  // Build menu items
  const menuItems = [
    { icon: <QrCode size={20} color="#FF6596" />, route: '/scanner' },
    { icon: <HeartHandshake size={20} color="#FF6596" />, route: '/(tabs)/community?section=prayer-wall' },
    { icon: <HandHeart size={20} color="#FF6596" />, route: '/giving' },
  ];

  if (isStaff) {
    menuItems.push({ icon: <CalendarPlus size={20} color="#FF6596" />, route: '/(tabs)/' });
    menuItems.push({ icon: <UserPlus size={20} color="#FF6596" />, route: '/(tabs)/attendance' });
  }

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
        <Animated.View key={index} style={[styles.subItemContainer, getSubItemStyle(index)]}>
          <TouchableOpacity 
            style={styles.subItem} 
            onPress={() => handlePress(item.route)}
            activeOpacity={0.8}
          >
            {item.icon}
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
    shadowColor: '#FF6596',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    borderRadius: 26,
    backgroundColor: 'transparent',
    zIndex: 10,
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
    alignItems: 'center',
  },
  subItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  }
});
