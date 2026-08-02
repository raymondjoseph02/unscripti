'use client';

import type { Message } from './types';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { SpinnerIcon, VoiceIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useChatNavigation } from '@/context/ChatContext';
import { useWallet } from '@/context/WalletContext';
import { useChatService } from '@/services/useChatService';
import { ChatMessageActions } from './ChatMessageActions';

// Character responses interleave *action/narration* with plain dialogue.
// Asterisk-wrapped runs render in italic, everything else as regular text.
const renderFormattedText = (text: string) => {
  const paragraphs = text.split('\n').map(p => p.trim()).filter(Boolean);

  return paragraphs.map((paragraph, pIndex) => (
    <p key={paragraph + pIndex} className={pIndex > 0 ? 'mt-3' : undefined}>
      {paragraph.split(/(\*[^*]+\*)/g).filter(Boolean).map((segment, sIndex) => (
        segment.startsWith('*') && segment.endsWith('*')
          ? <em key={segment + sIndex} className="text-white-75 italic">{segment.slice(1, -1)}</em>
          : <span key={segment + sIndex}>{segment}</span>
      ))}
    </p>
  ));
};

const audioMimeTypes: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
};

// Reads the edited contentEditable DOM back into the *asterisk* markdown the app stores as text.
const serializeEditableContent = (container: HTMLElement) => {
  const blocks = Array.from(container.childNodes).filter(
    (node): node is HTMLElement => node.nodeType === Node.ELEMENT_NODE,
  );

  return blocks
    .map((block) => {
      let line = '';
      block.childNodes.forEach((node) => {
        line += node instanceof HTMLElement && node.tagName === 'EM' ? `*${node.textContent ?? ''}*` : (node.textContent ?? '');
      });
      return line;
    })
    .filter(Boolean)
    .join('\n');
};

export const ChatMessageBubble = (props: {
  message: Message;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onEdit: (id: number, text: string) => void;
}) => {
  const t = useTranslations('ChatMessageBubble');
  const [isEditing, setIsEditing] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { activeChat } = useChatNavigation();
  const { getMessageSpeech } = useChatService();
  const { isAuthenticated } = useAuth();
  const { refresh: refreshWallet } = useWallet();
  const isUser = props.message.sender === 'user';
  const messageId = props.message.messageId;

  const playVoice = async () => {
    if (!activeChat || !messageId || isPlayingVoice) {
      return;
    }
    setIsPlayingVoice(true);
    try {
      const res = await getMessageSpeech(activeChat.chatroomId, messageId);
      // Speech is charged on request, so the shown balance is stale until re-read.
      refreshWallet();
      const { audio: base64Audio, format } = res.content;
      const mimeType = audioMimeTypes[format.toLowerCase()] ?? `audio/${format}`;
      audioRef.current?.pause();
      const audio = new Audio(`data:${mimeType};base64,${base64Audio}`);
      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast_voice_failed'));
    } finally {
      setIsPlayingVoice(false);
    }
  };

  const saveEdit = () => {
    if (!editableRef.current) {
      return;
    }
    const text = serializeEditableContent(editableRef.current).trim();
    if (text) {
      props.onEdit(props.message.id, text);
    }
    setIsEditing(false);
  };

  if (props.message.text && isEditing) {
    return (
      <div className="mb-3 w-fit max-w-3xl rounded-2xl bg-black-80 px-6 py-4 text-sm leading-6 text-white">
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          className="outline-none"
        >
          {renderFormattedText(props.message.text)}
        </div>
        <div className="mt-3 flex items-center justify-end gap-3">
          <Button type="button" onClick={() => setIsEditing(false)} className="rounded-full bg-black-40 text-white hover:bg-black-60">
            {t('cancel')}
          </Button>
          <Button type="button" onClick={saveEdit} className="rounded-full bg-white text-black hover:bg-white/90">
            {t('save')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`group flex w-fit max-w-3xl flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {props.message.image && (
          <div className="relative h-58 w-58 overflow-hidden rounded-xl">
            <Image src={props.message.image} alt="message" fill sizes="232px" className="object-cover" />
          </div>
        )}

        {props.message.text && (
          <div className={`w-fit max-w-3xl rounded-2xl px-6 py-4 text-sm leading-6 text-white  ${isUser ? 'rounded-br-sm bg-black-40' : 'rounded-bl-sm bg-black-80'}`}>
            {renderFormattedText(props.message.text)}

          </div>
        )}

        <div className="opacity- flex  w-full items-center gap-2 transition-all duration-200 ease-in-out group-hover:opacity-100 group-focus:opacity-100">
          {/* <span className="text-[10px] text-white-75">{props.message.time}</span> */}
          {props.message.text && (
            <div className="flex w-full items-center justify-between">
              <ChatMessageActions
                onCopy={() => navigator.clipboard.writeText(props.message.text ?? '')}
                onEdit={() => setIsEditing(true)}
                onDuplicate={() => props.onDuplicate(props.message.id)}
                onDelete={() => props.onDelete(props.message.id)}
                copyOnly={!isAuthenticated}
              />
              {!isUser && isAuthenticated && (
                <button
                  type="button"
                  aria-label={t('play_voice')}
                  disabled={isPlayingVoice || !messageId}
                  onClick={() => void playVoice()}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-black-100/70 text-white hover:text-white disabled:cursor-not-allowed disabled:opacity-60 [&>svg]:size-3.5"
                >
                  {isPlayingVoice ? <SpinnerIcon /> : <VoiceIcon />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
