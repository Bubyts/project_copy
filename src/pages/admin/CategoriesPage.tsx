import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Typography, App, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { Category } from '../../types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('category_name');
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    form.setFieldsValue(cat);
    setModalOpen(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    setSaving(true);

    if (editing) {
      const { error } = await supabase.from('categories').update(values).eq('category_id', editing.category_id);
      if (error) { message.error(error.message); setSaving(false); return; }
      message.success('Category updated');
    } else {
      const { error } = await supabase.from('categories').insert(values);
      if (error) { message.error(error.message); setSaving(false); return; }
      message.success('Category created');
    }

    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(cat: Category) {
    const { error } = await supabase.from('categories').update({ is_active: false }).eq('category_id', cat.category_id);
    if (error) message.error(error.message);
    else { message.success('Category deleted'); load(); }
  }

  const columns = [
    { title: 'Category Name', dataIndex: 'category_name', key: 'name', render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'Description', dataIndex: 'description', key: 'desc', ellipsis: true },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: Category) => (
        <Space>
          <Tooltip title="Edit"><Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} /></Tooltip>
          <Popconfirm title="Delete this category?" onConfirm={() => handleDelete(r)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Categories</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Category</Button>
      </div>

      <Table dataSource={categories} columns={columns} rowKey="category_id" loading={loading} />

      <Modal title={editing ? 'Edit Category' : 'Add Category'} open={modalOpen} onOk={handleSave} onCancel={() => setModalOpen(false)} confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Form.Item name="category_name" label="Category Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
