/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { topics, Topic } from './data/topics';
import { AIChat } from './components/AIChat';
import { Shield, ChevronRight, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState<Record<string, boolean>>({});

  const handleOptionSelect = (topicId: string, index: number) => {
    setQuizAnswers({ ...quizAnswers, [topicId]: index });
    setShowResult({ ...showResult, [topicId]: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setCurrentTopic(null)}
          >
            <div className="bg-emerald-500/20 p-2 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
              <Shield className="text-emerald-400" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">مختبر الأمن السيبراني</h1>
              <p className="text-xs text-slate-400 font-mono">VLAB.CYBER.BASIC</p>
            </div>
          </div>
          {currentTopic && (
            <button 
              onClick={() => setCurrentTopic(null)}
              className="text-sm flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              العودة للقائمة <ArrowRight size={16} />
            </button>
          )}
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
                  اختر موضوعاً للبدء. كل موضوع يحتوي على شرح مبسط وسؤال لاختبار معلوماتك. يمكنك دائماً سؤال المساعد الذكي لمزيد من التوضيح.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map((topic, index) => {
                  const isCompleted = showResult[topic.id] && quizAnswers[topic.id] === topic.correctOptionIndex;
                  return (
                    <motion.button
                      key={topic.id}
                      onClick={() => setCurrentTopic(topic)}
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
                        <ChevronRight size={16} /> <span>ابدأ التعلم</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="topic"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto"
            >
              {/* Topic Content */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 mb-8 shadow-xl">
                <h2 className="text-3xl font-bold text-white mb-6 border-b border-slate-800 pb-4">{currentTopic.title}</h2>
                <div className="prose prose-invert prose-emerald max-w-none mb-8 text-slate-300 leading-loose text-lg whitespace-pre-wrap">
                  {currentTopic.content}
                </div>
              </div>

              {/* Lab Quiz */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 mb-20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Shield size={18} />
                  </div>
                  <h3 className="text-xl font-bold text-white">اختبر معلوماتك</h3>
                </div>
                
                <p className="text-lg mb-6 text-slate-300">{currentTopic.question}</p>
                
                <div className="space-y-3">
                  {currentTopic.options.map((option, idx) => {
                    const isSelected = quizAnswers[currentTopic.id] === idx;
                    const isCorrect = currentTopic.correctOptionIndex === idx;
                    const showFeedback = showResult[currentTopic.id];

                    let btnClass = "w-full text-right p-4 rounded-xl border flex items-center justify-between transition-colors ";
                    if (!showFeedback) {
                      btnClass += "border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-slate-500 cursor-pointer";
                    } else {
                      if (isCorrect) {
                        btnClass += "border-emerald-500 bg-emerald-500/10 text-emerald-300 cursor-default";
                      } else if (isSelected) {
                        btnClass += "border-red-500 bg-red-500/10 text-red-300 cursor-default";
                      } else {
                        btnClass += "border-slate-800 bg-slate-800/50 text-slate-500 cursor-default opacity-50";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={showFeedback}
                        onClick={() => handleOptionSelect(currentTopic.id, idx)}
                        className={btnClass}
                      >
                        <span className="text-[15px] sm:text-base">{option}</span>
                        {showFeedback && isCorrect && <CheckCircle className="text-emerald-500 flex-shrink-0" size={20} />}
                        {showFeedback && isSelected && !isCorrect && <XCircle className="text-red-500 flex-shrink-0" size={20} />}
                      </button>
                    );
                  })}
                </div>

                {showResult[currentTopic.id] && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 p-4 rounded-xl ${quizAnswers[currentTopic.id] === currentTopic.correctOptionIndex ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}
                  >
                    {quizAnswers[currentTopic.id] === currentTopic.correctOptionIndex 
                      ? "إجابة صحيحة! أحسنت." 
                      : "إجابة غير صحيحة، حاول التركيز على الشرح بالأعلى أو اسأل المساعد الذكي."}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AIChat currentTopicContent={currentTopic?.content} />
    </div>
  );
}
