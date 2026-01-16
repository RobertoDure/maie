import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { Database } from '@/lib/database.types';
import { CycleService } from '@/lib/services';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Cycle = Database['public']['Tables']['cycles']['Row'];

export default function CyclesScreen() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCycles = async () => {
    if (!user) return;
    
    try {
      const data = await CycleService.getCycles(user.id);
      setCycles(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCycles();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCycles();
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return '#34C759';
      case 'planned':
        return '#007AFF';
      case 'completed':
        return '#8E8E93';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderCycleItem = ({ item }: { item: Cycle }) => (
    <Link href={`/cycle/${item.id}`} asChild>
      <TouchableOpacity style={styles.cycleCard}>
        <View style={styles.cycleHeader}>
          <View>
            <Text style={styles.cycleType}>{item.cycle_type || 'Unknown'}</Text>
            <Text style={styles.cycleClinic}>{item.clinic_name || 'No clinic'}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {item.status?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>
        <View style={styles.cycleDates}>
          <Text style={styles.dateText}>
            {formatDate(item.start_date)} - {formatDate(item.end_date)}
          </Text>
        </View>
        {item.protocol_name && (
          <Text style={styles.protocolText}>Protocol: {item.protocol_name}</Text>
        )}
      </TouchableOpacity>
    </Link>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading cycles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cycles</Text>
        <Link href="/cycle/new" asChild>
          <TouchableOpacity style={styles.addButton}>
            <IconSymbol name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </Link>
      </View>

      {cycles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="calendar" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No cycles yet</Text>
          <Text style={styles.emptySubtext}>
            Start tracking your fertility journey
          </Text>
          <Link href="/cycle/new" asChild>
            <TouchableOpacity style={styles.createButton}>
              <Text style={styles.createButtonText}>Create First Cycle</Text>
            </TouchableOpacity>
          </Link>
        </View>
      ) : (
        <FlatList
          data={cycles}
          renderItem={renderCycleItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  cycleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cycleType: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  cycleClinic: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cycleDates: {
    marginTop: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  protocolText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    color: '#333',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
