import { useCallback, useEffect, useRef, useState } from 'react';
import ApiKeyScreen from './components/ApiKeyScreen';
import BirthForm from './components/BirthForm';
import HistoryPanel from './components/HistoryPanel';
import Layout from './components/Layout';
import ResultScreen, { type ReadingState } from './components/ResultScreen';
import { requestReading, toGeminiError } from './lib/gemini';
import { buildUserPrompt } from './lib/prompt';
import { calculateSaju } from './lib/saju';
import {
  addHistory,
  clearApiKey,
  clearHistory,
  loadApiKey,
  loadHistory,
  loadModel,
  removeHistory,
  saveApiKey,
  saveModel,
  type HistoryEntry,
} from './lib/storage';
import type { BirthInput, SajuResult } from './types/saju';

type Step = 'key' | 'form' | 'result';

export default function App() {
  const [stored] = useState(loadApiKey);
  const [apiKey, setApiKey] = useState(stored?.key ?? '');
  const [persistent, setPersistent] = useState(stored?.persistent ?? false);
  const [model, setModel] = useState(loadModel);
  const [step, setStep] = useState<Step>('form');
  const [saju, setSaju] = useState<SajuResult | null>(null);
  const [reading, setReading] = useState<ReadingState>({ status: 'loading' });
  const [fromHistory, setFromHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [formError, setFormError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const runReading = useCallback(
    async (target: SajuResult) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setReading({ status: 'loading' });
      try {
        const result = await requestReading(
          { apiKey, model, signal: ac.signal },
          buildUserPrompt(target),
        );
        if (ac.signal.aborted) return;
        setReading({ status: 'done', reading: result });
        setHistory(
          addHistory({
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            model,
            saju: target,
            reading: result,
          }),
        );
      } catch (e) {
        const g = toGeminiError(e);
        setReading({ status: 'error', message: g.message, cancelled: g.kind === 'aborted' });
      }
    },
    [apiKey, model],
  );

  const handleBirth = (input: BirthInput) => {
    try {
      const s = calculateSaju(input);
      setFormError('');
      setSaju(s);
      setFromHistory(false);
      setStep('result');
      void runReading(s);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '사주를 계산하지 못했습니다.');
    }
  };

  const restart = () => {
    abortRef.current?.abort();
    setSaju(null);
    setStep('form');
  };

  const openHistory = (entry: HistoryEntry) => {
    setSaju(entry.saju);
    setReading({ status: 'done', reading: entry.reading });
    setFromHistory(true);
    setStep('result');
  };

  return (
    <Layout onOpenSettings={step === 'key' ? undefined : () => setStep('key')}>
      {step === 'key' && (
        <ApiKeyScreen
          initialKey={apiKey}
          initialPersistent={persistent}
          model={model}
          onModelChange={(m) => {
            setModel(m);
            saveModel(m);
          }}
          onConfirm={(key, remember) => {
            saveApiKey(key, remember);
            setApiKey(key);
            setPersistent(remember);
            setStep(saju ? 'result' : 'form');
          }}
          onUseServer={() => {
            clearApiKey();
            setApiKey('');
            setPersistent(false);
            setStep(saju ? 'result' : 'form');
          }}
          onBack={() => setStep(saju ? 'result' : 'form')}
        />
      )}

      {step === 'form' && (
        <>
          <BirthForm onSubmit={handleBirth} />
          {formError && (
            <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
              {formError}
            </p>
          )}
          <HistoryPanel
            entries={history}
            onOpen={openHistory}
            onDelete={(id) => setHistory(removeHistory(id))}
            onClear={() => {
              clearHistory();
              setHistory([]);
            }}
          />
        </>
      )}

      {step === 'result' && saju && (
        <ResultScreen
          saju={saju}
          state={reading}
          fromHistory={fromHistory}
          onRetry={() => void runReading(saju)}
          onCancel={() => abortRef.current?.abort()}
          onRestart={restart}
        />
      )}
    </Layout>
  );
}
