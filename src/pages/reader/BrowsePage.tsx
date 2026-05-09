import { useEffect, useState } from 'react';
import { Card, Col, Input, Row, Select, Tag, Typography, Spin, Badge, Empty } from 'antd';
import { SearchOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Book, Category } from '../../types';

export default function BrowsePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [availFilter, setAvailFilter] = useState<'all' | 'available'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [booksRes, catRes] = await Promise.all([
        supabase.from('books')
          .select('*, categories(*), book_authors(author_order, authors(first_name, last_name))')
          .eq('is_active', true)
          .order('title'),
        supabase.from('categories').select('*').eq('is_active', true).order('category_name'),
      ]);
      setBooks((booksRes.data as Book[]) ?? []);
      setCategories((catRes.data as Category[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = books.filter(b => {
    const matchSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.isbn.includes(search) ||
      b.book_authors?.some(ba =>
        `${ba.authors.first_name} ${ba.authors.last_name}`.toLowerCase().includes(search.toLowerCase())
      );
    const matchCat = !categoryFilter || b.category_id === categoryFilter;
    const matchAvail = availFilter === 'all' || b.available_copies > 0;
    return matchSearch && matchCat && matchAvail;
  });

  if (loading) return <Spin />;

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>Browse Books</Typography.Title>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Input
          placeholder="Search by title, author or ISBN..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
          allowClear
        />
        <Select
          placeholder="All Categories"
          value={categoryFilter}
          onChange={setCategoryFilter}
          style={{ width: 180 }}
          allowClear
          options={categories.map(c => ({ value: c.category_id, label: c.category_name }))}
        />
        <Select
          value={availFilter}
          onChange={setAvailFilter}
          style={{ width: 140 }}
          options={[
            { value: 'all', label: 'All Books' },
            { value: 'available', label: 'Available Now' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <Empty description="No books found" />
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map(book => {
            const authors = book.book_authors
              ?.sort((a, b) => a.author_order - b.author_order)
              .map(ba => `${ba.authors.first_name} ${ba.authors.last_name}`)
              .join(', ');

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={book.book_id}>
                <Badge.Ribbon
                  text={book.available_copies > 0 ? 'Available' : 'Unavailable'}
                  color={book.available_copies > 0 ? 'green' : 'red'}
                >
                  <Card
                    hoverable
                    onClick={() => navigate(`/reader/book/${book.book_id}`)}
                    style={{ height: '100%' }}
                    cover={
                      <div style={{ height: 120, background: 'linear-gradient(135deg, #1677ff22, #1677ff44)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOutlined style={{ fontSize: 48, color: '#1677ff' }} />
                      </div>
                    }
                  >
                    <Card.Meta
                      title={<Typography.Text ellipsis={{ tooltip: book.title }}>{book.title}</Typography.Text>}
                      description={
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{authors || '—'}</Typography.Text>
                          <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {book.categories && <Tag>{book.categories.category_name}</Tag>}
                            {book.publication_year && <Tag color="default">{book.publication_year}</Tag>}
                          </div>
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                            {book.available_copies} of {book.total_copies} copies available
                          </Typography.Text>
                        </div>
                      }
                    />
                  </Card>
                </Badge.Ribbon>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
