import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import api from '@/api/client';
import { LocalProgram, Program } from '@/types';
import { addLocalProgram, deleteLocalProgram, getLocalPrograms, saveLocalPrograms } from '@/utils/programBuilderStorage';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';

function suggestedPrescription(exerciseName: string) {
  const lower = exerciseName.toLowerCase();
  if (lower.includes('pompes')) return { sets: 4, reps: '10-15', restSec: 60, loadKg: 0 };
  if (lower.includes('squat')) return { sets: 4, reps: '10-12', restSec: 75, loadKg: 12 };
  if (lower.includes('couche')) return { sets: 5, reps: '5-8', restSec: 120, loadKg: 60 };
  if (lower.includes('tirage')) return { sets: 4, reps: '8-12', restSec: 90, loadKg: 45 };
  if (lower.includes('souleve')) return { sets: 4, reps: '6-10', restSec: 120, loadKg: 70 };
  if (lower.includes('burpees')) return { sets: 6, reps: '30s', restSec: 30, loadKg: 0 };
  if (lower.includes('planche')) return { sets: 4, reps: '45s', restSec: 30, loadKg: 0 };
  return { sets: 3, reps: '10-12', restSec: 60, loadKg: 0 };
}

function makeBlankProgram(): LocalProgram {
  return {
    id: `local-${Date.now()}`,
    title: 'Mon programme',
    description: 'Programme personnalise',
    mode: 'home',
    daysPerWeek: 3,
    days: [
      {
        id: `day-${Date.now()}`,
        label: 'Jour 1',
        focus: 'Full Body',
        exercises: [
          { id: `ex-${Date.now()}`, name: 'Pompes', sets: 4, reps: '10-12', restSec: 60, loadKg: 0 }
        ]
      }
    ],
    createdAt: new Date().toISOString()
  };
}

function cloneFromTemplate(template: Program): LocalProgram {
  return {
    id: `local-${Date.now()}`,
    title: `${template.title} (Perso)`,
    description: template.description || 'Duplique depuis template',
    mode: template.mode,
    daysPerWeek: template.daysPerWeek || 3,
    days: [
      {
        id: `day-${Date.now()}`,
        label: 'Jour 1',
        focus: template.tags?.[0] || 'Focus principal',
        exercises: [
          { id: `ex-${Date.now()}`, name: 'Exercice libre', sets: 4, reps: '10', restSec: 60, loadKg: 0 }
        ]
      }
    ],
    createdAt: new Date().toISOString()
  };
}

