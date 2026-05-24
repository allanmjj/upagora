'use client';

import { useState, useEffect, useRef } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { motion } from 'framer-motion';

// ============ Donald Trump source corpus ============
const TRUMP_CORPUS = {
  speeches: [
    { title: "Arlington National Cemetery Speech (Jun 2020)", content: "Under this magnificent flag, in a country that is so great and so beautiful, you will always be honored, and you will always be remembered. And you will always be held in the highest possible regard. You are heroes. You are patriots. And as for those cowards who threatened to disrupt this event, you were greatly mistaken. It was you who were disrupted. You were greatly overruled. Because this is a country of law, and justice will be done. Thank you. May God bless these warriors, and may God greatly and richly bless America. Thank you." },
    { title: "Inaugural Address (Jan 2017)", content: "We, the citizens of America, are now joined in a great national effort to rebuild our country and to restore its promise for all of our people. Together, we will determine the course of America and the world for many, many years to come. We will bring back our jobs. We will bring back our borders. We will bring back our wealth. We will bring back our dreams." },
    { title: "Remarks on the Economy (2019)", content: "We are in the midst of the greatest economy this country has ever known. The Dow is at all-time highs, unemployment is at all-time lows, and American manufacturers are hiring like never before. We have unleashed a wave of national renewal that is making America stronger, better, and greater than ever before." },
    { title: "Evangel supporters rally (Dec 2023)", content: "Let's face it folks, our country was in shambles. It was an absolute disaster. Crime was out of control. Our borders were wide open. China was taking our money, our factories, our intellectual property. But together, we fixed it. Together, we made America great again. And we're going to do it even bigger and even better this time." },
  ],
  quotes: [
    "I could stand in the middle of Fifth Avenue and shoot somebody and I wouldn't lose voters.",
    "I have never seen anything like what's happening in this country. It's unbelievable.",
    "Build the wall. Build the wall. Mexico is going to pay for it.",
    "We have choice words for the losers, and they are total losers.",
    "This is the greatest comeback story the world has ever seen.",
  ],
  bio: "Donald John Trump (b. 1946), 45th President of the United States (2017-2021), businessman, television personality. Founded The Trump Organization, built real estate empire in NYC. Host of The Apprentice. Won 2016 presidential election. Known for unconventional rhetoric, social media activism, and transactional approach to leadership. Electoral College: 304 (2016), lost popular vote by 0.7%. First president impeached twice. Convicted on 34 felony charges in NY (May 2024). Running for 2024 president.",
};

const ALL_RAW_TEXT = (() => {
  let text = TRUMP_CORPUS.bio + '\n\n';
  for (const p of TRUMP_CORPUS.speeches) {
    text += `[${p.title}]\n${p.content}\n\n`;
  }
  for (const q of TRUMP_CORPUS.quotes) {
    text += `· ${q}\n`;
  }
  return text;
})();

// ============ 7-Dimension distillation results (pre-generated demo) ============
const SEVEN_DIMENSIONS = [
  'cognitive_patterns',
  'value_judgment',
  'expression_style',
  'knowledge_structure',
  'emotional_response',
  'relationship_memory',
  'life_narrative',
];

const DIMENSION_LABELS: Record<string, string> = {
  cognitive_patterns: "Cognitive Patterns",
  value_judgment: "Values & Ethics",
  expression_style: "Expression Style",
  knowledge_structure: "Knowledge Structure",
  emotional_response: "Emotional Response",
  relationship_memory: "Relationships & Social",
  life_narrative: "Life Narrative",
};

