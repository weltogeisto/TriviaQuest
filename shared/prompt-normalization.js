(function initPromptNormalization(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  globalScope.TriviaPromptNormalization = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const PRACTICE_VARIANT_SUFFIX = /\s*\(Practice Variant\s+\d+\)\s*$/i;
  const WRAPPER_FAMILIES = [
    {
      name: 'identify-correct-answer',
      pattern: /^\s*Identify the correct answer for this prompt:\s*/i,
      type: 'prefix',
    },
    {
      name: 'choose-best-answer',
      pattern: /^\s*Choose the option that best answers this question:\s*/i,
      type: 'prefix',
    },
    {
      name: 'correct-response-to-prompt',
      pattern: /^\s*What is the correct response to the prompt\s*/i,
      type: 'prefix',
    },
    {
      name: 'best-solves-trivia-clue',
      pattern: /^\s*Which option best solves this trivia clue:\s*/i,
      type: 'prefix',
    },
    {
      name: 'select-best-answer',
      pattern: /^\s*Select the best answer for the question\s*/i,
      type: 'prefix',
    },
    {
      name: 'answer-belongs-with-prompt',
      pattern: /^\s*What answer belongs with this prompt:\s*/i,
      type: 'prefix',
    },
    {
      name: 'quiz-asks-which-answer',
      pattern: /^\s*If a quiz asks\s*/i,
      suffixPattern: /\s*,?\s*which answer is correct\?\s*$/i,
      type: 'wrapped',
    },
    {
      name: 'answer-this-prompt-correctly',
      pattern: /^\s*Answer this prompt correctly:\s*/i,
      type: 'prefix',
    },
    {
      name: 'response-best-fits-question',
      pattern: /^\s*Which response best fits the question\s*/i,
      type: 'prefix',
    },
  ];

  function normalizePromptPunctuation(text) {
    return String(text || '')
      .replace(/([!?.,:;])\1+/g, '$1')
      .replace(/\s*([!?.,:;])\s*/g, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stripPromptWrappers(text) {
    let normalized = String(text || '').trim();
    normalized = normalized.replace(PRACTICE_VARIANT_SUFFIX, '').trim();
    for (const wrapper of WRAPPER_FAMILIES) {
      if (!wrapper.pattern.test(normalized)) continue;
      normalized = normalized.replace(wrapper.pattern, '').trim();
      if (wrapper.suffixPattern) {
        normalized = normalized.replace(wrapper.suffixPattern, '').trim();
      }
      break;
    }
    return normalizePromptPunctuation(normalized);
  }

  function normalizePromptStem(text) {
    return stripPromptWrappers(text).toLowerCase();
  }

  function findPromptWrapperMatch(text) {
    const value = String(text || '').trim();
    return WRAPPER_FAMILIES.find(wrapper => {
      if (!wrapper.pattern.test(value)) return false;
      if (wrapper.suffixPattern) return wrapper.suffixPattern.test(value);
      return true;
    }) || null;
  }

  return {
    PRACTICE_VARIANT_SUFFIX,
    WRAPPER_FAMILIES,
    findPromptWrapperMatch,
    normalizePromptPunctuation,
    normalizePromptStem,
    stripPromptWrappers,
  };
});
