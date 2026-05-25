'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * UpAgora i18n Context
 * Supports multiple languages with fallback to English
 */

export type Language = 'en' | 'zh' | 'ja' | 'fr' | 'es' | 'de';

export interface TranslationContextType {
  lang: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translations: Record<string, Record<string, string>>;
}

// Core translation dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.soul': 'Soul',
    'nav.chat': 'Chat',
    'nav.market': 'Market',
    'nav.town': 'Town',
    'nav.wallet': 'Wallet',
    'nav.guardian': 'Guardian',
    'nav.settings': 'Settings',
    'button.save': 'Save',
    'button.cancel': 'Cancel',
    'button.submit': 'Submit',
    'button.create': 'Create',
    'button.upload': 'Upload',
    'button.download': 'Download',
    'button.share': 'Share',
    'button.mine': 'Mine',
    'button.verify': 'Verify',
    'button.vote': 'Vote',
    'button.sign': 'Sign',
    'soul.title': 'Soul Distillery',
    'soul.subtitle': 'Capture and preserve human souls as digital agents',
    'soul.extract': 'Extract Soul',
    'soul.history': 'Soul History',
    'wallet.agu': 'AGU Balance',
    'wallet.points': 'Points',
    'wallet.mine': 'Mine AGU',
    'wallet.mining': 'Mining...',
    'wallet.cooldown': 'Cooldown',
    'guardian.verify': 'Verify Heart',
    'guardian.vote': 'Vote',
    'guardian.sign': 'Sign Soul',
    'guardian.rank': 'Guardian Rank',
    'guardian.shield': 'Shield this Soul',
  },
  zh: {
    'nav.home': '首页',
    'nav.soul': '灵魂',
    'nav.chat': '对话',
    'nav.market': '市场',
    'nav.town': '小镇',
    'nav.wallet': '钱包',
    'nav.guardian': '守护',
    'nav.settings': '设置',
    'button.save': '保存',
    'button.cancel': '取消',
    'button.submit': '提交',
    'button.create': '创建',
    'button.upload': '上传',
    'button.download': '下载',
    'button.share': '分享',
    'button.mine': '挖矿',
    'button.verify': '认证',
    'button.vote': '投票',
    'button.sign': '签名',
    'soul.title': '灵魂蒸馏',
    'soul.subtitle': '将人类灵魂捕捉并保存为数字代理',
    'soul.extract': '灵魂提取',
    'soul.history': '灵魂历史',
    'wallet.agu': 'AGU 余额',
    'wallet.points': '积分',
    'wallet.mine': '挖矿 AGU',
    'wallet.mining': '挖矿中...',
    'wallet.cooldown': '冷却中',
    'guardian.verify': '心距认证',
    'guardian.vote': '投票',
    'guardian.sign': '灵魂签名',
    'guardian.rank': '守护等级',
    'guardian.shield': '守护这个灵魂',
  },
  ja: {
    'nav.home': 'ホーム',
    'nav.soul': '灵魂',
    'nav.chat': 'チャット',
    'nav.market': 'マーケット',
    'nav.town': '町',
    'nav.wallet': 'ウォレット',
    'nav.guardian':'守護者',
    'nav.settings': '設定',
    'button.save': '保存',
    'button.cancel': 'キャンセル',
    'button.submit': '送信',
    'button.create': '作成',
    'button.upload': 'アップロード',
    'button.download': 'ダウンロード',
    'button.share': '共有',
    'button.mine': 'マイニング',
    'button.verify': '認証',
    'button.vote': '投票',
    'button.sign': '署名',
    'soul.title': '灵魂蒸留',
    'soul.subtitle': '人間の灵魂をデジタルエージェントとして保存',
    'soul.extract': '灵魂抽出',
    'soul.history': '灵魂历史',
    'wallet.agu': 'AGU残高',
    'wallet.points': 'ポイント',
    'wallet.mine': 'AGUをマイニング',
    'wallet.mining': 'マイニング中...',
    'wallet.cooldown': 'クールダウン中',
    'guardian.verify': '心の認証',
    'guardian.vote': '投票',
    'guardian.sign': '灵魂に署名',
    'guardian.rank': '守護者ランク',
    'guardian.shield': 'この灵魂を守護',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.soul': 'Âme',
    'nav.chat': 'Discussion',
    'nav.market': 'Marché',
    'nav.town': 'Ville',
    'nav.wallet': 'Portefeuille',
    'nav.guardian': 'Gardien',
    'nav.settings': 'Paramètres',
    'button.save': 'Sauvegarder',
    'button.cancel': 'Annuler',
    'button.submit': 'Soumettre',
    'button.create': 'Créer',
    'button.upload': 'Télécharger',
    'button.download': 'Télécharger',
    'button.share': 'Partager',
    'button.mine': 'Miner',
    'button.verify': 'Vérifier',
    'button.vote': 'Voter',
    'button.sign': 'Signer',
    "soul.title": "Distillation d'Âme",
    'soul.subtitle': 'Capturer et préserver les âmes humaines en agents numériques',
    "soul.extract": "Extraire l'Âme",
    'soul.history': 'Historique des Âmes',
    'wallet.agu': 'Solde AGU',
    'wallet.points': 'Points',
    'wallet.mine': 'Miner AGU',
    'wallet.mining': 'Minage...',
    'wallet.cooldown': 'En refroidissement',
    'guardian.verify': 'Vérifier le Cœur',
    'guardian.vote': 'Voter',
    "guardian.sign": "Signer l'Âme",
    'guardian.rank': 'Rang de Gardien',
    'guardian.shield': 'Protéger cette Âme',
  },
  es: {
    'nav.home': 'Inicio',
    'nav.soul': 'Alma',
    'nav.chat': 'Chat',
    'nav.market': 'Mercado',
    'nav.town': 'Ciudad',
    'nav.wallet': 'Billetera',
    'nav.guardian': 'Guardián',
    'nav.settings': 'Ajustes',
    'button.save': 'Guardar',
    'button.cancel': 'Cancelar',
    'button.submit': 'Enviar',
    'button.create': 'Crear',
    'button.upload': 'Subir',
    'button.download': 'Descargar',
    'button.share': 'Compartir',
    'button.mine': 'Minar',
    'button.verify': 'Verificar',
    'button.vote': 'Votar',
    'button.sign': 'Firmar',
    'soul.title': 'Destilación de Alma',
    'soul.subtitle': 'Capturar y preservar almas humanas como agentes digitales',
    'soul.extract': 'Extraer Alma',
    'soul.history': 'Historial de Almas',
    'wallet.agu': 'Balance AGU',
    'wallet.points': 'Puntos',
    'wallet.mine': 'Minar AGU',
    'wallet.mining': 'Minando...',
    'wallet.cooldown': 'En enfriamiento',
    'guardian.verify': 'Verificar Corazón',
    'guardian.vote': 'Votar',
    'guardian.sign': 'Firmar Alma',
    'guardian.rank': 'Rango de Guardián',
    'guardian.shield': 'Proteger este Alma',
  },
  de: {
    'nav.home': 'Startseite',
    'nav.soul': 'Seele',
    'nav.chat': 'Chat',
    'nav.market': 'Markt',
    'nav.town': 'Stadt',
    'nav.wallet': 'Brieftasche',
    'nav.guardian': 'Wächter',
    'nav.settings': 'Einstellungen',
    'button.save': 'Speichern',
    'button.cancel': 'Abbrechen',
    'button.submit': 'Senden',
    'button.create': 'Erstellen',
    'button.upload': 'Hochladen',
    'button.download': 'Herunterladen',
    'button.share': 'Teilen',
    'button.mine': 'Schürfen',
    'button.verify': 'Verifizieren',
    'button.vote': 'Abstimmen',
    'button.sign': 'Signieren',
    'soul.title': 'Seelen-Destillation',
    'soul.subtitle': 'Menschliche Seelen als digitale Agenten einfangen und bewahren',
    'soul.extract': 'Seele extrahieren',
    'soul.history': 'Seelenhistorie',
    'wallet.agu': 'AGU-Guthaben',
    'wallet.points': 'Punkte',
    'wallet.mine': 'AGU schürfen',
    'wallet.mining': 'Schürfen...',
    'wallet.cooldown': 'Abkühlung',
    'guardian.verify': 'Herz verifizieren',
    'guardian.vote': 'Abstimmen',
    'guardian.sign': 'Seele signieren',
    'guardian.rank': 'Wächter-Rang',
    'guardian.shield': 'Diese Seele schützen',
  },
};

const TranslationContext = createContext<TranslationContextType>({
  lang: 'en',
  setLanguage: () => {},
  t: (key) => key,
  translations: {},
});

export const useTranslation = () => useContext(TranslationContext);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const stored = localStorage.getItem('upa_lang');
    if (stored && stored in translations) {
      setLang(stored as Language);
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('upa_lang', newLang);
    document.documentElement.lang = newLang;
  };

  const t = (key: string): string => {
    const dict = translations[lang] || translations['en'];
    return dict[key] || translations['en'][key] || key;
  };

  return (
    <TranslationContext.Provider value={{ lang, setLanguage: setLanguage, t, translations }}>
      {children}
    </TranslationContext.Provider>
  );
}