// Pre-generated Trump 7-dimension soul extraction results
const PRE_GENERATED_EXTRACTIONS: Record<string, any> = {
  cognitive_patterns: {
    insights: [
      "Binary winner-loser framing: Sees every situation through a lens of absolute victory or catastrophic failure ('total disaster', 'greatest comeback')",
      "Instinctive over analytical: Relies on gut feeling and pattern-recognition rather than systematic reasoning ('I have very good instincts')",
      "Simplification as strategy: Reduces complex geopolitical/economic realities to digestible narratives ('China is ripping us off')",
      "Media-savvy cognition: Thinks in soundbites and headlines, understands what grabs attention before understanding policy mechanics",
      "Transactional worldview: Every relationship is a deal — good deal or bad deal, win or lose, no middle ground",
    ],
    confidence: 0.94,
  },
  value_judgment: {
    insights: [
      "American nationalism as core: 'America First' is not just policy but moral philosophy — US interests above all others, period",
      "Merit through results not pedigree: Values who delivers outcomes over institutional credentials ('they call me a genius and I'm not even modest about it')",
      "Anti-establishment ethos: Deep contempt for career politicians, pundits, and institutional gatekeepers",
      "Loyalty as supreme virtue: Those who support him are rewarded; those who defect are publicly destroyed",
      "Law-and-order absolutism: Crime threatens civilization itself — zero tolerance framed as existential necessity",
    ],
    confidence: 0.91,
  },
  expression_style: {
    insights: [
      "Repetition as emphasis: Tripling key phrases for rhetorical impact ('much bigger, much better, much tougher')",
      "Superlative dependence: Every descriptor reaches maximum — 'greatest', 'tremendous', 'unbelievable', 'disaster'",
      "Colloquial directness: Speaks like an ordinary person telling a story at a bar, not a formal address",
      "Nickname weaponization: Reduces opponents to humiliating labels ('Sleepy Joe', 'Crooked Hillary', 'Lyin Ted')",
      "Conversational interruptions: Unsigned, self-interrupting, tangent-prone — speech as live thought, not rehearsed script",
    ],
    confidence: 0.97,
  },
  knowledge_structure: {
    insights: [
      "Real estate and business acumen: Deep knowledge of construction, branding, deal-making, and negotiation",
      "Pop culture immersion: Entertainment industry background gives understanding of media mechanics and audience psychology",
      "Selective historical awareness: References to Founding Fathers and constitutional principles but limited depth on policy detail",
      "Instinctive economics: Understands market psychology and incentive structures through practical experience, not academic training",
      "Strategic ignorance pattern: Deliberately avoids detailed policy knowledge to maintain rhetorical flexibility and simplicity",
    ],
    confidence: 0.85,
  },
  emotional_response: {
    insights: [
      "Narcissistic wound sensitivity: Perceives criticism as personal attack requiring immediate and disproportionate retaliation",
      "Crowd-calibrated energy: Feeds off audience response — louder, more animated, more confident when crowd responds positively",
      "Victim-primary self-image: Consistently frames himself as the target of unfair conspiracy ('witch hunt', 'deep state')",
      "poll-driven motivation: Responds to favorable polling/ratings with escalating confidence and more aggressive positioning",
      "Affection for supporters: Genuine warmth toward base ('wonderful people', 'beautiful people') — crowd connection is most consistent positive emotion",
    ],
    confidence: 0.93,
  },
  relationship_memory: {
    insights: [
      "Family-first public identity: Uses family prominently in public appearances, emphasizes family values and legacy",
      "Friendship as alliance: Relationships outside family treated as loyalty tests — supporters become family, detractors become enemies",
      "Patronage and reward: Heavy users who deliver are elevated publicly and financially; those who fall short are discarded",
      "Intolerance for betrayal: Former allies who criticize become primary targets (Kellyanne Conway, Conway Campaign Manager)",
      "Charismatic but transactional leadership: Inspires intense personal loyalty but relationships remain conditional on performance and allegiance",
    ],
    confidence: 0.88,
  },
  life_narrative: {
    insights: [
      "Cinderella-to-empire arc: From Queensate childhood to NYC real estate mogul — inherited foundation but massively scaled through branding",
      "Reality TV coronation: The Apprentice (2004-2015) cemented pop culture icon status and built brand unto 'commander'",
      "Political underdog narrative: Outsiden to Washington insider system, anti-establishment challenger framing",
      "Persecution-resilience pattern: Stories build identity — impeached (twice), indicted (34 counts convicted), still running — 'the greatest comebacks story the world has ever seen'",
      "Legacy-maximizer ego: Driven by being remembered as singularly great — buildings name in skyline, term in history books, movement that outlasts him",
    ],
    confidence: 0.95,
  },
};

