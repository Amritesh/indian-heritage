import { StatePanel } from '@/shared/ui/StatePanel';

type ErrorStateProps = {
  title?: string;
  message: string;
};

export function ErrorState({ title = 'A curatorial error occurred', message }: ErrorStateProps) {
  return (
    <StatePanel eyebrow="Error" title={title} description={message} tone="error" icon="error" />
  );
}
