import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Typography, App, Tooltip } from 'antd';
import { EditOutlined, UserOutlined, SearchOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import dayjs from 'dayjs';

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();
  const { message } = App.useApp();

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('last_name');
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEdit(user: Profile) {
    setEditing(user);
    form.setFieldsValue(user);
    setModalOpen(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    setSaving(true);
    const { error } = await supabase.from('profiles').update(values).eq('id', editing!.id);
    setSaving(false);
    if (error) { message.error(error.message); return; }
    message.success('User updated');
    setModalOpen(false);
    load();
  }

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_: unknown, r: Profile) => (
        <Space>
          <UserOutlined />
          <Typography.Text strong>{r.first_name} {r.last_name}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '—' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => <Tag color={v === 'admin' ? 'gold' : 'blue'}>{v.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    { title: 'Max Loans', dataIndex: 'max_loans_allowed', key: 'max_loans' },
    {
      title: 'Registered',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (d: string) => dayjs(d).format('DD MMM YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: Profile) => (
        <Tooltip title="Edit">
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
        </Tooltip>
      ),
    },
  ];

  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Users</Typography.Title>
        <Input
          placeholder="Search by name or email..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 280 }}
          allowClear
        />
      </div>
      <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} />

      <Modal title="Edit User" open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={[{ value: 'reader', label: 'Reader' }, { value: 'admin', label: 'Admin' }]} />
          </Form.Item>
          <Form.Item name="max_loans_allowed" label="Max Loans Allowed">
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="Status">
            <Select options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
