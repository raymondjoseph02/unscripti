'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCreate } from '@/context/CreateContext';
import { useCharacterService } from '@/services/useCharacterService';
import { CreateAccordionField } from './CreateAccordionField';
import { CreateTagsField } from './CreateTagsField';

type Step3Key = 'backstory' | 'customPhysical' | 'customFaceDetails' | 'greeting' | 'personalityDetails';

const setters: Record<Step3Key, keyof ReturnType<typeof useCreate>> = {
  backstory: 'setBackstory',
  customPhysical: 'setCustomPhysical',
  customFaceDetails: 'setCustomFaceDetails',
  greeting: 'setGreeting',
  personalityDetails: 'setPersonalityDetails',
};

type EnrichContent = {
  backstory?: string;
  custom_face_prompt?: string;
  custom_physical_prompt?: string;
  greeting_message?: string;
  personality_details?: string;
};

export const CreateStep3 = (props: { onValidChange?: (valid: boolean) => void }) => {
  const t = useTranslations('CreateStep3');
  const ctx = useCreate();
  const { aiEnrich } = useCharacterService();
  const [enrichLoading, setEnrichLoading] = useState(false);

  const fields: { key: Step3Key; title: string; placeholder: string }[] = [
    { key: 'backstory', title: t('backstory'), placeholder: t('backstory_placeholder') },
    { key: 'customPhysical', title: t('custom_physical'), placeholder: t('custom_physical_placeholder') },
    { key: 'customFaceDetails', title: t('custom_face'), placeholder: t('custom_face_placeholder') },
    { key: 'greeting', title: t('greeting'), placeholder: t('greeting_placeholder') },
    { key: 'personalityDetails', title: t('personality_details'), placeholder: t('personality_details_placeholder') },
  ];

  useEffect(() => {
    props.onValidChange?.(true);
  }, []);

  const handleEnrich = () => {
    setEnrichLoading(true);
    aiEnrich({
      name: ctx.data.name,
      style: ctx.data.style ?? '',
      appearance: ctx.data.appearance,
      personality_archetype: ctx.data.personality,
      relationship_dynamic: ctx.data.relationship,
      kinks: ctx.data.kinks,
      hobby: ctx.data.socialRole,
    }).then((res: unknown) => {
      const content = (res as { content?: EnrichContent })?.content;
      if (content) {
        toast.success(t('toast_enriched'));
        if (content.backstory) {
          ctx.setBackstory(content.backstory);
        }
        if (content.custom_face_prompt) {
          ctx.setCustomFaceDetails(content.custom_face_prompt);
        }
        if (content.custom_physical_prompt) {
          ctx.setCustomPhysical(content.custom_physical_prompt);
        }
        if (content.greeting_message) {
          ctx.setGreeting(content.greeting_message);
        }
        if (content.personality_details) {
          ctx.setPersonalityDetails(content.personality_details);
        }
      }
      setEnrichLoading(false);
    }).catch(() => {
      toast.error(t('toast_enrich_failed'));
      setEnrichLoading(false);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <CreateAccordionField
        title={t('ai_enrichment')}
        subtitle={t('ai_subtitle')}
        expandable={false}
        loading={enrichLoading}
        onClick={handleEnrich}
      />
      {fields.map(f => (
        <CreateAccordionField
          key={f.key}
          title={f.title}
          placeholder={f.placeholder}
          value={ctx.data[f.key]}
          onChange={ctx[setters[f.key]] as (v: string) => void}
        />
      ))}
      <CreateTagsField tags={ctx.data.tags ?? []} onChange={ctx.setTags} />
    </div>
  );
};
