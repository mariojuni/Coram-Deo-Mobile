import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { PlusCircle, CheckCircle, Receipt, PieChart } from 'lucide-react-native';

export default function FinanceTab() {
  const router = useRouter();

  const financeTools = [
    {
      title: 'Giving Input',
      description: 'Manually add new giving records',
      icon: PlusCircle,
      route: '/staff-finance/giving-input',
      color: '#6DC8FF',
    },
    {
      title: 'Pending Verification',
      description: 'Review and approve giving records',
      icon: CheckCircle,
      route: '/staff-finance/pending-verification',
      color: '#B66DFF',
    },
    {
      title: 'Expense Tracker',
      description: 'Log and track church expenses',
      icon: Receipt,
      route: '/staff-finance/expense-tracker',
      color: '#FF6596',
    },
    {
      title: 'Finance Summary',
      description: 'Overview of income and expenses',
      icon: PieChart,
      route: '/staff-finance/finance-summary',
      color: '#FFA177', // warm gold/orange
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Finance Tools</Text>
      <View style={styles.grid}>
        {financeTools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => router.push(tool.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrapper, { backgroundColor: `${tool.color}15` }]}>
                <Icon size={28} color={tool.color} />
              </View>
              <Text style={styles.cardTitle}>{tool.title}</Text>
              <Text style={styles.cardDesc}>{tool.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 8,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
});