export default function BuilderScreen() {
  const [templates, setTemplates] = useState<Program[]>([]);
  const [locals, setLocals] = useState<LocalProgram[]>([]);
  const [draft, setDraft] = useState<LocalProgram>(makeBlankProgram());
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<'home' | 'gym'>('home');

  useEffect(() => {
    getLocalPrograms().then(setLocals).catch(() => undefined);
  }, []);

  useEffect(() => {
    api
      .get('/programs', { params: { mode: modeFilter } })
      .then((res) => setTemplates(res.data.programs || []))
      .catch(() => setTemplates([]));
  }, [modeFilter]);

  const totalExercises = useMemo(
    () => draft.days.reduce((acc, d) => acc + d.exercises.length, 0),
    [draft.days]
  );

  const addDay = () => {
    setDraft((prev) => ({
      ...prev,
      days: [
        ...prev.days,
        {
          id: `day-${Date.now()}`,
          label: `Jour ${prev.days.length + 1}`,
          focus: 'Focus',
          exercises: [
            { id: `ex-${Date.now()}`, name: 'Exercice', sets: 3, reps: '12', restSec: 60, loadKg: 0 }
          ]
        }
      ]
    }));
  };

  const addExercise = (dayId: string, presetName?: string) => {
    const preset = suggestedPrescription(presetName || '');
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                {
                  id: `ex-${Date.now()}`,
                  name: presetName || 'Nouvel exo',
                  sets: preset.sets,
                  reps: preset.reps,
                  restSec: preset.restSec,
                  loadKg: preset.loadKg
                }
              ]
            }
          : day
      )
    }));
  };

  const updateDay = (dayId: string, patch: Partial<LocalProgram['days'][number]>) => {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d))
    }));
  };

  const updateExercise = (
    dayId: string,
    exId: string,
    patch: Partial<LocalProgram['days'][number]['exercises'][number]>
  ) => {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.map((ex) => (ex.id === exId ? { ...ex, ...patch } : ex))
            }
          : d
      )
    }));
  };

  const saveDraft = async () => {
    try {
      let updated: LocalProgram[];
      if (editingProgramId) {
        updated = locals.map((item) =>
          item.id === editingProgramId
            ? { ...draft, id: editingProgramId, createdAt: item.createdAt }
            : item
        );
        await saveLocalPrograms(updated);
      } else {
        const programToSave = {
          ...draft,
          id: `local-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        updated = await addLocalProgram(programToSave);
      }
      setLocals(updated);
      setDraft(makeBlankProgram());
      setEditingProgramId(null);
      Alert.alert('OK', editingProgramId ? 'Programme mis a jour' : 'Programme perso sauvegarde');
    } catch {
      Alert.alert('Erreur', 'Sauvegarde impossible');
    }
  };

  const duplicateTemplate = async (template: Program) => {
    const local = cloneFromTemplate(template);
    const updated = await addLocalProgram(local);
    setLocals(updated);
    Alert.alert('Template duplique', local.title);
  };

  const duplicateLocal = async (program: LocalProgram) => {
    const copy = {
      ...program,
      id: `local-${Date.now()}`,
      title: `${program.title} (Copie)`,
      createdAt: new Date().toISOString()
    };
    const updated = await addLocalProgram(copy);
    setLocals(updated);
  };

  const removeLocal = async (id: string) => {
    const updated = await deleteLocalProgram(id);
    setLocals(updated);
  };

  const loadAsDraft = (program: LocalProgram) => {
    setDraft(JSON.parse(JSON.stringify(program)));
    setEditingProgramId(program.id);
  };

  return (
    <Screen style={styles.root}>
      <Text style={styles.title}>Programme Builder</Text>

      <View style={styles.segment}>
        <Pressable onPress={() => setModeFilter('home')} style={[styles.segmentBtn, modeFilter === 'home' && styles.segmentBtnActive]}>
          <Text style={styles.segmentText}>Templates Maison</Text>
        </Pressable>
        <Pressable onPress={() => setModeFilter('gym')} style={[styles.segmentBtn, modeFilter === 'gym' && styles.segmentBtnActive]}>
          <Text style={styles.segmentText}>Templates Salle</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dupliquer un template</Text>
          {templates.slice(0, 4).map((t) => (
            <View key={t._id} style={styles.templateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.templateTitle}>{t.title}</Text>
                <Text style={styles.templateMeta}>{t.daysPerWeek} jours/sem • {t.mode}</Text>
              </View>
              <Pressable style={styles.smallBtn} onPress={() => duplicateTemplate(t)}>
                <Text style={styles.smallBtnText}>Dupliquer</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Creer un programme perso</Text>
          <TextInput style={styles.input} value={draft.title} onChangeText={(v) => setDraft((p) => ({ ...p, title: v }))} placeholder="Titre" placeholderTextColor="#64748B" />
          <TextInput style={styles.input} value={draft.description} onChangeText={(v) => setDraft((p) => ({ ...p, description: v }))} placeholder="Description" placeholderTextColor="#64748B" />
          <TextInput
            style={styles.input}
            value={String(draft.daysPerWeek)}
            onChangeText={(v) => setDraft((p) => ({ ...p, daysPerWeek: Number(v || 1) }))}
            keyboardType="numeric"
            placeholder="Jours/semaine"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.counter}>{draft.days.length} jours • {totalExercises} exercices</Text>

          {draft.days.map((day) => (
            <View key={day.id} style={styles.dayCard}>
              <TextInput style={styles.input} value={day.label} onChangeText={(v) => updateDay(day.id, { label: v })} placeholder="Jour" placeholderTextColor="#64748B" />
              <TextInput style={styles.input} value={day.focus} onChangeText={(v) => updateDay(day.id, { focus: v })} placeholder="Focus" placeholderTextColor="#64748B" />

              <Text style={styles.helperLabel}>Suggestions exercices (auto reps/poids)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 8 }}>
                {EXERCISE_LIBRARY.slice(0, 8).map((lib) => (
                  <Pressable key={lib.id} style={styles.suggestChip} onPress={() => addExercise(day.id, lib.name)}>
                    <Text style={styles.suggestChipText}>{lib.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {day.exercises.map((ex) => (
                <View key={ex.id} style={styles.exBlock}>
                  <TextInput style={styles.input} value={ex.name} onChangeText={(v) => updateExercise(day.id, ex.id, { name: v })} placeholder="Exercice" placeholderTextColor="#64748B" />
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.rowInput]}
                      value={String(ex.sets)}
                      onChangeText={(v) => updateExercise(day.id, ex.id, { sets: Number(v || 0) })}
                      keyboardType="numeric"
                      placeholder="Sets"
                      placeholderTextColor="#64748B"
                    />
                    <TextInput style={[styles.input, styles.rowInput]} value={ex.reps} onChangeText={(v) => updateExercise(day.id, ex.id, { reps: v })} placeholder="Reps" placeholderTextColor="#64748B" />
                    <TextInput
                      style={[styles.input, styles.rowInput]}
                      value={String(ex.restSec)}
                      onChangeText={(v) => updateExercise(day.id, ex.id, { restSec: Number(v || 0) })}
                      keyboardType="numeric"
                      placeholder="Repos"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={ex.loadKg !== undefined ? String(ex.loadKg) : ''}
                    onChangeText={(v) => updateExercise(day.id, ex.id, { loadKg: Number(v || 0) })}
                    keyboardType="numeric"
                    placeholder="Poids conseille/utilise (kg)"
                    placeholderTextColor="#64748B"
                  />
                </View>
              ))}

              <Pressable style={styles.ghostBtn} onPress={() => addExercise(day.id)}>
                <Text style={styles.ghostBtnText}>+ Ajouter exercice</Text>
              </Pressable>
            </View>
          ))}

          <Pressable style={styles.ghostBtn} onPress={addDay}>
            <Text style={styles.ghostBtnText}>+ Ajouter jour</Text>
          </Pressable>

          <Pressable style={styles.primaryBtn} onPress={saveDraft}>
            <Text style={styles.primaryBtnText}>
              {editingProgramId ? 'Mettre a jour le programme' : 'Sauvegarder programme perso'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mes programmes ({locals.length})</Text>
          {locals.map((p) => (
            <View key={p.id} style={styles.localRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.templateTitle}>{p.title}</Text>
                <Text style={styles.templateMeta}>{p.daysPerWeek} j/sem • {p.days.length} jours</Text>
              </View>
              <View style={styles.actionCol}>
                <Pressable style={styles.smallBtn} onPress={() => duplicateLocal(p)}>
                  <Text style={styles.smallBtnText}>Copier</Text>
                </Pressable>
                <Pressable style={styles.smallBtnDark} onPress={() => loadAsDraft(p)}>
                  <Text style={styles.smallBtnText}>Editer</Text>
                </Pressable>
                <Pressable style={styles.smallBtnWarn} onPress={() => removeLocal(p.id)}>
                  <Text style={styles.smallBtnText}>Suppr</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#020617' },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '800', marginVertical: 12 },
  segment: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 12, padding: 4, marginBottom: 12 },
  segmentBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#0EA5A4' },
  segmentText: { color: '#E2E8F0', fontWeight: '700' },
  card: { backgroundColor: '#111827', borderColor: '#1F2937', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardTitle: { color: '#F8FAFC', fontWeight: '800', fontSize: 17, marginBottom: 10 },
  templateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  templateTitle: { color: '#F8FAFC', fontWeight: '700' },
  templateMeta: { color: '#94A3B8', marginTop: 3, fontSize: 12 },
  smallBtn: { backgroundColor: '#0EA5A4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  smallBtnDark: { backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  smallBtnWarn: { backgroundColor: '#7F1D1D', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  smallBtnText: { color: '#F8FAFC', fontWeight: '700', fontSize: 12 },
  input: {
    backgroundColor: '#0B1220',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#F8FAFC',
    marginBottom: 8
  },
  counter: { color: '#2DD4BF', fontWeight: '700', marginBottom: 8 },
  dayCard: { backgroundColor: '#0B1220', borderWidth: 1, borderColor: '#1F2937', borderRadius: 12, padding: 10, marginBottom: 10 },
  exBlock: { backgroundColor: '#111827', borderColor: '#1F2937', borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 8 },
  helperLabel: { color: '#94A3B8', marginBottom: 6, fontSize: 12, fontWeight: '600' },
  suggestChip: {
    backgroundColor: '#0EA5A4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  suggestChipText: { color: '#052E2B', fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 6 },
  rowInput: { flex: 1 },
  ghostBtn: { backgroundColor: '#0B1220', borderColor: '#334155', borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  ghostBtnText: { color: '#E2E8F0', fontWeight: '700' },
  primaryBtn: { backgroundColor: '#0EA5A4', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 2 },
  primaryBtnText: { color: '#032B2B', fontWeight: '800' },
  localRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionCol: { width: 72 }
});
