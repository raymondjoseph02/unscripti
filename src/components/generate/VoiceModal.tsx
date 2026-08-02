'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { CloseIcon, PlayIcon, VoiceIcon } from '@/components/icons';
import { useVoices } from '@/services/UseVoice';

type Voice = { localName: string; shortName: string; gender: 'Female' | 'Male'; sampleUrl: string };

type ApiVoice = { localName: string; shortName: string; gender: string; sampleUrl: string };

export type SelectedVoice = { shortName: string; localName: string; sampleUrl: string };

export const VoiceModal = (props: {
  selected: string;
  onSelect: (voice: SelectedVoice) => void;
  onClose: () => void;
}) => {
  const t = useTranslations('VoiceModal');
  const { getVoices } = useVoices();
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingShortName, setPlayingShortName] = useState<string | null>(null);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await getVoices() as { content?: ApiVoice[] };
        if (response.content && response.content.length > 0) {
          const mapped = response.content
            .filter(v => v.gender === 'Female' || v.gender === 'Male')
            .map(v => ({
              localName: v.localName,
              shortName: v.shortName,
              gender: v.gender as 'Female' | 'Male',
              sampleUrl: v.sampleUrl,
            }));
          setVoices(mapped);
        }
      } catch {
        // The list stays empty when the voices cannot be fetched.
      } finally {
        setLoading(false);
      }
    };
    fetchVoices();
  }, []);

  const handlePlay = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!voice.sampleUrl) {
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      if (playingShortName === voice.shortName) {
        setPlayingShortName(null);
        return;
      }
    }
    const audio = new Audio(voice.sampleUrl);
    audioRef.current = audio;
    setPlayingShortName(voice.shortName);
    audio.play().catch(() => {});
    audio.onended = () => setPlayingShortName(null);
  };

  const female = voices?.filter(v => v.gender === 'Female');
  const male = voices?.filter(v => v.gender === 'Male');

  return (
    <div className="fixed inset-0 z-70 flex items-start justify-center overflow-y-auto bg-black/80 p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="my-auto w-full max-w-160 rounded-2xl border border-white-25 bg-black-80 px-4 py-6 md:px-7.5">
        <div className="mb-5 flex items-center justify-between border-b border-black-40 pb-4">
          <h2 className="text-base font-semibold text-white">{t('title')}</h2>
          <button onClick={props.onClose} className="cursor-pointer text-white-75 hover:text-white">
            <CloseIcon />
          </button>
        </div>

        {loading
          ? (
              <div className="flex flex-col gap-6">
                {[0, 1].map(group => (
                  <div key={group} className="flex flex-col gap-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-black-40" />
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }, (_, i) => `s-${group}-${i}`).map(key => (
                        <div key={key} className="h-13 animate-pulse rounded-xl bg-black-40" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          : !voices || voices.length === 0
              ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-sm text-white-50">{t('empty')}</p>
                  </div>
                )
              : (
                  <div className="flex flex-col gap-6">
                    {([{ label: t('female'), items: female }, { label: t('male'), items: male }] as const)
                      .filter(group => group.items && group.items.length > 0)
                      .map(group => (
                        <div key={group.label} className="flex flex-col gap-3">
                          <span className="text-sm font-semibold text-white">{group.label}</span>
                          <div className="grid grid-cols-3 gap-2">
                            {group.items?.map(v => (
                              <button
                                key={v.shortName}
                                onClick={() => {
                                  props.onSelect({ shortName: v.shortName, localName: v.localName, sampleUrl: v.sampleUrl });
                                }}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors ${props.selected === v.shortName || props.selected === v.localName ? 'border-primary-100' : 'border-black-40 bg-black-100 hover:border-primary-100'}`}
                              >
                                <span className="text-sm font-medium text-white">{v.localName}</span>
                                {' '}
                                <div>
                                  <button
                                    onClick={e => handlePlay(v, e)}
                                    className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${playingShortName === v.shortName ? 'bg-primary-100' : 'bg-primary-800'}`}
                                  >
                                    {playingShortName === v.shortName ? <VoiceIcon /> : <PlayIcon />}
                                  </button>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

        <div className="mt-6">
          <button
            onClick={props.onClose}
            className="w-full cursor-pointer rounded-xl bg-primary-100 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
