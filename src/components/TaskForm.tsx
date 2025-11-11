import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';

interface TaskFormProps {
  onSubmit: (task: { title: string; description: string; status: string }) => void;
}

export default function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status] = useState('En cours');
 const [deadline, setDeadline] = useState('');
  const handleSubmit = () => {
    if (title.trim().length === 0) return;
    onSubmit({ title, description, status });
    setTitle('');
    setDescription('');
    setDeadline('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Titre"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />
      <Button title="Ajouter" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    marginVertical: 5,
    padding: 10,
    borderRadius: 5
  },
});
