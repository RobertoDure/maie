import { IconSymbol } from '@/components/ui/icon-symbol';
import {
    BrandColors,
    NeutralColors,
    Shadows,
} from '@/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Linking,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const APP_VERSION = '1.0.0';

export default function PrivacySecurityScreen() {
  const router = useRouter();

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [crashReportsEnabled, setCrashReportsEnabled] = useState(true);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={20} color={BrandColors.primary} />
          <Text style={styles.backText}>Profile</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: BrandColors.primary + '15' }]}>
                  <IconSymbol name="lock" size={18} color={BrandColors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Biometric Lock</Text>
                  <Text style={styles.settingDescription}>
                    Require Face ID or fingerprint to open the app
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: NeutralColors.gray200, true: BrandColors.accent }}
                thumbColor={NeutralColors.white}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: BrandColors.primary + '15' }]}>
                  <IconSymbol name="lock" size={18} color={BrandColors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Change Password</Text>
                  <Text style={styles.settingDescription}>
                    Update your account password
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Data & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: BrandColors.accent + '15' }]}>
                  <IconSymbol name="info.circle" size={18} color={BrandColors.accent} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Analytics</Text>
                  <Text style={styles.settingDescription}>
                    Help us improve the app by sharing anonymous usage data
                  </Text>
                </View>
              </View>
              <Switch
                value={analyticsEnabled}
                onValueChange={setAnalyticsEnabled}
                trackColor={{ false: NeutralColors.gray200, true: BrandColors.accent }}
                thumbColor={NeutralColors.white}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: BrandColors.accent + '15' }]}>
                  <IconSymbol name="info.circle" size={18} color={BrandColors.accent} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Crash Reports</Text>
                  <Text style={styles.settingDescription}>
                    Automatically send crash reports to help fix bugs
                  </Text>
                </View>
              </View>
              <Switch
                value={crashReportsEnabled}
                onValueChange={setCrashReportsEnabled}
                trackColor={{ false: NeutralColors.gray200, true: BrandColors.accent }}
                thumbColor={NeutralColors.white}
              />
            </View>
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                Linking.openURL('https://maie.app/privacy-policy')
              }
            >
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: NeutralColors.gray100 }]}>
                  <IconSymbol name="doc.text" size={18} color={NeutralColors.gray400} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Privacy Policy</Text>
                  <Text style={styles.settingDescription}>
                    Read how we collect, use, and protect your data
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                Linking.openURL('https://maie.app/terms-of-service')
              }
            >
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: NeutralColors.gray100 }]}>
                  <IconSymbol name="doc.text" size={18} color={NeutralColors.gray400} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Terms of Service</Text>
                  <Text style={styles.settingDescription}>
                    Review our terms and conditions
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                Linking.openURL('https://maie.app/data-processing')
              }
            >
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: NeutralColors.gray100 }]}>
                  <IconSymbol name="doc.text" size={18} color={NeutralColors.gray400} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Data Processing Agreement</Text>
                  <Text style={styles.settingDescription}>
                    How your data is processed and stored
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Your Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data</Text>

          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: BrandColors.primary + '15' }]}>
                  <IconSymbol name="person" size={18} color={BrandColors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Download My Data</Text>
                  <Text style={styles.settingDescription}>
                    Get a copy of all your personal data
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFE5E5' }]}>
                  <IconSymbol name="trash" size={18} color="#FF3B30" />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>
                    Delete My Account
                  </Text>
                  <Text style={styles.settingDescription}>
                    Permanently delete your account and all associated data
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={16} color={NeutralColors.gray300} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Encryption Notice */}
        <View style={styles.encryptionNotice}>
          <IconSymbol name="lock" size={16} color={NeutralColors.gray400} />
          <Text style={styles.encryptionText}>
            Your health data is encrypted end-to-end. Only you can access your
            personal information.
          </Text>
        </View>

        <Text style={styles.version}>MAIE v{APP_VERSION}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: NeutralColors.white,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backText: {
    fontSize: 16,
    color: BrandColors.primary,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.gray900,
    textAlign: 'center',
    flex: 2,
  },
  headerRight: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.gray900,
    marginBottom: 12,
  },
  card: {
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: NeutralColors.gray900,
  },
  settingDescription: {
    fontSize: 13,
    color: NeutralColors.gray400,
    marginTop: 2,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: NeutralColors.gray100,
    marginLeft: 64,
  },
  encryptionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: NeutralColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Shadows.sm,
  },
  encryptionText: {
    flex: 1,
    fontSize: 13,
    color: NeutralColors.gray400,
    marginLeft: 10,
    lineHeight: 18,
  },
  version: {
    textAlign: 'center',
    color: NeutralColors.gray300,
    fontSize: 12,
    marginTop: 8,
  },
});
