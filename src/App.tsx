/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { topics, Topic, Question } from './data/topics';
import { AIChat } from './components/AIChat';
import { Shield, ChevronRight, CheckCircle, XCircle, ArrowRight, ArrowLeft, RotateCcw, LogIn, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, loginWithGoogle, logout, loadProgress, saveProgress } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [viewMode, setViewMode] = useState<'content' | 'quiz'>('content');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  
  // User & Progress State
  const [user, setUser] = useState<User | null>(null);
  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [scoreByTopic, setScoreByTopic] = useState<Record<string, number>>({});
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const progress = await loadProgress(u.uid);
        if (progress) {
          setCompletedTopics(progress.completedTopics || {});
          setScoreByTopic(progress.scoreByTopic || {});
        } else {
          setCompletedTopics({});
          setScoreByTopic({});
        }
      } else {
        setCompletedTopics({});
        setScoreByTopic({});
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
      alert('حدث خطأ أثناء تسجيل الدخول');
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

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    if (currentTopic && index === currentTopic.questions[currentQuestionIndex].correctOptionIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = async () => {
    if (!currentTopic) return;
    
    // Check if moving to next question or ending quiz
    if (currentQuestionIndex < currentTopic.questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedOption(null);
    } else {
      setQuizFinished(true);
      
      const isCorrect = selectedOption === currentTopic.questions[currentQuestionIndex].correctOptionIndex;
      const finalScore = score + (isCorrect ? 1 : 0);
      
      // Keep highest score
      const currentHighest = scoreByTopic[currentTopic.id] || 0;
      const newScoreByTopic = { ...scoreByTopic };
      if (finalScore > currentHighest) {
        newScoreByTopic[currentTopic.id] = finalScore;
      }
      
      const newCompletedTopics = { ...completedTopics };
      if (finalScore >= 5) {
        newCompletedTopics[currentTopic.id] = true;
      }
      
      setScoreByTopic(newScoreByTopic);
      setCompletedTopics(newCompletedTopics);

      if (user) {
        saveProgress(user.uid, newCompletedTopics, newScoreByTopic);
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
              <div className="mb-10 text-center sm:text-right">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
                  الأساسيات في متناول يدك.
                </h2>
                <p className="text-slate-400 max-w-2xl leading-relaxed text-lg">
                  اختر موضوعاً للبدء. اقرأ الشرح المعرفي لكل موضوع ثم اختبر معلوماتك في سلسلة من الأسئلة. تجاوز 5 أسئلة لاجتياز الموضوع.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map((topic, index) => {
                  const isCompleted = completedTopics[topic.id];
                  return (
                    <motion.button
                      key={topic.id}
                      onClick={() => { setCurrentTopic(topic); setViewMode('content'); }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group flex flex-col items-start p-5 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition-all shadow-sm hover:shadow-emerald-500/10 text-right text-base cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <span className="font-mono text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md label">MOD_{String(index + 1).padStart(2, '0')}</span>
                        {isCompleted && <CheckCircle size={18} className="text-emerald-500" />}
                      </div>
                      <h3 className="font-bold text-white text-lg mb-2">{topic.title}</h3>
                      <p className="text-sm text-slate-400 mb-4 flex-1">{topic.description}</p>
                      <div className="flex items-center text-emerald-400 text-sm mt-auto group-hover:translate-x-1 transition-transform">
                        <ChevronRight size={16} /> <span>المادة العلمية واختبار المعرفة</span>
                      </div>
                    </motion.button>
                  );
                })}
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
                      <span>السؤال {currentQuestionIndex + 1} من {currentTopic.questions.length}</span>
                      <span>النقاط: {score}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex) / currentTopic.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-8 leading-relaxed">
                    {currentTopic.questions[currentQuestionIndex].text}
                  </h3>

                  <div className="space-y-3">
                    {currentTopic.questions[currentQuestionIndex].options.map((option, idx) => {
                      const isSelected = selectedOption === idx;
                      const isCorrect = currentTopic.questions[currentQuestionIndex].correctOptionIndex === idx;
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
                      <div className={`font-bold ${selectedOption === currentTopic.questions[currentQuestionIndex].correctOptionIndex ? 'text-emerald-400' : 'text-red-400'}`}>
                        {selectedOption === currentTopic.questions[currentQuestionIndex].correctOptionIndex ? 'إجابة صحيحة!' : 'إجابة غير صحيحة.'}
                      </div>
                      <button 
                        onClick={handleNextQuestion}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                      >
                        {currentQuestionIndex < currentTopic.questions.length - 1 ? 'السؤال التالي' : 'إنهاء الاختبار'} <ArrowLeft size={18} />
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 bg-emerald-500/20 text-emerald-400">
                    <Shield size={48} />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4 tracking-tight">اكتمل الاختبار!</h2>
                  <p className="text-slate-400 text-lg mb-6">موضوع: {currentTopic.title}</p>
                  
                  <div className="text-5xl font-mono font-bold text-white mb-8 border-y border-slate-800 py-8">
                    {score} <span className="text-2xl text-slate-500">/ {currentTopic.questions.length}</span>
                  </div>

                  {score >= 5 ? (
                    <div className="text-emerald-400 font-bold mb-8 flex items-center justify-center gap-2">
                       تهانينا! لقد اجتزت هذا الموضوع بنجاح.
                    </div>
                  ) : (
                    <div className="text-red-400 font-bold mb-8 flex items-center justify-center gap-2">
                       يمكنك تحقيق نتيجة أفضل. حاول مراجعة المادة مرة أخرى.
                    </div>
                  )}

                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={() => setViewMode('content')}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                      <RotateCcw size={18} /> العودة للمادة العلمية
                    </button>
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

      <AIChat currentTopicContent={currentTopic?.content} />
    </div>
  );
}
