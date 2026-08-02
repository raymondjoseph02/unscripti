'use client';

import type { GenerateMode, GenerateType } from '@/components/generate/GenerateTypeToggle';
import type { GeneratedAssetsResponse } from '@/services/generateService';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CardSkeleton } from '@/components/general/CardSkeleton';
import { GenerateResultGrid } from '@/components/generate/GenerateResultGrid';
import { GenerateTypeToggle } from '@/components/generate/GenerateTypeToggle';
import { MediaStyleTab } from '@/components/generate/MediaStyleTab';
import { AnimatedExtendVideo } from '@/components/generate/modes/AnimatedExtendVideo';
import { AnimatedImageToVideo } from '@/components/generate/modes/AnimatedImageToVideo';
import { AnimatedStylePresent } from '@/components/generate/modes/AnimatedStylePresent';
import { AnimatedTalking } from '@/components/generate/modes/AnimatedTalking';
import { StillEditStyle } from '@/components/generate/modes/StillEditStyle';
import { StillStylePresent } from '@/components/generate/modes/StillStylePresent';
import { useAuth } from '@/context/AuthContext';
import { guestToken } from '@/libs/guestToken';
import { useGenerateService } from '@/services/generateService';

type Tab = 'All' | 'Images' | 'Videos';

const skeletonKeys = ['a', 'b', 'c', 'd', 'e', 'f'];

export default function GeneratePage() {
  const t = useTranslations('GeneratePage');
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { getGeneratedAssets } = useGenerateService();

  const characterId = searchParams.get('characterId') ?? '';
  const characterName = searchParams.get('characterName') ?? '';
  const characterImage = searchParams.get('characterImage') ?? '';
  const initialCharacter = characterId ? { id: characterId, name: characterName, image: characterImage } : null;

  const [activeType, setActiveType] = useState<GenerateType>('still');
  const [mode, setMode] = useState<GenerateMode>('style_present');
  const [mediaTab, setMediaTab] = useState<Tab>('All');
  const [assets, setAssets] = useState<GeneratedAssetsResponse['content'] | null>(null);
  const [pending, setPending] = useState<{ id: string; orientation: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerationStart = (generationId: string, orientation: string) => {
    setPending(prev => [...prev, { id: generationId, orientation }]);
  };

  const handleGenerationEnd = (generationId: string) => {
    setPending(prev => prev.filter(p => p.id !== generationId));
  };

  const refreshAssets = async () => {
    try {
      const res = await getGeneratedAssets();
      if (res.success) {
        setAssets(res.content);
      }
    } catch {
      // Keep the assets already on screen if the refetch fails.
    }
  };

  useEffect(() => {
    if (!token && !guestToken.get()) {
      return;
    }
    const fetch = async () => {
      setIsLoading(true);
      await refreshAssets();
      setIsLoading(false);
    };
    fetch();
  }, [token]);

  const filteredAssets = assets
    ? {
        images: mediaTab === 'Videos' ? [] : assets.images,
        videos: mediaTab === 'Images' ? [] : assets.videos,
        pagination: assets.pagination,
      }
    : null;

  const modeProps = {
    onGenerated: refreshAssets,
    onGenerationStart: handleGenerationStart,
    onGenerationEnd: handleGenerationEnd,
  };

  const modeComponent = activeType === 'still'
    ? mode === 'edit_style'
      ? <StillEditStyle {...modeProps} />
      : <StillStylePresent initialCharacter={initialCharacter} {...modeProps} />
    : mode === 'image_to_video'
      ? <AnimatedImageToVideo {...modeProps} />
      : mode === 'extend_video'
        ? <AnimatedExtendVideo {...modeProps} />
        : mode === 'talking'
          ? <AnimatedTalking {...modeProps} />
          : <AnimatedStylePresent initialCharacter={initialCharacter} {...modeProps} />;

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-center text-xl font-bold text-white sm:text-2xl md:text-[32px]">
        {t('title')}
        {' '}
        <span className="text-primary-100">{t('title_highlight')}</span>
      </h1>
      <div className="mx-auto max-w-184">
        <GenerateTypeToggle
          active={activeType}
          mode={mode}
          onChange={setActiveType}
          onModeChange={setMode}
        />
        {modeComponent}
      </div>
      <MediaStyleTab tab={mediaTab} onTabChange={setMediaTab} />
      {isLoading
        ? (
            <div className="flex flex-wrap gap-2">
              {skeletonKeys.map(key => <CardSkeleton key={key} />)}
            </div>
          )
        : <GenerateResultGrid assets={filteredAssets} pending={pending} />}
    </div>
  );
}
