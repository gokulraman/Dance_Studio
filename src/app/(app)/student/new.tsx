import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import {
  EMPTY_STUDENT,
  findPhoneMatches,
  SharedPhoneNotice,
  StudentFields,
  validateStudent,
  type PhoneMatch,
  type StudentValues,
} from '@/components/student-form';
import { Button, ErrorText } from '@/components/ui';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';

export default function NewStudent() {
  const studioId = useStudioId();
  const [values, setValues] = useState<StudentValues>(EMPTY_STUDENT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharedWith, setSharedWith] = useState<PhoneMatch[] | null>(null);

  async function save() {
    setError(null);
    const result = validateStudent(values);
    if ('error' in result) return setError(result.error);

    setBusy(true);
    try {
      if (sharedWith === null) {
        const { matches, error } = await findPhoneMatches(studioId, result.row, null);
        if (error) return setError(error);
        if (matches.length) return setSharedWith(matches);
      }

      const { data, error } = await supabase
        .from('students')
        .insert({ studio_id: studioId, ...result.row })
        .select('id')
        .single();
      if (error) return setError(error.message);
      router.replace({ pathname: '/enroll/[studentId]', params: { studentId: String(data.id) } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <StudentFields
        values={values}
        onChange={(patch) => {
          setValues((v) => ({ ...v, ...patch }));
          setSharedWith(null);
        }}
      />
      {sharedWith && <SharedPhoneNotice matches={sharedWith} />}
      {error && <ErrorText>{error}</ErrorText>}
      <Button label={sharedWith ? 'Save anyway' : 'Save and enrol'} onPress={save} busy={busy} />
    </ScrollView>
  );
}
