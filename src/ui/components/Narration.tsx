import { Icon } from './Icon';

/** Caixa do narrador: uma explicação curta, em linguagem simples, do passo atual. */
export function Narration({ text, failed = false }: { text: string; failed?: boolean }) {
  return (
    <p className={`narration ${failed ? 'is-fail' : ''}`} aria-live="polite">
      <Icon name="info" size={17} />
      <span>{text}</span>
    </p>
  );
}
