import { useEffect } from 'react';

function setMeta(name, content) {
  if (!content) return;
  const element = document.querySelector(`meta[name="${name}"]`);
  if (element) {
    element.setAttribute('content', content);
    return;
  }

  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
}

export function usePageMeta({ title, description, keywords }) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    setMeta('description', description || 'RankOtaku lets anime fans compete with fun quiz challenges and global leaderboards. Play quizzes, track scores, and share with friends.');
    setMeta('keywords', keywords || 'anime quiz, leaderboard, otaku games, anime trivia, RankOtaku');
  }, [title, description, keywords]);
}
