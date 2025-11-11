import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Database = {
  getAllAsync: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  runAsync: (sql: string, params?: any[]) => Promise<{ rowsAffected: number; insertId: number }>;
};

// Interface pour le stockage des tâches
export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'En cours' | 'Terminé';
  deadline?: string;
}

// Clé pour AsyncStorage
const STORAGE_KEY = '@tasks';

// Méthodes utilitaires pour la base de données web
const webDatabaseUtils = {
  async getAllTasks(): Promise<Task[]> {
    const tasks = await AsyncStorage.getItem(STORAGE_KEY);
    return tasks ? JSON.parse(tasks) : [];
  }
};

// Implémentation web avec AsyncStorage
const webDatabase: Database = {
  async getAllAsync<T = any>(): Promise<T[]> {
    const tasks = await AsyncStorage.getItem(STORAGE_KEY);
    return tasks ? JSON.parse(tasks) : [];
  },

  async runAsync(sql: string, params: any[] = []) {
    const tasks = await webDatabaseUtils.getAllTasks();
    let insertId = 1;
    
    if (sql.includes('INSERT')) {
      const newTask: Task = {
        id: Date.now(),
        title: params[0],
        description: params[1],
        status: (params[2] as 'En cours' | 'Terminé') || 'En cours',
        deadline: params[3] || ''
      };
      insertId = newTask.id;
      tasks.push(newTask);
    } 
    else if (sql.includes('UPDATE')) {
      if (sql.includes('SET status')) {
        const taskId = params[1];
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          task.status = params[0] as 'En cours' | 'Terminé';
        }
      } else if (sql.includes('SET deadline')) {
        const taskId = params[1];
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          task.deadline = params[0];
        }
      }
    } else if (sql.includes('DELETE')) {
      const id = params[0];
      const index = tasks.findIndex((t: Task) => t.id === id);
      if (index !== -1) tasks.splice(index, 1);
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return {
      rowsAffected: 1,
      insertId,
      rows: {
        length: 1,
        item: () => ({}),
        _array: []
      }
    };
  }
};

// Implémentation native avec SQLite
const setupNativeDatabase = async (): Promise<Database> => {
  const db = await SQLite.openDatabaseAsync('tasks.db');
  
  // Create table if not exists with deadline column
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      title TEXT, 
      description TEXT, 
      status TEXT, 
      deadline TEXT
    );
  `);
  
  // Check if deadline column exists
  try {
    await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM pragma_table_info(\'tasks\') WHERE name = ?',
      ['deadline']
    );
  } catch (error) {
    // If column doesn't exist, add it
    await db.execAsync('ALTER TABLE tasks ADD COLUMN deadline TEXT');
  }
  
  return {
    getAllAsync: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
      try {
        return await db.getAllAsync<T>(sql, params);
      } catch (error) {
        console.error('Error in getAllAsync:', error);
        return [];
      }
    },
    runAsync: async (sql: string, params: any[] = []) => {
      try {
        const result = await db.runAsync(sql, params);
        return {
          rowsAffected: result.changes?.length || 0,
          insertId: result.lastInsertRowId as number || 0
        };
      } catch (error) {
        console.error('Error in runAsync:', error);
        throw error;
      }
    }
  };
};

// Sélection de l'implémentation en fonction de la plateforme
export async function openDatabase(): Promise<Database> {
  if (Platform.OS === 'web') {
    const tasks = await webDatabase.getAllAsync<Task>('SELECT * FROM tasks');
    if (tasks.length === 0) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
    return webDatabase;
  }
  
  return setupNativeDatabase();
}
