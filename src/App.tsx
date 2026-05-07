/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { topics, Topic, Question, Level } from './data/topics';
import { AIChat } from './components/AIChat';
import { Shield, ChevronRight, CheckCircle, XCircle, ArrowRight, ArrowLeft, RotateCcw, LogIn, LogOut, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, loginWithGoogle, logout, loadProgress, saveProgress } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

const LEVELS: Record<Level, { label: string, colorClass: string, bgClass: string, borderClass: string }> = {
  beginner: { label: 'المبتدئ', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]' },
  mid: { label: 'المتوسط', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10', borderClass: 'hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]' },
  pro: { label: 'المحترف', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10', borderClass: 'hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)]' },
  top: { label: 'الخبير', colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10', borderClass: 'hover:border-rose-500/50 hover:shadow-[0_0_15px_rgba(244,63,94,0.1)]' }
};

export default function App() {
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [viewMode, setViewMode] = useState<'content' | 'quiz'>('content');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [globalLevel, setGlobalLevel] = useState<Level>('beginner');
  
  const currentTopicQuestions = currentTopic?.id === 'review-quiz' 
    ? (currentTopic.questions || [])
    : currentTopic ? (currentTopic.questions || []).slice(0, 
        globalLevel === 'beginner' ? 4 :
        globalLevel === 'mid' ? 6 :
        globalLevel === 'pro' ? 8 :
        10
      ) : [];
      
  // User & Progress State
  const [user, setUser] = useState<User | null>(null);
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [scoreByTopic, setScoreByTopic] = useState<Record<string, number>>({});
  const [failedQuestions, setFailedQuestions] = useState<Record<string, number[]>>({});
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const progress = await loadProgress(u.uid);
        if (progress) {
          setCompletedTopics(progress.completedTopics || {});
          setScoreByTopic(progress.scoreByTopic || {});
          setFailedQuestions(progress.failedQuestions || {});
        } else {
          setCompletedTopics({});
          setScoreByTopic({});
          setFailedQuestions({});
        }
      } else {
        setCompletedTopics({});
        setScoreByTopic({});
        setFailedQuestions({});
      }
      setIsLoadingAuth(false);
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء تسجيل الدخول. يمكنك استخدام التطبيق، ولكن لن يتم حفظ تقدمك.');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const startQuiz = () => {
    setViewMode('quiz');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setQuizFinished(false);
  };

  const resetToHome = () => {
    setCurrentTopic(null);
    setViewMode('content');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setQuizFinished(false);
  };

  const startReviewQuiz = () => {
    const reviewQuestions: any[] = [];
    Object.keys(failedQuestions).forEach(topicId => {
      const topic = topics.find(t => t.id === topicId);
      if (topic) {
        failedQuestions[topicId].forEach(qIndex => {
          if (topic.questions[qIndex]) {
            reviewQuestions.push({
              ...topic.questions[qIndex],
              originalTopicId: topicId,
              originalQIndex: qIndex
            });
          }
        });
      }
    });

    if (reviewQuestions.length === 0) return;

    const reviewTopic: Topic = {
      id: 'review-quiz',
      title: 'اختبار مراجعة الأخطاء',
      description: 'قم بمراجعة الأسئلة التي تعثرت بها سابقاً',
      content: 'هذا الاختبار مخصص لمراجعة الأخطاء التي قمت بها في الاختبارات السابقة. أجب بشكل صحيح لتصحيح أخطائك ومسحها من سجلك.',
      questions: reviewQuestions.sort(() => Math.random() - 0.5).slice(0, 15) // pick up to 15 random failed questions
    };

    setCurrentTopic(reviewTopic);
    setViewMode('quiz');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setScore(0);
    setQuizFinished(false);
  };

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    if (!currentTopic || currentTopicQuestions.length === 0) return;

    const isCorrect = index === currentTopicQuestions[currentQuestionIndex].correctOptionIndex;

    if (isCorrect) {
      setScore(s => s + 1);

      // If review quiz, remove from failedQuestions if answered correctly
      if (currentTopic.id === 'review-quiz') {
        const eq = currentTopicQuestions[currentQuestionIndex] as any;
        if (eq.originalTopicId && eq.originalQIndex !== undefined) {
          setFailedQuestions(prev => {
            const newFailed = { ...prev };
            if (newFailed[eq.originalTopicId]) {
              newFailed[eq.originalTopicId] = newFailed[eq.originalTopicId].filter(idx => idx !== eq.originalQIndex);
              if (newFailed[eq.originalTopicId].length === 0) {
                delete newFailed[eq.originalTopicId];
              }
            }
            return newFailed;
          });
        }
      }
    } else {
      // Answered wrong: Add to failedQuestions
      if (currentTopic.id !== 'review-quiz') {
        setFailedQuestions(prev => {
          const newFailed = { ...prev };
          if (!newFailed[currentTopic.id]) {
            newFailed[currentTopic.id] = [];
          }
          if (!newFailed[currentTopic.id].includes(currentQuestionIndex)) {
            newFailed[currentTopic.id].push(currentQuestionIndex);
          }
          return newFailed;
        });
      }
    }
  };

  const handleNextQuestion = async () => {
    if (!currentTopic || currentTopicQuestions.length === 0) return;
    
    // Check if moving to next question or ending quiz
    if (currentQuestionIndex < currentTopicQuestions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedOption(null);
    } else {
      setQuizFinished(true);
      
      const isCorrect = selectedOption === currentTopicQuestions[currentQuestionIndex].correctOptionIndex;
      const finalScore = score + (isCorrect ? 1 : 0);
      
      const newCompletedTopics = { ...completedTopics };
      const newScoreByTopic = { ...scoreByTopic };

      if (currentTopic.id !== 'review-quiz') {
        const passThreshold = Math.max(1, Math.floor(currentTopicQuestions.length * 0.5));
        const topicKey = `${currentTopic.id}_${globalLevel}`;
        // Keep highest score
        const currentHighest = scoreByTopic[topicKey] || 0;
        if (finalScore > currentHighest) {
          newScoreByTopic[topicKey] = finalScore;
        }
        if (finalScore >= passThreshold) {
          newCompletedTopics[topicKey] = true;
        }
        setScoreByTopic(newScoreByTopic);
        setCompletedTopics(newCompletedTopics);
      }

      if (user) {
        saveProgress(user.uid, newCompletedTopics, newScoreByTopic, failedQuestions);
      }
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500">
        <Shield size={48} className="animate-pulse" />
      </div>
    );
  }

  const failedCount = Object.values(failedQuestions).flat().length;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={resetToHome}
          >
            <div className="bg-emerald-500/20 p-2 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
              <Shield className="text-emerald-400" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">مختبر الأمن السيبراني</h1>
              <p className="text-xs text-slate-400 font-mono">VLAB.CYBER.BASIC</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {currentTopic && (
              <button 
                onClick={resetToHome}
                className="text-sm hidden sm:flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
              >
                العودة للقائمة <ArrowRight size={16} />
              </button>
            )}
            
            {user ? (
              <div className="flex items-center gap-3 bg-slate-800 py-1.5 px-3 rounded-full border border-slate-700">
                <img src={user.photoURL || ''} alt="User" className="w-6 h-6 rounded-full" />
                <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">{user.displayName}</span>
                <button 
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 transition-colors ml-1"
                  title="تسجيل الخروج"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-bold transition-colors"
              >
                <LogIn size={16} /> تسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!currentTopic ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-10 text-center sm:text-right flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
                    الأساسيات في متناول يدك.
                  </h2>
                  <p className="text-slate-400 max-w-2xl leading-relaxed text-lg">
                    اختر موضوعاً للبدء. اكتسب المعرفة وارتقِ في مستويات الأمن السيبراني.
                  </p>
                </div>
                
                {failedCount > 0 && (
                  <button 
                    onClick={startReviewQuiz} 
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mx-auto sm:mx-0 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                  >
                    <AlertTriangle size={20} /> مسابقة مراجعة الأخطاء ({failedCount})
                  </button>
                )}
              </div>

              <div className="space-y-12">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-10 border-b border-slate-800 pb-8">
                  <span className="text-slate-400 font-bold ml-2">مستوى التطبيق:</span>
                  {(['beginner', 'mid', 'pro', 'top'] as Level[]).map(l => (
                    <button
                      key={l}
                      onClick={() => setGlobalLevel(l)}
                      className={`px-5 py-2.5 rounded-xl font-bold transition-all border ${
                        globalLevel === l 
                          ? `${LEVELS[l].bgClass} ${LEVELS[l].colorClass} border-current` 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {LEVELS[l].label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {topics.map((topic, index) => {
                    const isCompleted = completedTopics[`${topic.id}_${globalLevel}`];
                    const levelDef = LEVELS[globalLevel];
                    
                    return (
                      <motion.button
                        key={topic.id}
                        onClick={() => { setCurrentTopic(topic); setViewMode('content'); }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group flex flex-col items-start p-5 bg-slate-900 border border-slate-800 rounded-2xl transition-all text-right text-base cursor-pointer ${levelDef.borderClass}`}
                      >
                        <div className="flex items-center justify-between w-full mb-3">
                          <span className={`font-mono text-xs ${levelDef.colorClass} ${levelDef.bgClass} px-2 py-1 rounded-md`}>MOD_{topic.id.substring(0,3).toUpperCase()}</span>
                          {isCompleted && <CheckCircle size={18} className="text-emerald-500" />}
                        </div>
                        <h3 className="font-bold text-white text-lg mb-2">{topic.title}</h3>
                        <p className="text-sm text-slate-400 mb-4 flex-1 line-clamp-2">{topic.description}</p>
                        <div className={`flex items-center ${levelDef.colorClass} text-sm mt-auto group-hover:-translate-x-1 transition-transform`}>
                          <ChevronRight size={16} /> <span>تعلم واختبر معلوماتك</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : viewMode === 'content' ? (
            <motion.div
              key="content-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto pb-20"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl">
                <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
                  <h2 className="text-3xl font-bold text-white">{currentTopic.title}</h2>
                  <span className={`px-3 py-1 text-sm rounded-lg ${LEVELS[globalLevel].bgClass} ${LEVELS[globalLevel].colorClass}`}>
                    {LEVELS[globalLevel].label}
                  </span>
                </div>
                
                <div className="prose prose-invert prose-emerald max-w-none text-slate-300 leading-loose text-lg whitespace-pre-wrap mb-10">
                  {currentTopic.content}
                </div>

                <div className="flex justify-end pt-6 border-t border-slate-800">
                  <button 
                    onClick={startQuiz}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    التالي: بدء الاختبار <ArrowLeft size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="quiz-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto pb-20"
            >
              {!quizFinished ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl">
                  {/* Progress */}
                  <div className="mb-8">
                    <div className="flex justify-between text-sm text-slate-400 mb-2 font-mono">
                      <span>السؤال {currentQuestionIndex + 1} من {currentTopicQuestions.length}</span>
                      <span>النقاط: {score}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex) / currentTopicQuestions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-8 leading-relaxed">
                    {currentTopicQuestions[currentQuestionIndex].text}
                  </h3>

                  <div className="space-y-3">
                    {currentTopicQuestions[currentQuestionIndex].options.map((option, idx) => {
                      const isSelected = selectedOption === idx;
                      const isCorrect = currentTopicQuestions[currentQuestionIndex].correctOptionIndex === idx;
                      const showFeedback = selectedOption !== null;

                      let btnClass = "w-full text-right p-4 rounded-xl border flex items-center justify-between transition-all ";
                      
                      if (!showFeedback) {
                        btnClass += "border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 hover:shadow-md cursor-pointer";
                      } else {
                        if (isCorrect) {
                          btnClass += "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                        } else if (isSelected) {
                          btnClass += "border-red-500 bg-red-500/20 text-red-300 opacity-90";
                        } else {
                          btnClass += "border-slate-800 bg-slate-800/30 text-slate-500 opacity-40";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={showFeedback}
                          onClick={() => handleOptionSelect(idx)}
                          className={btnClass}
                        >
                          <span className="text-[15px] sm:text-lg">{option}</span>
                          {showFeedback && isCorrect && <CheckCircle className="text-emerald-500 flex-shrink-0" size={20} />}
                          {showFeedback && isSelected && !isCorrect && <XCircle className="text-red-500 flex-shrink-0" size={20} />}
                        </button>
                      );
                    })}
                  </div>

                  {selectedOption !== null && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 flex justify-between items-center"
                    >
                      <div className={`font-bold ${selectedOption === currentTopicQuestions[currentQuestionIndex].correctOptionIndex ? 'text-emerald-400' : 'text-red-400'}`}>
                        {selectedOption === currentTopicQuestions[currentQuestionIndex].correctOptionIndex ? 'إجابة صحيحة!' : 'إجابة غير صحيحة.'}
                      </div>
                      <button 
                        onClick={handleNextQuestion}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                      >
                        {currentQuestionIndex < currentTopicQuestions.length - 1 ? 'السؤال التالي' : 'إنهاء الاختبار'} <ArrowLeft size={18} />
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl text-center">
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${currentTopic.id === 'review-quiz' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {currentTopic.id === 'review-quiz' ? <AlertTriangle size={48} /> : <Shield size={48} />}
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4 tracking-tight">اكتمل الاختبار!</h2>
                  <p className="text-slate-400 text-lg mb-6">موضوع: {currentTopic.title}</p>
                  
                  <div className="text-5xl font-mono font-bold text-white mb-8 border-y border-slate-800 py-8">
                    {score} <span className="text-2xl text-slate-500">/ {currentTopicQuestions.length}</span>
                  </div>

                  {score >= (currentTopicQuestions.length / 2) ? (
                    <div className="text-emerald-400 font-bold mb-8 flex items-center justify-center gap-2">
                       تهانينا! لقد حققت نتيجة جيدة.
                    </div>
                  ) : (
                    <div className="text-red-400 font-bold mb-8 flex items-center justify-center gap-2">
                       يمكنك تحقيق نتيجة أفضل. ركز أكثر في المرة القادمة.
                    </div>
                  )}

                  <div className="flex justify-center gap-4">
                    {currentTopic.id !== 'review-quiz' && (
                      <button 
                        onClick={() => setViewMode('content')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                      >
                        <RotateCcw size={18} /> العودة للمادة العلمية
                      </button>
                    )}
                    <button 
                      onClick={resetToHome}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold transition-all"
                    >
                      العودة لقائمة المواضيع
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* AIChat is still present; we'll remove it if you prefer or keep it */}
      <AIChat currentTopicContent={currentTopic?.content} />
    </div>
  );
}
