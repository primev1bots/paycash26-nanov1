import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react'
import { Bell, Loader2, Copy, Check, Link2, Users, Coins, Send, Code, ArrowLeft, ArrowRight, CreditCard, X, CheckCircle2, ShieldCheck, History, Shield, Wifi, WifiOff, RefreshCw, Globe, Server, Clock } from 'lucide-react'
import { logo, fan, sparkles } from './images'
import Wallet from "./icons/Wallet"
import HomeIcon from './icons/Home'
import EarnIcon from './icons/Earn'
import FriendsIcon from './icons/Friends'
import ProfileIcon from './icons/Profile'
import { db } from './Firebase'
import { ref, set, update, onValue, push, query, orderByChild, limitToLast, get, runTransaction } from 'firebase/database'
import { FaTasks, FaTelegram } from 'react-icons/fa'
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxCJzoya9ncucqJFAcIe8ocIXAIsMl6BE",
  authDomain: "paycash26-nanov1.firebaseapp.com",
  databaseURL: "https://paycash26-nanov1-default-rtdb.firebaseio.com",
  projectId: "paycash26-nanov1",
  storageBucket: "paycash26-nanov1.firebasestorage.app",
  messagingSenderId: "307223058212",
  appId: "1:307223058212:web:525ee735f268c6584b85b1",
  measurementId: "G-Y3FSY4QXKK"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Types
type TabType = 'home' | 'earn' | 'friends' | 'profile'
type TransactionType = 'claim' | 'ad_reward' | 'task_reward' | 'withdrawal' | 'referral'
type TransactionStatus = 'completed' | 'pending' | 'failed'

// Telegram WebApp Types
declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          query_id?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        showPopup: (params: any) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
      };
    };
    showGiga?: () => Promise<void>;
    showAdsovio?: () => Promise<void>;
    p_adextra?: (onSuccess: () => void, onError: () => void) => void;
    showAd?: () => Promise<void>;
    initCdTma?: any;
    [k: string]: any;
  }
}

// User Data Types based on your structure
interface UserData {
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  joinDate: string;
  adsWatchedToday: number;
  tasksCompleted: {
    [taskId: string]: {
      completedAt: string;
      reward: number;
    };
  };
  referredBy?: string;
  referral: {
    code: string;
    bonusGiven: boolean;
  };
  stats: {
    [date: string]: {
      ads: number;
      earned: number;
    };
  };
  lastAdWatch?: string;
  deviceId?: string;
  isMainAccount?: boolean;
}

interface ReferralData {
  referralCode: string;
  referredCount: number;
  referralEarnings: number;
  referredUsers: {
    [userId: string]: {
      joinedAt: string;
      bonusGiven: boolean;
      earningsFromUser: number;
    };
  };
}

// UPDATED: Enhanced Transaction interface with account details
interface Transaction {
  id: string;
  userId: number;
  type: TransactionType;
  amount: number;
  description: string;
  timestamp: number;
  status: TransactionStatus;
  method?: string;
  accountNumber?: string;
  accountDetails?: string;
  paymentMethod?: string;
  processedAt?: number;
  rejectionReason?: string;
}

// Task Types
interface Task {
  id: string;
  name: string;
  reward: number;
  category: string;
  totalRequired: number;
  completed?: number;
  url?: string;
  buttonText?: string;
  usersQuantity?: number;
  completedUsers?: number;
  telegramChannel?: string;
  checkMembership?: boolean;
  inviteLink?: string;
}

// Ad Types
type Provider = 'gigapub' | 'adsovio' | 'adextra' | 'onclicka';

interface Ad {
  id: number;
  title: string;
  description: string;
  watched: number;
  dailyLimit: number;
  hourlyLimit: number;
  provider: Provider;
  waitTime: number;
  cooldown: number;
  reward: number;
  enabled: boolean;
  appId: string;
  lastWatched?: Date;
}

// Wallet Configuration from Admin Panel
interface WalletConfig {
  currency: string;
  currencySymbol: string;
  defaultMinWithdrawal: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

// Payment Method from Admin Panel
interface PaymentMethod {
  id: string;
  name: string;
  logo: string;
  status: 'active' | 'inactive';
  minWithdrawal: number;
  createdAt: string;
  updatedAt: string;
}

// VPN Configuration
interface VPNConfig {
  vpnRequired: boolean;
  allowedCountries: string[];
}

// App Configuration from Admin Panel
interface AppConfig {
  logoUrl: string;
  appName: string;
  sliderImages: SliderImage[];
  supportUrl: string;
  tutorialVideoId: string;
  referralCommissionRate: number;
  miningBaseAmount: number;
  miningMaxAmount: number;
  miningDuration: number;
}

interface SliderImage {
  id: string;
  url: string;
  alt: string;
  order: number;
  createdAt: string;
}

// Mining Session Data
interface MiningSession {
  isActive: boolean;
  startTime: number | null;
  lastClaimTime: number | null;
  accumulatedAmount: number;
  lastUpdated: number;
}

// Device Management Types
interface DeviceAccountInfo {
  deviceId: string;
  accounts: Array<{
    telegramId: number;
    username: string;
    firstName: string;
    lastName: string;
    joinDate: string;
    isMainAccount: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface DeviceRestrictions {
  maxAccountsPerDevice: number;
  enabled: boolean;
  lastUpdated: string;
  updatedBy: string;
}

// Tab Context
interface TabContextType {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

const TabContext = createContext<TabContextType | undefined>(undefined)

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('home')
  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabContext.Provider>
  )
}

export function useTab() {
  const context = useContext(TabContext)
  if (!context) throw new Error('useTab must be used within TabProvider')
  return context
}

// Device ID generation utility
const generateDeviceId = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.hardwareConcurrency?.toString(),
    screen.width?.toString(),
    screen.height?.toString(),
    navigator.platform
  ].filter(Boolean).join('|');

  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `device_${Math.abs(hash).toString(36)}`;
};

