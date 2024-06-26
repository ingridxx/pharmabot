"use client"

import { useState, useEffect } from 'react';

export type SimilarityMetric = "euclidean" | "dot_product";

const useConfiguration = () => {
  // Safely get values from localStorage
  const getLocalStorageValue = (key: string, defaultValue: any) => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem(key);
      if (storedValue !== null) {
        return storedValue;
      }
    }
    return defaultValue;
  };

  const [useRag, setUseRag] = useState<boolean>(() => getLocalStorageValue('useRag', 'true') === 'true');
  const [llm, setLlm] = useState<string>(() => getLocalStorageValue('llm', 'gpt-3.5-turbo'));
  const [similarityMetric, setSimilarityMetric] = useState<SimilarityMetric>(
    () => getLocalStorageValue('similarityMetric', 'dot_product') as SimilarityMetric
  );

  const setConfiguration = (rag: boolean, llm: string, similarityMetric: SimilarityMetric) => {
    setUseRag(rag);
    setLlm(llm);
    setSimilarityMetric(similarityMetric);
  }

  const handleSelectSimilarityMetric = (value: string) => {
    if (value === "euclidean" || value === "dot_product") {
        setSimilarityMetric(value as SimilarityMetric);
    } else {
        console.error("Invalid similarity metric selected:", value);
    }
  };

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('useRag', JSON.stringify(useRag));
      localStorage.setItem('llm', llm);
      localStorage.setItem('similarityMetric', similarityMetric);
    }
  }, [useRag, llm, similarityMetric]);

  return {
    useRag,
    llm,
    similarityMetric,
    setConfiguration,
    handleSelectSimilarityMetric,
  };
}

export default useConfiguration;