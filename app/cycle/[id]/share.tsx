import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { CycleService } from '@/lib/services';
import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface UserSearch {
    id: string;
    email: string;
    full_name: string | null;
}

export default function ShareCycleScreen() {
    const { id: cycleId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResult, setSearchResult] = useState<UserSearch | null>(null);
    const [searching, setSearching] = useState(false);
    const [accessLevel, setAccessLevel] = useState<'read' | 'write'>('read');
    const [sharing, setSharing] = useState(false);
    const [sharedUsers, setSharedUsers] = useState<
        { email: string; access_level: string }[]
    >([]);
    const [loading, setLoading] = useState(true);

    const loadSharedUsers = async () => {
        if (!cycleId) return;

        try {
            const { data } = await supabase
                .from('shared_access')
                .select('granted_to, access_level, users!shared_access_granted_to_fkey(email)')
                .eq('cycle_id', cycleId);

            if (data) {
                setSharedUsers(
                    data.map((item: any) => ({
                        email: item.users?.email || 'Unknown',
                        access_level: item.access_level,
                    }))
                );
            }
        } catch (error) {
            console.error('Error loading shared users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSharedUsers();
    }, [cycleId]);

    const handleSearch = async () => {
        if (!searchEmail.trim()) return;

        setSearching(true);
        setSearchResult(null);

        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email, full_name')
                .ilike('email', `%${searchEmail.trim()}%`)
                .neq('id', user?.id)
                .limit(1)
                .single();

            if (error) {
                Alert.alert('Not Found', 'No user found with that email');
            } else {
                setSearchResult(data);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSearching(false);
        }
    };

    const handleShare = async () => {
        if (!user || !cycleId || !searchResult) return;

        setSharing(true);
        try {
            await CycleService.shareAccess(
                user.id,
                cycleId,
                searchResult.id,
                accessLevel
            );

            Alert.alert('Success', `Cycle shared with ${searchResult.email}`);
            setSearchEmail('');
            setSearchResult(null);
            loadSharedUsers();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSharing(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Share Cycle</Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Share with Partner</Text>
                    <Text style={styles.sectionSubtitle}>
                        Enter your partner's email to share this cycle with them
                    </Text>

                    <View style={styles.searchRow}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="partner@email.com"
                            value={searchEmail}
                            onChangeText={setSearchEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={handleSearch}
                            disabled={searching}
                        >
                            {searching ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <IconSymbol name="magnifyingglass" size={20} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>

                    {searchResult && (
                        <View style={styles.resultCard}>
                            <View style={styles.resultInfo}>
                                <IconSymbol name="person.fill" size={32} color="#007AFF" />
                                <View style={styles.resultText}>
                                    <Text style={styles.resultEmail}>{searchResult.email}</Text>
                                    {searchResult.full_name && (
                                        <Text style={styles.resultName}>{searchResult.full_name}</Text>
                                    )}
                                </View>
                            </View>

                            <Text style={styles.accessLabel}>Access Level</Text>
                            <View style={styles.accessRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.accessButton,
                                        accessLevel === 'read' && styles.accessButtonSelected,
                                    ]}
                                    onPress={() => setAccessLevel('read')}
                                >
                                    <IconSymbol
                                        name="eye"
                                        size={18}
                                        color={accessLevel === 'read' ? '#fff' : '#666'}
                                    />
                                    <Text
                                        style={[
                                            styles.accessText,
                                            accessLevel === 'read' && styles.accessTextSelected,
                                        ]}
                                    >
                                        View Only
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.accessButton,
                                        accessLevel === 'write' && styles.accessButtonSelected,
                                    ]}
                                    onPress={() => setAccessLevel('write')}
                                >
                                    <IconSymbol
                                        name="pencil"
                                        size={18}
                                        color={accessLevel === 'write' ? '#fff' : '#666'}
                                    />
                                    <Text
                                        style={[
                                            styles.accessText,
                                            accessLevel === 'write' && styles.accessTextSelected,
                                        ]}
                                    >
                                        Can Edit
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.shareButton, sharing && styles.shareButtonDisabled]}
                                onPress={handleShare}
                                disabled={sharing}
                            >
                                <Text style={styles.shareButtonText}>
                                    {sharing ? 'Sharing...' : 'Share Cycle'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {sharedUsers.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Currently Shared With</Text>
                        {sharedUsers.map((shared, index) => (
                            <View key={index} style={styles.sharedUserCard}>
                                <IconSymbol name="person" size={20} color="#666" />
                                <Text style={styles.sharedEmail}>{shared.email}</Text>
                                <View style={styles.sharedBadge}>
                                    <Text style={styles.sharedBadgeText}>{shared.access_level}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    placeholder: {
        width: 40,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 12,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        width: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    resultInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    resultText: {
        marginLeft: 12,
    },
    resultEmail: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    resultName: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    accessLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    accessRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    accessButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    accessButtonSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    accessText: {
        fontSize: 14,
        color: '#666',
    },
    accessTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    shareButton: {
        backgroundColor: '#34C759',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    shareButtonDisabled: {
        opacity: 0.5,
    },
    shareButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    sharedUserCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
    },
    sharedEmail: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        marginLeft: 12,
    },
    sharedBadge: {
        backgroundColor: '#E3F2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    sharedBadgeText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '500',
    },
});
