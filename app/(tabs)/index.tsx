import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, SemanticColors, Shadows, Spacing } from '@/constants/theme';
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
        return SemanticColors.success;
      case 'planned':
        return BrandColors.primary;
      case 'completed':
        return NeutralColors.gray400;
      case 'cancelled':
        return SemanticColors.error;
      default:
        return NeutralColors.gray400;
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
      <TouchableOpacity style={styles.cycleCard} activeOpacity={0.7}>
        {/* Left accent border — color based on status */}
        <View style={[styles.accentBorder, { backgroundColor: getStatusColor(item.status) }]} />

        <View style={styles.cardContent}>
          {/* Header: icon + title + status badge */}
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: getStatusColor(item.status) + '15' }]}>
              <IconSymbol name="heart.circle" size={20} color={getStatusColor(item.status)} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.cycleType} numberOfLines={1}>{item.cycle_type || 'Unknown'}</Text>
              {item.clinic_name && (
                <View style={styles.clinicBadge}>
                  <Text style={styles.clinicBadgeText}>{item.clinic_name}</Text>
                </View>
              )}
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

          {/* Details */}
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <IconSymbol name="calendar" size={14} color={BrandColors.accent} />
              <Text style={styles.dateText}>
                {formatDate(item.start_date)} – {formatDate(item.end_date)}
              </Text>
            </View>
            {item.protocol_name && (
              <View style={styles.detailRow}>
                <IconSymbol name="doc.text" size={14} color={NeutralColors.gray400} />
                <Text style={styles.protocolText}>{item.protocol_name}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading cycles...</Text>
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
          <IconSymbol name="calendar" size={64} color={NeutralColors.gray300} />
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BrandColors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.gray50,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NeutralColors.gray50,
  },
  loadingText: {
    fontSize: 16,
    color: NeutralColors.gray400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingTop: 60,
    backgroundColor: NeutralColors.white,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: NeutralColors.gray900,
  },
  addButton: {
    backgroundColor: BrandColors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: Spacing.lg,
  },
  cycleCard: {
    flexDirection: 'row',
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.md,
  },
  accentBorder: {
    width: 4,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  cycleType: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.gray900,
    marginBottom: 2,
  },
  clinicBadge: {
    backgroundColor: NeutralColors.gray400 + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  clinicBadgeText: {
    fontSize: 12,
    color: NeutralColors.gray400,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginLeft: Spacing.sm,
  },
  statusText: {
    color: NeutralColors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  details: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: BrandColors.accent,
  },
  protocolText: {
    fontSize: 13,
    color: NeutralColors.gray400,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: Spacing.lg,
    color: NeutralColors.gray900,
  },
  emptySubtext: {
    fontSize: 16,
    color: NeutralColors.gray400,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: BrandColors.accent,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.xxl,
  },
  createButtonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
