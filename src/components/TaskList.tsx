import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import type { Task } from '../../App';
type TaskStatus = 'En cours' | 'Terminé';

interface TaskListProps {
  tasks: Task[];
  onDelete: (id: number) => void;
  onUpdateStatus: (id: number, newStatus: TaskStatus) => Promise<void>;
  onUpdateDeadline: (id: number, deadline: string) => Promise<void>;
}

// Format date helper function
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Aucune date définie';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date invalide';
  }
};

export default function TaskList({ tasks, onDelete, onUpdateStatus, onUpdateDeadline }: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'status' | 'deadline'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [error, setError] = useState<string | null>(null);
  
  // Reset error state when search query changes
  useEffect(() => {
    setError(null);
  }, [searchQuery]);

  // For web compatibility
  const promptForDate = (currentDate?: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const newDate = window.prompt('Entrez une nouvelle date (YYYY-MM-DD):', currentDate || '');
        resolve(newDate);
      });
    } else {
      // For native, we'll use Alert.prompt with type assertion
      return new Promise((resolve) => {
        Alert.prompt(
          'Modifier la date',
          'Entrez la nouvelle date (YYYY-MM-DD):',
          [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
            {
              text: 'OK',
              onPress: (text: string | undefined) => resolve(text || null),
            },
          ],
          'plain-text',
          currentDate
        ) as any; // Type assertion to handle Alert.prompt type issues
      });
    }
  };

  // Filter tasks by search query (title, description, status, or deadline)
  const filteredTasks = useMemo(() => {
    try {
      if (!tasks) return [];
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) return tasks;
      
      const normalizedQuery = trimmedQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      return tasks.filter(task => {
        // Check status (case and accent insensitive)
        const normalizedStatus = task.status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizedStatus.includes(normalizedQuery)) {
          return true;
        }
        
        // Check title and description (case insensitive)
        if (task.title.toLowerCase().includes(normalizedQuery) ||
            task.description.toLowerCase().includes(normalizedQuery)) {
          return true;
        }
        
        // If it's a number, search in dates
        if (/^\d+$/.test(normalizedQuery)) {
          if (task.deadline) {
            const date = new Date(task.deadline);
            if (isNaN(date.getTime())) return false;
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            // Check if the normalizedQuery matches day, month, or year
            if (day.includes(normalizedQuery) || 
                month.includes(normalizedQuery) || 
                year.toString().includes(normalizedQuery)) {
              return true;
            }
          }
          return false;
        }
        
        // For non-numeric queries, check formatted date
        if (task.deadline) {
          try {
            const formattedDate = formatDate(task.deadline).toLowerCase();
            if (formattedDate.includes(query)) {
              return true;
            }
            
            // Check in ISO format (YYYY-MM-DD)
            const date = new Date(task.deadline);
            if (!isNaN(date.getTime())) {
              const isoDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
              if (isoDate.includes(query)) {
                return true;
              }
            }
          } catch (error) {
            console.error('Error processing date:', error);
            return false;
          }
        }
        
        return false;
      });
    } catch (error) {
      console.error('Error filtering tasks:', error);
      setError('Une erreur est survenue lors du filtrage des tâches');
      return [];
    }
  }, [tasks, searchQuery]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (sortBy === 'status') {
        return sortOrder === 'asc' 
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      } else { // sort by deadline
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });
  }, [filteredTasks, sortBy, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Aucune date définie';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date invalide';
    }
  };

  // Show error message if there's an error
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setError(null)}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par titre, description, statut (en cours/terminé) ou date..."
          placeholderTextColor="#95a5a6"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
      </View>

      <View style={styles.sortContainer}>
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'status' && styles.activeSort]}
          onPress={() => setSortBy('status')}
        >
          <Text>Par statut</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'deadline' && styles.activeSort]}
          onPress={() => setSortBy('deadline')}
        >
          <Text>Par échéance</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleSortOrder} style={styles.sortOrderButton}>
          <MaterialIcons 
            name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
            size={20} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.tasksContainer}>
        {sortedTasks.map((task) => (
          <View key={task.id} style={styles.taskContainer}>
            <View style={styles.taskHeader}>
              <Text style={styles.title}>{task.title}</Text>
              <TouchableOpacity onPress={() => onDelete(task.id)}>
                <MaterialIcons name="delete" size={24} color="#ff3b30" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.description}>{task.description}</Text>
            
            {/* Deadline section */}
            <View style={styles.deadlineContainer}>
              <Text style={styles.metaLabel}>Échéance:</Text>
              <TouchableOpacity 
                style={styles.deadlineButton}
                onPress={async () => {
                  try {
                    const newDate = await promptForDate(task.deadline);
                    if (newDate) {
                      await onUpdateDeadline(task.id, newDate);
                    }
                  } catch (error) {
                    console.error('Error updating deadline:', error);
                  }
                }}
              >
                <Text style={styles.deadlineText}>
                  {task.deadline ? formatDate(task.deadline) : 'Définir une date'}
                </Text>
                <MaterialIcons name="edit" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {/* Status section */}
            <View style={styles.taskMeta}>
              <View style={styles.statusContainer}>
                <Text style={styles.metaLabel}>Statut:</Text>
                <TouchableOpacity 
                  style={[styles.statusBadge, task.status === 'Terminé' && styles.statusCompleted]}
                  onPress={async () => {
                    try {
                      const newStatus: TaskStatus = task.status === 'Terminé' ? 'En cours' : 'Terminé';
                      await onUpdateStatus(task.id, newStatus);
                    } catch (error) {
                      console.error('Error updating status:', error);
                    }
                  }}
                >
                  <Text style={styles.statusText}>{task.status}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderWidth: 0,
    borderRadius: 12,
    padding: 12,
    paddingLeft: 50,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: 'white',
    placeholderTextColor: '#95a5a6',
  },
  searchIcon: {
    position: 'absolute',
    left: 15,
    top: 13,
    color: '#7f8c8d',
  },
  sortContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f1f2f6',
  },
  activeSort: {
    backgroundColor: '#3498db',
  },
  sortButtonText: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  activeSortText: {
    color: 'white',
  },
  sortOrderButton: {
    marginLeft: 'auto',
    padding: 8,
    backgroundColor: '#f1f2f6',
    borderRadius: 20,
  },
  tasksContainer: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 16,
    shadowColor: '#2c3e50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  taskCompleted: {
    borderLeftColor: '#2ecc71',
    opacity: 0.9,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  deadlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deadlineText: {
    color: '#2c3e50',
    marginRight: 6,
    fontSize: 14,
  },
  metaLabel: {
    marginRight: 8,
    color: '#7f8c8d',
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e3f2fd',
  },
  statusText: {
    color: '#2980b9',
    fontWeight: '600',
    fontSize: 13,
  },
  statusCompleted: {
    backgroundColor: '#d4edda',
  },
  statusCompletedText: {
    color: '#28a745',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  statusCompleted: {
    backgroundColor: '#e8f5e9',
  },
  statusText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deadlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 4,
  },
  deadlineText: {
    color: '#007AFF',
    marginRight: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5
  },
  description: {
    color: '#666',
    marginBottom: 5
  },
  status: {
    color: '#007AFF',
    marginBottom: 10,
    fontSize: 16,
  },
  completedStatus: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  statusButton: {
    backgroundColor: '#007AFF',
    marginRight: 10,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
});
