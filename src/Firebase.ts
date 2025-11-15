// firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBQFKqKGmVpNv4aHQhLfldQ6CouBmtYwYY",
  authDomain: "watchhamelite-primev1.firebaseapp.com",
  databaseURL: "https://watchhamelite-primev1-default-rtdb.firebaseio.com",
  projectId: "watchhamelite-primev1",
  storageBucket: "watchhamelite-primev1.firebasestorage.app",
  messagingSenderId: "868246294583",
  appId: "1:868246294583:web:70da61aadda9b1ed4defb2",
  measurementId: "G-20Z4Q1H7D9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
