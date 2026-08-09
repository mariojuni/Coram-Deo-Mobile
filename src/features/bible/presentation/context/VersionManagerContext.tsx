import {
    downloadBibleOffline,
    fetchBiblesByLanguage,
    fetchOrganization,
    getSavedVersions,
    getUserPreferences,
    saveUserPreferences,
    saveVersion,
} from '@/features/bible/data/bible.repository';
import { getBibleIndex } from '@/features/bible/data/offlineDb.repository';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type SavedVersion = {
  id: string | number;
  organization_id?: string;
  [key: string]: unknown;
};

type LanguageOption = {
  id: string;
  tag: string;
  name: string;
  local_name: string;
  biblesCount: number;
  publishedVersionCount?: number;
};

type VersionContextValue = {
  POPULAR_LANGUAGES: LanguageOption[];
  activeTranslation: string | number;
  handleSelectVersion: (id: string | number) => Promise<void>;
  publishers: Record<string, string>;
  refreshSavedVersions: () => Promise<void>;
  savedVersions: SavedVersion[];
  selectedLanguage: LanguageOption;
  setSelectedLanguage: React.Dispatch<React.SetStateAction<LanguageOption>>;
};

const POPULAR_LANGUAGES: LanguageOption[] = [
  { id: 'eng', tag: 'eng', name: 'English', local_name: 'English', biblesCount: 12 },
  { id: 'Fil', tag: 'Fil', name: 'Filipino / Tagalog', local_name: 'Filipino', biblesCount: 4 },
  { id: 'spa', tag: 'spa', name: 'Spanish', local_name: 'Español', biblesCount: 8 },
  { id: 'fra', tag: 'fra', name: 'French', local_name: 'Français', biblesCount: 6 },
  { id: 'deu', tag: 'deu', name: 'German', local_name: 'Deutsch', biblesCount: 5 },
  { id: 'zho', tag: 'zho', name: 'Chinese', local_name: '中文', biblesCount: 7 },
  { id: 'jpn', tag: 'jpn', name: 'Japanese', local_name: '日本語', biblesCount: 3 },
  { id: 'kor', tag: 'kor', name: 'Korean', local_name: '한국어', biblesCount: 3 },
  { id: 'rus', tag: 'rus', name: 'Russian', local_name: 'Русский', biblesCount: 4 },
  { id: 'por', tag: 'por', name: 'Portuguese', local_name: 'Português', biblesCount: 5 },
  { id: 'ind', tag: 'ind', name: 'Bahasa Indonesia', local_name: 'Bahasa Indonesia', biblesCount: 4 },
];

const VersionContext = createContext<VersionContextValue | null>(null);

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const [savedVersions, setSavedVersions] = useState<SavedVersion[]>([]);
  const [activeTranslation, setActiveTranslation] = useState<string | number>('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(POPULAR_LANGUAGES[0]);
  const [publishers, setPublishers] = useState<Record<string, string>>({});

  const refreshSavedVersions = async () => {
    const versions = await getSavedVersions();
    setSavedVersions(versions);
  };

  useEffect(() => {
    const init = async () => {
      const prefs = await getUserPreferences();
      setActiveTranslation(prefs?.activeTranslation || 59);
      await refreshSavedVersions();

      // Auto-download ESV on fresh install
      const DEFAULT_VERSION_ID = 59;
      const alreadyDownloaded = await getBibleIndex(DEFAULT_VERSION_ID);
      if (!alreadyDownloaded) {
        // Ensure ESV is in saved versions list before downloading
        const versions = await getSavedVersions();
        const hasEsv = versions.some((v: any) => String(v.id) === String(DEFAULT_VERSION_ID));
        if (!hasEsv) {
          // Fetch version metadata from the API and save it
          const englishBibles = await fetchBiblesByLanguage('eng');
          const esvMeta = englishBibles?.find((b: any) => b.id === DEFAULT_VERSION_ID);
          if (esvMeta) {
            await saveVersion(esvMeta);
            await refreshSavedVersions();
          }
        }
        // Kick off background download silently
        downloadBibleOffline(DEFAULT_VERSION_ID).catch(() => {});
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchPublishers = async () => {
      const missingOrgIds = [
        ...new Set(
          savedVersions
            .map((version) => version.organization_id)
            .filter((organizationId): organizationId is string => typeof organizationId === 'string' && organizationId.length > 0)
        ),
      ];

      if (missingOrgIds.length === 0) return;

      const organizations = await Promise.all(
        missingOrgIds.map(async (organizationId) => {
          const data = await fetchOrganization(organizationId);
          return {
            id: organizationId,
            name: data?.name || 'Public Domain',
          };
        })
      );

      setPublishers((previous) => {
        const next = { ...previous };
        organizations.forEach((organization) => {
          if (!next[organization.id]) {
            next[organization.id] = organization.name;
          }
        });
        return next;
      });
    };

    fetchPublishers();
  }, [savedVersions]);

  const handleSelectVersion = async (id: string | number) => {
    const prefs = await getUserPreferences();
    await saveUserPreferences({ ...prefs, activeTranslation: id });
    setActiveTranslation(id);
  };

  const value = useMemo<VersionContextValue>(
    () => ({
      POPULAR_LANGUAGES,
      activeTranslation,
      handleSelectVersion,
      publishers,
      refreshSavedVersions,
      savedVersions,
      selectedLanguage,
      setSelectedLanguage,
    }),
    [activeTranslation, publishers, savedVersions, selectedLanguage]
  );

  return <VersionContext.Provider value={value}>{children}</VersionContext.Provider>;
}

export function useVersionContext() {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersionContext must be used within VersionProvider');
  }
  return context;
}
