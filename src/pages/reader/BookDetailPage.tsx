import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Col, Descriptions, Row, Tag, Typography, App, Spin, Divider } from 'antd';
import { ArrowLeftOutlined, BookOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../../lib/supabase';
import { Book } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [alreadyReserved, setAlreadyReserved] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { message } = App.useApp();

  useEffect(() => {
    async function load() {
      const [bookRes, resRes] = await Promise.all([
        supabase.from('books')
          .select('*, categories(*), book_authors(author_order, authors(*))')
          .eq('book_id', id)
          .single(),
        supabase.from('reservations')
          .select('reservation_id')
          .eq('book_id', id)
          .eq('user_id', profile?.id)
          .eq('status', 'Active'),
      ]);
      setBook(bookRes.data as Book);
      setAlreadyReserved((resRes.data?.length ?? 0) > 0);
      setLoading(false);
    }
    load();
  }, [id, profile]);

  async function handleReserve() {
    if (!book || !profile) return;
    setReserving(true);
    const { error } = await supabase.from('reservations').insert({
      book_id: book.book_id,
      user_id: profile.id,
      expiration_date: dayjs().add(7, 'day').toISOString(),
    });
    setReserving(false);
    if (error) {
      message.error(error.message);
    } else {
      message.success('Reservation created! Valid for 7 days.');
      setAlreadyReserved(true);
    }
  }

  if (loading) return <Spin />;
  if (!book) return <Typography.Text>Book not found.</Typography.Text>;

  const authors = book.book_authors
    ?.sort((a, b) => a.author_order - b.author_order)
    .map(ba => `${ba.authors.first_name} ${ba.authors.last_name}`)
    .join(', ');

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        Back to Browse
      </Button>

      <Card>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={6}>
            <div style={{ height: 200, background: 'linear-gradient(135deg, #1677ff22, #1677ff44)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOutlined style={{ fontSize: 72, color: '#1677ff' }} />
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Tag color={book.available_copies > 0 ? 'green' : 'red'} style={{ fontSize: 14, padding: '4px 12px' }}>
                {book.available_copies > 0 ? `${book.available_copies} copies available` : 'Not available'}
              </Tag>
            </div>
          </Col>

          <Col xs={24} md={18}>
            <Typography.Title level={3} style={{ marginBottom: 4 }}>{book.title}</Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 16 }}>{authors}</Typography.Text>

            <Divider />

            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="ISBN">{book.isbn}</Descriptions.Item>
              <Descriptions.Item label="Category">{book.categories?.category_name}</Descriptions.Item>
              <Descriptions.Item label="Publisher">{book.publisher || '—'}</Descriptions.Item>
              <Descriptions.Item label="Year">{book.publication_year || '—'}</Descriptions.Item>
              <Descriptions.Item label="Pages">{book.pages || '—'}</Descriptions.Item>
              <Descriptions.Item label="Total Copies">{book.total_copies}</Descriptions.Item>
            </Descriptions>

            {book.description && (
              <>
                <Divider />
                <Typography.Paragraph>{book.description}</Typography.Paragraph>
              </>
            )}

            <Divider />

            <Button
              type="primary"
              size="large"
              icon={<CalendarOutlined />}
              onClick={handleReserve}
              loading={reserving}
              disabled={alreadyReserved}
            >
              {alreadyReserved ? 'Already Reserved' : 'Reserve This Book'}
            </Button>
            {alreadyReserved && (
              <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
                You have an active reservation for this book.
              </Typography.Text>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
}
