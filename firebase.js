const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get, update } = require('firebase/database');

// Configuración de Firebase (copia y pega la tuya aquí)
const firebaseConfig = {
  apiKey: "AIzaSyDQOumixUUJ5Uxh-fXj8P9bC_1YKNWii1w",
  authDomain: "bot-de-puntos-para-discord.firebaseapp.com",
  databaseURL: "https://bot-de-puntos-para-discord-default-rtdb.firebaseio.com",
  projectId: "bot-de-puntos-para-discord",
  storageBucket: "bot-de-puntos-para-discord.firebasestorage.app",
  messagingSenderId: "239269509131",
  appId: "1:239269509131:web:9dba4b369e64e55e66af0e"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Función para obtener los puntos de un usuario
async function getPoints(userId) {
  const snapshot = await get(ref(database, `scores/${userId}`));
  return snapshot.exists() ? snapshot.val() : 0;
}

// Función para asignar puntos a un usuario
async function setPoints(userId, points) {
  await set(ref(database, `scores/${userId}`), points);
}

// Función para reiniciar todos los puntos
async function resetAllPoints() {
  await set(ref(database, 'scores'), {});
}

// Función para obtener todos los puntajes
async function getAllScores() {
  const snapshot = await get(ref(database, 'scores'));
  return snapshot.exists() ? snapshot.val() : {};
}

// Función para restar puntos a un usuario
async function subtractPoints(userId, points) {
  const currentPoints = await getPoints(userId);
  const newPoints = Math.max(currentPoints - points, 0);
  await setPoints(userId, newPoints);
  return newPoints;
}

module.exports = { getPoints, setPoints, resetAllPoints, getAllScores, subtractPoints };
