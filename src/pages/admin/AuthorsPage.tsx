import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, Typography, App, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../../lib/supabase';
import { Author } from '../../types';

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Author | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();
  const { message } = App.useApp();

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('authors').select('*').eq('is_active', true).order('last_name');
    setAuthors((data as Author[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(author: Author) {
    setEditing(author);
    form.setFieldsValue({
      ...author,
      birth_date: author.birth_date ? dayjs(author.birth_date) : null,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    setSaving(true);
    const payload = {
      ...values,
      birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
    };

    if (editing) {
      const { error } = await supabase.from('authors').update(payload).eq('author_id', editing.author_id);
      if (error) { message.error(error.message); setSaving(false); return; }
      message.success('Author updated');
    } else {
      const { error } = await supabase.from('authors').insert(payload);
      if (error) { message.error(error.message); setSaving(false); return; }
      message.success('Author created');
    }

    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(author: Author) {
    const { error } = await supabase.from('authors').update({ is_active: false }).eq('author_id', author.author_id);
    if (error) message.error(error.message);
    else { message.success('Author deleted'); load(); }
  }

  const columns = [
    { title: 'First Name', dataIndex: 'first_name', key: 'first_name' },
    { title: 'Last Name', dataIndex: 'last_name', key: 'last_name', render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Nationality', dataIndex: 'nationality', key: 'nationality' },
    { title: 'Birth Date', dataIndex: 'birth_date', key: 'birth_date', render: (d: string) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: Author) => (
        <Space>
          <Tooltip title="Edit"><Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} /></Tooltip>
          <Popconfirm title="Delete this author?" onConfirm={() => handleDelete(r)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filtered = authors.filter(a =>
    `${a.first_name} ${a.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (a.nationality ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Authors</Typography.Title>
        <Space>
          <Input
            placeholder="Search by name or nationality..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Author</Button>
        </Space>
      </div>

      <Table dataSource={filtered} columns={columns} rowKey="author_id" loading={loading} />

      <Modal title={editing ? 'Edit Author' : 'Add Author'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="nationality" label="Nationality">
            <Input />
          </Form.Item>
          <Form.Item name="birth_date" label="Birth Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="biography" label="Biography">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
