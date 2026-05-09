import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Spin, Alert } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../../lib/supabase';
import { Loan } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const statusColor: Record<string, string> = { Active: 'blue', Returned: 'green', Overdue: 'red' };

export default function MyLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const { data } = await supabase
        .from('loans')
        .select('*, books(title, isbn)')
        .eq('user_id', profile.id)
        .order('loan_date', { ascending: false });
      setLoans((data as Loan[]) ?? []);
      setLoading(false);
    }
    load();
  }, [profile]);

  if (loading) return <Spin />;

  const overdue = loans.filter(l => l.status === 'Overdue');
  const totalFine = loans.reduce((sum, l) => sum + Number(l.fine), 0);

  const columns = [
    { title: 'Book', key: 'book', render: (_: unknown, r: Loan) => <Typography.Text strong>{r.books?.title}</Typography.Text>, ellipsis: true },
    { title: 'Loan Date', dataIndex: 'loan_date', key: 'loan_date', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
    { title: 'Return Date', dataIndex: 'return_date', key: 'return_date', render: (d: string) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={statusColor[v]} icon={v === 'Overdue' ? <WarningOutlined /> : undefined}>{v}</Tag>
      ),
    },
    {
      title: 'Fine',
      dataIndex: 'fine',
      key: 'fine',
      render: (v: number) => v > 0 ? <Tag color="orange">{Number(v).toFixed(2)} PLN</Tag> : '—',
    },
  ];

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>My Loans</Typography.Title>

      {overdue.length > 0 && (
        <Alert
          type="error"
          icon={<WarningOutlined />}
          showIcon
          message={`You have ${overdue.length} overdue loan(s). Total fine: ${totalFine.toFixed(2)} PLN. Please return the books as soon as possible.`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table dataSource={loans} columns={columns} rowKey="loan_id" pagination={{ pageSize: 10 }} />
    </div>
  );
}