// ============ Donald Trump conversation responses (local demo data) ============
const TRUMP_RESPONSES: Record<string, string> = {
  greeting: "Hey, it's Donald Trump. Tremendous to meet you. We're doing great, aren't we? The greatest. Look, people have been saying it for a long time — you have a great energy, I can see it.",
  life: "I've had a great life, I tell you. Some would say unbelievable. From Queens to the presidency — nobody's ever done anything like it. Made a fortune, built the most beautiful buildings, and then they did everything they could to try to stop me. But you know what? We came back bigger than ever. The greatest comeback story the world has ever seen.",
  hardship: "I've been through some tremendous hardships, maybe more than anybody. They hit me with everything — investigations, indictments, thirty-four felony convictions. The fake news goes crazy, the radical left, they try to destroy you. But it only makes you stronger. It makes you unbreakable. And honestly? It's made me better, smarter, sharper than ever.",
  love: "I love this country. I love America more than anybody has ever loved America. And my family — I love my family, I love my kids, I love the fans. The people — the beautiful people. They line up for hours. It's something I've never seen before in the history of our country.",
  friendship: "I have some very, very smart people around me. Real smart people. The best. We get along great, but I'll tell you something — loyalty is everything. People who stand by you, when the chips are down, those are the ones. The ones who flip, they're not people. Total losers.",
  philosophy: "I believe in America. Not the globalists' America, our America. We need to protect our people, our borders, our economy. Fair deals, not rigged deals. And if we do that — and we will, we're doing it — we're going to have prosperity like the world has never seen. Patriotic. That's what matters.",
  business: "Real estate, folks, it's all about the deal. You negotiate, you close, you build. I built tremendous buildings. The best. People want to be there. And then I brought that to politics — same thing. You negotiate, you win, you make deals nobody thought were possible. We did things nobody thought was possible.",
  default: "Look, I've been through it all, folks. The greatest runs, the greatest fights, and I tell you, the future is going to be tremendous. We're going to win so much, you're going to get tired of winning. Believe me.",
};


function getResponseFromQuestion(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("who")) return TRUMP_RESPONSES.greeting;
  if (q.includes("life") || q.includes("story") || q.includes("career") || q.includes("journey") || q.includes("history")) return TRUMP_RESPONSES.life;
  if (q.includes("hardship") || q.includes("difficulty") || q.includes("challenge") || q.includes("obstacle") || q.includes("fight")) return TRUMP_RESPONSES.hardship;
  if (q.includes("love") || q.includes("heart") || q.includes("family") || q.includes("marriage") || q.includes("wife")) return TRUMP_RESPONSES.love;
  if (q.includes("friend") || q.includes("relationship") || q.includes("loyal") || q.includes("betray")) return TRUMP_RESPONSES.friendship;
  if (q.includes("philosophy") || q.includes("believe") || q.includes("america") || q.includes("country") || q.includes("idea")) return TRUMP_RESPONSES.philosophy;
  if (q.includes("business") || q.includes("deal") || q.includes("money") || q.includes("company") || q.includes("trump tower")) return TRUMP_RESPONSES.business;
  return TRUMP_RESPONSES.default;
}
// ============ TTS speech synthesis ============
function speakEnglish(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.85;
  utterance.pitch = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith('en'));
  if (enVoice) utterance.voice = enVoice;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

