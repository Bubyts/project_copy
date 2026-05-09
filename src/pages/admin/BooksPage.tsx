import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, InputNumber,
  Select, Tag, Typography, App, Popconfirm, Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { Book, Category, Author } from '../../types';

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  async function load() {
    setLoading(true);
    const [booksRes, catRes, authRes] = await Promise.all([
      supabase.from('books').select('*, categories(*), book_authors(author_order, authors(*))').eq('is_active', true).order('title'),
      supabase.from('categories').select('*').eq('is_active', true).order('category_name'),
      supabase.from('authors').select('*').eq('is_active', true).order('last_name'),
    ]);
    setBooks((booksRes.data as Book[]) ?? []);
    setCategories((catRes.data as Category[]) ?? []);
    setAuthors((authRes.data as Author[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(book: Book) {
    setEditing(book);
    form.setFieldsValue({
      ...book,
      author_ids: book.book_authors?.map(ba => ba.authors.author_id) ?? [],
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    setSaving(true);

    const { author_ids, ...bookData } = values;

    if (editing) {
      const { error } = await supabase.from('books').update(bookData).eq('book_id', editing.book_id);
      if (error) { message.error(error.message); setSaving(false); return; }

      await supabase.from('book_authors').delete().eq('book_id', editing.book_id);
      if (author_ids?.length) {
        await supabase.from('book_authors').insert(
          author_ids.map((id: number, i: number) => ({ book_id: editing.book_id, author_id: id, author_order: i + 1 }))
        );
      }
      message.success('Book updated');
    } else {
      const { data, error } = await supabase.from('books').insert(bookData).select().single();
      if (error) { message.error(error.message); setSaving(false); return; }

      if (author_ids?.length) {
        await supabase.from('book_authors').insert(
          author_ids.map((id: number, i: number) => ({ book_id: (data as Book).book_id, author_id: id, author_order: i + 1 }))
        );
      }
      message.success('Book created');
    }

    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function handleDelete(book: Book) {
    const { error } = await supabase.from('books').update({ is_active: false }).eq('book_id', book.book_id);
    if (error) message.error(error.message);
    else { message.success('Book deleted'); load(); }
  }

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.isbn.includes(search)
  );

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: 'ISBN', dataIndex: 'isbn', key: 'isbn' },
    { title: 'Category', key: 'category', render: (_: unknown, r: Book) => r.categories?.category_name },
    {
      title: 'Authors',
      key: 'authors',
      render: (_: unknown, r: Book) =>
        r.book_authors?.sort((a, b) => a.author_order - b.author_order)
          .map(ba => `${ba.authors.first_name} ${ba.authors.last_name}`)
          .join(', '),
    },
    { title: 'Year', dataIndex: 'publication_year', key: 'year' },
    {
      title: 'Available',
      key: 'avail',
      render: (_: unknown, r: Book) => (
        <Tag color={r.available_copies > 0 ? 'green' : 'red'}>
          {r.available_copies} / {r.total_copies}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: Book) => (
        <Space>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          </Tooltip>
          <Popconfirm title="Delete this book?" onConfirm={() => handleDelete(r)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Books</Typography.Title>
        <Space>
          <Input
            placeholder="Search title or ISBN..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Book</Button>
        </Space>
      </div>

      <Table dataSource={filtered} columns={columns} rowKey="book_id" loading={loading} />

      <Modal
        title={editing ? 'Edit Book' : 'Add Book'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        width={640}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="title" label="Title" rules={[{ required: true }]} style={{ gridColumn: '1 / -1' }}>
              <Input />
            </Form.Item>
            <Form.Item name="isbn" label="ISBN" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="category_id" label="Category" rules={[{ required: true }]}>
              <Select options={categories.map(c => ({ value: c.category_id, label: c.category_name }))} />
            </Form.Item>
            <Form.Item name="author_ids" label="Authors">
              <Select
                mode="multiple"
                options={authors.map(a => ({ value: a.author_id, label: `${a.first_name} ${a.last_name}` }))}
              />
            </Form.Item>
            <Form.Item name="publisher" label="Publisher">
              <Input />
            </Form.Item>
            <Form.Item name="publication_year" label="Year">
              <InputNumber style={{ width: '100%' }} min={1000} max={2100} />
            </Form.Item>
            <Form.Item name="total_copies" label="Total Copies" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
            <Form.Item name="pages" label="Pages">
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
            <Form.Item name="description" label="Description" style={{ gridColumn: '1 / -1' }}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
