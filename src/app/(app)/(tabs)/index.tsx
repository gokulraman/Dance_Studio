import { useMemo } from 'react';
import { FlatList, View } from 'react-native';

import { Badge, Card, Choices, Muted, Row, SectionHeader, StateMessage, Title } from '@/components/ui';
import { clockTime, rupees } from '@/lib/format';
import { useStudioId } from '@/lib/studio';
import { supabase } from '@/lib/supabase';
import { useThemeChoice, type ThemeChoice } from '@/lib/theme';
import { useLoad } from '@/lib/use-load';

type ClassRow = { batch_id: number; batch_name: string; start_time: string; end_time: string; attendance_taken: boolean };
type MembershipRow = { status: string; outstanding_rupees: number };

const fetchClasses = (studioId: number) =>
  supabase
    .from('todays_classes')
    .select('batch_id, batch_name, start_time, end_time, attendance_taken')
    .eq('studio_id', studioId)
    .order('start_time')
    .then((r) => ({ data: r.data as ClassRow[] | null, error: r.error }));

const fetchMemberships = (studioId: number) =>
  supabase
    .from('membership_overview')
    .select('status, outstanding_rupees')
    .eq('studio_id', studioId)
    .neq('status', 'cancelled')
    .then((r) => ({ data: r.data as MembershipRow[] | null, error: r.error }));

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function Today() {
  const studioId = useStudioId();
  const classes = useLoad(fetchClasses, studioId);
  const memberships = useLoad(fetchMemberships, studioId);
  const [themeChoice, setThemeChoice] = useThemeChoice();

  const attention = useMemo(() => {
    const rows = memberships.data ?? [];
    const count = (...statuses: string[]) => rows.filter((m) => statuses.includes(m.status)).length;
    return {
      expiring: count('expiring_soon', 'expires_today'),
      recentlyExpired: count('recently_expired'),
      awaiting: count('awaiting_activation'),
      outstanding: rows.reduce((sum, m) => sum + m.outstanding_rupees, 0),
    };
  }, [memberships.data]);

  return (
    <FlatList
      data={classes.data ?? []}
      keyExtractor={(c) => String(c.batch_id)}
      refreshing={classes.isLoading}
      onRefresh={() => {
        void classes.reload();
        void memberships.reload();
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <View>
          <SectionHeader>Needs attention</SectionHeader>
          <Card>
            <Row><Muted>Expiring in the next 7 days</Muted><Title>{attention.expiring}</Title></Row>
            <Row><Muted>Expired in the last 7 days</Muted><Title>{attention.recentlyExpired}</Title></Row>
            <Row><Muted>Awaiting activation</Muted><Title>{attention.awaiting}</Title></Row>
            <Row><Muted>Total balance due</Muted><Title>{rupees(attention.outstanding)}</Title></Row>
          </Card>
          <SectionHeader>Today&apos;s classes</SectionHeader>
        </View>
      }
      ListEmptyComponent={<StateMessage isLoading={classes.isLoading} error={classes.error} empty="No classes scheduled today." />}
      ListFooterComponent={
        <View>
          <SectionHeader>Appearance</SectionHeader>
          <View style={{ paddingHorizontal: 16 }}>
            <Choices options={THEME_OPTIONS} value={themeChoice} onChange={setThemeChoice} />
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <Row>
            <Title>{item.batch_name}</Title>
            <Badge label={item.attendance_taken ? 'Attendance taken' : 'Not taken'} tone={item.attendance_taken ? 'good' : 'warn'} />
          </Row>
          <Muted>{clockTime(item.start_time)} – {clockTime(item.end_time)}</Muted>
        </Card>
      )}
    />
  );
}
