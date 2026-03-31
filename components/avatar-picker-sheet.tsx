import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, SemanticColors, Shadows } from '@/constants/theme';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import React, { forwardRef, useCallback, useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

interface AvatarPickerSheetProps {
  /** Called with the selected image URI */
  onImageSelected: (uri: string) => void;
  /** Called when the user wants to remove their photo */
  onRemovePhoto?: () => void;
  /** Whether the user has an existing avatar (shows Remove option) */
  hasExistingAvatar?: boolean;
}

export const AvatarPickerSheet = forwardRef<BottomSheet, AvatarPickerSheetProps>(
  ({ onImageSelected, onRemovePhoto, hasExistingAvatar = false }, ref) => {
    const snapPoints = useMemo(() => [hasExistingAvatar ? 260 : 200], [hasExistingAvatar]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
      ),
      [],
    );

    const handleTakePhoto = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is needed to take a photo.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
        // @ts-ignore — close the bottom sheet
        (ref as any)?.current?.close();
      }
    };

    const handleChooseFromLibrary = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library permission is needed to choose a photo.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onImageSelected(result.assets[0].uri);
        // @ts-ignore — close the bottom sheet
        (ref as any)?.current?.close();
      }
    };

    const handleRemovePhoto = () => {
      // @ts-ignore
      (ref as any)?.current?.close();
      onRemovePhoto?.();
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Change Profile Photo</Text>

          <Pressable style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]} onPress={handleTakePhoto}>
            <View style={[styles.optionIcon, { backgroundColor: BrandColors.primary }]}>
              <IconSymbol name="camera" size={20} color="#fff" />
            </View>
            <Text style={styles.optionText}>Take Photo</Text>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]} onPress={handleChooseFromLibrary}>
            <View style={[styles.optionIcon, { backgroundColor: BrandColors.accent }]}>
              <IconSymbol name="photo" size={20} color="#fff" />
            </View>
            <Text style={styles.optionText}>Choose from Library</Text>
          </Pressable>

          {hasExistingAvatar && onRemovePhoto ? (
            <Pressable style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]} onPress={handleRemovePhoto}>
              <View style={[styles.optionIcon, { backgroundColor: SemanticColors.error }]}>
                <IconSymbol name="trash" size={20} color="#fff" />
              </View>
              <Text style={[styles.optionText, { color: SemanticColors.error }]}>
                Remove Photo
              </Text>
            </Pressable>
          ) : null}
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

AvatarPickerSheet.displayName = 'AvatarPickerSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: NeutralColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Shadows.lg,
  },
  handleIndicator: {
    backgroundColor: NeutralColors.gray300,
    width: 40,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.gray900,
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: NeutralColors.gray900,
  },
});
