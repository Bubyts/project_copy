import { useEffect, useState } from 'react';
import { Card, Col, Row, Table, Typography, Spin, Tag, Progress } from 'antd';
import { TrophyOutlined, WarningOutlined, UserOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import dayjs from 'dayjs';

interface PopularBook { title: string; loan_count: number }
interface OverdueItem { title: string; borrower: string; due_date: string; days_overdue: number }
interface ActiveUser { name: string; active_loans: number }

export default function ReportsPage() {
  const [popular, setPopular] = useState<PopularBook[]>([]);
  const [overdue, setOverdue] = useState<OverdueItem[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await supabase.rpc('mark_overdue_loans');

      const [loansData, overdueData] = await Promise.all([
        supabase.from('loans').select('book_id, books(title)'),
        supabase.from('loans')
          .select('books(title), profiles(first_name, last_name), due_date, user_id')
          .eq('status', 'Overdue')
          .order('due_date'),
      ]);

      // Popular books: count loans per book
      const bookCounts = new Map<string, number>();
      (loansData.data ?? []).forEach((l: { books?: { title: string } | null }) => {
        const title = l.books?.title ?? 'Unknown';
        bookCounts.set(title, (bookCounts.get(title) ?? 0) + 1);
      });
      const popularSorted = Array.from(bookCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([title, loan_count]) => ({ title, loan_count }));
      setPopular(popularSorted);

      // Overdue items
      const overdueItems = (overdueData.data ?? []).map((l: {
        books?: { title: string } | null;
        profiles?: { first_name: string; last_name: string } | null;
        due_date: string;
      }) => ({
        title: l.books?.title ?? '—',
        borrower: `${l.profiles?.first_name ?? ''} ${l.profiles?.last_name ?? ''}`.trim(),
        due_date: l.due_date,
        days_overdue: dayjs().diff(dayjs(l.due_date), 'day'),
      }));
      setOverdue(overdueItems);

      // Active users
      const userCounts = new Map<string, number>();
      (loansData.data ?? []).forEach((l: { user_id?: string }) => {
        if (l.user_id) userCounts.set(l.user_id, (userCounts.get(l.user_id) ?? 0) + 1);
      });

      const { data: profilesData } = await supabase.from('profiles').select('id, first_name, last_name');
      const profileMap = new Map((profilesData ?? []).map((p: { id: string; first_name: string; last_name: string }) => [p.id, p]));
      const activeUsersSorted = Array.from(userCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => {
          const p = profileMap.get(id);
          return { name: p ? `${p.first_name} ${p.last_name}` : id, active_loans: count };
        });
      setActiveUsers(activeUsersSorted);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spin />;

  const maxLoans = popular[0]?.loan_count ?? 1;

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>Reports</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<><TrophyOutlined style={{ color: '#faad14', marginRight: 8 }} />Popular Books</>}>
            <Table
              dataSource={popular}
              rowKey="title"
              size="small"
              pagination={{ pageSize: 5 }}
              columns={[
                { title: 'Book', dataIndex: 'title', key: 'title', ellipsis: true },
                {
                  title: 'Loans',
                  dataIndex: 'loan_count',
                  key: 'loans',
                  render: (v: number) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Progress percent={Math.round((v / maxLoans) * 100)} showInfo={false} strokeColor="#1677ff" style={{ flex: 1, marginBottom: 0 }} />
                      <Tag>{v}</Tag>
                    </div>
                  ),
                },
              ]}
              locale={{ emptyText: 'No data yet' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<><UserOutlined style={{ color: '#52c41a', marginRight: 8 }} />Most Active Readers</>}>
            <Table
              dataSource={activeUsers}
              rowKey="name"
              size="small"
              columns={[
                { title: '#', key: 'rank', render: (_: unknown, __: unknown, i: number) => i + 1, width: 40 },
                { title: 'User', dataIndex: 'name', key: 'name' },
                { title: 'Total Loans', dataIndex: 'active_loans', key: 'loans', render: (v: number) => <Tag color="blue">{v}</Tag> },
              ]}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>

        <Col xs={24}>
          <Card title={<><WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />Overdue Loans Detail</>}>
            <Table
              dataSource={overdue}
              rowKey={(r, i) => `${r.title}-${i}`}
              size="small"
              pagination={{ pageSize: 10 }}
              columns={[
                { title: 'Book', dataIndex: 'title', key: 'title', ellipsis: true },
                { title: 'Borrower', dataIndex: 'borrower', key: 'borrower' },
                { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
                {
                  title: 'Days Overdue',
                  dataIndex: 'days_overdue',
                  key: 'overdue',
                  render: (v: number) => <Tag color="red">{v} days</Tag>,
                  sorter: (a: OverdueItem, b: OverdueItem) => b.days_overdue - a.days_overdue,
                },
                {
                  title: 'Est. Fine',
                  key: 'fine',
                  render: (_: unknown, r: OverdueItem) => `${r.days_overdue.toFixed(0)} PLN`,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
