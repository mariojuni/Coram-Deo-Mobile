import { Handshake } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

interface ServeEmptyStateProps {
  title: string;
  message: string;
}

export function ServeEmptyState({ title, message }: ServeEmptyStateProps) {
  return (
    <View style={cs.container}>
      <View style={cs.iconContainer}>
        <Handshake size={32} color="#FF6596" strokeWidth={1.5} />
      </View>
      <Text style={cs.title}>{title}</Text>
      <Text style={cs.message}>{message}</Text>
    </View>
  );
}

const cs = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
  },
});
