import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, NeutralColors, Radius, Shadows, Spacing } from '@/constants/theme';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { memo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface PostComposerProps {
  onSubmit: (content: string, imageUri?: string) => Promise<void>;
  placeholder?: string;
}

export const PostComposer = memo(function PostComposer({
  onSubmit,
  placeholder = "Share something with the community...",
}: PostComposerProps) {
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed && !imageUri) return;

    setSubmitting(true);
    try {
      await onSubmit(trimmed, imageUri || undefined);
      setContent('');
      setImageUri(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = (content.trim().length > 0 || imageUri) && !submitting;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={NeutralColors.gray300}
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={2000}
        editable={!submitting}
      />

      {imageUri && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
          <Pressable
            onPress={() => setImageUri(null)}
            style={({ pressed }) => [styles.removeImageBtn, pressed && { opacity: 0.7 }]}
          >
            <IconSymbol name="xmark.circle.fill" size={24} color={NeutralColors.white} />
          </Pressable>
        </View>
      )}

      <View style={styles.toolbar}>
        <Pressable
          onPress={pickImage}
          style={({ pressed }) => [styles.toolButton, pressed && { opacity: 0.7 }]}
          disabled={submitting}
        >
          <IconSymbol name="photo" size={20} color={BrandColors.primary} />
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.postButton,
            !canSubmit && styles.postButtonDisabled,
            pressed && canSubmit && { opacity: 0.8 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={NeutralColors.white} />
          ) : (
            <Text style={[styles.postButtonText, !canSubmit && styles.postButtonTextDisabled]}>
              Post
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: NeutralColors.white,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  input: {
    fontSize: 15,
    color: NeutralColors.gray900,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  imagePreviewContainer: {
    marginTop: Spacing.sm,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: Radius.sm,
  },
  removeImageBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.gray100,
  },
  toolButton: {
    padding: Spacing.sm,
  },
  postButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    minWidth: 70,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: NeutralColors.gray200,
  },
  postButtonText: {
    color: NeutralColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  postButtonTextDisabled: {
    color: NeutralColors.gray400,
  },
});
