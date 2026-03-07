import type { FC } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  List,
  CheckSquare,
  NotebookPen,
  ScrollText,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const TEMPLATES = [
  {
    id: 'executive_summary',
    icon: FileText,
    nameKey: 'regenerate.executiveSummary',
    descKey: 'regenerate.executiveSummaryDesc',
    prompt:
      'Rewrite this meeting summary as a concise executive summary. Write 2-3 short paragraphs covering: the purpose of the meeting, key discussion topics, and the main outcomes or conclusions. Use a professional tone. Keep it under 200 words. Format the output in plain text paragraphs without bullet points.',
  },
  {
    id: 'key_points',
    icon: List,
    nameKey: 'regenerate.keyPoints',
    descKey: 'regenerate.keyPointsDesc',
    prompt:
      'Rewrite this meeting summary as a list of key points. Extract the 5-10 most important takeaways from the meeting. Format each point as a bullet point starting with a bold keyword or phrase, followed by a brief explanation. Order them by importance. Keep each point to 1-2 sentences maximum.',
  },
  {
    id: 'action_items',
    icon: CheckSquare,
    nameKey: 'regenerate.actionItems',
    descKey: 'regenerate.actionItemsDesc',
    prompt:
      'Rewrite this meeting summary focusing exclusively on action items and next steps. For each action item, format it as a checklist item with: the task description, who is responsible (if mentioned), and any deadline or timeline mentioned. Group items by topic or person if applicable. If no specific action items were discussed, extract implied next steps from the conversation. End with a "Next Steps" section summarizing what needs to happen before the next meeting.',
  },
  {
    id: 'detailed_notes',
    icon: NotebookPen,
    nameKey: 'regenerate.detailedNotes',
    descKey: 'regenerate.detailedNotesDesc',
    prompt:
      'Rewrite this meeting summary as comprehensive structured meeting notes. Organize the content into clearly labeled sections with headings (use ## for headings). Include these sections as applicable: Overview, Discussion Topics (with sub-sections for each topic), Key Decisions, Action Items, Questions Raised, and Additional Notes. Provide more detail than a summary — include context, reasoning behind decisions, and different viewpoints mentioned. Use bullet points within each section.',
  },
  {
    id: 'meeting_minutes',
    icon: ScrollText,
    nameKey: 'regenerate.meetingMinutes',
    descKey: 'regenerate.meetingMinutesDesc',
    prompt:
      'Rewrite this meeting summary as formal meeting minutes. Use the following structure:\n- **Meeting Title**: Infer from context\n- **Date**: Extract if mentioned\n- **Attendees**: List participants mentioned\n- **Agenda Items**: Number each topic discussed\n- **Discussion**: Brief summary under each agenda item\n- **Decisions Made**: List all decisions with clear outcomes\n- **Action Items**: Table format with Task, Owner, Deadline columns\n- **Next Meeting**: Note if mentioned\nUse formal, professional language throughout.',
  },
  {
    id: 'quick_recap',
    icon: Zap,
    nameKey: 'regenerate.quickRecap',
    descKey: 'regenerate.quickRecapDesc',
    prompt:
      'Rewrite this meeting summary as an ultra-brief recap in exactly 2-3 sentences. Capture only the single most important outcome or decision, who was involved, and the immediate next step. This should be short enough to read in 5 seconds. Do not use bullet points or formatting — just plain sentences.',
  },
] as const;

interface RegenerateSheetProps {
  isOpen: boolean;
  onDismiss: () => void;
  noteId: string;
  onRegenerated: (newContent: string) => void;
  isRegenerating: boolean;
  onRegenerateStart: () => void;
}

export const RegenerateSheet: FC<RegenerateSheetProps> = ({
  isOpen,
  onDismiss,
  noteId,
  onRegenerated,
  isRegenerating,
  onRegenerateStart,
}) => {
  const { t } = useTranslation();

  const handleSelect = async (prompt: string) => {
    if (isRegenerating) return;

    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }

    onRegenerateStart();
    onDismiss();

    try {
      const { api } = await import('@/shared/lib/api/client');
      const updated = await api.notes.regenerate(noteId, prompt);
      onRegenerated(updated.summarizedContent || '');
    } catch {
      onRegenerated('');
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      initialBreakpoint={0.55}
      breakpoints={[0, 0.55]}
      data-testid="regenerate-sheet"
      handle={false}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('regenerate.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="px-4 pb-8">
          {TEMPLATES.map((template, index) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                className={`w-full flex items-center gap-3 py-3 px-1 text-left active:bg-stone-100 dark:active:bg-stone-800 transition-colors ${
                  index < TEMPLATES.length - 1
                    ? 'border-b border-stone-100 dark:border-stone-700/50'
                    : ''
                }`}
                onClick={() => handleSelect(template.prompt)}
                disabled={isRegenerating}
                data-testid={`regenerate-template-${template.id}`}
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                  <Icon
                    size={18}
                    className="text-text-secondary dark:text-dark-text-secondary"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary dark:text-dark-text">
                    {t(template.nameKey)}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                    {t(template.descKey)}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="flex-shrink-0 text-text-secondary/40 dark:text-dark-text-secondary/40"
                />
              </button>
            );
          })}
        </div>
      </IonContent>
    </IonModal>
  );
};