// Device Management Hook
function useDeviceManagement() {
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceAccounts, setDeviceAccounts] = useState<DeviceAccountInfo | null>(null);
  const [deviceRestrictions, setDeviceRestrictions] = useState<DeviceRestrictions>({
    maxAccountsPerDevice: 2,
    enabled: true,
    lastUpdated: new Date().toISOString(),
    updatedBy: 'system'
  });
  const [isCheckingDevice, setIsCheckingDevice] = useState(true);

  useEffect(() => {
    const initializeDevice = async () => {
      try {
        // Generate or get device ID
        let storedDeviceId = localStorage.getItem('deviceId');
        if (!storedDeviceId) {
          storedDeviceId = generateDeviceId();
          localStorage.setItem('deviceId', storedDeviceId);
        }
        setDeviceId(storedDeviceId);

        // Load device restrictions from Firebase
        const restrictionsRef = ref(db, 'deviceRestrictions');
        const unsubscribeRestrictions = onValue(restrictionsRef, (snapshot) => {
          if (snapshot.exists()) {
            setDeviceRestrictions(snapshot.val());
          }
        });

        // Load device accounts
        const deviceRef = ref(db, `devices/${storedDeviceId}`);
        const unsubscribeDevice = onValue(deviceRef, (snapshot) => {
          if (snapshot.exists()) {
            setDeviceAccounts(snapshot.val());
          } else {
            setDeviceAccounts({
              deviceId: storedDeviceId!,
              accounts: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
          setIsCheckingDevice(false);
        });

        return () => {
          unsubscribeRestrictions();
          unsubscribeDevice();
        };
      } catch (error) {
        console.error('Device initialization error:', error);
        setIsCheckingDevice(false);
      }
    };

    initializeDevice();
  }, []);

  const registerAccount = async (userData: UserData): Promise<{ success: boolean; isMainAccount: boolean; error?: string }> => {
    if (!deviceId || !deviceRestrictions.enabled) {
      return { success: true, isMainAccount: true };
    }

    try {
      const deviceRef = ref(db, `devices/${deviceId}`);
      const currentAccounts = deviceAccounts?.accounts || [];
      
      // Check if account already exists on this device
      const existingAccount = currentAccounts.find(acc => acc.telegramId === userData.telegramId);
      if (existingAccount) {
        return { 
          success: true, 
          isMainAccount: existingAccount.isMainAccount 
        };
      }

      // Check account limit
      if (currentAccounts.length >= deviceRestrictions.maxAccountsPerDevice) {
        return { 
          success: false, 
          isMainAccount: false,
          error: `Maximum ${deviceRestrictions.maxAccountsPerDevice} accounts allowed per device` 
        };
      }

      // Determine if this is the main account (first account on device)
      const isMainAccount = currentAccounts.length === 0;

      const newAccount = {
        telegramId: userData.telegramId,
        username: userData.username || '',
        firstName: userData.firstName,
        lastName: userData.lastName || '',
        joinDate: userData.joinDate,
        isMainAccount
      };

      const updatedAccounts = [...currentAccounts, newAccount];
      const deviceData: DeviceAccountInfo = {
        deviceId,
        accounts: updatedAccounts,
        createdAt: deviceAccounts?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await set(deviceRef, deviceData);
      setDeviceAccounts(deviceData);

      return { success: true, isMainAccount };
    } catch (error) {
      console.error('Error registering account:', error);
      return { 
        success: false, 
        isMainAccount: false,
        error: 'Failed to register account on device' 
      };
    }
  };

  const getMainAccount = () => {
    return deviceAccounts?.accounts.find(acc => acc.isMainAccount);
  };

  const canCreateNewAccount = () => {
    if (!deviceRestrictions.enabled) return true;
    return (deviceAccounts?.accounts.length || 0) < deviceRestrictions.maxAccountsPerDevice;
  };

  return {
    deviceId,
    deviceAccounts,
    deviceRestrictions,
    isCheckingDevice,
    registerAccount,
    getMainAccount,
    canCreateNewAccount
  };
}

// Source Protection Component
const SourceProtection = () => {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S and other developer shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I (Developer Tools)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+S (Save Page)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+A (Select All) - Allow only for input fields
      if (e.ctrlKey && e.keyCode === 65) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          return false;
        }
      }
      
      // Ctrl+P (Print)
      if (e.ctrlKey && e.keyCode === 80) {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
        return false;
      }
    };

    // Allow text selection only for specific elements
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      const allowedTags = ['INPUT', 'TEXTAREA'];
      const isContentEditable = target.isContentEditable;
      
      if (!allowedTags.includes(target.tagName) && !isContentEditable) {
        e.preventDefault();
        return false;
      }
    };

    // Disable drag for images and other elements
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Console warning
    const consoleWarning = () => {
      console.clear();
      console.log('%c🚫 ACCESS DENIED 🚫', 'color: red; font-size: 40px; font-weight: bold;');
      console.log('%c⚠️ UNAUTHORIZED ACCESS TO SOURCE CODE IS PROHIBITED', 'color: red; font-size: 16px; font-weight: bold;');
      console.log('%c🔒 This application is protected by Security System', 'color: orange; font-size: 14px;');
      console.log('%c© 2025 - All Rights Reserved', 'color: gray; font-size: 10px;');
    };

    // Anti-debugging measures
    const detectDevTools = () => {
      let devtools = false;
      const threshold = 160;

      const checkDevTools = () => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.outerWidth > threshold) {
          if (!devtools) {
            devtools = true;
            consoleWarning();
          }
        } else {
          devtools = false;
        }
      };

      // Check every 500ms
      setInterval(checkDevTools, 500);
    };

    // Detect if developer tools are open
    const detectDebugger = () => {
      const start = performance.now();
      debugger;
      const end = performance.now();
      
      if (end - start > 100) {
        consoleWarning();
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    // Initialize protection
    consoleWarning();
    detectDevTools();

    // Periodic debugger check
    const debuggerInterval = setInterval(detectDebugger, 1000);

    // Disable image dragging
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.draggable = false;
      img.ondragstart = () => false;
    });

    // CSS injection for additional protection
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      
      img {
        pointer-events: none !important;
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
      }
    `;
    document.head.appendChild(style);

    // Cleanup function
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      clearInterval(debuggerInterval);
      document.head.removeChild(style);
    };
  }, []);

  return null;
};

// Splash Screen Component for Device Limit
interface SplashScreenProps {
  mainAccount?: {
    username: string;
    userId: number;
  };
  maxAccountsPerDevice?: number;
  onRetry: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  mainAccount,
  onRetry 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-blue-500/30 p-8 max-w-md w-full text-white text-center shadow-2xl shadow-blue-500/10">
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center border border-blue-400/40 shadow-lg shadow-blue-500/20">
              <Shield className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
          Important Notice
        </h1>

        {/* Main Account Info */}
        {mainAccount && (
          <div className="bg-blue-500/10 border border-blue-400/40 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-center mb-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-400/30 mr-3">
                <Users className="w-5 h-5 text-blue-300" />
              </div>
              <span className="text-blue-300 font-semibold text-lg">Your Main Account</span>
            </div>
            <div className="text-sm text-blue-200 space-y-1">
              <p className="flex justify-between">
                <span className="text-blue-300">Username:</span>
                <span className="font-mono bg-blue-500/10 px-2 py-1 rounded-2xl">@{mainAccount.username}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-blue-300">User ID:</span>
                <span className="font-mono bg-blue-500/10 px-2 py-1 rounded-2xl">{mainAccount.userId}</span>
              </p>
            </div>
          </div>
        )}

        {/* Rules */}
        <div className="bg-gray-800/40 border border-gray-600/40 rounded-2xl p-4 mb-6">
          <h3 className="text-gray-300 font-semibold mb-2 text-sm">Account Rules</h3>
          <ul className="text-xs text-gray-400 text-left space-y-1">
            <li>• Max 2 accounts per device</li>
            <li>• First account becomes main account</li>
            <li>• Use your main account for best experience</li>
            <li>• Contact support for help</li>
          </ul>
        </div>

        {/* Retry Button */}
        <button
          onClick={onRetry}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-3"
        >
          <RefreshCw className="w-5 h-5" />
          <span className="text-lg">Retry with Main Account</span>
        </button>

        {/* Footer */}
        <p className="text-sm text-gray-400 mt-5 flex items-center justify-center">
          <Shield className="w-4 h-4 mr-2" />
          For assistance, contact support
        </p>
      </div>
    </div>
  );
};

// Firebase Hooks
function useUserData() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deviceCheckComplete, setDeviceCheckComplete] = useState(false)
  const { registerAccount, deviceRestrictions } = useDeviceManagement()

  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    if (!tgUser?.id) {
      setLoading(false)
      setDeviceCheckComplete(true)
      return
    }

    const userRef = ref(db, `users/${tgUser.id}`)
    
    const unsubscribe = onValue(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        
        // Check device restrictions for existing user
        if (deviceRestrictions.enabled) {
          const registration = await registerAccount(data)
          if (!registration.success) {
            // Device limit reached for existing user
            setUserData(null)
            setLoading(false)
            setDeviceCheckComplete(true)
            return
          }
        }
        
        setUserData(data)
        setDeviceCheckComplete(true)
      } else {
        // Check for referral parameter in start command
        const startParam = new URLSearchParams(window.Telegram.WebApp.initData).get('start')
        const referredBy = startParam && startParam !== 'default' ? startParam : undefined
        
        // Create new user with your structure
        const today = new Date().toISOString().split('T')[0];
        const newUser: UserData = {
          telegramId: tgUser.id,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          username: tgUser.username,
          balance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          joinDate: new Date().toISOString(),
          adsWatchedToday: 0,
          tasksCompleted: {},
          referredBy: referredBy,
          referral: {
            code: tgUser.id.toString(),
            bonusGiven: false
          },
          stats: {
            [today]: { ads: 0, earned: 0 }
          }
        }

        // Check device restrictions before creating new user
        if (deviceRestrictions.enabled) {
          const registration = await registerAccount(newUser)
          if (!registration.success) {
            // Device limit reached for new user
            setUserData(null)
            setLoading(false)
            setDeviceCheckComplete(true)
            return
          }
          newUser.isMainAccount = registration.isMainAccount
        }

        set(userRef, newUser)
        setUserData(newUser)
        setDeviceCheckComplete(true)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const updateUser = async (updates: Partial<UserData>) => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    if (!tgUser?.id) return

    const userRef = ref(db, `users/${tgUser.id}`)
    await update(userRef, updates)
  }

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    if (!tgUser?.id) return

    const transactionsRef = ref(db, `transactions/${tgUser.id}`)
    const newTransactionRef = push(transactionsRef)
    await set(newTransactionRef, {
      ...transaction,
      id: newTransactionRef.key
    })
  }

  return { 
    userData, 
    loading: loading || !deviceCheckComplete, 
    updateUser, 
    addTransaction 
  }
}

function useReferralData() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const { userData } = useUserData()

  useEffect(() => {
    if (!userData?.telegramId) return

    const referralRef = ref(db, `referrals/${userData.telegramId}`)
    
    const unsubscribe = onValue(referralRef, (snapshot) => {
      if (snapshot.exists()) {
        setReferralData(snapshot.val())
      } else {
        // Create referral data if it doesn't exist
        const newReferralData: ReferralData = {
          referralCode: userData.telegramId.toString(),
          referredCount: 0,
          referralEarnings: 0,
          referredUsers: {}
        }
        set(referralRef, newReferralData)
        setReferralData(newReferralData)
      }
    })

    return () => unsubscribe()
  }, [userData?.telegramId])

  const updateReferralData = async (updates: Partial<ReferralData>) => {
    if (!userData?.telegramId) return

    const referralRef = ref(db, `referrals/${userData.telegramId}`)
    await update(referralRef, updates)
  }

  return { referralData, updateReferralData }
}

function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    if (!tgUser?.id) return

    const transactionsRef = query(
      ref(db, `transactions/${tgUser.id}`),
      orderByChild('timestamp'),
      limitToLast(50)
    )

    const unsubscribe = onValue(transactionsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const transactionsList = Object.values(data) as Transaction[]
        setTransactions(transactionsList.sort((a, b) => b.timestamp - a.timestamp))
      } else {
        setTransactions([])
      }
    })

    return () => unsubscribe()
  }, [])

  return transactions
}

// Wallet Configuration Hook
function useWalletConfig() {
  const [walletConfig, setWalletConfig] = useState<WalletConfig>({
    currency: 'USDT',
    currencySymbol: '$',
    defaultMinWithdrawal: 10,
    maintenanceMode: false,
    maintenanceMessage: 'Wallet is under maintenance. Please try again later.'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const configRef = ref(db, 'walletConfig');
    
    const unsubscribe = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const configData = snapshot.val();
        setWalletConfig(configData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { walletConfig, loading };
}

// Payment Methods Hook
function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const methodsRef = ref(db, 'paymentMethods');
    
    const unsubscribe = onValue(methodsRef, (snapshot) => {
      if (snapshot.exists()) {
        const methodsData = snapshot.val();
        const methodsArray: PaymentMethod[] = Object.keys(methodsData).map(key => ({
          id: key,
          ...methodsData[key]
        })).filter(method => method.status === 'active'); // Only show active methods
        
        setPaymentMethods(methodsArray);
      } else {
        setPaymentMethods([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { paymentMethods, loading };
}

// App Configuration Hook
function useAppConfig() {
  const [appConfig, setAppConfig] = useState<AppConfig>({
    logoUrl: '',
    appName: 'NanoV1',
    sliderImages: [],
    supportUrl: 'https://t.me/nan0v1_support',
    tutorialVideoId: 'dQw4w9WgXcQ',
    referralCommissionRate: 10,
    miningBaseAmount: 0.00,
    miningMaxAmount: 1.0,
    miningDuration: 60000
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const configRef = ref(db, 'appConfig');
    
    const unsubscribe = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const configData = snapshot.val();
        setAppConfig(configData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { appConfig, loading };
}

// Enhanced hook to track referral earnings from referred users' activities
function useReferralEarningsTracker() {
  const { userData } = useUserData()
  const { referralData, updateReferralData } = useReferralData()
  const { appConfig } = useAppConfig()

  useEffect(() => {
    if (!userData?.telegramId || !referralData?.referredUsers) return

    const checkReferredUsersEarnings = async () => {
      const referredUserIds = Object.keys(referralData.referredUsers)
      let totalCommission = 0
      const updatedReferredUsers = { ...referralData.referredUsers }

      for (const userId of referredUserIds) {
        const userRef = ref(db, `users/${userId}`)
        const userSnap = await get(userRef)
        
        if (userSnap.exists()) {
          const referredUser = userSnap.val()
          const userEarnings = referredUser.totalEarned || 0
          const commissionRate = (appConfig.referralCommissionRate || 10) / 100 // Use config rate
          const expectedCommission = userEarnings * commissionRate
          const currentCommission = updatedReferredUsers[userId].earningsFromUser || 0

          // If referred user earned more, add the difference as commission
          if (expectedCommission > currentCommission) {
            const newCommission = expectedCommission - currentCommission
            totalCommission += newCommission
            updatedReferredUsers[userId].earningsFromUser = expectedCommission
          }
        }
      }

      // Update referral earnings if there's new commission
      if (totalCommission > 0) {
        const newReferralEarnings = (referralData.referralEarnings || 0) + totalCommission
        
        // Update referrer's balance
        const userRef = ref(db, `users/${userData.telegramId}`)
        const userSnap = await get(userRef)
        if (userSnap.exists()) {
          const currentUser = userSnap.val()
          await update(userRef, {
            balance: currentUser.balance + totalCommission,
            totalEarned: currentUser.totalEarned + totalCommission
          })
        }

        // Update referral data
        await updateReferralData({
          referralEarnings: newReferralEarnings,
          referredUsers: updatedReferredUsers
        })

        // Add commission transactions
        const transactionsRef = ref(db, `transactions/${userData.telegramId}`)
        const newTransactionRef = push(transactionsRef)
        await set(newTransactionRef, {
          id: newTransactionRef.key,
          userId: userData.telegramId,
          type: 'referral',
          amount: totalCommission,
          description: `Referral commission from ${referredUserIds.length} users`,
          timestamp: Date.now(),
          status: 'completed'
        })
      }
    }

    // Check for new earnings every 30 seconds
    const interval = setInterval(checkReferredUsersEarnings, 30000)
    checkReferredUsersEarnings() // Initial check

    return () => clearInterval(interval)
  }, [userData?.telegramId, referralData?.referredUsers, appConfig.referralCommissionRate])
}

// Transaction Filtering Hooks

function useWalletTransactions() {
  const transactions = useTransactions()
  
  return useMemo(() => {
    return transactions.filter(tx => 
      tx.type === 'withdrawal' && 
      (tx.status === 'pending' || tx.status === 'completed')
    )
  }, [transactions])
}

function useEarningsTransactions() {
  const transactions = useTransactions()
  
  return useMemo(() => {
    return transactions.filter(tx => 
      ['claim', 'ad_reward', 'task_reward', 'referral'].includes(tx.type) &&
      tx.status === 'completed'
    )
  }, [transactions])
}

// Persistent Mining Hook
function usePersistentMining() {
  const { userData } = useUserData()
  const { appConfig } = useAppConfig()
  
  const [miningData, setMiningData] = useState<MiningSession>({
    isActive: false,
    startTime: null,
    lastClaimTime: null,
    accumulatedAmount: 0,
    lastUpdated: Date.now()
  })

  // Load mining data from localStorage on mount
  useEffect(() => {
    if (!userData?.telegramId) return
    
    const storageKey = `mining_${userData.telegramId}`
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setMiningData(parsed)
      }
    } catch (error) {
      console.error('Error loading mining data:', error)
    }
  }, [userData?.telegramId])

  // Save mining data to localStorage whenever it changes
  useEffect(() => {
    if (!userData?.telegramId) return
    
    const storageKey = `mining_${userData.telegramId}`
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        ...miningData,
        lastUpdated: Date.now()
      }))
    } catch (error) {
      console.error('Error saving mining data:', error)
    }
  }, [miningData, userData?.telegramId])

  const startMining = async (): Promise<boolean> => {
    if (miningData.isActive) return false
    
    setMiningData({
      isActive: true,
      startTime: Date.now(),
      lastClaimTime: null,
      accumulatedAmount: 0,
      lastUpdated: Date.now()
    })
    return true
  }

  const claimMining = async (): Promise<number> => {
    if (!miningData.isActive || !miningData.startTime) return 0
    
    const now = Date.now()
    const elapsed = now - miningData.startTime
    const miningDuration = appConfig.miningDuration || 60000 // 1 minute default
    
    if (elapsed < miningDuration) return 0
    
    // Calculate reward based on elapsed time and config
    const baseAmount = appConfig.miningBaseAmount || 0.001
    const maxAmount = appConfig.miningMaxAmount || 1.0
    
    // Linear progression from base to max over mining duration
    const progress = Math.min(elapsed / miningDuration, 1)
    const reward = baseAmount + (maxAmount - baseAmount) * progress
    
    // Reset mining session
    setMiningData({
      isActive: false,
      startTime: null,
      lastClaimTime: now,
      accumulatedAmount: 0,
      lastUpdated: now
    })
    
    return parseFloat(reward.toFixed(4))
  }

  const stopMining = (): void => {
    setMiningData({
      isActive: false,
      startTime: null,
      lastClaimTime: null,
      accumulatedAmount: 0,
      lastUpdated: Date.now()
    })
  }

  const getRemainingTime = (): number => {
    if (!miningData.isActive || !miningData.startTime) return 0
    
    const now = Date.now()
    const elapsed = now - miningData.startTime
    const miningDuration = appConfig.miningDuration || 60000
    
    return Math.max(0, miningDuration - elapsed)
  }

  const getProgress = (): number => {
    if (!miningData.isActive || !miningData.startTime) return 0
    
    const now = Date.now()
    const elapsed = now - miningData.startTime
    const miningDuration = appConfig.miningDuration || 60000
    
    return Math.min(elapsed / miningDuration, 1)
  }

  const getCurrentAmount = (): number => {
    if (!miningData.isActive || !miningData.startTime) return 0
    
    const progress = getProgress()
    const baseAmount = appConfig.miningBaseAmount || 0.001
    const maxAmount = appConfig.miningMaxAmount || 1.0
    
    return parseFloat((baseAmount + (maxAmount - baseAmount) * progress).toFixed(4))
  }

  const canClaim = (): boolean => {
    return miningData.isActive && getRemainingTime() <= 0
  }

  const isActive = (): boolean => {
    return miningData.isActive
  }

  return {
    miningData,
    startMining,
    claimMining,
    stopMining,
    getRemainingTime,
    getProgress,
    getCurrentAmount,
    canClaim: canClaim(),
    isActive: isActive()
  }
}

// Simple countdown hook for UI only
function useMiningCountdown(remainingTime: number) {
  const [timeLeft, setTimeLeft] = useState(remainingTime)

  useEffect(() => {
    setTimeLeft(remainingTime)
  }, [remainingTime])

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const parts = useMemo(() => {
    const totalSec = Math.max(0, Math.floor(timeLeft / 1000))
    const s = totalSec.toString().padStart(2, '0')
    return { s }
  }, [timeLeft])

  return { parts, timeLeft }
}

// History Modal Component
interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const transactions = useEarningsTransactions();
  const { walletConfig } = useWalletConfig();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'claim':
        return <Coins className="w-4 h-4 text-yellow-400" />;
      case 'ad_reward':
        return <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
        </svg>;
      case 'task_reward':
        return <FaTasks className="w-4 h-4 text-green-400" />;
      case 'referral':
        return <Users className="w-4 h-4 text-purple-400" />;
      default:
        return <Coins className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransactionTypeLabel = (type: TransactionType) => {
    switch (type) {
      case 'claim':
        return 'Daily Claim';
      case 'ad_reward':
        return 'Ad Reward';
      case 'task_reward':
        return 'Task Reward';
      case 'referral':
        return 'Referral Bonus';
      default:
        return type;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#151516] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Earnings History</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No earnings history yet</p>
              <p className="text-gray-500 text-sm mt-1">Complete tasks and watch ads to see your earnings here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/10 rounded-lg">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {getTransactionTypeLabel(transaction.type)}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {formatDate(transaction.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold text-sm">
                        +{walletConfig.currencySymbol}{transaction.amount.toFixed(2)}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {transaction.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-white/10 text-gray-300 disabled:opacity-40 hover:text-white hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
            
            <span className="text-gray-300 text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-white/10 text-gray-300 disabled:opacity-40 hover:text-white hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Topbar Component
const Topbar = () => {
  const { userData } = useUserData()
  const { walletConfig } = useWalletConfig()
  const { appConfig } = useAppConfig()

  return (
    <div className="flex justify-center w-full pt-16">
      <div className="fixed top-0 w-full max-w-md px-4 py-3 bg-[#151516] shadow-lg z-50 rounded-b-3xl">
        <div className="flex justify-between items-center border-l-2 border-[#4c9ce2] pl-2">
          <div className="flex items-center gap-3">
            <img
              src={appConfig.logoUrl || logo}
              alt="Logo"
              width={45}
              height={45}
              className="rounded-full"
            />
            <div className="flex flex-col leading-tight text-white">
              <span className="text-md font-semibold">{appConfig.appName || 'NanoV1'}</span>
              <span className="text-xs text-gray-400">
                {userData ? `@${userData.username || 'user'}` : 'Loading...'}
              </span>
            </div>
          </div>
          <div className="bg-[#007aff] text-white px-3 py-0.5 rounded-full flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            <span>{walletConfig.currencySymbol}{userData?.balance.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Navigation Bar Component
const NavigationBar = () => {
  const { activeTab, setActiveTab } = useTab()

  const tabs: { id: TabType; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', Icon: HomeIcon },
    { id: 'earn', label: 'Earn', Icon: EarnIcon },
    { id: 'friends', label: 'Friends', Icon: FriendsIcon },
    { id: 'profile', label: 'Profile', Icon: ProfileIcon },
  ]

  return (
    <div className="flex justify-center w-full">
      <div className="fixed bottom-0 bg-black border-t border-gray-800 w-full rounded-t-3xl overflow-hidden max-w-md">
        <div className="flex justify-between px-4 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center"
              >
                <tab.Icon className={`w-10 h-10 ${isActive ? 'text-[#4c9ce2]' : 'text-[#727272]'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-[#4c9ce2]' : 'text-[#727272]'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Tab Container Component
const TabContainer = () => {
  const { activeTab } = useTab()

  return (
    <div className="flex-1 overflow-hidden max-w-md mx-auto pt-[44px] pb-[72px]">
      <div className={activeTab === 'home' ? 'block' : 'hidden'}>
        <HomeTab />
      </div>

      <div className={activeTab === 'friends' ? 'block' : 'hidden'}>
        <FriendsTab />
      </div>

      <div className={activeTab === 'earn' ? 'block' : 'hidden'}>
        <EarnTab />
      </div>

      <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
        <ProfileTab />
      </div>
    </div>
  )
}

// Home Tab Component with libtl.com integration
const HomeTab: React.FC = () => {
  const { userData, updateUser, addTransaction } = useUserData()
  const { referralData } = useReferralData()
  const { walletConfig } = useWalletConfig()
  const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user

  const {
    startMining,
    claimMining,
    getRemainingTime,
    getCurrentAmount,
    canClaim,
    isActive,
  } = usePersistentMining()

  const remainingTime = getRemainingTime()
  const currentAmount = getCurrentAmount()
  const { parts } = useMiningCountdown(remainingTime)

  // libtl.com rewarded ad setup
  const [showingAd, setShowingAd] = useState(false)
  const [libtlLoaded, setLibtlLoaded] = useState(false)

  useEffect(() => {
    // Inject the libtl SDK once
    const script = document.createElement('script')
    script.src = '//libtl.com/sdk.js'
    script.async = true
    script.setAttribute('data-zone', '10192342')
    script.setAttribute('data-sdk', 'show_10192342')
    
    script.onload = () => {
      console.log('libtl SDK loaded successfully')
      setLibtlLoaded(true)
    }
    
    script.onerror = () => {
      console.error('Failed to load libtl SDK')
      setLibtlLoaded(false)
    }
    
    document.body.appendChild(script)
    
    return () => {
      // Clean up the script if the component unmounts
      try {
        document.body.removeChild(script)
      } catch {}
    }
  }, [])

  // Helper to show the rewarded ad and resolve when it's done/closed
  const showRewardedAd = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const showAdFunction = (window as any).show_10192342
        if (typeof showAdFunction === 'function') {
          // libtl SDK function - we assume it returns a promise or uses callbacks
          const result = showAdFunction()
          
          if (result && typeof result.then === 'function') {
            // If it returns a promise, wait for it
            result
              .then(() => {
                console.log('libtl ad completed successfully')
                resolve(true)
              })
              .catch(() => {
                console.log('libtl ad failed or was skipped')
                resolve(false)
              })
          } else {
            // If no promise returned, assume success after a reasonable timeout
            console.log('libtl ad started (no promise returned)')
            setTimeout(() => {
              resolve(true)
            }, 30000) // 30 second timeout as fallback
          }
        } else {
          console.warn('libtl show function not available')
          // If function not available, proceed anyway to not block users
          resolve(true)
        }
      } catch (error) {
        console.error('Error showing libtl ad:', error)
        // Don't block user flow if ad fails
        resolve(true)
      }
    })
  }

  // Enhanced claim handler with libtl ad gate
  const handleClaim = async () => {
    if (!userData) return

    try {
      // If mining not active → start session
      if (!isActive) {
        const started = await startMining()
        if (started) {
          window?.Telegram?.WebApp?.showPopup?.({
            title: 'Mining Started!',
            message: 'Your mining session has started.',
            buttons: [{ type: 'ok' }],
          })
        }
        return
      }

      // If claimable → show rewarded ad first, then claim
      if (canClaim) {
        setShowingAd(true)
        
        try {
          // Show libtl rewarded ad
          const adCompleted = await showRewardedAd()
          
          if (adCompleted) {
            // Ad was completed successfully, proceed with claim
            const claimAmount = await claimMining()
            if (claimAmount && claimAmount > 0) {
              const newBalance = (userData.balance || 0) + claimAmount
              const newTotalEarned = (userData.totalEarned || 0) + claimAmount

              await updateUser({
                balance: newBalance,
                totalEarned: newTotalEarned,
              })

              await addTransaction({
                userId: userData.telegramId,
                type: 'claim',
                amount: claimAmount,
                description: 'Minute mining reward',
                timestamp: Date.now(),
                status: 'completed',
              })

              window?.Telegram?.WebApp?.showPopup?.({
                title: 'Claim Successful!',
                message: `You claimed ${walletConfig.currencySymbol}${claimAmount.toFixed(2)}`,
                buttons: [{ type: 'ok' }],
              })
            }
          } else {
            // Ad was not completed
            window?.Telegram?.WebApp?.showPopup?.({
              title: 'Ad Not Completed',
              message: 'Please watch the ad completely to claim your reward.',
              buttons: [{ type: 'ok' }],
            })
          }
        } catch (error) {
          console.error('Error in ad viewing process:', error)
          window?.Telegram?.WebApp?.showPopup?.({
            title: 'Error',
            message: 'Something went wrong with the ad. Please try again.',
            buttons: [{ type: 'ok' }],
          })
        } finally {
          setShowingAd(false)
        }
      } else {
        // Not ready to claim yet
        const remaining = getRemainingTime()
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        
        window?.Telegram?.WebApp?.showPopup?.({
          title: 'Not Ready Yet',
          message: `Come back in ${minutes}:${seconds.toString().padStart(2, '0')} to claim!`,
          buttons: [{ type: 'ok' }],
        })
      }
    } catch (error) {
      console.error('Error in mining claim process:', error)
      window?.Telegram?.WebApp?.showPopup?.({
        title: 'Error',
        message: 'Something went wrong. Please try again.',
        buttons: [{ type: 'ok' }],
      })
      setShowingAd(false)
    }
  }

  return (
    <div className="home-tab-con transition-all duration-300 pb-10">
      <div className="relative mx-4 mt-0 mb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            Welcome {tgUser?.first_name || 'User'}
          </h1>
          <Bell className="w-6 h-6 text-gray-400 cursor-pointer" />
        </div>
        <p className="text-gray-400 text-sm mt-1">You're doing great 🐾</p>
        <div className="absolute -top-2 -right-2">
          <img src={sparkles} alt="Sparkles" width={40} height={40} />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mt-8">
        <div className="relative">
          <img src={fan} alt="fan" width={220} height={220} className="animate-spinSlow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-[#1f1f1f] rounded-full flex items-center justify-center border border-gray-700">
              <span className="text-white text-lg font-bold">▲</span>
            </div>
          </div>
        </div>

        {/* Live animated amount */}
        <div className="text-white mt-5 text-2xl font-bold">
          {currentAmount.toFixed(2)}{' '}
          <span className="text-purple-400">{walletConfig.currencySymbol}</span>
        </div>

        <div className="mt-2 text-sm text-gray-300">
          {isActive ? (
            <>
              {canClaim ? (
                <span className="font-semibold text-green-400">Ready to Claim! 🎉</span>
              ) : (
                <>
                  Next Claim in:{' '}
                  <span className="font-semibold text-yellow-400">{`00:${parts.s}`}</span>
                </>
              )}
            </>
          ) : (
            <span className="text-gray-400">Press Start to begin mining</span>
          )}
        </div>

        <div className="flex gap-4 mt-6">
          <button
            className={`w-[250px] py-2 rounded-lg font-semibold shadow-md transition ${
              (!isActive || canClaim) && !showingAd
                ? 'bg-white text-black hover:bg-gray-200'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'
            }`}
            onClick={handleClaim}
            disabled={(isActive && !canClaim) || showingAd}
          >
            {!isActive
              ? 'Start Mining'
              : canClaim
              ? (showingAd
                  ? 'Showing Ad...'
                  : `Claim ${walletConfig.currencySymbol}${currentAmount.toFixed(2)}`)
              : 'Mining...'}
          </button>
        </div>

        {/* libtl SDK status indicator */}
        {!libtlLoaded && (
          <div className="mt-4 text-xs text-yellow-400">
            Loading ads provider... Please wait
          </div>
        )}
      </div>

      <div className="bg-[#ffffff0d] border border-[#2d2d2e] rounded-xl mx-4 mt-8 p-4 flex justify-between items-center">
        <div className="flex flex-col items-center w-1/2 border-r border-[#2d2d2e]">
          <div className="shine-effect text-2xl font-bold text-green-400">
            {walletConfig.currencySymbol}
            {(userData?.totalEarned ?? 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Total Earned</div>
        </div>
        <div className="flex flex-col items-center w-1/2">
          <div className="shine-effect text-2xl font-bold text-purple-400">
            {referralData?.referredCount || 0}
          </div>
          <div className="text-sm text-gray-400">Total Referrals</div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Daily Tasks Component with Fixed Task Completion
interface DailyTasksProps {
  userData?: UserData | null;
  onCompleteTask: (taskId: string, reward: number) => Promise<boolean>;
  onBack: () => void;
}

const SERVER_CONFIG = {
  baseUrl: 'https://0d8e909a-7fc9-4bf7-b381-5bb3f4b2ff7f.e1-us-east-azure.choreoapps.dev',
  endpoints: {
    telegram: '/api/telegram/check-membership',
    connect: '/api/frontend/connect',
    health: '/api/health'
  }
};

const DailyTasks: React.FC<DailyTasksProps> = ({
  userData,
  onCompleteTask,
  onBack,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyTaskFilter, setDailyTaskFilter] = useState("All");
  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  const [claimingTask, setClaimingTask] = useState<string | null>(null);
  const [startingTask, setStartingTask] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
  const [serverStatus, setServerStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [connectionId, setConnectionId] = useState<string>('');
  const { walletConfig } = useWalletConfig();

  useEffect(() => {
    registerFrontendConnection();
  }, [userData]);

  useEffect(() => {
    const tasksRef = ref(db, 'tasks');

    const unsubscribe = onValue(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const tasksData: Task[] = [];
        snapshot.forEach((childSnapshot) => {
          const taskData = childSnapshot.val();
          const task: Task = {
            ...taskData,
            id: childSnapshot.key as string,
            usersQuantity: taskData.usersQuantity || 0,
            completedUsers: taskData.completedUsers || 0,
            telegramChannel: taskData.telegramChannel || '',
            checkMembership: taskData.checkMembership || false,
            inviteLink: taskData.inviteLink || ''
          };
          tasksData.push(task);
        });
        setTasks(tasksData);
      } else {
        setTasks([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const registerFrontendConnection = async () => {
    try {
      setServerStatus('connecting');
      const response = await fetch(`${SERVER_CONFIG.baseUrl}${SERVER_CONFIG.endpoints.connect}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          userData: userData ? {
            telegramId: userData.telegramId,
            username: userData.username,
          } : null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionId(data.connectionId);
        setServerStatus('connected');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Frontend connection failed:', error);
      setServerStatus('error');
    }
  };

  const checkServerHealth = async () => {
    try {
      const response = await fetch(`${SERVER_CONFIG.baseUrl}${SERVER_CONFIG.endpoints.health}`);
      if (response.ok) {
        setServerStatus('connected');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setServerStatus('error');
      return false;
    }
  };

  const checkTelegramMembership = async (taskId: string): Promise<boolean> => {
    if (!userData) {
      setTaskErrors(prev => ({
        ...prev,
        [taskId]: "User not logged in"
      }));
      return false;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task?.telegramChannel) {
      setTaskErrors(prev => ({
        ...prev,
        [taskId]: "Telegram channel not configured"
      }));
      return false;
    }

    const isHealthy = await checkServerHealth();
    if (!isHealthy) {
      setTaskErrors(prev => ({
        ...prev,
        [taskId]: "Server is unavailable"
      }));
      return false;
    }

    try {
      const response = await fetch(`${SERVER_CONFIG.baseUrl}${SERVER_CONFIG.endpoints.telegram}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.telegramId,
          username: userData.username,
          channel: task.telegramChannel,
          connectionId: connectionId,
          taskId: taskId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      return result.isMember;

    } catch (error: any) {
      setTaskErrors(prev => ({
        ...prev,
        [taskId]: `Verification failed: ${error.message}`
      }));
      return false;
    }
  };

  const filteredTasks =
    dailyTaskFilter === "All"
      ? tasks
      : tasks.filter((task) => task.category === dailyTaskFilter);

  const totalPages = Math.ceil(filteredTasks.length / 3);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * 3,
    currentPage * 3
  );

  const getTaskAvailability = (task: Task) => {
    if (!userData) {
      return { canStart: false, reason: "User not logged in" };
    }

    const completedTask = userData.tasksCompleted?.[task.id];
    const completedCount = completedTask ? 1 : 0;
    const isCompleted = completedCount >= task.totalRequired;
    const usersQuantity = task.usersQuantity || 0;
    const completedUsers = task.completedUsers || 0;

    // Check if task is disabled for all users (users quantity limit reached)
    if (usersQuantity > 0 && completedUsers >= usersQuantity) {
      return { canStart: false, reason: "This task is no longer available" };
    }

    if (isCompleted) {
      return { canStart: false, reason: "You've completed this task" };
    }

    return { canStart: true };
  };

  const incrementCompletedUsers = async (taskId: string): Promise<boolean> => {
    const taskRef = ref(db, `tasks/${taskId}`);

    try {
      const result = await runTransaction(taskRef, (currentTask: any) => {
        if (!currentTask) return;

        const usersQuantity = currentTask.usersQuantity || 0;
        const completedUsers = currentTask.completedUsers || 0;

        // Only increment if we haven't reached the limit
        if (usersQuantity > 0 && completedUsers >= usersQuantity) {
          throw new Error("Task users quantity limit reached");
        }

        currentTask.completedUsers = (completedUsers || 0) + 1;
        return currentTask;
      });

      return result.committed;
    } catch (error) {
      console.error('Error incrementing completed users:', error);
      return false;
    }
  };

  // FIXED: Enhanced task completion handler
  const handleCompleteTaskInternal = async (taskId: string): Promise<boolean> => {
    if (!userData) {
      console.error('User data not available');
      return false;
    }

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return false;
      }

      // Check if task is already completed
      const currentCompletion = userData.tasksCompleted?.[taskId];
      if (currentCompletion) {
        console.log('Task already completed');
        return false;
      }

      // Call the parent completion handler with reward
      const success = await onCompleteTask(taskId, task.reward);
      
      if (success) {
        console.log('Task completed successfully:', taskId);
        return true;
      } else {
        console.error('Failed to complete task in parent handler');
        return false;
      }
    } catch (error) {
      console.error('Error in handleCompleteTaskInternal:', error);
      return false;
    }
  };

  const handleStartTask = async (task: Task) => {
    if (!userData) {
      alert("Please log in to start tasks");
      return;
    }

    if (task.category === "TG Tasks" && task.checkMembership) {
      const isHealthy = await checkServerHealth();
      if (!isHealthy) {
        setTaskErrors(prev => ({
          ...prev,
          [task.id]: "Server is currently unavailable"
        }));
        return;
      }
    }

    setStartingTask(task.id);
    setTaskErrors(prev => ({ ...prev, [task.id]: '' }));

    try {
      setPendingTask(task);

      if (task.category === "TG Tasks" && task.telegramChannel) {
        const telegramUrl = task.inviteLink || `https://t.me/${task.telegramChannel}`;
        window.open(telegramUrl, "_blank", "noopener,noreferrer");
        
        // Show better instructions
        window.Telegram?.WebApp?.showPopup?.({
          title: 'Join Channel',
          message: `1. Join the channel: ${task.telegramChannel}\n2. Wait a few seconds after joining\n3. Return here and click "Verify & Claim"`,
          buttons: [{ type: 'ok' }]
        });
      } else if (task.url) {
        window.open(task.url, "_blank", "noopener,noreferrer");
      } else {
        // For tasks without URLs, complete immediately
        setTimeout(() => {
          handleClaimTask(task);
        }, 1000);
      }
    } catch (error) {
      console.error('Error starting task:', error);
      setTaskErrors(prev => ({
        ...prev,
        [task.id]: "Error starting task"
      }));
    } finally {
      setStartingTask(null);
    }
  };

  // FIXED: Enhanced claim task handler
  const handleClaimTask = async (task: Task): Promise<void> => {
    if (!userData) {
      alert("User data not available");
      return;
    }

    setClaimingTask(task.id);
    setTaskErrors(prev => ({ ...prev, [task.id]: '' }));

    try {
      let verificationPassed = true;

      // For TG Tasks, verify membership first
      if (task.category === "TG Tasks" && task.telegramChannel && task.checkMembership) {
        verificationPassed = await checkTelegramMembership(task.id);
        
        if (!verificationPassed) {
          const errorMsg = "We couldn't verify that you joined the channel. Please make sure you joined and try again.";
          setTaskErrors(prev => ({
            ...prev,
            [task.id]: errorMsg
          }));
          window.Telegram?.WebApp?.showPopup?.({
            title: 'Verification Failed',
            message: errorMsg,
            buttons: [{ type: 'ok' }]
          });
          return;
        }
      }

      // Check if we can still complete this task (users quantity limit)
      const usersQuantity = task.usersQuantity || 0;
      const completedUsers = task.completedUsers || 0;

      if (usersQuantity > 0 && completedUsers >= usersQuantity) {
        const errorMsg = "This task is no longer available (user limit reached)";
        setTaskErrors(prev => ({
          ...prev,
          [task.id]: errorMsg
        }));
        window.Telegram?.WebApp?.showPopup?.({
          title: 'Task Unavailable',
          message: errorMsg,
          buttons: [{ type: 'ok' }]
        });
        return;
      }

      // Increment completed users count
      if (usersQuantity > 0) {
        const userIncremented = await incrementCompletedUsers(task.id);
        if (!userIncremented) {
          const errorMsg = "This task is no longer available";
          setTaskErrors(prev => ({
            ...prev,
            [task.id]: errorMsg
          }));
          window.Telegram?.WebApp?.showPopup?.({
            title: 'Task Unavailable',
            message: errorMsg,
            buttons: [{ type: 'ok' }]
          });
          return;
        }
      }

      // Complete the task
      const success = await handleCompleteTaskInternal(task.id);

      if (success) {
        setPendingTask(null);
        
        // Show success message
        window.Telegram?.WebApp?.showPopup?.({
          title: 'Task Completed! 🎉',
          message: `You earned ${walletConfig.currencySymbol}${task.reward.toFixed(2)}`,
          buttons: [{ type: 'ok' }]
        });
        
        // Clear any previous errors
        setTaskErrors(prev => ({ ...prev, [task.id]: '' }));
      } else {
        const errorMsg = "Failed to complete task. Please try again.";
        setTaskErrors(prev => ({
          ...prev,
          [task.id]: errorMsg
        }));
        window.Telegram?.WebApp?.showPopup?.({
          title: 'Error',
          message: errorMsg,
          buttons: [{ type: 'ok' }]
        });
      }
    } catch (error) {
      console.error('Error claiming task:', error);
      const errorMsg = "An error occurred while completing the task";
      setTaskErrors(prev => ({
        ...prev,
        [task.id]: errorMsg
      }));
      window.Telegram?.WebApp?.showPopup?.({
        title: 'Error',
        message: errorMsg,
        buttons: [{ type: 'ok' }]
      });
    } finally {
      setClaimingTask(null);
    }
  };

  const handleCancelTask = async (task: Task) => {
    setPendingTask(null);
    setTaskErrors(prev => ({ ...prev, [task.id]: '' }));
  };

  const getTaskIcon = (category: string) => {
    if (category === "TG Tasks") {
      return <FaTelegram className="w-5 h-5 text-white" />;
    }
    return <FaTasks className="w-5 h-5 text-white" />;
  };

  const getServerStatusIcon = () => {
    switch (serverStatus) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-green-400" />;
      case 'error':
        return <WifiOff className="w-5 h-5 text-red-400" />;
      default:
        return <Server className="w-5 h-5 text-yellow-400 animate-pulse" />;
    }
  };

  const handleRetryConnection = async () => {
    await registerFrontendConnection();
  };

  const isServerOnline = serverStatus === 'connected';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f172a] px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-8">
            <div className="flex items-center cursor-pointer group" onClick={onBack}>
              <div className="bg-white/10 p-2 rounded-2xl group-hover:bg-white/20 transition-all duration-300 mr-3">
                <ArrowLeft className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold text-white">Daily Tasks</h1>
              <p className="text-blue-200 text-sm mt-1">Complete tasks and earn rewards</p>
            </div>
            <div className="w-12"></div>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] px-4 py-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-2xl hover:bg-white/20 transition-all duration-300 mr-3"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white">Daily Tasks</h1>
              {getServerStatusIcon()}
            </div>
            <p className="text-blue-200 text-sm">Complete tasks and earn rewards</p>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Server Offline Warning */}
        {!isServerOnline && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Server Offline</span>
            </div>
            <p className="text-red-300 text-xs">
              Telegram tasks are currently unavailable. Please try again later.
            </p>
            <button
              onClick={handleRetryConnection}
              className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-all mt-2"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-1 mb-6">
          <div className="flex justify-between gap-1">
            {["All", "Socials Tasks", "TG Tasks"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setDailyTaskFilter(tab);
                  setCurrentPage(1);
                  setTaskErrors({});
                }}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2
                  ${dailyTaskFilter === tab
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                    : "text-blue-200 hover:text-white hover:bg-white/10"
                  }`}
              >
                {tab === "TG Tasks" && <FaTelegram className="w-4 h-4" />}
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {paginatedTasks.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-center">
              <FaTasks className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-50" />
              <p className="text-blue-300 font-semibold">
                {tasks.length === 0 ? "No tasks available" : "No tasks in this category"}
              </p>
              <p className="text-blue-200 text-sm mt-1">
                Check back later for new tasks
              </p>
            </div>
          ) : (
            paginatedTasks.map((task) => {
              const completedTask = userData?.tasksCompleted?.[task.id];
              const completedCount = completedTask ? 1 : 0;
              const isCompleted = completedCount >= task.totalRequired;
              const isPending = pendingTask?.id === task.id;
              const isStarting = startingTask === task.id;
              const isClaiming = claimingTask === task.id;
              const availability = getTaskAvailability(task);
              const isTelegramTask = task.category === "TG Tasks" && task.checkMembership;
              const isTaskDisabled = isTelegramTask && !isServerOnline;
              const usersQuantity = task.usersQuantity || 0;
              const completedUsers = task.completedUsers || 0;
              const isTaskLimitReached = usersQuantity > 0 && completedUsers >= usersQuantity;

              return (
                <div
                  key={task.id}
                  className={`bg-white/10 backdrop-blur-lg rounded-2xl border transition-all duration-300
                    ${(isTaskDisabled || isTaskLimitReached) ? 'border-red-500/20 opacity-70' :
                      isPending ? 'border-yellow-500/30' : 'border-white/20 hover:border-white/30'}`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Task Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300
                        ${isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                          isPending ? 'bg-gradient-to-r from-yellow-500 to-amber-600' :
                            !availability.canStart || isTaskDisabled || isTaskLimitReached ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                              'bg-gradient-to-r from-blue-500 to-cyan-600'}`}
                      >
                        {getTaskIcon(task.category)}
                      </div>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-base leading-tight mb-1 ${(isTaskDisabled || isTaskLimitReached) ? 'text-gray-400' : 'text-white'
                              }`}>
                              {task.name}
                            </h3>

                            {/* Telegram Channel */}
                            {task.telegramChannel && (
                              <div className="flex items-center gap-1 mb-2">
                                <FaTelegram className={`w-3 h-3 ${(isTaskDisabled || isTaskLimitReached) ? 'text-gray-500' : 'text-blue-300'}`} />
                                <span className={`text-xs ${(isTaskDisabled || isTaskLimitReached) ? 'text-gray-500' : 'text-blue-300'}`}>
                                  @{task.telegramChannel}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Reward */}
                          <div className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded-lg border border-green-500/30 ml-2 flex-shrink-0">
                            +${task.reward.toFixed(2)}
                          </div>
                        </div>

                        {/* Progress and Stats */}
                        <div className="space-y-2">
                          {/* User Progress */}
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${(isTaskDisabled || isTaskLimitReached) ? 'text-gray-500' : 'text-blue-300'}`}>
                              Your progress: {completedCount}/{task.totalRequired}
                            </span>
                            {isCompleted && (
                              <span className="text-green-400 text-xs font-medium bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                                Completed
                              </span>
                            )}
                          </div>

                          {/* Users Quantity Stats */}
                          {usersQuantity > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-blue-300">
                                <Users className="w-3 h-3" />
                                <span>
                                  {completedUsers}/{usersQuantity} users
                                  {" "}• Remaining: {usersQuantity - completedUsers}
                                </span>
                              </div>
                              {isTaskLimitReached && (
                                <span className="text-red-400 text-xs font-medium bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                                  Limit Reached
                                </span>
                              )}
                            </div>
                          )}

                          {taskErrors[task.id] && (
                            <p className="text-red-400 text-xs bg-red-500/10 px-2 py-1 rounded border border-red-500/20 whitespace-pre-line">
                              ⚠️ {taskErrors[task.id]}
                            </p>
                          )}
                        </div>

                        {/* Action Button */}
                        <div className="mt-3">
                          {isPending ? (
                            <div className="flex gap-2">
                              <button
                                className="flex-1 px-4 py-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white transition-all duration-300 flex items-center justify-center gap-2"
                                disabled={isClaiming || !isServerOnline || isTaskLimitReached}
                                onClick={() => handleClaimTask(task)}
                              >
                                {isClaiming ? (
                                  <>
                                    <Clock className="w-4 h-4 animate-spin" />
                                    Verifying...
                                  </>
                                ) : (
                                  "Verify & Claim"
                                )}
                              </button>
                              <button
                                className="px-3 py-2 rounded-xl text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all duration-300"
                                onClick={() => handleCancelTask(task)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className={`w-full px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2
                                ${isCompleted
                                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                  : !availability.canStart || isStarting || isTaskDisabled || isTaskLimitReached
                                    ? "bg-red-500/50 text-red-200 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                                }`}
                              disabled={isCompleted || !availability.canStart || isStarting || isTaskDisabled || isTaskLimitReached}
                              onClick={() => handleStartTask(task)}
                            >
                              {isCompleted ? (
                                "Completed"
                              ) : isStarting ? (
                                <>
                                  <Clock className="w-4 h-4 animate-spin" />
                                  Starting...
                                </>
                              ) : !availability.canStart ? (
                                "Unavailable"
                              ) : isTaskDisabled ? (
                                "Offline"
                              ) : isTaskLimitReached ? (
                                "Unavailable"
                              ) : task.buttonText ? (
                                task.buttonText
                              ) : task.category === "TG Tasks" ? (
                                <>
                                  <FaTelegram className="w-4 h-4" />
                                  Join Channel
                                </>
                              ) : (
                                "🚀 Start Task"
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 space-x-3">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm rounded-lg bg-white/10 text-blue-300 disabled:opacity-40 hover:text-white hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              Previous
            </button>
            <span className="text-blue-300 text-sm font-medium min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm rounded-lg bg-white/10 text-blue-300 disabled:opacity-40 hover:text-white hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced AdsDashboard with proper AdExtra integration and Firebase appId updating
const AdsDashboard: React.FC<{ userData?: UserData | null }> = ({ userData }) => {
  const [ads, setAds] = React.useState<Ad[]>([
    { id: 1, title: 'Ads1', description: '', watched: 0, dailyLimit: 5, hourlyLimit: 2, provider: 'gigapub', waitTime: 5, cooldown: 60, reward: 0.5, enabled: true, appId: '4338' },
    { id: 2, title: 'Ads2', description: '', watched: 0, dailyLimit: 5, hourlyLimit: 2, provider: 'onclicka', waitTime: 5, cooldown: 60, reward: 0.5, enabled: true, appId: '6098415' },
    { id: 3, title: 'Ads3', description: '', watched: 0, dailyLimit: 5, hourlyLimit: 2, provider: 'adsovio', waitTime: 5, cooldown: 60, reward: 0.5, enabled: true, appId: '7721' },
    { id: 4, title: 'Ads4', description: '', watched: 0, dailyLimit: 5, hourlyLimit: 2, provider: 'adextra', waitTime: 5, cooldown: 60, reward: 0.5, enabled: true, appId: 'STATIC_FROM_INDEX_HTML' },
  ]);

  const [isWatchingAd, setIsWatchingAd] = React.useState<number | null>(null);
  const [scriptLoaded, setScriptLoaded] = React.useState<Record<Provider, boolean>>({
    gigapub: false,
    onclicka: false,
    adsovio: false,
    adextra: true, // AdExtra comes from index.html
  });
  const [scriptsInitialized, setScriptsInitialized] = React.useState<Record<Provider, boolean>>({
    gigapub: false,
    onclicka: false,
    adsovio: false,
    adextra: true,
  });
  const [cooldowns, setCooldowns] = React.useState<Record<string, number>>({});
  const [lastWatched, setLastWatched] = React.useState<Record<string, Date>>({});
  const [userMessages, setUserMessages] = React.useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [concurrentLock, setConcurrentLock] = React.useState<boolean>(false);
  const [timeUntilReset, setTimeUntilReset] = React.useState<string>('24:00:00');

  const { updateUser, addTransaction } = useUserData();
  const { walletConfig } = useWalletConfig();

  // Concurrency lock management
  const concurrencyLockRef = useRef<boolean>(false);

  const showMessage = (type: 'success' | 'error' | 'info', message: string) => {
    setUserMessages({ type, message });
    setTimeout(() => setUserMessages(null), 4000);
  };

  const getBangladeshTime = (): Date => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * 6);
  };
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  // Firebase helpers
  const firebaseRequest = {
    updateUser: async (telegramId: number, updates: Partial<UserData>): Promise<boolean> => {
      try {
        await update(ref(db, `users/${telegramId}`), updates);
        return true;
      } catch (e) {
        console.error('Error updating user:', e);
        return false;
      }
    },
    addTransaction: async (transaction: any): Promise<string> => {
      const transactionsRef = ref(db, 'transactions');
      const newRef = push(transactionsRef);
      const id = newRef.key!;
      await set(newRef, { ...transaction, id });
      return id;
    },
    addReferralCommission: async (referredUserId: number, earnedAmount: number): Promise<boolean> => {
      try {
        const commissionRate = 10;
        const referredUserRef = ref(db, `users/${referredUserId}`);
        const referredUserSnapshot = await get(referredUserRef);
        if (!referredUserSnapshot.exists()) return false;

        const referredUser = referredUserSnapshot.val() as UserData;
        const referrerId = referredUser.referredBy;
        if (!referrerId) return false;

        const commission = earnedAmount * (commissionRate / 100);
        const referrerRef = ref(db, `users/${referrerId}`);
        const referrerSnapshot = await get(referrerRef);
        if (!referrerSnapshot.exists()) return false;

        const referrer = referrerSnapshot.val() as UserData;
        const newBalance = (referrer.balance || 0) + commission;
        const newTotalEarned = (referrer.totalEarned || 0) + commission;
        await update(referrerRef, { balance: newBalance, totalEarned: newTotalEarned });

        const referralRef = ref(db, `referrals/${referrerId}`);
        const referralSnapshot = await get(referralRef);
        if (referralSnapshot.exists()) {
          const data = referralSnapshot.val() as any;
          if (!data.referredUsers) data.referredUsers = {};
          if (data.referredUsers[referredUserId]) {
            data.referredUsers[referredUserId].totalEarned += earnedAmount;
            data.referredUsers[referredUserId].commissionEarned += commission;
          } else {
            data.referredUsers[referredUserId] = {
              joinedAt: new Date().toISOString(),
              totalEarned: earnedAmount,
              commissionEarned: commission,
            };
          }
          data.referralEarnings = (data.referralEarnings || 0) + commission;
          data.referredCount = Object.keys(data.referredUsers).length;
          await set(referralRef, data);
        }

        await firebaseRequest.addTransaction({
          userId: referrerId.toString(),
          type: 'referral_commission',
          amount: commission,
          description: `${commissionRate}% commission from referral ${referredUser.firstName || referredUser.username}`,
          status: 'completed',
          createdAt: new Date().toISOString(),
        });

        return true;
      } catch (e) {
        console.error('Error adding referral commission:', e);
        return false;
      }
    },
  };

  // Daily reset @ 6AM BD
  const checkAndPerformDailyReset = React.useCallback(async () => {
    try {
      const bdTime = getBangladeshTime();
      const today = formatDate(bdTime);
      const resetRef = ref(db, 'system/lastResetDate');
      const snapshot = await get(resetRef);
      const lastReset = snapshot.val();
      const currentHour = bdTime.getHours();
      const shouldReset = currentHour >= 6 && lastReset !== today;

      if (shouldReset) {
        await set(resetRef, today);
        const usersAdsRef = ref(db, 'userAds');
        const usersSnapshot = await get(usersAdsRef);
        if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val();
          const updates: any = {};
          Object.keys(usersData).forEach((uid) => {
            Object.keys(usersData[uid]).forEach((provider) => {
              updates[`userAds/${uid}/${provider}/watchedToday`] = 0;
              updates[`userAds/${uid}/${provider}/lastReset`] = new Date().toISOString();
            });
          });
          if (Object.keys(updates).length > 0) await update(ref(db), updates);
        }
      }
    } catch (e) {
      console.error('Daily reset check failed:', e);
    }
  }, []);

  React.useEffect(() => {
    const updateResetTime = () => {
      const bdTime = getBangladeshTime();
      const resetTime = new Date(bdTime);
      resetTime.setHours(6, 0, 0, 0);
      if (bdTime.getTime() >= resetTime.getTime()) resetTime.setDate(resetTime.getDate() + 1);

      const diff = resetTime.getTime() - bdTime.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeUntilReset(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    checkAndPerformDailyReset();
    updateResetTime();
    const t = setInterval(updateResetTime, 1000);
    const r = setInterval(checkAndPerformDailyReset, 60000);
    return () => {
      clearInterval(t);
      clearInterval(r);
    };
  }, [checkAndPerformDailyReset]);

  // FIXED: Load ads config from Firebase with proper appId updating
  React.useEffect(() => {
    const adsRef = ref(db, 'ads');
    const unsubscribe = onValue(adsRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('No ads configuration found in Firebase');
        return;
      }
      
      const adsData: Record<string, any> = snapshot.val();
      console.log('Loaded ads config from Firebase:', adsData);
      
      setAds((prev) =>
        prev.map((ad) => {
          const cfg = adsData[ad.provider];
          if (!cfg) {
            console.log(`No config found for provider: ${ad.provider}`);
            return ad;
          }
          
          // FIXED: Properly update all fields including appId
          const updatedAd = {
            ...ad,
            reward: cfg.reward ?? ad.reward,
            dailyLimit: cfg.dailyLimit ?? ad.dailyLimit,
            hourlyLimit: cfg.hourlyLimit ?? ad.hourlyLimit,
            cooldown: cfg.cooldown ?? ad.cooldown,
            enabled: cfg.enabled !== false,
            waitTime: cfg.waitTime ?? ad.waitTime,
            // FIXED: This line was missing - properly update appId from Firebase
            appId: cfg.appId ?? ad.appId,
            description: `${walletConfig.currency} ${cfg.reward ?? ad.reward} per ad`,
          };

          console.log(`Updated ${ad.provider} ad:`, {
            oldAppId: ad.appId,
            newAppId: updatedAd.appId,
            fromConfig: cfg.appId,
            enabled: updatedAd.enabled
          });
          
          return updatedAd;
        })
      );
      
      // Reset script initialization when config changes
      setScriptsInitialized((prev) => ({
        ...prev,
        gigapub: false,
        onclicka: false,
        adsovio: false,
      }));
    });

    return () => unsubscribe();
  }, [walletConfig.currency]);

  // FIXED: Add debug logging to see current appIds
  React.useEffect(() => {
    console.log('Current ads configuration:', ads.map(ad => ({
      provider: ad.provider,
      appId: ad.appId,
      enabled: ad.enabled,
      reward: ad.reward
    })));
  }, [ads]);

  // Load user's ad watch history
  React.useEffect(() => {
    if (!userData?.telegramId) return;
    const userAdsRef = ref(db, `userAds/${userData.telegramId}`);
    const unsubscribe = onValue(userAdsRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const userAdsData = snapshot.val();
      const newLastWatched: Record<string, Date> = {};
      const bdTime = getBangladeshTime();
      const today = formatDate(bdTime);

      setAds((prev) =>
        prev.map((ad) => {
          const pData = userAdsData[ad.provider];
          if (pData?.lastWatched) newLastWatched[ad.provider] = new Date(pData.lastWatched);

          let watchedToday = pData?.watchedToday || 0;
          const lastReset = pData?.lastReset;
          if (lastReset && formatDate(new Date(lastReset)) !== today) watchedToday = 0;

          return { ...ad, watched: watchedToday, lastWatched: pData?.lastWatched ? new Date(pData.lastWatched) : undefined };
        })
      );
      setLastWatched(newLastWatched);
    });
    return () => unsubscribe();
  }, [userData?.telegramId]);

  // FIXED: Enhanced script initialization to use updated appId
  React.useEffect(() => {
    const initScripts = () => {
      ads.forEach((ad) => {
        if (!ad.enabled || scriptsInitialized[ad.provider]) return;
        
        console.log(`Initializing ${ad.provider} with appId:`, ad.appId);
        
        switch (ad.provider) {
          case 'gigapub': {
            if (!document.getElementById('gigapub-script')) {
              const s = document.createElement('script');
              s.id = 'gigapub-script';
              // FIXED: Use the updated appId from Firebase
              s.src = `https://ad.gigapub.tech/script?id=${ad.appId}`;
              s.async = true;
              s.onload = () => {
                console.log('Gigapub script loaded with appId:', ad.appId);
                setScriptLoaded((p) => ({ ...p, gigapub: typeof window.showGiga === 'function' }));
                setScriptsInitialized((p) => ({ ...p, gigapub: true }));
              };
              s.onerror = () => {
                console.error('Gigapub script failed to load with appId:', ad.appId);
                setScriptsInitialized((p) => ({ ...p, gigapub: true }));
              };
              document.head.appendChild(s);
            } else {
              setScriptLoaded((p) => ({ ...p, gigapub: true }));
              setScriptsInitialized((p) => ({ ...p, gigapub: true }));
            }
            break;
          }
          case 'adsovio': {
            if (!document.getElementById('adsovio-script')) {
              const s = document.createElement('script');
              s.id = 'adsovio-script';
              // FIXED: Use the updated appId from Firebase
              s.src = `https://adsovio.com/cdn/ads.js?app_uid=${ad.appId}`;
              s.async = true;
              s.onload = () => {
                console.log('Adsovio script loaded with appId:', ad.appId);
                setScriptLoaded((p) => ({ ...p, adsovio: typeof window.showAdsovio === 'function' }));
                setScriptsInitialized((p) => ({ ...p, adsovio: true }));
              };
              s.onerror = () => {
                console.error('Adsovio script failed to load with appId:', ad.appId);
                setScriptsInitialized((p) => ({ ...p, adsovio: true }));
              };
              document.head.appendChild(s);
            } else {
              setScriptLoaded((p) => ({ ...p, adsovio: true }));
              setScriptsInitialized((p) => ({ ...p, adsovio: true }));
            }
            break;
          }
          case 'adextra': {
            // AdExtra is expected to be included in index.html
            setScriptLoaded((p) => ({ ...p, adextra: typeof window.p_adextra === 'function' || p.adextra }));
            setScriptsInitialized((p) => ({ ...p, adextra: true }));
            break;
          }
        }
      });
    };
    
    if (ads.length > 0) {
      initScripts();
    }
  }, [ads, scriptsInitialized]);

  // Onclicka initialization
  useEffect(() => {
    const loadOnclickaScript = () => {
      const onclickaAd = ads.find(ad => ad.provider === 'onclicka' && ad.enabled);
      if (!onclickaAd) return;

      if (document.getElementById('onclicka-script')) {
        console.log('Onclicka script already loaded');
        return;
      }

      const script = document.createElement('script');
      script.id = 'onclicka-script';
      script.src = 'https://js.onclckvd.com/in-stream-ad-admanager/tma.js';
      script.async = true;
      
      script.onload = async () => {
        console.log('Onclicka script loaded successfully');
        
        try {
          if (window.initCdTma) {
            // FIXED: Use the updated appId from Firebase
            const onclickaAd = ads.find(ad => ad.provider === 'onclicka');
            const appId = onclickaAd?.appId || '6098415';
            const show = await window.initCdTma({ id: appId });
            window.showAd = show;
            setScriptLoaded(prev => ({ ...prev, onclicka: typeof window.showAd === 'function' }));
            console.log('Onclicka initialized successfully with appId:', appId);
          } else {
            console.error('initCdTma not defined after script load');
            setScriptLoaded(prev => ({ ...prev, onclicka: false }));
          }
        } catch (error) {
          console.error('Onclicka initialization error:', error);
          setScriptLoaded(prev => ({ ...prev, onclicka: false }));
        }
      };
      
      script.onerror = () => {
        console.error('Failed to load Onclicka script');
        setScriptLoaded(prev => ({ ...prev, onclicka: false }));
      };
      
      document.head.appendChild(script);
    };

    // Only load if there's an Onclicka ad enabled
    const onclickaAd = ads.find(ad => ad.provider === 'onclicka' && ad.enabled);
    if (onclickaAd && !scriptLoaded.onclicka) {
      console.log('Loading Onclicka with appId:', onclickaAd.appId);
      loadOnclickaScript();
    }
  }, [ads, scriptLoaded.onclicka]);

  // Cooldown ticker
  React.useEffect(() => {
    const iv = setInterval(() => {
      const next: Record<string, number> = {};
      Object.keys(lastWatched).forEach((provider) => {
        const ad = ads.find((a) => a.provider === provider);
        if (ad && lastWatched[provider]) {
          const elapsed = (Date.now() - lastWatched[provider].getTime()) / 1000;
          if (elapsed < ad.cooldown) next[provider] = Math.ceil(ad.cooldown - elapsed);
        }
      });
      setCooldowns(next);
    }, 1000);
    return () => clearInterval(iv);
  }, [lastWatched, ads]);

  const updateUserAdWatch = async (adId: number) => {
    if (!userData?.telegramId) return;
    const ad = ads.find((a) => a.id === adId);
    if (!ad) return;

    const userAdRef = ref(db, `userAds/${userData.telegramId}/${ad.provider}`);
    const now = new Date().toISOString();
    await update(userAdRef, {
      watchedToday: (ad.watched || 0) + 1,
      lastWatched: now,
      lastUpdated: now,
    });
  };

  const recordAdWatch = async (adId: number): Promise<number> => {
    if (!userData) {
      showMessage('error', 'User not loaded. Try again.');
      return 0;
    }
    const ad = ads.find((a) => a.id === adId);
    if (!ad) return 0;

    try {
      const now = new Date();
      const lastWatch = userData.lastAdWatch ? new Date(userData.lastAdWatch) : null;
      let newAdsWatchedToday = userData.adsWatchedToday || 0;
      if (lastWatch && lastWatch.toDateString() !== now.toDateString()) newAdsWatchedToday = 0;

      const reward = ad.reward;
      const newBalance = userData.balance + reward;
      const newTotalEarned = userData.totalEarned + reward;
      const newAdsCount = newAdsWatchedToday + 1;

      await updateUser({
        balance: newBalance,
        totalEarned: newTotalEarned,
        adsWatchedToday: newAdsCount,
        lastAdWatch: now.toISOString(),
      });

      await addTransaction({
        userId: userData.telegramId,
        type: 'ad_reward',
        amount: reward,
        description: `Ad watched: ${ad.title}`,
        timestamp: Date.now(),
        status: 'completed'
      });

      if (userData.referredBy) {
        await firebaseRequest.addReferralCommission(userData.telegramId, reward);
      }

      return reward;
    } catch (e) {
      console.error('recordAdWatch error:', e);
      showMessage('error', 'Error recording reward.');
      return 0;
    }
  };

  const handleAdCompletion = async (adId: number) => {
    await updateUserAdWatch(adId);
    const earned = await recordAdWatch(adId);
    if (earned > 0) showMessage('success', `Ad completed! You earned ${walletConfig.currencySymbol}${earned}`);
  };

  const formatTime = (sec: number): string => (sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`);

  // Enhanced AdExtra handler with proper timeout and error handling
  const runAdExtra = async (adId: number, ad: Ad) => {
    if (typeof window.p_adextra !== 'function') {
      showMessage('info', 'AdExtra initializing… please try again in a moment');
      concurrencyLockRef.current = false;
      setConcurrentLock(false);
      setIsWatchingAd(null);
      return;
    }
    const timeoutMs = Math.max(15000, ad.waitTime * 1000 + 5000);

    const release = () => {
      concurrencyLockRef.current = false;
      setConcurrentLock(false);
      setIsWatchingAd(null);
    };
    const onSuccess = async () => {
      console.log('AdExtra: Success callback received');
      await handleAdCompletion(adId);
      setAds((prev) => prev.map((a) => (a.id === adId ? { ...a, watched: a.watched + 1 } : a)));
      setLastWatched((prev) => ({ ...prev, [ad.provider]: new Date() }));
      release();
    };
    const onError = () => {
      console.log('AdExtra: Error callback received');
      showMessage('error', 'Ad failed or was skipped. Try again.');
      release();
    };

    const to = setTimeout(() => {
      console.warn('AdExtra timed out without callback');
      onError();
    }, timeoutMs);

    const wrappedSuccess = () => {
      clearTimeout(to);
      onSuccess();
    };
    const wrappedError = () => {
      clearTimeout(to);
      onError();
    };

    try {
      console.log('AdExtra: Calling p_adextra');
      window.p_adextra(wrappedSuccess, wrappedError);
    } catch (error) {
      console.error('AdExtra: Error calling p_adextra', error);
      clearTimeout(to);
      onError();
    }
  };

  // Onclicka handler
  const runOnclicka = async (adId: number, ad: Ad) => {
    if (!window.showAd) {
      showMessage('error', 'Onclicka not loaded properly. Please refresh and try again.');
      concurrencyLockRef.current = false;
      setConcurrentLock(false);
      setIsWatchingAd(null);
      return;
    }

    try {
      showMessage('info', 'Loading Onclicka...');
      
      await window.showAd();
      await handleAdCompletion(adId);
      setAds((prev) => prev.map((a) => (a.id === adId ? { ...a, watched: a.watched + 1 } : a)));
      setLastWatched((prev) => ({ ...prev, [ad.provider]: new Date() }));
      showMessage('success', `Onclicka completed! You earned ${walletConfig.currencySymbol}${ad.reward}`);
    } catch (error) {
      console.error('Onclicka error:', error);
      showMessage('error', 'Onclicka failed to load. Please try again later.');
    } finally {
      concurrencyLockRef.current = false;
      setConcurrentLock(false);
      setIsWatchingAd(null);
    }
  };

  // Enhanced showAd with proper concurrency control
  const showAd = async (adId: number) => {
    // Check concurrency lock
    if (concurrencyLockRef.current) {
      showMessage('info', 'Please complete the current ad first');
      return;
    }

    const ad = ads.find((a) => a.id === adId);
    if (!ad) {
      showMessage('error', 'Ad not found');
      return;
    }
    if (!ad.enabled) {
      showMessage('error', 'This ad provider is temporarily unavailable');
      return;
    }

    // AdExtra should not wait for dynamic scriptLoaded
    if (ad.provider !== 'adextra' && !scriptLoaded[ad.provider]) {
      showMessage('info', 'Ad provider is loading... Please wait a moment');
      return;
    }

    const now = new Date();
    if (ad.dailyLimit > 0 && ad.watched >= ad.dailyLimit) {
      showMessage('info', 'Daily limit reached. Come back tomorrow!');
      return;
    }
    if (lastWatched[ad.provider]) {
      const elapsed = (now.getTime() - lastWatched[ad.provider].getTime()) / 1000;
      if (elapsed < ad.cooldown) {
        const waitLeft = Math.ceil(ad.cooldown - elapsed);
        showMessage('info', `Please wait ${formatTime(waitLeft)} before next ad`);
        return;
      }
    }

    // Set concurrency lock
    concurrencyLockRef.current = true;
    setConcurrentLock(true);
    setIsWatchingAd(adId);
    showMessage('info', 'Preparing ad…');

    try {
      // Handle different providers
      if (ad.provider === 'adextra') {
        await runAdExtra(adId, ad);
        return;
      }

      if (ad.provider === 'onclicka') {
        await runOnclicka(adId, ad);
        return;
      }

      // Handle other providers (gigapub, adsovio)
      const minWaitTime = ad.waitTime;
      const start = Date.now();
      let adCompleted = false;

      if (ad.provider === 'gigapub' && window.showGiga) {
        await window.showGiga(); 
        adCompleted = true;
      } else if (ad.provider === 'adsovio' && window.showAdsovio) {
        await window.showAdsovio(); 
        adCompleted = true;
      } else {
        throw new Error('Ad provider function not available');
      }

      if (adCompleted) {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed >= minWaitTime) {
          await handleAdCompletion(adId);
          setAds((prev) => prev.map((a) => (a.id === adId ? { ...a, watched: a.watched + 1 } : a)));
          setLastWatched((prev) => ({ ...prev, [ad.provider]: now }));
        } else {
          throw new Error(`Please watch the ad completely (minimum ${minWaitTime} seconds)`);
        }
      }
    } catch (e) {
      console.error('Ad error:', e);
      showMessage('error', 'Ad was not completed.');
    } finally {
      // Only release lock for non-callback providers
      if (ad?.provider !== 'adextra' && ad?.provider !== 'onclicka') {
        concurrencyLockRef.current = false;
        setConcurrentLock(false);
        setIsWatchingAd(null);
      }
    }
  };

  const isAdDisabled = (ad: Ad) => {
    if (!ad.enabled) return true;
    if (ad.dailyLimit > 0 && ad.watched >= ad.dailyLimit) return true;
    if (cooldowns[ad.provider]) return true;
    if (ad.provider !== 'adextra' && !scriptLoaded[ad.provider]) return true;
    if (concurrentLock && isWatchingAd !== ad.id) return true;
    return false;
  };

  const getButtonText = (ad: Ad) => {
    if (!ad.enabled) return 'Temporarily Disabled';
    if (ad.dailyLimit > 0 && ad.watched >= ad.dailyLimit) return 'Daily Limit Reached';
    if (cooldowns[ad.provider]) return `Wait ${formatTime(cooldowns[ad.provider])}`;
    if (ad.provider !== 'adextra' && !scriptLoaded[ad.provider]) return 'Loading...';
    if (concurrentLock && isWatchingAd !== ad.id) return 'Another in Progress';
    if (isWatchingAd === ad.id) return 'Watching Ad...';
    return 'Watch Now';
  };

  return (
    <div className="grid grid-cols-2 gap-2 text-neutral-200">
      {userMessages && (
        <div
          className={`col-span-2 p-3 rounded-2xl mb-2 text-center font-semibold tracking-wide shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ring-1 ring-white/10 backdrop-blur-sm ${
            userMessages.type === 'success'
              ? 'bg-white/10 text-white'
              : userMessages.type === 'error'
              ? 'bg-white/5 text-white'
              : 'bg-white/8 text-white'
          }`}
        >
          {userMessages.message}
        </div>
      )}

      <div className="col-span-2 rounded-xl p-3 border border-white/10 shadow-xl bg-neutral-950/40 backdrop-blur-sm">
        <div className="flex justify-between items-center text-sm">
          <span className="text-neutral-400">Daily reset in:</span>
          <span className="text-neutral-100 font-semibold tabular-nums">{timeUntilReset}</span>
          <span className="text-neutral-500">Reset: 6 AM (BD Time)</span>
        </div>
      </div>

      {ads.map((ad) => (
        <div
          key={ad.id}
          className="rounded-xl p-3 border border-white/10 shadow-[0_10px_25px_-12px_rgba(0,0,0,0.7)] bg-neutral-950/50 backdrop-blur-sm hover:border-white/20 transition-colors"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="p-3 rounded-2xl shadow-inner bg-gradient-to-tr from-neutral-800 via-neutral-700 to-neutral-600 ring-1 ring-white/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-base leading-tight truncate">
                {ad.title}
              </h3>
              <p className="text-[12px] text-neutral-400 mt-1 line-clamp-2">
                {ad.description}
              </p>
            </div>
          </div>

          <div className="w-full bg-neutral-800/40 rounded-full h-3 mb-3 overflow-hidden ring-1 ring-white/10">
            <div
              className="h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-neutral-300 to-neutral-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]"
              style={{ width: `${Math.min((ad.watched / ad.dailyLimit) * 100, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-[13px] text-neutral-400 font-medium mb-4">
            <span className="tabular-nums">
              {ad.watched} / {ad.dailyLimit} watched
            </span>
            <span className="text-neutral-300 tabular-nums">wait: {ad.waitTime}s</span>
          </div>

          <div className="flex justify-center">
            <button
              className="w-11/12 py-2 rounded-xl text-sm font-semibold shadow-xl transition-all duration-300 transform ring-1 ring-black/10 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-b from-white to-neutral-200 text-neutral-900 hover:from-white hover:to-white"
              onClick={() => showAd(ad.id)}
              disabled={isAdDisabled(ad) || isWatchingAd === ad.id}
            >
              {isWatchingAd === ad.id ? 'Watching Ad…' : getButtonText(ad)}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// VPN Guard Component
function normalizeCountryString(s?: string): string {
  return (s || "").trim().toUpperCase();
}

function extractCountry(data: any) {
  const countryName =
    data?.country_name ||
    data?.country ||
    data?.countryName ||
    data?.country_name_en ||
    data?.country_name_local ||
    '';

  const countryCode = (data?.country_code || data?.country_code2 || data?.countryCode || data?.countryCode2 || '').toUpperCase();

  return {
    name: String(countryName),
    code: String(countryCode),
  };
}

// VPN Guard Component - Updated to only block Earn tab content
const VPNGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [vpnConfig, setVpnConfig] = useState<VPNConfig>({
    vpnRequired: true,
    allowedCountries: []
  });

  // Live-config from Firebase
  useEffect(() => {
    const vpnConfigRef = ref(database, 'vpnConfig');
    const unsubscribe = onValue(vpnConfigRef, (snapshot) => {
      const config = snapshot.val();
      if (config) {
        setVpnConfig((prev) => ({
          ...prev,
          vpnRequired: !!config.vpnRequired,
          allowedCountries: Array.isArray(config.allowedCountries)
            ? config.allowedCountries
            : [],
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // React on config changes
  useEffect(() => {
    let mounted = true;

    if (!vpnConfig.vpnRequired) {
      setAccessAllowed(true);
      return;
    }

    const timer = setTimeout(() => {
      if (mounted) checkVPN();
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [vpnConfig.vpnRequired, vpnConfig.allowedCountries.join(',')]);

  const checkVPN = async () => {
    if (!vpnConfig.vpnRequired) {
      setAccessAllowed(true);
      return;
    }

    if (!vpnConfig.allowedCountries || vpnConfig.allowedCountries.length === 0) {
      setAccessAllowed(false);
      return;
    }

    setIsRetrying(true);
    try {
      const services = [
        'https://ipapi.co/json/',
        'https://ipwhois.app/json/',
        'https://api.ip.sb/geoip',
      ];

      let info: any = null;
      for (const url of services) {
        try {
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          if (res.ok) {
            info = await res.json();
            if (info) break;
          }
        } catch (_) {
          // try next provider
        }
      }

      if (!info) throw new Error('Could not fetch location data');

      const { name: countryName, code: countryCode } = extractCountry(info);

      const allowed = vpnConfig.allowedCountries
        .map(normalizeCountryString)
        .filter(Boolean);

      const targetName = normalizeCountryString(countryName);
      const targetCode = normalizeCountryString(countryCode);

      const isAllowed = allowed.some((a) =>
        a === targetCode ||
        a === targetName ||
        (targetName && a.length > 2 && targetName.includes(a))
      );

      setAccessAllowed(isAllowed);
    } catch (err) {
      console.error('VPN check failed:', err);
      setAccessAllowed(false);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!vpnConfig.vpnRequired) return <>{children}</>;

  if (accessAllowed === null) {
    return (
      <div className="relative min-h-[400px] bg-gradient-to-br from-[#0a1a2b] to-[#0f2235] flex items-center justify-center rounded-xl border-2 border-blue-500/30 m-4">
        <div className="bg-[#0a1a2b]/90 backdrop-blur-lg rounded-3xl border-2 border-blue-500/30 p-8 text-center max-w-md w-full shadow-2xl shadow-blue-500/10">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            Security Check
          </h2>
          <p className="text-blue-200 mb-6 text-sm leading-relaxed">
            Verifying your location and connection security
          </p>

          <div className="flex justify-center items-center space-x-3 bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-300 text-sm font-medium">Network scanning...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!accessAllowed) {
    const uniqueCountries = Array.from(
      new Set((vpnConfig.allowedCountries || []).map((c) => c.trim()).filter(Boolean))
    );

    return (
      <div className="relative min-h-[400px] bg-gradient-to-br from-black to-gray-900 flex items-center justify-center rounded-xl border-2 border-gray-600 m-4">
        <div className="bg-gray-900/90 backdrop-blur-lg rounded-xl border-2 border-gray-600 p-8 text-center max-w-lg w-full shadow-2xl shadow-gray-800/20">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
              <WifiOff className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-black text-xs font-bold">!</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent mb-3">
            Access Restricted
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-3">
            This section requires a connection
          </p>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 mb-4 text-left max-h-32 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {uniqueCountries.map((c) => (
                <span
                  key={c}
                  className="px-2 py-1 rounded-xl border border-gray-600 bg-gray-700 text-gray-200 text-xs"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={checkVPN}
              disabled={isRetrying}
              className="w-full bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 disabled:from-gray-800 disabled:to-gray-800 text-white font-semibold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-gray-700/25 disabled:shadow-none"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Rechecking...
                </>
              ) : (
                <>
                  <Wifi className="w-5 h-5" />
                  Retry Connection
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield className="w-3 h-3" />
              <span>Secure connection required</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Updated EarnTab Component with Fixed Task Completion
const EarnTab = () => {
  const [activeTab, setActiveTab] = useState<'ads' | 'daily-tasks'>('ads')
  const [showHistory, setShowHistory] = useState(false)
  const { userData, updateUser, addTransaction } = useUserData()
  useWalletConfig()

  // FIXED: Enhanced task completion handler
  const handleCompleteTask = async (taskId: string, reward: number): Promise<boolean> => {
    if (!userData) {
      console.error('User data not available for task completion');
      return false;
    }

    try {
      console.log('Completing task:', taskId, 'Reward:', reward);

      const today = new Date().toISOString().split('T')[0];
      const todayStats = userData.stats?.[today] || { ads: 0, earned: 0 };

      const newBalance = userData.balance + reward;
      const newTotalEarned = userData.totalEarned + reward;
      
      // Update tasks completed - FIXED: Store completion data properly
      const newTasksCompleted = {
        ...userData.tasksCompleted,
        [taskId]: {
          completedAt: new Date().toISOString(),
          reward: reward
        }
      };

      const newStats = {
        ...userData.stats,
        [today]: {
          ads: todayStats.ads,
          earned: todayStats.earned + reward
        }
      };

      // Update user data
      await updateUser({
        balance: newBalance,
        totalEarned: newTotalEarned,
        tasksCompleted: newTasksCompleted,
        stats: newStats
      });

      // Add transaction record
      await addTransaction({
        userId: userData.telegramId,
        type: 'task_reward',
        amount: reward,
        description: `Task completed`,
        timestamp: Date.now(),
        status: 'completed'
      });

      console.log('Task completed successfully');
      return true;

    } catch (error) {
      console.error('Error completing task:', error);
      return false;
    }
  }

  // Render content based on active tab with VPN protection
  const renderContent = () => {
    if (activeTab === 'ads') {
      return (
        <VPNGuard>
          <div className="max-h-[65vh] overflow-auto rounded-xl border border-white/10">
            <AdsDashboard userData={userData} />
          </div>
        </VPNGuard>
      )
    } else {
      return (
        <VPNGuard>
          <DailyTasks
            userData={userData}
            onCompleteTask={handleCompleteTask}
            onBack={() => setActiveTab('ads')}
          />
        </VPNGuard>
      )
    }
  }

  return (
    <div className="tasks-tab-con px-4 gap-2 transition-all duration-300">
      <div className="pt-6 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-black/50">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xl font-semibold tracking-tight">EARN</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">{new Date().toLocaleDateString()}</span>
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              title="View Earnings History"
            >
              <History className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setActiveTab('ads')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition duration-300 border ${
            activeTab === 'ads' 
              ? 'bg-white text-black border-transparent' 
              : 'bg-[#151515] text-white border-white/10 hover:border-white/30'
          }`}
        >
          Watch Ads
        </button>
        <button
          onClick={() => setActiveTab('daily-tasks')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition duration-300 border ${
            activeTab === 'daily-tasks' 
              ? 'bg-white text-black border-transparent' 
              : 'bg-[#151515] text-white border-white/10 hover:border-white/30'
          }`}
        >
          Daily Tasks
          <div className="bg-[#5a5a5a] text-[#fefefe] size-4 rounded-full grid place-items-center text-[11px]">
            <FaTasks className="w-2 h-2" />
          </div>
        </button>
      </div>

      <div className="mt-3">
        {renderContent()}
      </div>

      <HistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
      />
    </div>
  )
}

// Friends Tab Component
const FriendsTab = () => {
  useUserData()
  const { referralData } = useReferralData()
  const { walletConfig } = useWalletConfig()
  const { appConfig } = useAppConfig()
  useReferralEarningsTracker() // Track referral earnings
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user

  const referUrl = useMemo(() => {
    if (typeof window === 'undefined' || !tgUser?.id) return 'https://t.me/PayCash26_bot?start=default'
    return `https://t.me/PayCash26_bot?start=${tgUser.id}`
  }, [tgUser?.id])

  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(referUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch (e) {
      console.error('Copy failed', e)
      setCopied(false)
    }
  }

  const handleInvite = async () => {
    if (typeof window !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'Join me on NanoV1',
          text: 'Earn money by completing tasks and watching ads!',
          url: referUrl,
        })
      } catch (e) {
        onCopy()
      }
    } else {
      onCopy()
      window.Telegram.WebApp.showPopup({
        title: 'Link Copied!',
        message: 'Share your referral link with friends to earn rewards.',
        buttons: [{ type: 'ok' }]
      })
    }
  }

  return (
    <div className="friends-tab-con px-4 pb-24 transition-all duration-300">
      <div className="pt-8 space-y-1">
        <h1 className="text-3xl font-bold">INVITE FRIENDS</h1>
        <div className="text-xl">
          <span className="font-semibold">SHARE</span>
          <span className="ml-2 text-gray-500">YOUR INVITATION</span>
        </div>
        <div className="text-xl">
          <span className="text-gray-500">LINK &amp;</span>
          <span className="ml-2 font-semibold">GET {appConfig.referralCommissionRate || 10}%</span>
          <span className="ml-2 text-gray-500">OF</span>
        </div>
        <div className="text-gray-500 text-xl">FRIEND'S POINTS</div>
      </div>

      <div className="mt-8 mb-4">
        <div className="bg-[#151516] w-full rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <Link2 className="h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-400">Your referral link</p>
          </div>

          <div className="flex items-stretch gap-3">
            <input
              readOnly
              value={referUrl}
              className="flex-1 rounded-xl bg-[#0e0e10] text-white border border-[#2a2a2d] px-4 py-3 text-sm truncate focus:outline-none"
            />
            <button
              onClick={onCopy}
              className="min-w-[110px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium bg-[#232327] border border-[#2a2a2d] hover:bg-[#2a2a2d] active:scale-[0.99]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-[#151516] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Total Referrals</p>
              <p className="text-2xl font-semibold mt-1">{referralData?.referredCount || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#0e0e10] flex items-center justify-center border border-[#2a2a2d]">
              <Users className="h-5 w-5 text-gray-300" />
            </div>
          </div>
        </div>
        <div className="bg-[#151516] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Total Commission</p>
              <p className="text-2xl font-semibold mt-1">{walletConfig.currencySymbol}{referralData?.referralEarnings.toFixed(2) || '0.00'}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#0e0e10] flex items-center justify-center border border-[#2a2a2d]">
              <Coins className="h-5 w-5 text-gray-300" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="bg-[#151516] w-full rounded-2xl p-5 text-center">
          <p className="text-sm text-[#8e8e93]">
            Invite friends using your link to earn more rewards.
          </p>
        </div>
      </div>

      <div className="fixed bottom-[80px] left-0 right-0 py-4 flex justify-center">
        <div className="w-full max-w-md px-4">
          <button
            className="w-full bg-[#4c9ce2] text-white py-4 rounded-xl text-lg font-medium active:scale-[0.99]"
            onClick={handleInvite}
          >
            Invite Friends
          </button>
        </div>
      </div>
    </div>
  )
}

// Profile Tab Component - Updated Wallet Section
const TX_PAGE_SIZE = 3;

function PaymentLogo({
  src,
  alt,
  size = 36,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <span
      className="relative overflow-hidden rounded"
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={alt}
        sizes={`${size}px`}
        className="object-contain"
      />
    </span>
  );
}

function PaymentMethodList({
  methods,
  selectedId,
  onSelect,
  walletConfig,
}: {
  methods: readonly PaymentMethod[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  walletConfig: WalletConfig;
}) {
  return (
    <div
      className="flex flex-col gap-2"
      role="listbox"
      aria-label="Choose a payment method"
    >
      {methods.map((m) => {
        const active = selectedId === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(m.id)}
            className={[
              "w-full text-left flex items-center gap-3 py-2",
              "transition",
              active ? "opacity-100" : "opacity-80 hover:opacity-100",
              "border-b border-white/10",
            ].join(" ")}
          >
            <PaymentLogo
              src={m.logo}
              alt={m.name}
              size={40}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{m.name}</p>
              <p className="text-xs text-gray-400">• Min withdraw {walletConfig.currencySymbol}{m.minWithdrawal}</p>
            </div>
            <span
              aria-hidden
              className={[
                "inline-block h-3 w-3 rounded-full",
                active ? "bg-[#007aff]" : "bg-white/20",
              ].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}

function ProfileHeader({ onOpenWallet }: { onOpenWallet: () => void }) {
  const { userData } = useUserData()
  const { referralData } = useReferralData()
  const { walletConfig } = useWalletConfig()
  useAppConfig()
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user

  const user = {
    name: `${tgUser?.first_name || ''} ${tgUser?.last_name || ''}`.trim() || 'User',
    handle: tgUser?.username ? `@${tgUser.username}` : 'user',
    id: tgUser?.id?.toString() || 'unknown',
    joined: userData?.joinDate ? new Date(userData.joinDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    }) : 'Jan 15, 2024',
  };

  return (
    <section aria-label="Profile header" className="w-full max-w-3xl">
      <div className="relative -mt-12 sm:-mt-16 mx-3 sm:mx-6">
        <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-white/20 to-transparent" />

          <div className="p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex items-center gap-24 shrink-0">
                <div className="relative h-24 w-24">
                  <span className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-[#22d3ee] via-[#3b82f6] to-[#a855f7] opacity-70 blur" />
                  <div className="relative h-24 w-24 rounded-full overflow-hidden ring-2 ring-white/20 bg-black/40">
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                      {tgUser?.first_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-black/60 ring-1 ring-green-400/20 p-1">
                    <ShieldCheck className="h-4 w-4 text-green-400" />
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenWallet}
                  className="bg-[#007aff] px-4 py-2 rounded-2xl flex items-center gap-2 shadow-md text-white hover:brightness-110 active:scale-[0.98] transition"
                  aria-label="Open wallet"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Wallet</span>
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                    {user.name}
                  </h2>
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] leading-5 text-emerald-200"
                    aria-label="Verified account"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                    Verified
                  </span>
                </div>

                <p className="text-sm text-gray-300 mt-0.5">{user.handle}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-200/90">
                  <span className="rounded-md bg-black/30 px-2 py-1 border border-white/10">ID: {user.id}</span>
                  <span className="text-gray-500">•</span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10 active:scale-[0.98] transition">Joined: {user.joined}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
              {[
                { label: "Earnings", value: `${walletConfig.currencySymbol}${userData?.totalEarned.toFixed(2) || '0.00'}` },
                { label: "Friends", value: `${referralData?.referredCount || 0}` },
                { label: "Withdrawn", value: `${walletConfig.currencySymbol}${userData?.totalWithdrawn.toFixed(2) || '0.00'}` },
              ].map((s, i) => (
                <div key={i} className="px-4 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">{s.label}</p>
                  <p className="text-base font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const ProfileTab = () => {
  const [view, setView] = useState<"profile" | "wallet">("profile");
  const walletRef = useRef<HTMLDivElement | null>(null);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { userData, updateUser, addTransaction } = useUserData()
  const { walletConfig } = useWalletConfig()
  const { paymentMethods } = usePaymentMethods()
  const { appConfig } = useAppConfig()
  const walletTransactions = useWalletTransactions()

  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(walletTransactions.length / TX_PAGE_SIZE))
  const paginatedTxs = useMemo(() => {
    const start = (page - 1) * TX_PAGE_SIZE
    return walletTransactions.slice(start, start + TX_PAGE_SIZE)
  }, [page, walletTransactions])

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages))
  }, [totalPages])

  useEffect(() => {
    if (view === "wallet" && walletRef.current) {
      walletRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [view])

  useEffect(() => {
    if (selectedMethod) setError(null)
  }, [selectedMethod])

  const balance = userData?.balance || 0

  const resetWithdrawForm = () => {
    setSelectedMethod(null)
    setAccountNumber("")
    setAmount("")
    setError(null)
  }

  const handleWithdrawClick = () => setShowWithdraw(true)
  const handleCancelWithdraw = () => {
    setShowWithdraw(false)
    resetWithdrawForm()
  }

  const selectedMeta: PaymentMethod | undefined = selectedMethod
    ? paymentMethods.find((p) => p.id === selectedMethod)
    : undefined

  const selectedMin = selectedMeta?.minWithdrawal ?? walletConfig.defaultMinWithdrawal

  const handleSubmitWithdraw = async () => {
    setError(null)

    const amt = parseFloat(amount)
    if (!selectedMethod) return setError("Please select a payment method.")
    if (!accountNumber.trim())
      return setError("Please enter an account number.")
    if (!amount || isNaN(amt) || amt <= 0)
      return setError("Please enter a valid amount.")
    if (amt > balance) return setError("Amount exceeds available balance.")
    if (amt < selectedMin)
      return setError(
        `Minimum withdraw for ${selectedMeta?.name ?? "this method"} is ${walletConfig.currencySymbol}${selectedMin}.`
      )

    try {
      setSubmitting(true)
      
      const newBalance = balance - amt
      const newTotalWithdrawn = (userData?.totalWithdrawn || 0) + amt
      
      await updateUser({
        balance: newBalance,
        totalWithdrawn: newTotalWithdrawn
      })

      // Enhanced transaction data with account information
      const transactionData = {
        userId: userData!.telegramId,
        type: 'withdrawal' as TransactionType,
        amount: -amt,
        description: `Withdrawal to ${selectedMeta?.name}`,
        timestamp: Date.now(),
        status: 'pending' as TransactionStatus,
        // Add account information for WithdrawalManagement
        method: selectedMeta?.name,
        accountNumber: accountNumber,
        paymentMethod: selectedMeta?.name,
        accountDetails: accountNumber
      }

      await addTransaction(transactionData)

      setSubmitting(false)
      setShowWithdraw(false)
      resetWithdrawForm()
      
      window.Telegram.WebApp.showPopup({
        title: 'Withdrawal Requested!',
        message: `Your withdrawal of ${walletConfig.currencySymbol}${amt.toFixed(2)} has been submitted for processing.`,
        buttons: [{ type: 'ok' }]
      })
    } catch {
      setSubmitting(false)
      setError("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-full text-white px-6 py-6 gap-6">
      {view === "profile" && (
        <>
          <ProfileHeader onOpenWallet={() => setView("wallet")} />

          <div className="w-full max-w-3xl">
            <h3 className="text-lg font-semibold mb-2">Tutorial Video</h3>
            <div className="relative w-full aspect-video overflow-hidden rounded-2xl border border-white/10 shadow">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${appConfig.tutorialVideoId || 'dQw4w9WgXcQ'}`}
                title="YouTube video player"
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>

          <a
            href={appConfig.supportUrl || "https://t.me/nan0v1_support"}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10 hover:border-white/20"
          >
            <Send className="h-5 w-5 transition group-hover:translate-x-0.5" />
            <span>Contact Support on Telegram</span>
          </a>

          <a href="https://t.me/altaslab" className="flex items-center gap-2 text-sm text-gray-400">
            <Code className="h-5 w-5" />
            Developed by Atlas Lab BD
          </a>
        </>
      )}

      {view === "wallet" && (
        <div ref={walletRef} id="wallet" className="w-full max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setView("profile")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 bg-white/5 text-sm">
              <Wallet className="h-5 w-5" />
              <span className="font-semibold">Wallet</span>
            </div>
          </div>

          <div className="rounded-3xl p-6 w-full text-left shadow-lg border border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Current Balance</p>
                <p className="text-3xl font-bold mt-1">
                  {walletConfig.currencySymbol}{" "}
                  {balance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleWithdrawClick}
                  className="rounded-2xl border border-white/10 bg-[#007aff] px-4 py-2 text-sm font-medium hover:brightness-110 transition inline-flex items-center gap-2"
                >
                  <CreditCard className="h-4 h-4" />
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          {showWithdraw && (
            <div className="mt-6 rounded-3xl p-4 shadow-lg border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-semibold inline-flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Withdraw Funds
                </h4>
                <button
                  onClick={handleCancelWithdraw}
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 hover:bg-white/10"
                  aria-label="Close withdraw panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-3">
                {!selectedMethod ? (
                  <>
                    <p className="text-sm text-gray-400 mb-2">Choose a payment method</p>
                    <PaymentMethodList
                      methods={paymentMethods}
                      selectedId={selectedMethod}
                      onSelect={(id) => setSelectedMethod(id)}
                      walletConfig={walletConfig}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <PaymentLogo
                        src={selectedMeta?.logo || ""}
                        alt={selectedMeta?.name || "Method"}
                        size={36}
                      />
                      <div className="text-sm">
                        <p className="font-medium">{selectedMeta?.name}</p>
                        <p className="text-xs text-gray-400">Min withdraw {walletConfig.currencySymbol}{selectedMin}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod(null)}
                      className="text-xs rounded-lg border border-white/10 bg-white/5 px-3 py-1 hover:bg-white/10"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {!selectedMethod && (
                <p className="text-sm text-gray-400">Select a payment method to continue.</p>
              )}

              {selectedMethod && (
                <div className="mt-2 space-y-3">
                  <div className="flex flex-col">
                    <label htmlFor="account" className="text-sm text-gray-300 mb-1">
                      {selectedMeta?.name} Account / Number
                    </label>
                    <input
                      id="account"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="e.g., 01XXXXXXXXX / Account IBAN"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full rounded-2xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-[#007aff]"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label htmlFor="amount" className="text-sm text-gray-300 mb-1">
                      Amount
                    </label>
                    <input
                      id="amount"
                      type="number"
                      min={0}
                      step="0.00"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full rounded-2xl bg-black/30 border border-white/10 px-3 py-2 outline-none focus:border-[#007aff]"
                    />
                    <p className="text-xs text-gray-500 mt-1">Min withdraw {walletConfig.currencySymbol}{selectedMin}</p>
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelWithdraw}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitWithdraw}
                      disabled={submitting}
                      className="rounded-2xl bg-[#007aff] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60 inline-flex items-center gap-2"
                    >
                      {submitting ? (
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Withdraw
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 rounded-3xl p-4 shadow-lg border border-white/10 bg-white/5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-base font-semibold">Withdrawal History</h4>
              <span className="text-xs text-gray-400">{TX_PAGE_SIZE} per page</span>
            </div>

            {walletTransactions.length === 0 ? (
              <p className="text-sm text-gray-400">No withdrawal transactions yet.</p>
            ) : (
              <>
                <ul className="divide-y divide-white/10">
                  {paginatedTxs.map((tx: any) => (
                    <li key={tx.id} className="flex items-center justify-between py-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{tx.description}</p>
                          <p
                            className={[
                              "text-sm font-semibold",
                              tx.amount > 0 ? "text-emerald-400" : "text-rose-400",
                            ].join(" ")}
                          >
                            {tx.amount > 0 ? '+' : ''}{walletConfig.currencySymbol}{Math.abs(tx.amount).toFixed(2)}
                          </p>
                        </div>
                        
                        {/* Show account number if available */}
                        {(tx.accountNumber || tx.accountDetails) && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-400">Account:</p>
                            <p className="text-xs text-white font-mono bg-gray-700/50 p-1 rounded border border-gray-600/50">
                              {tx.accountNumber || tx.accountDetails}
                            </p>
                          </div>
                        )}

                        {/* Show payment method if available */}
                        {(tx.method || tx.paymentMethod) && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-400">Method:</p>
                            <p className="text-xs text-blue-300">
                              {tx.method || tx.paymentMethod}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            {new Date(tx.timestamp).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: '2-digit',
                              year: 'numeric'
                            })} • {new Date(tx.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            tx.status === 'completed' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : tx.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {tx.status === 'completed' ? 'Approved' : tx.status === 'pending' ? 'Pending' : 'Failed'}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <nav
                  className="mt-4 flex items-center justify-between"
                  role="navigation"
                  aria-label="Transactions pagination"
                >
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-white/10"
                    aria-label="Previous page"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Prev
                  </button>

                  <div className="flex items-center gap-2" aria-live="polite">
                    <span className="text-xs text-gray-400">
                      Page <strong className="text-white">{page}</strong> of {totalPages}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-white/10"
                    aria-label="Next page"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </nav>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Page Component
export default function HomePage() {
  const { userData, loading } = useUserData();
  const { getMainAccount, deviceRestrictions, isCheckingDevice } = useDeviceManagement();
  const [showDeviceLimitScreen, setShowDeviceLimitScreen] = useState(false);

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }
  }, [])

  useEffect(() => {
    // Check if user is blocked by device restrictions
    if (!loading && !isCheckingDevice && deviceRestrictions.enabled) {
      const mainAccount = getMainAccount();
      if (!userData && mainAccount) {
        // User is trying to create more than 2 accounts on same device
        setShowDeviceLimitScreen(true);
      }
    }
  }, [loading, isCheckingDevice, userData, deviceRestrictions.enabled, getMainAccount]);

  // Show loading while checking device restrictions
  if (loading || isCheckingDevice) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Checking device restrictions...</p>
        </div>
      </div>
    );
  }

  // Show device limit screen if user is blocked
  if (showDeviceLimitScreen) {
    const mainAccount = getMainAccount();
    return (
      <SplashScreen
        mainAccount={mainAccount ? {
          username: mainAccount.username,
          userId: mainAccount.telegramId
        } : undefined}
        maxAccountsPerDevice={deviceRestrictions.maxAccountsPerDevice}
        onRetry={() => {
          window.Telegram.WebApp.showPopup({
            title: 'Device Limit Reached',
            message: `You can only have ${deviceRestrictions.maxAccountsPerDevice} accounts per device. Please use your main account.`,
            buttons: [{ type: 'ok' }]
          });
        }}
      />
    );
  }

  return (
    <>
      <SourceProtection />
      <TabProvider>
        <main className="min-h-screen bg-black text-white">
          <Topbar />
          <TabContainer />
          <NavigationBar />
        </main>
      </TabProvider>
    </>
  )
}
