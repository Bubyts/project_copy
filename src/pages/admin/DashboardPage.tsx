import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Table, Tag, Spin } from 'antd';
import {
  BookOutlined,
  UserOutlined,
  FileTextOutlined,
  WarningOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { Loan } from '../../types';
import dayjs from 'dayjs';

interface Stats {
  totalBooks: number;
  availableBooks: number;
  totalUsers: number;
  activeLoans: number;
  overdueLoans: number;
  activeReservations: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [overdue, setOverdue] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await supabase.rpc('mark_overdue_loans');

      const [books, users, activeLoans, overdueLoans, reservations, overdueList] = await Promise.all([
        supabase.from('books').select('book_id, available_copies').eq('is_active', true),
        supabase.from('profiles').select('id').eq('is_active', true),
        supabase.from('loans').select('loan_id').eq('status', 'Active'),
        supabase.from('loans').select('loan_id').eq('status', 'Overdue'),
        supabase.from('reservations').select('reservation_id').eq('status', 'Active'),
        supabase.from('loans')
          .select('*, books(title), profiles(first_name, last_name, email)')
          .eq('status', 'Overdue')
          .order('due_date')
          .limit(10),
      ]);

      const bookData = books.data ?? [];
      setStats({
        totalBooks: bookData.length,
        availableBooks: bookData.filter(b => b.available_copies > 0).length,
        totalUsers: users.data?.length ?? 0,
        activeLoans: activeLoans.data?.length ?? 0,
        overdueLoans: overdueLoans.data?.length ?? 0,
        activeReservations: reservations.data?.length ?? 0,
      });
      setOverdue((overdueList.data as Loan[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spin />;

  const overdueColumns = [
    { title: 'Book', dataIndex: ['books', 'title'], key: 'title', ellipsis: true },
    {
      title: 'User',
      key: 'user',
      render: (_: unknown, r: Loan) => `${r.profiles?.first_name} ${r.profiles?.last_name}`,
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (d: string) => (
        <Tag color="red">{dayjs(d).format('DD MMM YYYY')}</Tag>
      ),
    },
    {
      title: 'Days Overdue',
      key: 'overdue',
      render: (_: unknown, r: Loan) => (
        <Tag color="volcano">{dayjs().diff(dayjs(r.due_date), 'day')} days</Tag>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>Dashboard</Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic title="Total Books" value={stats?.totalBooks} prefix={<BookOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic title="Available Now" value={stats?.availableBooks} prefix={<BookOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic title="Registered Users" value={stats?.totalUsers} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic title="Active Loans" value={stats?.activeLoans} prefix={<FileTextOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic title="Overdue" value={stats?.overdueLoans} prefix={<WarningOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic title="Reservations" value={stats?.activeReservations} prefix={<CalendarOutlined />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
      </Row>

      <Card title={<><WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />Overdue Loans</>}>
        <Table
          dataSource={overdue}
          columns={overdueColumns}
          rowKey="loan_id"
          size="small"
          pagination={false}
          locale={{ emptyText: 'No overdue loans' }}
        />
      </Card>
    </div>
  );
}
