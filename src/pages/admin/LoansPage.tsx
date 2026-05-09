import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Select, Input, InputNumber, Tag, Typography, App, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, CheckOutlined, WarningOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../../lib/supabase';
import { Loan, Book, Profile } from '../../types';

const statusColor: Record<string, string> = {
  Active: 'blue',
  Returned: 'green',
  Overdue: 'red',
};

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [form] = Form.useForm();
  const { message } = App.useApp();

  async function load() {
    setLoading(true);
    await supabase.rpc('mark_overdue_loans');

    const [loansRes, booksRes, usersRes] = await Promise.all([
      supabase.from('loans')
        .select('*, books(title, isbn), profiles(first_name, last_name, email)')
        .order('loan_date', { ascending: false }),
      supabase.from('books').select('book_id, title, available_copies').eq('is_active', true).gt('available_copies', 0),
      supabase.from('profiles').select('id, first_name, last_name, email').eq('is_active', true),
    ]);
    setLoans((loansRes.data as Loan[]) ?? []);
    setBooks((booksRes.data as Book[]) ?? []);
    setUsers((usersRes.data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreateLoan() {
    const values = await form.validateFields();
    setSaving(true);
    const dueDate = dayjs().add(values.days, 'day').toISOString();
    const { error } = await supabase.from('loans').insert({
      book_id: values.book_id,
      user_id: values.user_id,
      due_date: dueDate,
    });
    setSaving(false);
    if (error) { message.error(error.message); return; }
    message.success('Loan created');
    setModalOpen(false);
    form.resetFields();
    load();
  }

  async function handleReturn(loan: Loan) {
    const { error } = await supabase.from('loans').update({
      status: 'Returned',
      return_date: new Date().toISOString(),
    }).eq('loan_id', loan.loan_id);
    if (error) message.error(error.message);
    else { message.success('Book returned'); load(); }
  }

  const [search, setSearch] = useState('');

  const filtered = loans
    .filter(l => statusFilter === 'all' || l.status === statusFilter)
    .filter(l =>
      (l.books?.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      `${l.profiles?.first_name ?? ''} ${l.profiles?.last_name ?? ''}`.toLowerCase().includes(search.toLowerCase())
    );

  const columns = [
    { title: 'Book', key: 'book', render: (_: unknown, r: Loan) => r.books?.title, ellipsis: true },
    {
      title: 'User',
      key: 'user',
      render: (_: unknown, r: Loan) => `${r.profiles?.first_name} ${r.profiles?.last_name}`,
    },
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
      render: (v: number) => v > 0 ? <Tag color="orange">{v.toFixed(2)} PLN</Tag> : '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: Loan) =>
        r.status !== 'Returned' ? (
          <Popconfirm title="Mark as returned?" onConfirm={() => handleReturn(r)}>
            <Tooltip title="Return Book">
              <Button icon={<CheckOutlined />} size="small" type="primary">Return</Button>
            </Tooltip>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Loans</Typography.Title>
        <Space>
          <Input
            placeholder="Search book or user..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Overdue', label: 'Overdue' },
              { value: 'Returned', label: 'Returned' },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
            New Loan
          </Button>
        </Space>
      </div>

      <Table dataSource={filtered} columns={columns} rowKey="loan_id" loading={loading} />

      <Modal title="Create Loan" open={modalOpen} onOk={handleCreateLoan} onCancel={() => setModalOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="book_id" label="Book" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={books.map(b => ({ value: b.book_id, label: `${b.title} (${b.available_copies} available)` }))}
            />
          </Form.Item>
          <Form.Item name="user_id" label="User" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={users.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} — ${u.email}` }))}
            />
          </Form.Item>
          <Form.Item name="days" label="Loan Duration (days)" initialValue={14} rules={[{ required: true }]}>
            <InputNumber min={1} max={90} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
