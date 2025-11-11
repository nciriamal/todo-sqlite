import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, Image, View } from 'react-native';
import TaskForm from './src/components/TaskForm';
import TaskList from './src/components/TaskList';
import { openDatabase } from './src/database/database';

type Database = {
  getAllAsync: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  runAsync: (sql: string, params?: any[]) => Promise<{ rowsAffected: number; insertId: number }>;
};

type TaskStatus = 'En cours' | 'Terminé';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  deadline?: string;
}

export default function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const database = await openDatabase();
        setDb(database);
        const result = await database.getAllAsync<Task>('SELECT * FROM tasks');
        setTasks(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error('Error initializing database:', error);
        setTasks([]);
      }
    })();
  }, []);

  async function addTask(task: { title: string; description: string; status: string; deadline?: string }) {
    if (!db) return;
    try {
      await db.runAsync(
        'INSERT INTO tasks (title, description, status, deadline) VALUES (?, ?, ?, ?)',
        [task.title, task.description, task.status || 'En cours', task.deadline || null]
      );
      const updated = await db.getAllAsync<Task>('SELECT * FROM tasks');
      setTasks(updated);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  }

  async function deleteTask(id: number) {
    if (!db) return;
    try {
      await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
      const updated = await db.getAllAsync<Task>('SELECT * FROM tasks');
      setTasks(updated);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  async function updateTaskStatus(id: number, newStatus: TaskStatus) {
    if (!db) return;
    try {
      await db.runAsync('UPDATE tasks SET status = ? WHERE id = ?', [newStatus, id]);
      const updated = await db.getAllAsync<Task>('SELECT * FROM tasks');
      setTasks(updated);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  async function updateTaskDeadline(id: number, deadline: string) {
    if (!db) return;
    try {
      await db.runAsync('UPDATE tasks SET deadline = ? WHERE id = ?', [deadline, id]);
      const updated = await db.getAllAsync<Task>('SELECT * FROM tasks');
      setTasks(updated);
    } catch (error) {
      console.error('Error updating deadline:', error);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Mes Tâches</Text>

      {/* ✅ Profile Image */}
      <View style={styles.profileWrapper}>
        <Image
          source={require('./assets/profile.png')}
          style={styles.profileImage}
        />
      </View>

      <TaskForm onSubmit={addTask} />

      {tasks.length > 0 ? (
        <TaskList
          tasks={tasks}
          onDelete={deleteTask}
          onUpdateStatus={updateTaskStatus}
          onUpdateDeadline={updateTaskDeadline}
        />
      ) : (
        <Text style={styles.emptyText}>Aucune tâche pour le moment</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  header: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 10,
    color: '#333',
    textAlign: 'center'
  },
  // ✅ Added Profile Styles
  profileWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55, // makes perfectly round
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 16
  },
});
