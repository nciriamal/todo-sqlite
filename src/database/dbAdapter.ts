import * as SQLite from 'expo-sqlite';

type WebDatabase = {
  getAllAsync: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  runAsync: (sql: string, params?: any[]) => Promise<{ rowsAffected: number; insertId: number }>;
};

export function createDatabaseAdapter(db: SQLite.SQLiteDatabase | WebDatabase) {
  // Vérifie si c'est une base de données SQLite native
  if ('databasePath' in db) {
    return {
      getAllAsync: async <T = any>(sql: string, params: any[] = []) => {
        return db.getAllAsync<T>(sql, params);
      },
      runAsync: async (sql: string, params: any[] = []) => {
        return db.runAsync(sql, params);
      }
    };
  }
  
  // Sinon, c'est notre implémentation web
  return db;
}