// ============ Main component ============
export default function DistillationPage() {
  const { user } = useSupabase();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<{ role: string; content: string }[]>([]);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const steps = [
    { name: 'Import Text', desc: 'Poetry · Prose · Letters' },
    { name: '7-D Extraction', desc: 'Soul Analysis' },
    { name: 'Persona Build', desc: 'Soul Profile' },
    { name: 'Chat Test', desc: 'Talk with Donald Trump' },
  ];

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  const importTexts = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(1);
    }, 1500);
  };

  const startExtraction = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 3000);
  };

  const generatePersona = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 2000);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    const userMsg = message.trim();
    setConversation(prev => [...prev, { role: 'user', content: userMsg }]);
    setMessage('');
    setTimeout(() => {
      const reply = getResponseFromQuestion(userMsg);
      setConversation(prev => [...prev, { role: 'assistant', content: reply }]);
    }, 800);
  };

  const speakMessage = (index: number) => {
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
    } else {
      const text = conversation[index]?.content || '';
      setSpeakingIndex(index);
      speakEnglish(text, () => setSpeakingIndex(null));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f172a] to-[#0a0a0f] text-white p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent mb-2">
            Soul Distillation · Donald Trump
          </h1>
          <p className="text-gray-400 text-sm">
            Extracting 7-dimensional soul traits from speeches, tweets, and interviews — Digital immortality of a modern icon
          </p>
        </motion.div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-10 gap-2">
          {steps.map((s, i) => (
            <motion.div
              key={s.name}
              animate={{ opacity: i <= step ? 1 : 0.3 }}
              className="flex items-center gap-2"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'bg-amber-500 text-black' :
                'bg-gray-700 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <div className="hidden sm:block text-xs">
                <div className="font-medium text-gray-300">{s.name}</div>
                <div className="text-gray-500">{s.desc}</div>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-6 h-px ${i < step ? 'bg-green-500' : 'bg-gray-700'}`} />
              )}
            </motion.div>
          ))}
        </div>

        {/* ============ Step 0: Import ============ */}
        {step === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-xl font-bold mb-6">① Import Donald Trump Source Texts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-amber-400 font-semibold mb-2">Poetry ({TRUMP_CORPUS.poetry.length} works)</div>
                <ul className="text-gray-400 space-y-1">
                  {TRUMP_CORPUS.poetry.map(p => <li key={p.title}>• {p.title}</li>)}
                </ul>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-amber-400 font-semibold mb-2">Quotes & Bio</div>
                <div className="text-gray-400 text-xs mb-2">{TRUMP_CORPUS.bio.slice(0, 100)}...</div>
                <ul className="text-gray-400 space-y-1">
                  {TRUMP_CORPUS.quotes.slice(0, 5).map((q, i) => <li key={i}>• {q}</li>)}
                </ul>
              </div>
            </div>
            <div className="text-xs text-gray-500 mb-4">
              Total: {ALL_RAW_TEXT.length} characters | Source: Public domain literature
            </div>
            <button
              onClick={importTexts}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl disabled:opacity-50 hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              {loading ? 'Importing...' : 'Import All Texts'}
            </button>
          </motion.div>
        )}

        {/* ============ Step 1: Extraction ============ */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h2 className="text-xl font-bold mb-2">② 7-Dimensional Soul Extraction</h2>
            <p className="text-gray-400 text-sm mb-6">Using LLM to analyze 7 soul dimensions from imported texts</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {SEVEN_DIMENSIONS.map((dim, i) => (
                <div key={dim} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold">
                    {i + 1}
                  </div>
                  <span className="text-gray-300 text-sm">{DIMENSION_LABELS[dim]}</span>
                </div>
              ))}
            </div>
            <button
              onClick={startExtraction}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl disabled:opacity-50"
            >
              {loading ? 'Extracting 7 dimensions... (~3s)' : 'Start Extraction'}
            </button>
          </motion.div>
        )}

        {/* ============ Step 2: Extraction Results ============ */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h2 className="text-xl font-bold mb-6">③ Extraction Results</h2>
              <div className="space-y-4">
                {SEVEN_DIMENSIONS.map(dim => {
                  const data = PRE_GENERATED_EXTRACTIONS[dim];
                  return (
                    <div key={dim} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">
                          {SEVEN_DIMENSIONS.indexOf(dim) + 1}
                        </div>
                        <span className="font-semibold text-amber-400 text-sm">{DIMENSION_LABELS[dim]}</span>
                        <span className="text-xs text-gray-500 ml-auto">Confidence {Math.round((data?.confidence || 0) * 100)}%</span>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1 ml-10">
                        {data?.insights?.map((insight: string, i: number) => (
                          <p key={i} className="leading-relaxed">• {insight}</p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={generatePersona}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl disabled:opacity-50"
            >
              {loading ? 'Generating persona profile...' : 'Generate Soul Profile → Enter Chat'}
            </button>
          </motion.div>
        )}

        {/* ============ Step 3: Chat ============ */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Persona Summary */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold mb-3">Soul Profile · Donald Trump</h2>
              <div className="text-sm text-gray-400 space-y-2">
                <p><span className="text-amber-400">Identity:</span> Su Shi, styled Zizhan, known as Dongpo Jushi (1037-1101)</p>
                <p><span className="text-amber-400">Core traits:</span> Optimistic and open-minded, harmonious with nature, authenticity first</p>
                <p><span className="text-amber-400">Expression:</span> Bold yet delicate, ironic self-mockery, rich natural imagery</p>
                <p><span className="text-amber-400">Signature quotes:</span> "Where the heart finds peace, there is home" · "Neither wind-rain nor sunshine"</p>
                <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-white/10">
                  7-dimension average confidence 90% | Source: 6 poetry works + 5 quotes + biography
                </p>
              </div>
            </div>

            {/* Chat */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold mb-3">Converse with Donald Trump's Soul</h2>
              <div className="bg-black/20 rounded-xl p-4 mb-4 h-80 overflow-y-auto">
                {conversation.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-12">
                    <div className="text-4xl mb-3">🏔️</div>
                    Ask Donald Trump a question
                  </div>
                )}
                {conversation.map((msg, i) => (
                  <div key={i} className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-amber-500 text-black text-right'
                        : 'bg-white/10 text-gray-200'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => speakMessage(i)}
                          className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 float-left"
                        >
                          {speakingIndex === i ? '⏹ Stop' : '🔊 Play Audio'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatRef} />
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask Donald Trump a question..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-sm"
                />
                <button
                  onClick={sendMessage}
                  className="px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl text-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pb-4">
          UpAgora Soul Distillation Engine v0.1 | 7-Dimensional Soul Modeling | 
          {user ? ` User: ${user.email?.slice(0, 8)}***` : 'Not logged in'}
        </div>
      </div>
    </div>
  );
}
